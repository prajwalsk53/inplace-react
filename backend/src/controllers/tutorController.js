const prisma = require('../config/db');
const { issueProviderToken } = require('../utils/providerToken');
const { mailVisitScheduled } = require('../utils/mailer');
const { logAction } = require('../utils/auditLog');
const { buildVisitIcs } = require('../utils/calendarInvite');

const AT_RISK_VISIT_DAYS = 60;

const placementListInclude = {
  student: { select: { id: true, fullName: true, email: true, avatarInitials: true } },
  company: true,
};

async function atRiskPlacementIds(tutorId) {
  const cutoff = new Date(Date.now() - AT_RISK_VISIT_DAYS * 24 * 60 * 60 * 1000);
  const placements = await prisma.placement.findMany({
    where: { tutorId, status: 'ACTIVE' },
    include: { visits: { where: { status: 'completed' }, orderBy: { scheduledAt: 'desc' }, take: 1 } },
  });
  return placements
    .filter((p) => p.visits.length === 0 || p.visits[0].scheduledAt < cutoff)
    .map((p) => p.id);
}

exports.getDashboard = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const [totalPlacements, activePlacements, upcomingVisits, pendingRequests, atRisk] = await Promise.all([
      prisma.placement.count({ where: { tutorId } }),
      prisma.placement.count({ where: { tutorId, status: 'ACTIVE' } }),
      prisma.visit.count({ where: { tutorId, status: 'scheduled', scheduledAt: { gte: new Date() } } }),
      prisma.placementChangeRequest.count({ where: { status: 'PENDING', placement: { tutorId } } }),
      atRiskPlacementIds(tutorId),
    ]);
    res.json({ totalPlacements, activePlacements, upcomingVisits, pendingRequests, atRiskCount: atRisk.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacements = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      where: { tutorId: req.user.id },
      include: placementListInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAtRiskPlacements = async (req, res) => {
  try {
    const ids = await atRiskPlacementIds(req.user.id);
    const placements = await prisma.placement.findMany({ where: { id: { in: ids } }, include: placementListInclude });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacement = async (req, res) => {
  try {
    const placement = await prisma.placement.findFirst({
      where: { id: Number(req.params.id), tutorId: req.user.id },
      include: { ...placementListInclude, visits: true, reflections: true, reports: true, documents: true, changeRequests: true },
    });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailableStudents = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', approvalStatus: 'APPROVED', placementsAsStudent: { none: { status: { notIn: ['REJECTED', 'TERMINATED'] } } } },
      select: { id: true, fullName: true, email: true, academicYear: true, programmeType: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPlacement = async (req, res) => {
  try {
    const {
      studentId, companyId, companyName, companyAddress, companySector, companyLat, companyLng,
      roleTitle, jobDescription, startDate, endDate, salary, workingPattern,
      supervisorName, supervisorEmail, supervisorPhone,
    } = req.body;

    let finalCompanyId = companyId ? Number(companyId) : null;
    if (!finalCompanyId) {
      if (!companyName) return res.status(400).json({ error: 'companyId or companyName is required' });
      const company = await prisma.company.create({
        data: { name: companyName, address: companyAddress, sector: companySector, latitude: companyLat ? Number(companyLat) : null, longitude: companyLng ? Number(companyLng) : null },
      });
      finalCompanyId = company.id;
    }

    const placement = await prisma.placement.create({
      data: {
        studentId: Number(studentId),
        companyId: finalCompanyId,
        tutorId: req.user.id,
        roleTitle, jobDescription,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        salary: salary ? Number(salary) : null,
        workingPattern, supervisorName, supervisorEmail, supervisorPhone,
        status: 'AWAITING_PROVIDER',
      },
      include: { student: true },
    });

    if (supervisorEmail) await issueProviderToken(placement, 'confirm_placement');
    await prisma.notification.create({
      data: { userId: placement.studentId, type: 'placement', title: 'Placement created', body: `A placement with ${companyName || 'your provider'} has been created for you.`, link: '/student/my-placement' },
    });
    await logAction(req.user.id, 'create_placement', 'placements', placement.id);

    res.status(201).json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlacement = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.placement.findFirst({ where: { id, tutorId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Placement not found' });

    const { roleTitle, jobDescription, startDate, endDate, salary, workingPattern, supervisorName, supervisorEmail, supervisorPhone, status } = req.body;
    const placement = await prisma.placement.update({
      where: { id },
      data: {
        roleTitle, jobDescription,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        salary: salary !== undefined ? Number(salary) : undefined,
        workingPattern, supervisorName, supervisorEmail, supervisorPhone,
        status: status || undefined,
      },
    });
    await logAction(req.user.id, 'update_placement', 'placements', id);
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.terminatePlacement = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.placement.findFirst({ where: { id, tutorId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Placement not found' });
    const placement = await prisma.placement.update({ where: { id }, data: { status: 'TERMINATED' } });
    await prisma.notification.create({
      data: { userId: placement.studentId, type: 'placement', title: 'Placement terminated', body: req.body.reason || 'Your placement has been terminated.', link: '/student/my-placement' },
    });
    await logAction(req.user.id, 'terminate_placement', 'placements', id, req.body.reason);
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVisits = async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { tutorId: req.user.id },
      include: { placement: { include: { student: { select: { fullName: true } }, company: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.scheduleVisit = async (req, res) => {
  try {
    const { placementId, scheduledAt, visitType } = req.body;
    const placement = await prisma.placement.findFirst({ where: { id: Number(placementId), tutorId: req.user.id }, include: { student: true } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const visit = await prisma.visit.create({
      data: { placementId: placement.id, tutorId: req.user.id, scheduledAt: new Date(scheduledAt), visitType: visitType || 'in_person' },
    });
    await prisma.notification.create({
      data: { userId: placement.studentId, type: 'visit', title: 'Visit scheduled', body: `A tutor visit has been scheduled for ${new Date(scheduledAt).toLocaleDateString('en-GB')}.`, link: '/student/visits' },
    });
    await mailVisitScheduled(placement.student.email, placement.student.fullName, scheduledAt, visitType || 'in_person');
    res.status(201).json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveVisitNotes = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.visit.findFirst({ where: { id, tutorId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Visit not found' });
    const { notes, outcome, status } = req.body;
    const visit = await prisma.visit.update({ where: { id }, data: { notes, outcome, status: status || 'completed' } });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.downloadVisitIcs = async (req, res) => {
  try {
    const visit = await prisma.visit.findFirst({ where: { id: Number(req.params.id), tutorId: req.user.id } });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="visit-${visit.id}.ics"`);
    res.send(buildVisitIcs(visit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProviders = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { placements: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProviderMeetings = async (req, res) => {
  try {
    const meetings = await prisma.providerMeeting.findMany({
      where: { requestedById: req.user.id },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestProviderMeeting = async (req, res) => {
  try {
    const { companyId, purpose, scheduledAt } = req.body;
    const meeting = await prisma.providerMeeting.create({
      data: { companyId: Number(companyId), requestedById: req.user.id, purpose, scheduledAt: scheduledAt ? new Date(scheduledAt) : null, status: scheduledAt ? 'scheduled' : 'requested' },
    });
    res.status(201).json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getChangeRequests = async (req, res) => {
  try {
    const requests = await prisma.placementChangeRequest.findMany({
      where: { placement: { tutorId: req.user.id } },
      include: { placement: { include: { student: { select: { fullName: true } } } }, requestedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.respondChangeRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { decision, reviewNotes } = req.body; // "approve" | "reject"
    const request = await prisma.placementChangeRequest.findFirst({ where: { id, placement: { tutorId: req.user.id } } });
    if (!request) return res.status(404).json({ error: 'Change request not found' });

    const updated = await prisma.placementChangeRequest.update({
      where: { id },
      data: { status: decision === 'approve' ? 'APPROVED' : 'REJECTED', reviewedById: req.user.id, reviewNotes },
    });
    await prisma.notification.create({
      data: { userId: request.requestedById, type: 'change_request', title: `Request ${updated.status.toLowerCase()}`, body: reviewNotes || '', link: '/student/submit-request' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReflectionsAndReports = async (req, res) => {
  try {
    const [reflections, reports] = await Promise.all([
      prisma.reflection.findMany({ where: { placement: { tutorId: req.user.id } }, include: { student: { select: { fullName: true } }, placement: { select: { roleTitle: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.report.findMany({ where: { placement: { tutorId: req.user.id } }, include: { student: { select: { fullName: true } }, placement: { select: { roleTitle: true } } }, orderBy: { submittedAt: 'desc' } }),
    ]);
    res.json({ reflections, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.giveReflectionFeedback = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { tutorFeedback } = req.body;
    const reflection = await prisma.reflection.update({ where: { id }, data: { tutorFeedback, status: 'reviewed' } });
    res.json(reflection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.giveReportFeedback = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { tutorFeedback } = req.body;
    const report = await prisma.report.update({ where: { id }, data: { tutorFeedback, status: 'reviewed', reviewedAt: new Date() } });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, audienceRole, isPinned, expiresAt } = req.body;
    const announcement = await prisma.announcement.create({
      data: {
        title, content,
        audienceRole: audienceRole ? audienceRole.toUpperCase() : null,
        isPinned: !!isPinned,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        postedById: req.user.id,
      },
    });
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMapPlacements = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      where: { tutorId: req.user.id, status: { in: ['ACTIVE', 'APPROVED'] } },
      include: { student: { select: { fullName: true } }, company: true },
    });
    res.json(placements.filter((p) => p.company.latitude && p.company.longitude));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await prisma.tutorSetting.upsert({
      where: { tutorId: req.user.id },
      update: {},
      create: { tutorId: req.user.id },
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { visitReminderDays, emailNotifications } = req.body;
    const settings = await prisma.tutorSetting.upsert({
      where: { tutorId: req.user.id },
      update: { visitReminderDays: visitReminderDays !== undefined ? Number(visitReminderDays) : undefined, emailNotifications },
      create: { tutorId: req.user.id, visitReminderDays: visitReminderDays ? Number(visitReminderDays) : undefined, emailNotifications },
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      where: { tutorId: req.user.id },
      include: { student: true, company: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

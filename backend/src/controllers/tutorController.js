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
    const [unreadCount, pendingRequests, totalActive] = await Promise.all([
      prisma.message.count({ where: { receiverId: req.user.id, isRead: false } }),
      prisma.placement.count({ where: { status: { in: ['SUBMITTED', 'AWAITING_TUTOR', 'AWAITING_PROVIDER'] } } }),
      prisma.placement.count({ where: { status: { in: ['APPROVED', 'ACTIVE'] } } }),
    ]);
    res.json({ unreadCount, pendingRequests, totalActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

exports.getDashboardMetrics = async (req, res) => {
  try {
    const [statusGroups, placementCities, reflections, visitGroups] = await Promise.all([
      prisma.placement.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.placement.findMany({ select: { company: { select: { city: true } } } }),
      prisma.reflection.findMany({ select: { createdAt: true } }),
      prisma.visit.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const status = statusGroups.map((g) => ({ status: g.status.toLowerCase(), cnt: g._count._all }));

    const cityCounts = {};
    for (const p of placementCities) {
      const city = p.company?.city?.trim() || 'Unknown';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    }
    const city = Object.entries(cityCounts)
      .map(([city, cnt]) => ({ city, cnt }))
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 8);

    const weekCounts = {};
    for (const r of reflections) {
      const key = isoWeekKey(r.createdAt);
      weekCounts[key] = (weekCounts[key] || 0) + 1;
    }
    const reflectionTrend = Object.entries(weekCounts)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-12)
      .map(([week, cnt]) => ({ week, cnt }));

    const visits = visitGroups.map((g) => ({ status: g.status, cnt: g._count._all }));

    res.json({ charts: { status, city, reflectionTrend, visits }, ts: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function buildAllPlacementsWhere(query) {
  const { status, company, location, search } = query;
  const where = { AND: [] };

  where.AND.push(status ? { status } : { status: { in: ['APPROVED', 'ACTIVE'] } });
  if (company) where.AND.push({ company: { name: { contains: company, mode: 'insensitive' } } });
  if (location) where.AND.push({ company: { city: location } });
  if (search) {
    where.AND.push({
      OR: [
        { student: { fullName: { contains: search, mode: 'insensitive' } } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { company: { city: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }
  return where;
}

exports.getPlacements = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      where: buildAllPlacementsWhere(req.query),
      include: placementListInclude,
      orderBy: [{ startDate: 'desc' }, { student: { fullName: 'asc' } }],
    });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacementFilterOptions = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { placements: { some: { status: { in: ['APPROVED', 'ACTIVE'] } } } },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });
    const cities = await prisma.company.findMany({
      where: { city: { not: null }, placements: { some: { status: { in: ['APPROVED', 'ACTIVE'] } } } },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });
    res.json({ companies: companies.map((c) => c.name), cities: cities.map((c) => c.city).filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportAllPlacementsCsv = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      where: buildAllPlacementsWhere(req.query),
      include: placementListInclude,
      orderBy: [{ startDate: 'desc' }, { student: { fullName: 'asc' } }],
    });
    const header = 'Student,Email,Company,City,Role,Start Date,End Date,Status\n';
    const rows = placements.map((p) => [
      p.student.fullName, p.student.email, p.company.name, p.company.city || '', p.roleTitle, p.status,
      p.startDate ? p.startDate.toISOString().slice(0, 10) : '', p.endDate ? p.endDate.toISOString().slice(0, 10) : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="all-placements.csv"');
    res.send(header + rows);
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
      where: { id: Number(req.params.id) },
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
      where: { role: 'STUDENT', approvalStatus: 'APPROVED', isActive: true },
      select: { id: true, fullName: true, email: true, academicYear: true, programmeType: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getExistingCompanyNames = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({ select: { name: true }, distinct: ['name'], orderBy: { name: 'asc' } });
    res.json(companies.map((c) => c.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const INITIAL_STATUS_OPTIONS = ['AWAITING_PROVIDER', 'AWAITING_TUTOR', 'APPROVED'];

exports.createPlacement = async (req, res) => {
  try {
    const {
      studentId, companyName, companyAddress, companyCity, companySector, companyLat, companyLng,
      roleTitle, jobDescription, startDate, endDate, salary, workingPattern,
      supervisorName, supervisorEmail, supervisorPhone, initialStatus,
    } = req.body;

    if (!studentId || !companyName || !roleTitle || !startDate || !endDate) {
      return res.status(400).json({ error: 'Student, company name, role title, start date and end date are all required.' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'End date must be after start date.' });
    }

    const student = await prisma.user.findFirst({ where: { id: Number(studentId), role: 'STUDENT', approvalStatus: 'APPROVED' } });
    if (!student) return res.status(400).json({ error: 'Selected student not found or not approved.' });

    const status = INITIAL_STATUS_OPTIONS.includes((initialStatus || '').toUpperCase()) ? initialStatus.toUpperCase() : 'AWAITING_PROVIDER';
    const lat = companyLat !== undefined && companyLat !== '' && !Number.isNaN(Number(companyLat)) ? Number(companyLat) : null;
    const lng = companyLng !== undefined && companyLng !== '' && !Number.isNaN(Number(companyLng)) ? Number(companyLng) : null;

    const existingCompany = await prisma.company.findFirst({ where: { name: { equals: companyName, mode: 'insensitive' } } });
    let companyId;
    if (existingCompany) {
      companyId = existingCompany.id;
      await prisma.company.update({
        where: { id: companyId },
        data: {
          address: companyAddress || existingCompany.address,
          city: companyCity || existingCompany.city,
          sector: companySector || existingCompany.sector,
          contactName: supervisorName || existingCompany.contactName,
          contactEmail: supervisorEmail || existingCompany.contactEmail,
          contactPhone: supervisorPhone || existingCompany.contactPhone,
          latitude: lat ?? existingCompany.latitude,
          longitude: lng ?? existingCompany.longitude,
        },
      });
    } else {
      const company = await prisma.company.create({
        data: {
          name: companyName, address: companyAddress || null, city: companyCity || null, sector: companySector || null,
          contactName: supervisorName || null, contactEmail: supervisorEmail || null, contactPhone: supervisorPhone || null,
          latitude: lat, longitude: lng,
        },
      });
      companyId = company.id;
    }

    const placement = await prisma.placement.create({
      data: {
        studentId: student.id,
        companyId,
        tutorId: req.user.id,
        roleTitle, jobDescription: jobDescription || null,
        startDate: new Date(startDate), endDate: new Date(endDate),
        salary: salary || null, workingPattern: workingPattern || null,
        supervisorName: supervisorName || null, supervisorEmail: supervisorEmail || null, supervisorPhone: supervisorPhone || null,
        status,
      },
      include: { student: true },
    });

    await logAction(req.user.id, 'tutor_created_placement', 'placements', placement.id, `Created on behalf of student #${student.id}`);

    const statusLabel = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    await prisma.message.create({
      data: {
        senderId: req.user.id, receiverId: student.id, isRead: false,
        body: `A placement record has been created for you at ${companyName} (${roleTitle}) by your tutor. Status: ${statusLabel}. Please log in to review the details.`,
      },
    });

    if (status === 'AWAITING_PROVIDER' && supervisorEmail) {
      await issueProviderToken(placement, 'confirm_placement');
    }

    res.status(201).json({
      placement,
      message: `Placement created successfully for ${student.fullName} at ${companyName}. Status set to: ${statusLabel}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlacement = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.placement.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Placement not found' });

    const { roleTitle, jobDescription, startDate, endDate, salary, workingPattern } = req.body;
    const placement = await prisma.placement.update({
      where: { id },
      data: {
        roleTitle: roleTitle !== undefined ? roleTitle : undefined,
        jobDescription: jobDescription !== undefined ? jobDescription : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        salary: salary !== undefined ? (salary || null) : undefined,
        workingPattern: workingPattern !== undefined ? workingPattern : undefined,
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
    const reason = (req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'A termination reason is required.' });

    const existing = await prisma.placement.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Placement not found' });
    const placement = await prisma.placement.update({ where: { id }, data: { status: 'TERMINATED' } });
    await prisma.notification.create({
      data: { userId: placement.studentId, type: 'placement_terminated', title: 'Placement terminated', body: `Your placement has been terminated by your tutor. Reason: ${reason}`, link: '/student/my-placement' },
    });
    await logAction(req.user.id, 'terminate_placement', 'placements', id, reason);
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const visitInclude = { placement: { include: { student: true, company: true } }, tutor: true };

exports.getVisits = async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { tutorId: req.user.id },
      include: visitInclude,
      orderBy: [{ scheduledAt: 'asc' }],
    });
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVisit = async (req, res) => {
  try {
    const visit = await prisma.visit.findFirst({ where: { id: Number(req.params.id), tutorId: req.user.id }, include: visitInclude });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.scheduleVisit = async (req, res) => {
  try {
    const { placementId, visitDate, visitTime, duration, visitType, location, meetingLink, notes } = req.body;
    const placement = await prisma.placement.findFirst({ where: { id: Number(placementId) }, include: { student: true, company: true } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const scheduledAt = new Date(`${visitDate}T${visitTime}`);
    const visit = await prisma.visit.create({
      data: {
        placementId: placement.id, tutorId: req.user.id, scheduledAt,
        durationHours: duration ? Number(duration) : 2,
        visitType: visitType || 'physical',
        location: location || null, meetingLink: meetingLink || null,
        notes: notes || null,
        status: 'scheduled',
      },
      include: visitInclude,
    });

    await prisma.notification.create({
      data: { userId: placement.studentId, type: 'visit', title: 'Visit scheduled', body: `A tutor visit has been scheduled for ${scheduledAt.toLocaleDateString('en-GB')}.`, link: '/student/visits' },
    });

    const icsContent = buildVisitIcs(visit, { name: req.user.fullName, email: req.user.email }, [{ name: placement.student.fullName, email: placement.student.email }]);
    let inviteSent = false;
    try {
      await mailVisitScheduled({
        summary: `${placement.roleTitle} - Placement Visit`,
        scheduledAt, durationHours: visit.durationHours, visitType: visit.visitType, meetingLink, location,
        companyName: placement.company.name, studentName: placement.student.fullName, notes,
        organizer: { name: req.user.fullName, email: req.user.email },
        attendee: { name: placement.student.fullName, email: placement.student.email },
      }, icsContent);
      inviteSent = true;
    } catch (e) { /* email is best-effort */ }

    res.status(201).json({
      visit,
      message: inviteSent
        ? `Visit scheduled successfully! Calendar invites have been sent to ${placement.student.fullName} and added to your calendar.`
        : 'Visit scheduled successfully!',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateVisit = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.visit.findFirst({ where: { id, tutorId: req.user.id }, include: { placement: true } });
    if (!existing) return res.status(404).json({ error: 'Visit not found' });

    const { visitDate, visitTime, visitType, location, meetingLink, notes } = req.body;
    const scheduledAt = new Date(`${visitDate}T${visitTime}`);
    const visit = await prisma.visit.update({
      where: { id },
      data: { scheduledAt, visitType, location: location || null, meetingLink: meetingLink || null, notes: notes || null },
    });

    await prisma.notification.create({
      data: {
        userId: existing.placement.studentId, type: 'visit_updated',
        title: 'Visit rescheduled',
        body: `📅 Your visit has been rescheduled to ${scheduledAt.toLocaleDateString('en-GB')} at ${scheduledAt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}.`,
        link: '/student/visits',
      },
    });

    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.completeVisit = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.visit.findFirst({ where: { id, tutorId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Visit not found' });
    const visit = await prisma.visit.update({ where: { id }, data: { status: 'completed', notes: req.body.notes || null } });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelVisit = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.visit.findFirst({ where: { id, tutorId: req.user.id }, include: { placement: true } });
    if (!existing) return res.status(404).json({ error: 'Visit not found' });

    const reason = (req.body.reason || '').trim() || 'Cancelled by tutor';
    const visit = await prisma.visit.update({
      where: { id },
      data: { status: 'cancelled', notes: `${existing.notes || ''}\n[CANCELLED] ${reason}`.trim() },
    });

    await prisma.notification.create({
      data: {
        userId: existing.placement.studentId, type: 'visit_cancelled',
        title: 'Visit cancelled',
        body: `⚠️ Your visit scheduled for ${existing.scheduledAt.toLocaleDateString('en-GB')} at ${existing.scheduledAt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })} has been cancelled by your tutor. Reason: ${reason}`,
        link: '/student/visits',
      },
    });

    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveVisitNotes = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.visit.findFirst({ where: { id, tutorId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Visit not found' });
    const visit = await prisma.visit.update({ where: { id }, data: { notes: req.body.notes || null } });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.downloadVisitIcs = async (req, res) => {
  try {
    const visit = await prisma.visit.findFirst({ where: { id: Number(req.params.id), tutorId: req.user.id }, include: visitInclude });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="visit-${visit.id}.ics"`);
    res.send(buildVisitIcs(visit, { name: visit.tutor.fullName, email: visit.tutor.email }, [{ name: visit.placement.student.fullName, email: visit.placement.student.email }]));
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
    const [announcements, totalStudents] = await Promise.all([
      prisma.announcement.findMany({
        where: { postedById: req.user.id },
        include: { _count: { select: { reads: true } } },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
    ]);
    res.json({
      totalStudents,
      announcements: announcements.map((a) => ({ ...a, readCount: a._count.reads, _count: undefined })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, audienceRole, audienceType, targetValue, isPinned, expiresAt } = req.body;
    const announcement = await prisma.announcement.create({
      data: {
        title, content,
        audienceRole: audienceRole ? audienceRole.toUpperCase() : null,
        audienceType: audienceType || 'all',
        targetValue: audienceType && audienceType !== 'all' ? targetValue : null,
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

exports.updateAnnouncement = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.announcement.findFirst({ where: { id, postedById: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    const { title, content, audienceType, targetValue, isPinned, expiresAt } = req.body;
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title, content,
        audienceType: audienceType || 'all',
        targetValue: audienceType && audienceType !== 'all' ? targetValue : null,
        isPinned: !!isPinned,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.announcement.findFirst({ where: { id, postedById: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    await prisma.announcementRead.deleteMany({ where: { announcementId: id } });
    await prisma.announcement.delete({ where: { id } });
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.togglePinAnnouncement = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.announcement.findFirst({ where: { id, postedById: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    const announcement = await prisma.announcement.update({ where: { id }, data: { isPinned: !existing.isPinned } });
    res.json(announcement);
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

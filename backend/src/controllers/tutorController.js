const prisma = require('../config/db');
const { issueProviderToken } = require('../utils/providerToken');
const { mailVisitScheduled, mailProviderMeetingScheduled } = require('../utils/mailer');
const { logAction } = require('../utils/auditLog');
const { buildVisitIcs, buildMeetingIcs } = require('../utils/calendarInvite');

const placementListInclude = {
  student: { select: { id: true, fullName: true, email: true, avatarInitials: true } },
  company: true,
};

const AT_RISK_STATUSES = ['APPROVED', 'ACTIVE', 'AWAITING_TUTOR', 'AWAITING_PROVIDER'];

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
    const placements = await prisma.placement.findMany({
      where: { status: { in: AT_RISK_STATUSES } },
      include: {
        student: { select: { fullName: true, email: true, avatarInitials: true } },
        company: { select: { name: true, city: true } },
        riskFlaggedBy: { select: { fullName: true } },
        documents: { where: { category: { in: REPORT_CATEGORIES } }, select: { id: true } },
        visits: { where: { status: 'completed' }, orderBy: { scheduledAt: 'desc' }, take: 1, select: { scheduledAt: true } },
      },
      orderBy: [{ riskFlag: 'desc' }, { student: { fullName: 'asc' } }],
    });

    const shaped = placements.map((p) => ({
      id: p.id, status: p.status, startDate: p.startDate, endDate: p.endDate, roleTitle: p.roleTitle,
      riskFlag: p.riskFlag, riskLevel: p.riskLevel, riskNotes: p.riskNotes, riskFlaggedAt: p.riskFlaggedAt,
      flaggedByName: p.riskFlaggedBy?.fullName || null,
      student: p.student, company: p.company,
      reportCount: p.documents.length,
      lastVisit: p.visits[0]?.scheduledAt || null,
    }));

    const riskOrder = { high: 0, medium: 1, low: 2 };
    shaped.sort((a, b) => {
      if (a.riskFlag !== b.riskFlag) return a.riskFlag ? -1 : 1;
      if (a.riskFlag && b.riskFlag) return (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3);
      return a.student.fullName.localeCompare(b.student.fullName);
    });

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.respondPlacementRisk = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, riskLevel, riskNotes } = req.body;
    const level = ['low', 'medium', 'high'].includes(riskLevel) ? riskLevel : 'medium';

    if (action === 'flag') {
      const placement = await prisma.placement.update({
        where: { id },
        data: { riskFlag: true, riskLevel: level, riskNotes: riskNotes || null, riskFlaggedAt: new Date(), riskFlaggedById: req.user.id },
      });
      await prisma.message.create({
        data: {
          senderId: req.user.id, receiverId: placement.studentId, isRead: false,
          body: `Your tutor has flagged your placement as requiring attention (${level.toUpperCase()} priority). Please check in with your tutor.${riskNotes ? ` Note: ${riskNotes}` : ''}`,
        },
      });
      res.json({ message: 'Student flagged as at-risk. They have been notified via message.' });
    } else if (action === 'update') {
      const existing = await prisma.placement.findFirst({ where: { id, riskFlag: true } });
      if (!existing) return res.status(404).json({ error: 'Placement is not currently flagged' });
      await prisma.placement.update({
        where: { id },
        data: { riskLevel: level, riskNotes: riskNotes || null, riskFlaggedById: req.user.id, riskFlaggedAt: new Date() },
      });
      res.json({ message: 'Risk flag updated.' });
    } else if (action === 'unflag') {
      await prisma.placement.update({
        where: { id },
        data: { riskFlag: false, riskLevel: null, riskNotes: null, riskFlaggedAt: null, riskFlaggedById: null },
      });
      res.json({ message: 'Flag removed. Student is no longer marked at-risk.' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacement = async (req, res) => {
  try {
    const placement = await prisma.placement.findFirst({
      where: { id: Number(req.params.id) },
      include: { ...placementListInclude, visits: true, reflections: true, documents: true, changeRequests: true },
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
    const { search, sector } = req.query;
    const where = { AND: [] };
    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (sector) where.AND.push({ sector });

    const companies = await prisma.company.findMany({
      where: where.AND.length ? where : undefined,
      include: {
        placements: { select: { status: true } },
        users: { where: { role: 'PROVIDER', isActive: true }, select: { fullName: true, email: true }, take: 1 },
      },
    });

    const result = companies
      .map((c) => {
        const totalPlacements = c.placements.length;
        const activePlacements = c.placements.filter((p) => ['APPROVED', 'ACTIVE'].includes(p.status)).length;
        const providerUser = c.users[0] || null;
        const { placements, users, ...rest } = c;
        return {
          ...rest,
          totalPlacements,
          activePlacements,
          providerUserName: providerUser?.fullName || null,
          providerUserEmail: providerUser?.email || null,
        };
      })
      .sort((a, b) => b.activePlacements - a.activePlacements || b.totalPlacements - a.totalPlacements || a.name.localeCompare(b.name));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProviderSectors = async (req, res) => {
  try {
    const rows = await prisma.company.findMany({ where: { sector: { not: null } }, select: { sector: true }, distinct: ['sector'] });
    res.json(rows.map((r) => r.sector).filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProvider = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, address, city, sector, website, phone, contactName, contactEmail, contactPhone, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required.' });

    const company = await prisma.company.update({
      where: { id },
      data: { name, address, city, sector, website, phone, contactName, contactEmail, contactPhone, description },
    });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProvider = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const placementCount = await prisma.placement.count({ where: { companyId: id } });
    if (placementCount > 0) return res.status(400).json({ error: 'Cannot delete — this company has placement records.' });
    await prisma.company.delete({ where: { id } });
    res.json({ message: 'Company deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProviderMeetings = async (req, res) => {
  try {
    const meetings = await prisma.providerMeeting.findMany({
      where: { requestedById: req.user.id },
      include: { company: true },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestProviderMeeting = async (req, res) => {
  try {
    const { companyId, contactName, contactEmail, meetingDate, meetingTime, duration, meetingType, location, meetingLink, agenda } = req.body;
    if (!companyId || !meetingDate || !meetingTime) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const company = await prisma.company.findUnique({ where: { id: Number(companyId) } });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const scheduledAt = new Date(`${meetingDate}T${meetingTime}`);
    const meeting = await prisma.providerMeeting.create({
      data: {
        companyId: company.id, requestedById: req.user.id,
        contactName: contactName || null, contactEmail: contactEmail || null,
        scheduledAt, durationHours: duration ? Number(duration) : 1,
        meetingType: meetingType || 'physical', location: location || null, meetingLink: meetingLink || null,
        agenda: agenda || null, status: 'scheduled',
      },
      include: { company: true },
    });

    let emailSent = false;
    if (contactEmail) {
      try {
        const icsContent = buildMeetingIcs(meeting, { name: req.user.fullName, email: req.user.email }, { name: contactName || company.name, email: contactEmail });
        await mailProviderMeetingScheduled({
          organizer: { name: req.user.fullName, email: req.user.email },
          contactName, contactEmail, companyName: company.name,
          scheduledAt, durationHours: meeting.durationHours, meetingType: meeting.meetingType,
          location, meetingLink, agenda,
        }, icsContent);
        emailSent = true;
      } catch (e) { /* email is best-effort */ }
    }

    res.status(201).json({
      meeting,
      message: emailSent
        ? `Meeting scheduled! Calendar invite sent to ${contactEmail} and your email.`
        : `Meeting scheduled successfully!${contactEmail ? ' (Email invite could not be sent — check SMTP settings.)' : ' No contact email — invite not sent.'}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProviderMeetingStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = ['completed', 'cancelled'].includes(req.body.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ error: 'Invalid status' });
    const existing = await prisma.providerMeeting.findFirst({ where: { id, requestedById: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Meeting not found' });
    const meeting = await prisma.providerMeeting.update({ where: { id }, data: { status } });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const PLACEMENT_REQUEST_TUTOR_VISIBLE = ['AWAITING_TUTOR', 'APPROVED', 'REJECTED', 'ACTIVE', 'TERMINATED'];
const PLACEMENT_REQUEST_ORDER = ['AWAITING_TUTOR', 'APPROVED', 'ACTIVE', 'REJECTED', 'TERMINATED'];

exports.getPlacementRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = { AND: [] };
    where.AND.push(status && PLACEMENT_REQUEST_TUTOR_VISIBLE.includes(status) ? { status } : { status: { in: PLACEMENT_REQUEST_TUTOR_VISIBLE } });
    if (search) {
      where.AND.push({
        OR: [
          { student: { fullName: { contains: search, mode: 'insensitive' } } },
          { company: { name: { contains: search, mode: 'insensitive' } } },
          { company: { city: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const placements = await prisma.placement.findMany({
      where,
      include: {
        student: { select: { fullName: true, email: true, avatarInitials: true } },
        company: true,
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    placements.sort((a, b) => PLACEMENT_REQUEST_ORDER.indexOf(a.status) - PLACEMENT_REQUEST_ORDER.indexOf(b.status));

    const counts = await prisma.placement.groupBy({ by: ['status'], where: { status: { in: PLACEMENT_REQUEST_TUTOR_VISIBLE } }, _count: { _all: true } });
    const countMap = {};
    counts.forEach((c) => { countMap[c.status] = c._count._all; });

    res.json({ requests: placements, counts: countMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.respondPlacementRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { decision, comments } = req.body; // "approved" | "rejected"
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

    const placement = await prisma.placement.findFirst({ where: { id }, include: { student: true, company: true } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const status = decision === 'approved' ? 'APPROVED' : 'REJECTED';
    const updated = await prisma.placement.update({
      where: { id },
      data: { status, tutorComments: comments || null, tutorId: req.user.id },
    });

    const msg = decision === 'approved'
      ? 'Your placement request has been approved! Log in to view your placement details.'
      : `Your placement request was not approved.${comments ? ` Tutor feedback: ${comments}` : ' Please contact your tutor for more information.'}`;

    await prisma.message.create({ data: { senderId: req.user.id, receiverId: placement.studentId, isRead: false, body: msg } });

    const { mailPlacementApproved, mailPlacementRejected } = require('../utils/mailer');
    if (decision === 'approved') {
      await mailPlacementApproved(placement.student.email, placement.student.fullName, placement.company.name);
    } else {
      await mailPlacementRejected(placement.student.email, placement.student.fullName, placement.company.name, comments);
    }

    await logAction(req.user.id, `placement_${decision}`, 'placements', id, comments);

    res.json({
      placement: updated,
      message: decision === 'approved'
        ? '✅ Placement approved! Student has been notified by email.'
        : '❌ Placement rejected. Student has been notified by email.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getChangeRequests = async (req, res) => {
  try {
    const requests = await prisma.placementChangeRequest.findMany({
      include: { placement: { include: { student: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const order = ['PENDING_TUTOR', 'PENDING_PROVIDER', 'APPROVED', 'REJECTED'];
    requests.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.respondChangeRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { decision, comment } = req.body; // "approve" | "reject"
    const request = await prisma.placementChangeRequest.findFirst({
      where: { id, status: 'PENDING_TUTOR' },
      include: { requestedBy: true },
    });
    if (!request) return res.status(404).json({ error: 'Change request not found' });

    const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await prisma.placementChangeRequest.update({
      where: { id },
      data: { status, reviewedById: req.user.id, tutorComment: comment || null },
    });

    const changeTypeLabel = request.requestType.replace(/_/g, ' ');
    const msg = decision === 'approve'
      ? `Your placement change request (${changeTypeLabel}) has been approved! Please contact your tutor to discuss next steps.${comment ? ` Tutor note: ${comment}` : ''}`
      : `Your placement change request (${changeTypeLabel}) was not approved.${comment ? ` Tutor feedback: ${comment}` : ' Please contact your tutor for more information.'}`;

    await prisma.message.create({ data: { senderId: req.user.id, receiverId: request.requestedById, isRead: false, body: msg } });

    res.json({
      request: updated,
      message: decision === 'approve' ? '✅ Change request approved. Student has been notified.' : '❌ Change request rejected. Student has been notified.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReflections = async (req, res) => {
  try {
    const reflections = await prisma.reflection.findMany({
      include: { student: { select: { fullName: true } }, placement: { select: { roleTitle: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reflections });
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

const REPORT_CATEGORIES = ['interim_report', 'final_report'];

exports.getReports = async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const where = { AND: [{ category: { in: REPORT_CATEGORIES } }] };
    where.AND.push(type ? { category: type } : {});
    where.AND.push(status ? { status } : { status: { not: 'rejected' } });
    if (search) {
      where.AND.push({
        OR: [
          { uploadedBy: { fullName: { contains: search, mode: 'insensitive' } } },
          { placement: { company: { name: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }

    const reports = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: { select: { fullName: true, email: true, avatarInitials: true } },
        placement: { select: { roleTitle: true, startDate: true, endDate: true, company: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const order = ['pending', 'approved', 'revision_needed'];
    reports.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

    const statsRaw = await prisma.document.groupBy({
      by: ['category', 'status'],
      where: { category: { in: REPORT_CATEGORIES } },
      _count: { _all: true },
    });
    const stats = { interimPending: 0, interimApproved: 0, finalPending: 0, finalApproved: 0, revisionNeeded: 0 };
    statsRaw.forEach((s) => {
      if (s.category === 'interim_report' && s.status === 'pending_review') stats.interimPending = s._count._all;
      else if (s.category === 'interim_report' && s.status === 'approved') stats.interimApproved = s._count._all;
      else if (s.category === 'final_report' && s.status === 'pending_review') stats.finalPending = s._count._all;
      else if (s.category === 'final_report' && s.status === 'approved') stats.finalApproved = s._count._all;
      else if (s.status === 'revision_needed') stats.revisionNeeded += s._count._all;
    });

    const activePlacements = await prisma.placement.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        company: { select: { name: true } },
        documents: { where: { category: { in: REPORT_CATEGORIES } }, select: { category: true } },
      },
      orderBy: { endDate: 'asc' },
    });
    const missing = activePlacements
      .map((p) => ({
        studentId: p.student.id, studentName: p.student.fullName, studentEmail: p.student.email,
        companyName: p.company.name, startDate: p.startDate, endDate: p.endDate,
        interimSubmitted: p.documents.some((d) => d.category === 'interim_report'),
        finalSubmitted: p.documents.some((d) => d.category === 'final_report'),
      }))
      .filter((p) => !p.interimSubmitted || !p.finalSubmitted);

    res.json({ reports, stats, missing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.reviewReport = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, feedback } = req.body; // 'approved' | 'revision_needed'
    if (!['approved', 'revision_needed'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    const existing = await prisma.document.findFirst({ where: { id, category: { in: REPORT_CATEGORIES } } });
    if (!existing) return res.status(404).json({ error: 'Report not found' });

    const report = await prisma.document.update({
      where: { id },
      data: { status: action, reviewerFeedback: feedback || null, reviewedAt: new Date(), reviewedById: req.user.id },
    });

    const msg = action === 'approved'
      ? `Your report has been approved by your placement tutor.${feedback ? ` Feedback: ${feedback}` : ''}`
      : `Your report requires revisions. Tutor feedback: ${feedback}`;
    await prisma.notification.create({
      data: { userId: existing.uploadedById, type: 'report_reviewed', title: action === 'approved' ? 'Report approved' : 'Report needs revision', body: msg, link: '/student/reports' },
    });

    res.json({
      report,
      message: action === 'approved' ? '✅ Report approved successfully!' : '📝 Revision request sent to student.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendReportReminder = async (req, res) => {
  try {
    const { studentId, studentEmail, studentName, missingTypes } = req.body;
    if (!studentEmail || !missingTypes?.length) {
      return res.status(400).json({ error: 'Could not send reminder: student email or report type is missing.' });
    }
    const { mailReportReminder } = require('../utils/mailer');
    const sent = await mailReportReminder(studentEmail, studentName, missingTypes, req.user.fullName);
    if (sent) {
      res.json({ message: `Reminder sent to ${studentName} (${studentEmail}) successfully.` });
    } else {
      res.status(500).json({ error: 'Email failed to send.' });
    }
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
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      include: { student: { select: { fullName: true, avatarInitials: true } }, company: true },
      orderBy: [{ company: { city: 'asc' } }, { company: { name: 'asc' } }],
    });
    res.json(placements.map((p) => ({
      id: p.id,
      roleTitle: p.roleTitle,
      studentName: p.student.fullName,
      studentInitials: p.student.avatarInitials,
      companyName: p.company.name,
      companyCity: p.company.city,
      companyAddress: p.company.address,
      latitude: p.company.latitude,
      longitude: p.company.longitude,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const CYCLE_DEFAULTS = {
  cycle_label: '2025/26',
  cycle_start_date: '',
  cycle_end_date: '',
  interim_report_months: '4',
  final_report_months_before: '1',
  deadline_reminder_days: '14',
  max_placement_months: '12',
  min_placement_months: '6',
  allowed_sectors: '',
  placement_notes: '',
};

exports.getSettings = async (req, res) => {
  try {
    const { getSetting } = require('../utils/settings');
    const cfg = {};
    for (const [key, fallback] of Object.entries(CYCLE_DEFAULTS)) {
      cfg[key] = await getSetting(key, fallback);
    }
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { setSetting } = require('../utils/settings');
    for (const key of Object.keys(CYCLE_DEFAULTS)) {
      if (req.body[key] !== undefined) await setSetting(key, String(req.body[key]).trim());
    }
    res.json({ message: 'Settings saved successfully.' });
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

const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { mailAccountApproved } = require('../utils/mailer');
const { getSetting, setSetting } = require('../utils/settings');
const { logAction } = require('../utils/auditLog');

const safe = (user) => {
  const { password, ...rest } = user;
  return rest;
};

function initialsFor(fullName) {
  const parts = String(fullName).trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] || '';
  return (first + last).toUpperCase();
}

// ── Dashboard ────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, activePlacements, totalCompanies, upcomingVisits, roleGroups, recentActivity, dbSizeRow] = await Promise.all([
      prisma.user.count(),
      prisma.placement.count({ where: { status: { in: ['APPROVED', 'ACTIVE'] } } }),
      prisma.company.count(),
      prisma.visit.count({ where: { scheduledAt: { gte: today } } }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.auditLog.findMany({ include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.$queryRawUnsafe(`SELECT pg_database_size(current_database()) AS size`),
    ]);

    const usersByRole = Object.fromEntries(roleGroups.map((g) => [g.role.toLowerCase(), g._count._all]));
    const dbSizeMb = Math.round((Number(dbSizeRow[0]?.size || 0) / 1024 / 1024) * 100) / 100;

    res.json({
      totalUsers, activePlacements, totalCompanies, upcomingVisits, usersByRole,
      dbSizeMb,
      recentActivity: recentActivity.map((log) => ({
        id: log.id, action: log.action, tableAffected: log.tableAffected, createdAt: log.createdAt,
        fullName: log.user?.fullName || 'System',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Users ────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const where = {
      role: role ? role.toUpperCase() : undefined,
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
      OR: search
        ? [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { studentId: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const users = await prisma.user.findMany({
      where,
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(safe));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) }, include: { company: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, studentId, companyId } = req.body;
    if (!fullName || !email || !password || !role) return res.status(400).json({ error: 'Full name, email, password and role are required' });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName, email, password: hash, role: role.toUpperCase(),
        studentId: studentId || null,
        companyId: companyId ? Number(companyId) : null,
        avatarInitials: initialsFor(fullName),
        approvalStatus: 'APPROVED',
      },
    });
    await logAction(req.user.id, 'admin_create_user', 'users', user.id);
    res.status(201).json(safe(user));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'A user with that email already exists' });
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { fullName, email, role, studentId, companyId, isActive, newPassword } = req.body;
    const data = {
      fullName, email,
      role: role ? role.toUpperCase() : undefined,
      studentId: studentId !== undefined ? (studentId || null) : undefined,
      companyId: companyId !== undefined ? (companyId ? Number(companyId) : null) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      avatarInitials: fullName ? initialsFor(fullName) : undefined,
    };
    if (newPassword) data.password = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data });
    await logAction(req.user.id, 'admin_update_user', 'users', user.id);
    res.json(safe(user));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'A user with that email already exists' });
    res.status(500).json({ error: err.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
    await logAction(req.user.id, 'admin_deactivate_user', 'users', user.id);
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isActive: true } });
    await logAction(req.user.id, 'admin_activate_user', 'users', user.id);
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    await prisma.user.delete({ where: { id: targetId } });
    await logAction(req.user.id, 'admin_delete_user', 'users', targetId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete user - they have associated records. Use Hard Delete instead.' });
  }
};

exports.hardDeleteUser = async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  try {
    await prisma.$transaction([
      prisma.placementChangeRequest.deleteMany({ where: { requestedById: targetId } }),
      prisma.providerToken.deleteMany({ where: { placement: { studentId: targetId } } }),
      prisma.document.deleteMany({ where: { placement: { studentId: targetId } } }),
      prisma.document.deleteMany({ where: { uploadedById: targetId } }),
      prisma.visit.deleteMany({ where: { placement: { studentId: targetId } } }),
      prisma.reflection.deleteMany({ where: { studentId: targetId } }),
      prisma.message.deleteMany({ where: { OR: [{ senderId: targetId }, { receiverId: targetId }] } }),
      prisma.notification.deleteMany({ where: { userId: targetId } }),
      prisma.auditLog.deleteMany({ where: { userId: targetId } }),
      prisma.announcementRead.deleteMany({ where: { userId: targetId } }),
      prisma.placement.deleteMany({ where: { studentId: targetId } }),
      prisma.user.delete({ where: { id: targetId } }),
    ]);
    res.json({ success: true, message: 'User and all associated data permanently deleted.' });
  } catch (err) {
    res.status(400).json({ error: 'Hard delete failed: ' + err.message });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Registration approvals (students only) ────────────────────────────────
exports.getRegistrations = async (req, res) => {
  try {
    const { year, programme, status } = req.query;
    const users = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        approvalStatus: status ? status.toUpperCase() : { in: ['PENDING', 'APPROVED'] },
        academicYear: year || undefined,
        programmeType: programme || undefined,
      },
      select: { id: true, fullName: true, email: true, academicYear: true, programmeType: true, createdAt: true, approvalStatus: true },
      orderBy: [{ createdAt: 'asc' }],
    });
    users.sort((a, b) => (a.approvalStatus === b.approvalStatus ? 0 : a.approvalStatus === 'PENDING' ? -1 : 1));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRegistrationFilters = async (req, res) => {
  try {
    const rows = await prisma.user.findMany({
      where: { role: 'STUDENT', approvalStatus: { in: ['PENDING', 'APPROVED'] } },
      select: { academicYear: true, programmeType: true },
    });
    const years = [...new Set(rows.map((r) => r.academicYear).filter(Boolean))].sort();
    const programmes = [...new Set(rows.map((r) => r.programmeType).filter(Boolean))].sort();
    res.json({ years, programmes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveRegistration = async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { approvalStatus: 'APPROVED', rejectionReason: null, approvedById: req.user.id, approvedAt: new Date() },
    });
    await mailAccountApproved(user.email, user.fullName);
    await logAction(req.user.id, 'approve_registration', 'users', user.id);
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectRegistration = async (req, res) => {
  try {
    await prisma.user.deleteMany({ where: { id: Number(req.params.id), approvalStatus: 'PENDING' } });
    await logAction(req.user.id, 'reject_registration', 'users', Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkApproveRegistrations = async (req, res) => {
  try {
    const ids = (req.body.userIds || []).map(Number).filter(Boolean);
    let count = 0;
    for (const uid of ids) {
      const result = await prisma.user.updateMany({
        where: { id: uid, approvalStatus: 'PENDING' },
        data: { approvalStatus: 'APPROVED', approvedById: req.user.id, approvedAt: new Date() },
      });
      if (result.count) {
        const user = await prisma.user.findUnique({ where: { id: uid } });
        await mailAccountApproved(user.email, user.fullName);
        count++;
      }
    }
    await logAction(req.user.id, 'bulk_approve_registrations', 'users', null, ids);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkRejectRegistrations = async (req, res) => {
  try {
    const ids = (req.body.userIds || []).map(Number).filter(Boolean);
    const result = await prisma.user.deleteMany({ where: { id: { in: ids }, approvalStatus: 'PENDING' } });
    await logAction(req.user.id, 'bulk_reject_registrations', 'users', null, ids);
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Placements ─────────────────────────────────────────────────────────────
exports.getPlacements = async (req, res) => {
  try {
    const { status, company, year, search } = req.query;
    const placements = await prisma.placement.findMany({
      where: {
        status: status ? status.toUpperCase() : undefined,
        companyId: company ? Number(company) : undefined,
        student: year ? { academicYear: year } : undefined,
        OR: search
          ? [
              { student: { fullName: { contains: search, mode: 'insensitive' } } },
              { company: { name: { contains: search, mode: 'insensitive' } } },
              { roleTitle: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { student: { select: { fullName: true, email: true, avatarInitials: true, academicYear: true, programmeType: true } }, tutor: { select: { fullName: true } }, company: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacementStats = async (req, res) => {
  try {
    const groups = await prisma.placement.groupBy({ by: ['status'], _count: { _all: true } });
    const stats = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacement = async (req, res) => {
  try {
    const placement = await prisma.placement.findUnique({
      where: { id: Number(req.params.id) },
      include: { student: true, tutor: { select: { fullName: true } }, company: true, documents: { orderBy: { createdAt: 'desc' } } },
    });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlacement = async (req, res) => {
  try {
    const { roleTitle, jobDescription, startDate, endDate, salary, workingPattern, supervisorName, supervisorEmail, supervisorPhone, status, tutorId } = req.body;
    const placement = await prisma.placement.update({
      where: { id: Number(req.params.id) },
      data: {
        roleTitle, jobDescription,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        salary, workingPattern, supervisorName, supervisorEmail, supervisorPhone,
        status: status ? status.toUpperCase() : undefined,
        tutorId: tutorId !== undefined ? (tutorId ? Number(tutorId) : null) : undefined,
      },
    });
    await logAction(req.user.id, 'admin_update_placement', 'placements', placement.id);
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportPlacementsCsv = async (req, res) => {
  try {
    const { status, company, year, search } = req.query;
    const placements = await prisma.placement.findMany({
      where: {
        status: status ? status.toUpperCase() : undefined,
        companyId: company ? Number(company) : undefined,
        student: year ? { academicYear: year } : undefined,
        OR: search
          ? [
              { student: { fullName: { contains: search, mode: 'insensitive' } } },
              { company: { name: { contains: search, mode: 'insensitive' } } },
              { roleTitle: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { student: { select: { fullName: true, email: true, academicYear: true, programmeType: true } }, tutor: { select: { fullName: true } }, company: true },
      orderBy: { createdAt: 'desc' },
    });

    const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Student Name', 'Student Email', 'Academic Year', 'Programme', 'Company', 'City', 'Sector', 'Role / Job Title', 'Start Date', 'End Date', 'Salary', 'Working Pattern', 'Status', 'Tutor', 'Supervisor Name', 'Supervisor Email', 'Supervisor Phone', 'Submitted At'];
    const rows = placements.map((p) => [
      p.student.fullName, p.student.email, p.student.academicYear, p.student.programmeType,
      p.company.name, p.company.city, p.company.sector,
      p.roleTitle, p.startDate?.toISOString().slice(0, 10), p.endDate?.toISOString().slice(0, 10),
      p.salary, p.workingPattern, titleCase(p.status.toLowerCase()), p.tutor?.fullName || 'Unassigned',
      p.supervisorName, p.supervisorEmail, p.supervisorPhone, p.createdAt.toISOString(),
    ].map(esc).join(','));

    res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
    res.setHeader('Content-Disposition', `attachment; filename="placements_export_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + [header.map(esc).join(','), ...rows].join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Settings ─────────────────────────────────────────────────────────────
const SETTINGS_DEFAULTS = {
  smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_pass: '', from_email: '', from_name: 'InPlace',
  recaptcha_site_key: '', recaptcha_secret_key: '',
  google_calendar_key: '', google_calendar_client_id: '', google_calendar_client_secret: '',
  leaflet_tile_url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};

exports.getSettings = async (req, res) => {
  try {
    const settings = {};
    for (const [key, fallback] of Object.entries(SETTINGS_DEFAULTS)) settings[key] = await getSetting(key, fallback);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    for (const key of Object.keys(SETTINGS_DEFAULTS)) {
      if (req.body[key] !== undefined) await setSetting(key, String(req.body[key]).trim());
    }
    await logAction(req.user.id, 'update_system_settings', 'system_settings', null, Object.keys(req.body));
    res.json({ message: 'Settings saved successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Audit logs ─────────────────────────────────────────────────────────────
exports.getLogs = async (req, res) => {
  try {
    const { user, action, date } = req.query;
    const dateFilter = date ? { gte: new Date(`${date}T00:00:00`), lt: new Date(`${date}T23:59:59.999`) } : undefined;
    const logs = await prisma.auditLog.findMany({
      where: {
        user: user ? { fullName: { contains: user, mode: 'insensitive' } } : undefined,
        action: action ? { contains: action, mode: 'insensitive' } : undefined,
        createdAt: dateFilter,
      },
      include: { user: { select: { fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Backup ───────────────────────────────────────────────────────────────
exports.backupDatabase = async (req, res) => {
  try {
    const models = [
      'company', 'user', 'placement', 'placementOpportunity', 'placementChangeRequest', 'document', 'reflection',
      'visit', 'providerToken', 'providerMeeting', 'providerEvaluation', 'providerIssue', 'placementNotification',
      'announcement', 'announcementRead', 'message', 'notification', 'otpCode', 'passwordReset', 'auditLog', 'systemSetting',
    ];
    const backup = { generatedAt: new Date().toISOString(), tables: {} };
    for (const model of models) {
      backup.tables[model] = await prisma[model].findMany();
    }
    await logAction(req.user.id, 'backup_database', null, null);
    const filename = `inplace_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

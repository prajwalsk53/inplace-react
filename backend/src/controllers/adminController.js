const prisma = require('../config/db');
const { mailAccountApproved, mailAccountRejected } = require('../utils/mailer');
const { getSetting, setSetting } = require('../utils/settings');
const { logAction } = require('../utils/auditLog');

const safe = (user) => {
  const { password, ...rest } = user;
  return rest;
};

exports.getUsers = async (req, res) => {
  try {
    const { role, approvalStatus } = req.query;
    const users = await prisma.user.findMany({
      where: {
        role: role ? role.toUpperCase() : undefined,
        approvalStatus: approvalStatus ? approvalStatus.toUpperCase() : undefined,
      },
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

exports.updateUser = async (req, res) => {
  try {
    const { fullName, role, isActive, academicYear, programmeType } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { fullName, role: role ? role.toUpperCase() : undefined, isActive, academicYear, programmeType },
    });
    await logAction(req.user.id, 'update_user', 'users', user.id);
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
    await logAction(req.user.id, 'deactivate_user', 'users', user.id);
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRegistrations = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { approvalStatus: 'PENDING' }, include: { company: true }, orderBy: { createdAt: 'asc' } });
    res.json(users.map(safe));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveRegistration = async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { approvalStatus: 'APPROVED', rejectionReason: null } });
    await mailAccountApproved(user.email, user.fullName);
    await logAction(req.user.id, 'approve_registration', 'users', user.id);
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectRegistration = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { approvalStatus: 'REJECTED', rejectionReason: reason || null } });
    await mailAccountRejected(user.email, user.fullName, reason);
    await logAction(req.user.id, 'reject_registration', 'users', user.id, reason);
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacements = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      include: { student: { select: { fullName: true, email: true } }, tutor: { select: { fullName: true } }, company: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlacement = async (req, res) => {
  try {
    const { tutorId, status, roleTitle } = req.body;
    const placement = await prisma.placement.update({
      where: { id: Number(req.params.id) },
      data: { tutorId: tutorId !== undefined ? Number(tutorId) : undefined, status: status || undefined, roleTitle: roleTitle || undefined },
    });
    await logAction(req.user.id, 'admin_update_placement', 'placements', placement.id);
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportPlacementsCsv = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      include: { student: { select: { fullName: true, email: true } }, tutor: { select: { fullName: true } }, company: true },
      orderBy: { createdAt: 'desc' },
    });
    const header = 'ID,Student,Email,Company,Tutor,Role Title,Status,Start Date,End Date\n';
    const rows = placements.map((p) => [
      p.id, p.student.fullName, p.student.email, p.company.name, p.tutor?.fullName || '', p.roleTitle, p.status,
      p.startDate ? p.startDate.toISOString().slice(0, 10) : '', p.endDate ? p.endDate.toISOString().slice(0, 10) : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="placements.csv"');
    res.send(header + rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const keys = ['RECAPTCHA_SITE_KEY', 'RECAPTCHA_SECRET_KEY'];
    const settings = {};
    for (const key of keys) settings[key] = await getSetting(key, '');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await setSetting(key, String(value));
    }
    await logAction(req.user.id, 'update_system_settings', 'system_settings', null, Object.keys(req.body));
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const take = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

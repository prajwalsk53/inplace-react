const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');
const { mailWelcome, mailPasswordReset } = require('../utils/mailer');
const { issueOtp, verifyOtp } = require('../utils/otp');
const { logAction } = require('../utils/auditLog');

const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const initials = (fullName) =>
  fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const safe = (user) => {
  const { password, ...rest } = user;
  return rest;
};

exports.register = async (req, res) => {
  try {
    const {
      fullName, email, password, role,
      academicYear, programmeType,
      companyName, companyAddress, companySector, contactPhone,
    } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'fullName, email, password and role are required' });
    }
    const normalizedRole = role.toUpperCase();
    if (!['STUDENT', 'TUTOR', 'PROVIDER'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Self-registration is only available for student, tutor and provider accounts' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email is already registered' });

    let companyId = null;
    if (normalizedRole === 'PROVIDER') {
      if (!companyName) return res.status(400).json({ error: 'companyName is required for provider registration' });
      const company = await prisma.company.create({
        data: { name: companyName, address: companyAddress, sector: companySector, contactName: fullName, contactEmail: email, contactPhone },
      });
      companyId = company.id;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        fullName, email, password: hashed, role: normalizedRole,
        avatarInitials: initials(fullName),
        academicYear: normalizedRole === 'STUDENT' ? academicYear : null,
        programmeType: normalizedRole === 'STUDENT' ? programmeType : null,
        companyId,
        approvalStatus: 'PENDING',
      },
    });

    await mailWelcome(user.email, user.fullName, user.role);
    await logAction(user.id, 'register', 'users', user.id);

    res.status(201).json({ message: 'Registration received. Your account is pending admin approval.', user: safe(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.isActive) return res.status(403).json({ error: 'This account has been deactivated' });
    if (user.approvalStatus === 'PENDING') return res.status(403).json({ error: 'Your account is still awaiting admin approval' });
    if (user.approvalStatus === 'REJECTED') return res.status(403).json({ error: `Your registration was rejected: ${user.rejectionReason || 'no reason given'}` });

    await logAction(user.id, 'login', 'users', user.id);
    res.json({ token: generateToken(user), user: safe(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json(safe(req.user));
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, academicYear, programmeType } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName: fullName || undefined,
        avatarInitials: fullName ? initials(fullName) : undefined,
        academicYear: academicYear !== undefined ? academicYear : undefined,
        programmeType: programmeType !== undefined ? programmeType : undefined,
      },
    });
    res.json(safe(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const valid = await bcrypt.compare(currentPassword, req.user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'No account found with that email' });
    await issueOtp(user, 'email_verification');
    res.json({ message: 'Verification code sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyOtpCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'No account found with that email' });
    const valid = await verifyOtp(user.id, code, 'email_verification');
    if (!valid) return res.status(400).json({ error: 'Invalid or expired code' });
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond success to avoid leaking which emails are registered
    if (!user) return res.json({ message: 'If that email is registered, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5175'}/reset-password/${token}`;
    await mailPasswordReset(user.email, user.fullName, resetUrl);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const record = await prisma.passwordReset.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

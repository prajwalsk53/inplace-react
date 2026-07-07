const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');
const { mailWelcome, mailPasswordReset, mailRegistrationOtp, mailNewRegistration } = require('../utils/mailer');
const { issueOtp, verifyOtp } = require('../utils/otp');
const { logAction } = require('../utils/auditLog');

const LEICESTER_STUDENT_EMAIL = /@student\.le\.ac\.uk$/i;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;

function isPasswordStrong(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

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
      companyName, companyAddress, companySector, contactPhone,
    } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'fullName, email, password and role are required' });
    }
    const normalizedRole = role.toUpperCase();
    if (!['STUDENT', 'PROVIDER'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Self-registration is only available for student and provider accounts' });
    }

    if (normalizedRole === 'STUDENT') {
      return registerStudent(req, res);
    }

    // ── Provider self-registration (provider-register.php) — unchanged ──
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email is already registered' });

    if (!companyName) return res.status(400).json({ error: 'companyName is required for provider registration' });
    const company = await prisma.company.create({
      data: { name: companyName, address: companyAddress, sector: companySector, contactName: fullName, contactEmail: email, contactPhone },
    });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        fullName, email, password: hashed, role: normalizedRole,
        avatarInitials: initials(fullName),
        companyId: company.id,
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

// ── Student registration (register.php) — Leicester email + OTP-gated ────
exports.sendRegistrationOtp = async (req, res) => {
  try {
    const email = (req.body.email || '').trim();
    const emailLower = email.toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!LEICESTER_STUDENT_EMAIL.test(emailLower)) {
      return res.status(400).json({ error: 'Must use Leicester student email (@student.le.ac.uk)' });
    }

    const existing = await prisma.user.findFirst({ where: { email: { equals: emailLower, mode: 'insensitive' } } });
    if (existing) return res.status(400).json({ error: 'This email is already registered' });

    const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    await prisma.otpCode.create({
      data: { email: emailLower, code, purpose: 'registration', expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000) },
    });

    await mailRegistrationOtp(emailLower, code);
    res.json({ message: 'OTP sent successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function registerStudent(req, res) {
  const { fullName, email, password, confirmPassword, academicYear, programmeType, otp } = req.body;
  const emailLower = (email || '').trim().toLowerCase();

  if (!LEICESTER_STUDENT_EMAIL.test(emailLower)) {
    return res.status(400).json({ error: 'You must use your Leicester student email (@student.le.ac.uk).' });
  }
  if (!fullName || !academicYear || !programmeType) {
    return res.status(400).json({ error: 'Full name, academic year and programme type are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  if (!isPasswordStrong(password || '')) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.' });
  }

  const otpRow = await prisma.otpCode.findFirst({
    where: { email: emailLower, purpose: 'registration', usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otpRow) {
    return res.status(400).json({ error: 'OTP session not found or expired. Please request a new code.' });
  }
  if (otpRow.code !== String(otp || '').padStart(6, '0')) {
    const attempts = otpRow.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.otpCode.update({ where: { id: otpRow.id }, data: { attempts, usedAt: new Date() } });
      return res.status(400).json({ error: 'Too many incorrect attempts. Please click Send OTP to request a new code.' });
    }
    await prisma.otpCode.update({ where: { id: otpRow.id }, data: { attempts } });
    const remaining = OTP_MAX_ATTEMPTS - attempts;
    return res.status(400).json({ error: `Incorrect OTP. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
  }
  await prisma.otpCode.update({ where: { id: otpRow.id }, data: { usedAt: new Date() } });

  const existing = await prisma.user.findFirst({ where: { email: { equals: emailLower, mode: 'insensitive' } } });
  if (existing) return res.status(400).json({ error: 'An account with this email already exists.' });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      fullName, email: emailLower, password: hashed, role: 'STUDENT',
      academicYear, programmeType,
      avatarInitials: initials(fullName),
      approvalStatus: 'PENDING',
    },
  });
  await logAction(user.id, 'register', 'users', user.id);

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { email: true, fullName: true } });
  if (admins.length) await mailNewRegistration(admins, fullName, emailLower, academicYear, programmeType);

  res.status(201).json({ message: 'Registration successful! Your account is pending admin approval. You will receive an email once approved.' });
}

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

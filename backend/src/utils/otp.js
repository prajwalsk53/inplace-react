const crypto = require('crypto');
const prisma = require('../config/db');
const { mailOtp } = require('./mailer');

const OTP_TTL_MINUTES = 10;

async function issueOtp(user, purpose = 'email_verification') {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await prisma.otpCode.create({ data: { userId: user.id, code, purpose, expiresAt } });
  await mailOtp(user.email, user.fullName, code);
  return code;
}

async function verifyOtp(userId, code, purpose = 'email_verification') {
  const otp = await prisma.otpCode.findFirst({
    where: { userId, code, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return false;
  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  return true;
}

module.exports = { issueOtp, verifyOtp };

const crypto = require('crypto');
const prisma = require('../config/db');
const { mailProviderConfirm } = require('./mailer');

const TOKEN_TTL_DAYS = 14;

async function issueProviderToken(placement, purpose = 'confirm_placement') {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.providerToken.create({ data: { token, placementId: placement.id, purpose, expiresAt } });

  const confirmUrl = `${process.env.CLIENT_URL || 'http://localhost:5175'}/provider-confirm/${token}`;
  if (placement.supervisorEmail) {
    await mailProviderConfirm(
      placement.supervisorEmail,
      placement.supervisorName || 'Placement Contact',
      placement.roleTitle,
      placement.student?.fullName || 'A student',
      confirmUrl,
    );
  }
  return token;
}

async function consumeProviderToken(token) {
  const record = await prisma.providerToken.findUnique({
    where: { token },
    include: { placement: { include: { student: true, company: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}

async function markProviderTokenUsed(id) {
  await prisma.providerToken.update({ where: { id }, data: { usedAt: new Date() } });
}

module.exports = { issueProviderToken, consumeProviderToken, markProviderTokenUsed };

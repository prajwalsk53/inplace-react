const prisma = require('../config/db');

async function logAction(userId, action, tableAffected = null, recordId = null, details = null) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, tableAffected, recordId, details: details ? JSON.stringify(details) : null },
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAction };

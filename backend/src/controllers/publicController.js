const prisma = require('../config/db');
const { consumeProviderToken, markProviderTokenUsed } = require('../utils/providerToken');
const { logAction } = require('../utils/auditLog');

exports.getProviderConfirmation = async (req, res) => {
  const record = await consumeProviderToken(req.params.token);
  if (!record) return res.status(404).json({ error: 'This confirmation link is invalid, expired, or already used' });

  res.json({
    placement: {
      id: record.placement.id,
      roleTitle: record.placement.roleTitle,
      jobDescription: record.placement.jobDescription,
      startDate: record.placement.startDate,
      endDate: record.placement.endDate,
      status: record.placement.status,
      student: { fullName: record.placement.student.fullName, email: record.placement.student.email },
      company: { name: record.placement.company.name },
    },
  });
};

exports.respondProviderConfirmation = async (req, res) => {
  try {
    const { decision } = req.body; // "approve" | "reject"
    const record = await consumeProviderToken(req.params.token);
    if (!record) return res.status(404).json({ error: 'This confirmation link is invalid, expired, or already used' });

    const newStatus = decision === 'approve' ? 'AWAITING_TUTOR' : 'REJECTED';
    await prisma.placement.update({ where: { id: record.placement.id }, data: { status: newStatus } });
    await markProviderTokenUsed(record.id);
    await logAction(null, `provider_${decision}_placement`, 'placements', record.placement.id);

    res.json({ message: decision === 'approve' ? 'Placement confirmed. Thank you.' : 'Placement rejected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

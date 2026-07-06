const prisma = require('../config/db');

const AT_RISK_VISIT_DAYS = 60;

exports.getDashboard = async (req, res) => {
  try {
    const [totalPlacements, activePlacements, totalStudents, totalProviders, pendingApprovals] = await Promise.all([
      prisma.placement.count(),
      prisma.placement.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'STUDENT', approvalStatus: 'APPROVED' } }),
      prisma.company.count(),
      prisma.user.count({ where: { approvalStatus: 'PENDING' } }),
    ]);

    const cutoff = new Date(Date.now() - AT_RISK_VISIT_DAYS * 24 * 60 * 60 * 1000);
    const activeList = await prisma.placement.findMany({
      where: { status: 'ACTIVE' },
      include: { visits: { where: { status: 'completed' }, orderBy: { scheduledAt: 'desc' }, take: 1 } },
    });
    const atRiskCount = activeList.filter((p) => p.visits.length === 0 || p.visits[0].scheduledAt < cutoff).length;

    res.json({ totalPlacements, activePlacements, totalStudents, totalProviders, pendingApprovals, atRiskCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacements = async (req, res) => {
  try {
    const { status, tutorId } = req.query;
    const placements = await prisma.placement.findMany({
      where: { status: status || undefined, tutorId: tutorId ? Number(tutorId) : undefined },
      include: {
        student: { select: { fullName: true, email: true } },
        tutor: { select: { fullName: true } },
        company: { select: { name: true, sector: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacement = async (req, res) => {
  try {
    const placement = await prisma.placement.findUnique({
      where: { id: Number(req.params.id) },
      include: { student: true, tutor: true, company: true, visits: true, reflections: true, documents: true, changeRequests: true },
    });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAtRiskPlacements = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - AT_RISK_VISIT_DAYS * 24 * 60 * 60 * 1000);
    const activeList = await prisma.placement.findMany({
      where: { status: 'ACTIVE' },
      include: {
        student: { select: { fullName: true, email: true } },
        tutor: { select: { fullName: true } },
        company: { select: { name: true } },
        visits: { where: { status: 'completed' }, orderBy: { scheduledAt: 'desc' }, take: 1 },
      },
    });
    const atRisk = activeList.filter((p) => p.visits.length === 0 || p.visits[0].scheduledAt < cutoff);
    res.json(atRisk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    const evaluations = await prisma.providerEvaluation.findMany({
      include: {
        company: { select: { name: true } },
        placement: { select: { roleTitle: true } },
        evaluatedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(evaluations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMapPlacements = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      where: { status: { in: ['ACTIVE', 'APPROVED'] } },
      include: { student: { select: { fullName: true } }, company: true },
    });
    res.json(placements.filter((p) => p.company.latitude && p.company.longitude));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReportsSummary = async (req, res) => {
  try {
    const [byStatus, bySector, evaluationAvg] = await Promise.all([
      prisma.placement.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.$queryRaw`SELECT c.sector as sector, COUNT(*)::int as count FROM "Placement" p JOIN "Company" c ON c.id = p."companyId" GROUP BY c.sector`,
      prisma.providerEvaluation.aggregate({ _avg: { rating: true } }),
    ]);
    res.json({
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      bySector,
      averageEvaluationRating: evaluationAvg._avg.rating || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const prisma = require('../config/db');
const { logAction } = require('../utils/auditLog');

function requireCompany(req, res) {
  if (!req.user.companyId) {
    res.status(400).json({ error: 'This account is not linked to a company' });
    return null;
  }
  return req.user.companyId;
}

exports.getDashboard = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const [totalStudents, pendingConfirmations, openIssues, upcomingVisits] = await Promise.all([
      prisma.placement.count({ where: { companyId, status: { in: ['ACTIVE', 'APPROVED'] } } }),
      prisma.placement.count({ where: { companyId, status: 'AWAITING_PROVIDER' } }),
      prisma.providerIssue.count({ where: { companyId, status: { in: ['open', 'in_progress'] } } }),
      prisma.visit.count({ where: { placement: { companyId }, status: 'scheduled', scheduledAt: { gte: new Date() } } }),
    ]);
    res.json({ totalStudents, pendingConfirmations, openIssues, upcomingVisits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacements = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const placements = await prisma.placement.findMany({
      where: { companyId },
      include: { student: { select: { id: true, fullName: true, email: true, avatarInitials: true } }, tutor: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacement = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const placement = await prisma.placement.findFirst({
      where: { id: Number(req.params.id), companyId },
      include: { student: true, tutor: { select: { fullName: true, email: true } }, visits: true, evaluations: true, issues: true },
    });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.confirmPlacement = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { decision } = req.body; // "approve" | "reject"
    const placement = await prisma.placement.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const status = decision === 'approve' ? 'AWAITING_TUTOR' : 'REJECTED';
    const updated = await prisma.placement.update({ where: { id: placement.id }, data: { status } });
    await prisma.notification.create({
      data: { userId: placement.studentId, type: 'placement', title: `Placement ${decision === 'approve' ? 'confirmed by provider' : 'rejected by provider'}`, link: '/student/my-placement' },
    });
    await logAction(req.user.id, `provider_${decision}_placement`, 'placements', placement.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.flagTermination = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { reason } = req.body;
    const placement = await prisma.placement.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const request = await prisma.placementChangeRequest.create({
      data: { placementId: placement.id, requestedById: req.user.id, requestType: 'terminate', details: reason || 'Provider requested termination' },
    });
    if (placement.tutorId) {
      await prisma.notification.create({
        data: { userId: placement.tutorId, type: 'change_request', title: 'Provider requested termination', body: reason, link: '/tutor/requests' },
      });
    }
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVisits = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const visits = await prisma.visit.findMany({
      where: { placement: { companyId } },
      include: { placement: { include: { student: { select: { fullName: true } } } }, tutor: { select: { fullName: true, email: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVisit = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const visit = await prisma.visit.findFirst({
      where: { id: Number(req.params.id), placement: { companyId } },
      include: { placement: { include: { student: true } }, tutor: { select: { fullName: true, email: true } } },
    });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const meetings = await prisma.providerMeeting.findMany({
      where: { companyId },
      include: { requestedBy: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.respondMeeting = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { scheduledAt, status, notes } = req.body;
    const meeting = await prisma.providerMeeting.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    const updated = await prisma.providerMeeting.update({
      where: { id: meeting.id },
      data: { scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined, status: status || undefined, notes },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getChangeRequests = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const requests = await prisma.placementChangeRequest.findMany({
      where: { placement: { companyId } },
      include: { placement: { include: { student: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.respondChangeRequest = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { decision, comment } = req.body; // "approve" | "reject"
    const request = await prisma.placementChangeRequest.findFirst({
      where: { id: Number(req.params.id), status: 'PENDING_PROVIDER', placement: { companyId } },
      include: { placement: { include: { student: true, tutor: true } } },
    });
    if (!request) return res.status(404).json({ error: 'Change request not found' });

    const status = decision === 'approve' ? 'PENDING_TUTOR' : 'REJECTED';
    const updated = await prisma.placementChangeRequest.update({
      where: { id: request.id },
      data: { status, providerComment: comment || null },
    });

    if (decision === 'approve' && request.placement.tutorId) {
      await prisma.notification.create({
        data: { userId: request.placement.tutorId, type: 'change_request', title: 'Change request awaiting your approval', body: `${request.placement.student.fullName}'s ${request.requestType} request has been approved by the provider and now needs your review.`, link: '/tutor/requests' },
      });
    } else if (decision === 'reject') {
      const msg = `Your placement change request was not approved by the provider.${comment ? ` Provider feedback: ${comment}` : ''}`;
      await prisma.message.create({ data: { senderId: req.user.id, receiverId: request.placement.student.id, isRead: false, body: msg } });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getIssues = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const issues = await prisma.providerIssue.findMany({
      where: { companyId },
      include: { placement: { include: { student: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createIssue = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { placementId, title, description, severity } = req.body;
    const placement = await prisma.placement.findFirst({ where: { id: Number(placementId), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const issue = await prisma.providerIssue.create({
      data: { placementId: placement.id, companyId, raisedById: req.user.id, title, description, severity: severity || 'medium' },
    });
    if (placement.tutorId) {
      await prisma.notification.create({
        data: { userId: placement.tutorId, type: 'issue', title: 'New workplace issue raised', body: title, link: '/tutor/requests' },
      });
    }
    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateIssue = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { status, resolutionNotes } = req.body;
    const issue = await prisma.providerIssue.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    const updated = await prisma.providerIssue.update({ where: { id: issue.id }, data: { status, resolutionNotes } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEvaluations = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const evaluations = await prisma.providerEvaluation.findMany({
      where: { companyId },
      include: { placement: { include: { student: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(evaluations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEvaluation = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { placementId, rating, comments } = req.body;
    const placement = await prisma.placement.findFirst({ where: { id: Number(placementId), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const evaluation = await prisma.providerEvaluation.create({
      data: { placementId: placement.id, companyId, evaluatedById: req.user.id, rating: Number(rating), comments },
    });
    res.status(201).json(evaluation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { name, address, sector, contactName, contactEmail, contactPhone, latitude, longitude } = req.body;
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name, address, sector, contactName, contactEmail, contactPhone,
        latitude: latitude !== undefined ? Number(latitude) : undefined,
        longitude: longitude !== undefined ? Number(longitude) : undefined,
      },
    });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

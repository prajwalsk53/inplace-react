const prisma = require('../config/db');
const { logAction } = require('../utils/auditLog');

function requireCompany(req, res) {
  if (!req.user.companyId) {
    res.status(400).json({ error: 'This account is not linked to a company' });
    return null;
  }
  return req.user.companyId;
}

async function notifyPlacementTutors(placement, notifData) {
  let tutorIds = [];
  if (placement.tutorId) {
    tutorIds = [placement.tutorId];
  } else {
    const tutors = await prisma.user.findMany({ where: { role: 'TUTOR', isActive: true }, select: { id: true } });
    tutorIds = tutors.map((t) => t.id);
  }
  if (tutorIds.length) {
    await prisma.notification.createMany({ data: tutorIds.map((userId) => ({ userId, ...notifData })) });
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [unreadCount, pendingRequests, activePlacements, upcomingVisitsCount, pendingList, visitsList] = await Promise.all([
      prisma.message.count({ where: { receiverId: req.user.id, isRead: false } }),
      prisma.placement.count({ where: { companyId, status: 'AWAITING_PROVIDER' } }),
      prisma.placement.count({ where: { companyId, status: { in: ['APPROVED', 'ACTIVE'] } } }),
      prisma.visit.count({ where: { placement: { companyId }, scheduledAt: { gte: today }, status: { in: ['proposed', 'confirmed'] } } }),
      prisma.placement.findMany({
        where: { companyId, status: 'AWAITING_PROVIDER' },
        include: { student: { select: { fullName: true, email: true, avatarInitials: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.visit.findMany({
        where: { placement: { companyId }, scheduledAt: { gte: today }, status: { in: ['proposed', 'confirmed'] } },
        include: { placement: { include: { student: { select: { fullName: true } } } }, tutor: { select: { fullName: true } } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
    ]);

    res.json({ pendingRequests, activePlacements, upcomingVisits: upcomingVisitsCount, unreadCount, pendingList, visitsList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const STATUS_ORDER = ['AWAITING_PROVIDER', 'AWAITING_TUTOR', 'APPROVED', 'ACTIVE'];

exports.getPlacements = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const placements = await prisma.placement.findMany({
      where: { companyId },
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarInitials: true, academicYear: true, programmeType: true } },
        tutor: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    placements.sort((a, b) => {
      const ra = STATUS_ORDER.indexOf(a.status); const rb = STATUS_ORDER.indexOf(b.status);
      const oa = ra === -1 ? 5 : ra; const ob = rb === -1 ? 5 : rb;
      if (oa !== ob) return oa - ob;
      return new Date(b.createdAt) - new Date(a.createdAt);
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
      include: {
        student: true,
        tutor: { select: { fullName: true, email: true } },
        company: true,
        documents: { orderBy: { createdAt: 'desc' } },
      },
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
    const { decision, reason } = req.body; // "approve" | "reject"
    const placement = await prisma.placement.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    if (placement.status !== 'AWAITING_PROVIDER') return res.status(400).json({ error: 'This placement is not awaiting your response' });

    let updated;
    if (decision === 'approve') {
      updated = await prisma.placement.update({
        where: { id: placement.id },
        data: { status: 'AWAITING_TUTOR', providerApprovedAt: new Date(), providerApprovedById: req.user.id },
      });
      await notifyPlacementTutors(placement, { type: 'placement', title: 'Placement awaiting your approval', body: 'A provider has approved a placement request that now needs your review.', link: '/tutor/requests' });
      await prisma.notification.create({
        data: { userId: placement.studentId, type: 'placement', title: 'Provider confirmed your placement', body: 'Your request has been passed to your tutor for final approval.', link: '/student/my-placement' },
      });
    } else {
      updated = await prisma.placement.update({
        where: { id: placement.id },
        data: { status: 'REJECTED', providerRejectionReason: reason || null, providerRejectedAt: new Date() },
      });
      const msg = `Your placement request was declined by the provider.${reason ? ` Reason: ${reason}` : ''}`;
      await prisma.notification.create({ data: { userId: placement.studentId, type: 'placement', title: 'Placement request declined', body: msg, link: '/student/my-placement' } });
      await notifyPlacementTutors(placement, { type: 'placement', title: 'Placement request declined by provider', body: msg, link: '/tutor/requests' });
    }
    await logAction(req.user.id, `provider_${decision}_placement`, 'placements', placement.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.provideFeedback = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { feedback } = req.body;
    const placement = await prisma.placement.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    const updated = await prisma.placement.update({
      where: { id: placement.id },
      data: { providerFeedback: feedback, providerFeedbackAt: new Date() },
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

    if (decision === 'approve') {
      await notifyPlacementTutors(request.placement, { type: 'change_request', title: 'Change request awaiting your approval', body: `${request.placement.student.fullName}'s ${request.requestType} request has been approved by the provider and now needs your review.`, link: '/tutor/requests' });
    } else {
      const msg = `Your placement change request was not approved by the provider.${comment ? ` Provider feedback: ${comment}` : ''}`;
      await prisma.message.create({ data: { senderId: req.user.id, receiverId: request.placement.student.id, isRead: false, body: msg } });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVisits = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const [visits, meetings] = await Promise.all([
      prisma.visit.findMany({
        where: { placement: { companyId } },
        include: { placement: { include: { student: { select: { fullName: true, avatarInitials: true } } } }, tutor: { select: { fullName: true, email: true, avatarInitials: true } } },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.providerMeeting.findMany({
        where: { companyId },
        include: { requestedBy: { select: { fullName: true, email: true, avatarInitials: true } } },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);
    const tagged = [
      ...visits.map((v) => ({ ...v, recordType: 'visit' })),
      ...meetings.map((m) => ({ ...m, recordType: 'provider_meeting' })),
    ];
    tagged.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    res.json(tagged);
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
      include: { placement: { include: { student: true, company: true } }, tutor: { select: { fullName: true, email: true, avatarInitials: true } } },
    });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.respondVisit = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { action, proposedDate, proposedTime, notes } = req.body; // confirm | decline | reschedule
    const visit = await prisma.visit.findFirst({ where: { id: Number(req.params.id), placement: { companyId } }, include: { tutor: true, placement: true } });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    let updated;
    if (action === 'confirm') {
      updated = await prisma.visit.update({ where: { id: visit.id }, data: { status: 'confirmed' } });
    } else if (action === 'decline') {
      updated = await prisma.visit.update({ where: { id: visit.id }, data: { status: 'cancelled' } });
      await prisma.notification.create({ data: { userId: visit.tutorId, type: 'visit', title: 'Visit declined', body: 'The provider declined the scheduled visit. Please arrange an alternative.', link: '/tutor/visits' } });
    } else if (action === 'reschedule') {
      if (!proposedDate || !proposedTime) return res.status(400).json({ error: 'Proposed date and time are required' });
      updated = await prisma.visit.update({
        where: { id: visit.id },
        data: { status: 'rescheduled', rescheduleProposedAt: new Date(`${proposedDate}T${proposedTime}`), rescheduleNotes: notes || null },
      });
      await prisma.notification.create({ data: { userId: visit.tutorId, type: 'visit', title: 'Visit reschedule proposed', body: `The provider proposed a new date: ${proposedDate} ${proposedTime}.${notes ? ` Notes: ${notes}` : ''}`, link: '/tutor/visits' } });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    res.json(updated);
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

exports.getEvaluationCandidates = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const placements = await prisma.placement.findMany({
      where: { companyId, status: { in: ['APPROVED', 'ACTIVE'] } },
      include: {
        student: { select: { fullName: true, email: true, avatarInitials: true } },
        evaluations: { where: { evalPeriod: { in: ['interim', 'final'] } } },
      },
      orderBy: { student: { fullName: 'asc' } },
    });
    const result = placements.map((p) => ({
      placementId: p.id,
      roleTitle: p.roleTitle,
      studentName: p.student.fullName,
      studentEmail: p.student.email,
      avatarInitials: p.student.avatarInitials,
      interimRating: p.evaluations.find((e) => e.evalPeriod === 'interim')?.rating || null,
      finalRating: p.evaluations.find((e) => e.evalPeriod === 'final')?.rating || null,
    }));
    res.json(result);
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

exports.saveEvaluation = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { placementId, evalPeriod, attendance, punctuality, professionalism, technicalSkills, communication, initiative, overallRating, strengths, areasForImprovement, additionalComments, recommendFuture } = req.body;
    const placement = await prisma.placement.findFirst({ where: { id: Number(placementId), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const period = ['interim', 'final', 'ad_hoc'].includes(evalPeriod) ? evalPeriod : 'ad_hoc';
    const clamp = (v) => Math.max(1, Math.min(5, Number(v) || 3));

    const evaluation = await prisma.providerEvaluation.upsert({
      where: { placementId_evalPeriod: { placementId: placement.id, evalPeriod: period } },
      update: {
        attendance: clamp(attendance), punctuality: clamp(punctuality), professionalism: clamp(professionalism),
        technicalSkills: clamp(technicalSkills), communication: clamp(communication), initiative: clamp(initiative),
        rating: clamp(overallRating), strengths: strengths || null, areasForImprovement: areasForImprovement || null,
        additionalComments: additionalComments || null, recommendFuture: !!recommendFuture,
      },
      create: {
        placementId: placement.id, companyId, evaluatedById: req.user.id, evalPeriod: period,
        attendance: clamp(attendance), punctuality: clamp(punctuality), professionalism: clamp(professionalism),
        technicalSkills: clamp(technicalSkills), communication: clamp(communication), initiative: clamp(initiative),
        rating: clamp(overallRating), strengths: strengths || null, areasForImprovement: areasForImprovement || null,
        additionalComments: additionalComments || null, recommendFuture: !!recommendFuture,
      },
    });

    const stars = clamp(overallRating);
    const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    await prisma.notification.create({
      data: {
        userId: placement.studentId, type: 'evaluation',
        title: `${period.charAt(0).toUpperCase() + period.slice(1)} evaluation submitted`,
        body: `Your employer submitted your ${period} evaluation. Overall rating: ${starStr} (${stars}/5).`,
        link: '/student/my-placement',
      },
    });

    res.status(201).json(evaluation);
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
    const { placementId, issueType, severity, description, desiredOutcome } = req.body;
    const placement = await prisma.placement.findFirst({ where: { id: Number(placementId), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    if (!issueType || !description) return res.status(400).json({ error: 'Issue type and description are required' });

    const issue = await prisma.providerIssue.create({
      data: { placementId: placement.id, companyId, raisedById: req.user.id, title: issueType, description, severity: severity || 'medium', desiredOutcome: desiredOutcome || null },
    });

    const sevLabel = severity === 'high' ? '🔴 High' : severity === 'low' ? '🟢 Low' : '🟡 Medium';
    const msgText = `⚠️ Issue reported by provider (${sevLabel} severity): ${issueType}\n\n${description}${desiredOutcome ? `\n\nDesired outcome: ${desiredOutcome}` : ''}`;
    let tutorIds = placement.tutorId ? [placement.tutorId] : (await prisma.user.findMany({ where: { role: 'TUTOR', isActive: true }, select: { id: true } })).map((t) => t.id);
    if (tutorIds.length) {
      await prisma.message.createMany({ data: tutorIds.map((receiverId) => ({ senderId: req.user.id, receiverId, body: msgText, isRead: false })) });
      await prisma.notification.createMany({ data: tutorIds.map((userId) => ({ userId, type: 'provider_issue', title: 'Provider reported an issue', body: `${sevLabel} severity: ${issueType}`, link: '/tutor/requests' })) });
    }

    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOpportunities = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const opportunities = await prisma.placementOpportunity.findMany({
      where: { companyId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createOpportunity = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { title, description, requirements, salaryRange, startDateEst, durationMonths, positions, skillsRequired, deadline } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const opportunity = await prisma.placementOpportunity.create({
      data: {
        companyId, postedById: req.user.id, title,
        description: description || null, requirements: requirements || null, salaryRange: salaryRange || null,
        startDateEst: startDateEst ? new Date(startDateEst) : null,
        durationMonths: durationMonths ? Number(durationMonths) : 12,
        positions: positions ? Number(positions) : 1,
        skillsRequired: skillsRequired || null,
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const students = await prisma.user.findMany({ where: { role: 'STUDENT', approvalStatus: 'APPROVED' }, select: { id: true } });
    if (students.length) {
      const notifMsg = `💡 New placement opportunity posted by ${company?.name || 'A company'}: ${title}${durationMonths ? ` (${durationMonths} months)` : ''}${skillsRequired ? ` — Skills: ${skillsRequired}` : ''}`;
      await prisma.notification.createMany({ data: students.map((s) => ({ userId: s.id, type: 'opportunity', title: 'New placement opportunity', body: notifMsg, link: '/student/announcements' })) });
    }

    res.status(201).json(opportunity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOpportunity = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { title, description, requirements, salaryRange, startDateEst, durationMonths, positions, skillsRequired, deadline } = req.body;
    const existing = await prisma.placementOpportunity.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!existing) return res.status(404).json({ error: 'Opportunity not found' });
    const updated = await prisma.placementOpportunity.update({
      where: { id: existing.id },
      data: {
        title, description: description || null, requirements: requirements || null, salaryRange: salaryRange || null,
        startDateEst: startDateEst ? new Date(startDateEst) : null,
        durationMonths: durationMonths ? Number(durationMonths) : 12,
        positions: positions ? Number(positions) : 1,
        skillsRequired: skillsRequired || null,
        deadline: deadline ? new Date(deadline) : null,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleOpportunity = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const existing = await prisma.placementOpportunity.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!existing) return res.status(404).json({ error: 'Opportunity not found' });
    const updated = await prisma.placementOpportunity.update({ where: { id: existing.id }, data: { isActive: !existing.isActive } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteOpportunity = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const existing = await prisma.placementOpportunity.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!existing) return res.status(404).json({ error: 'Opportunity not found' });
    await prisma.placementOpportunity.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacementNotifications = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const notifications = await prisma.placementNotification.findMany({
      where: { companyId },
      include: { placement: { include: { student: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const NOTIF_TYPES = ['early_termination', 'supervisor_change', 'role_change', 'location_change', 'contract_extension', 'other'];
const NOTIF_STUDENT_MESSAGES = {
  role_change: (reason) => `💼 Your employer has notified a Role Change for your placement. Reason: ${reason}`,
  location_change: (reason) => `📍 Your employer has notified a Location Change for your placement. Reason: ${reason}`,
  supervisor_change: (reason) => `👤 Your employer has notified a Supervisor Change for your placement. Reason: ${reason}`,
  contract_extension: (reason) => `📅 Good news — your employer has submitted a Contract Extension for your placement. Reason: ${reason}`,
  early_termination: (reason) => `🔴 Your placement has been terminated early by your employer. Reason: ${reason}`,
};

exports.createPlacementNotification = async (req, res) => {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;
    const { placementId, notificationType, effectiveDate, reason, details } = req.body;
    if (!NOTIF_TYPES.includes(notificationType)) return res.status(400).json({ error: 'Invalid notification type' });
    if (!reason) return res.status(400).json({ error: 'A reason is required' });

    const placement = await prisma.placement.findFirst({ where: { id: Number(placementId), companyId } });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const notification = await prisma.placementNotification.create({
      data: { placementId: placement.id, companyId, raisedById: req.user.id, notificationType, effectiveDate: effectiveDate ? new Date(effectiveDate) : null, reason, details: details || null },
    });

    if (notificationType === 'early_termination') {
      await prisma.placement.update({ where: { id: placement.id }, data: { status: 'TERMINATED', terminatedReason: reason } });
    }

    if (placement.tutorId) {
      await prisma.notification.create({ data: { userId: placement.tutorId, type: 'placement_change', title: 'Placement change notification', body: `Provider reported: ${notificationType.replace(/_/g, ' ')}. Reason: ${reason}`, link: '/tutor/requests' } });
    }
    const studentMsg = (NOTIF_STUDENT_MESSAGES[notificationType] || ((r) => `📋 Your employer has submitted a placement change notification (${notificationType.replace(/_/g, ' ')}). Reason: ${r}`))(reason);
    await prisma.notification.create({ data: { userId: placement.studentId, type: 'placement_change', title: 'Placement update from employer', body: studentMsg, link: '/student/my-placement' } });

    res.status(201).json(notification);
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
    const { name, address, city, sector, website, phone, description, contactName, contactEmail, contactPhone } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required' });
    const company = await prisma.company.update({
      where: { id: companyId },
      data: { name, address, city, sector, website, phone, description, contactName, contactEmail, contactPhone },
    });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

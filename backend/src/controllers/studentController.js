const prisma = require('../config/db');
const { fileUrl } = require('../utils/storage');
const { logAction } = require('../utils/auditLog');

const placementInclude = {
  company: true,
  tutor: { select: { id: true, fullName: true, email: true, avatarInitials: true } },
};

async function getCurrentPlacement(studentId) {
  return prisma.placement.findFirst({
    where: { studentId, status: { in: ['APPROVED', 'ACTIVE'] } },
    include: placementInclude,
    orderBy: { createdAt: 'desc' },
  });
}

const STEP_MAP = {
  SUBMITTED: 1, AWAITING_PROVIDER: 1, AWAITING_TUTOR: 2,
  APPROVED: 3, ACTIVE: 4, COMPLETED: 4, REJECTED: 4, TERMINATED: 4,
};

exports.getDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    const activePlacement = await prisma.placement.findFirst({
      where: { studentId, status: { in: ['APPROVED', 'ACTIVE'] } },
      include: placementInclude,
      orderBy: { createdAt: 'desc' },
    });
    const latestPlacement = activePlacement || (await prisma.placement.findFirst({
      where: { studentId },
      include: placementInclude,
      orderBy: { createdAt: 'desc' },
    }));

    const [reportCount, nextVisit, unreadMessages, rawAnnouncements] = await Promise.all([
      prisma.report.count({ where: { studentId } }),
      activePlacement
        ? prisma.visit.findFirst({
            where: { placementId: activePlacement.id, status: 'scheduled', scheduledAt: { gte: new Date() } },
            orderBy: { scheduledAt: 'asc' },
          })
        : null,
      prisma.message.count({ where: { receiverId: studentId, isRead: false } }),
      prisma.announcement.findMany({
        where: { OR: [{ audienceRole: null }, { audienceRole: 'STUDENT' }] },
        include: { postedBy: { select: { fullName: true } }, reads: { where: { userId: studentId } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const unreadAnnouncements = rawAnnouncements
      .filter((a) => a.reads.length === 0)
      .slice(0, 3)
      .map((a) => ({ id: a.id, title: a.title, body: a.content, authorName: a.postedBy.fullName, createdAt: a.createdAt }));

    let interimDue = null;
    let finalDue = null;
    let progressPct = 0;
    let daysToEnd = null;
    if (activePlacement && activePlacement.startDate && activePlacement.endDate) {
      const start = new Date(activePlacement.startDate);
      const end = new Date(activePlacement.endDate);
      const today = new Date();
      interimDue = new Date(start); interimDue.setMonth(interimDue.getMonth() + 4);
      finalDue = new Date(end); finalDue.setMonth(finalDue.getMonth() - 1);
      const totalDays = Math.max(1, Math.round((end - start) / 86400000));
      const elapsedDays = Math.round((today - start) / 86400000);
      progressPct = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
      daysToEnd = Math.round((end - today) / 86400000);
    }

    const latestRequest = latestPlacement
      ? { id: latestPlacement.id, status: latestPlacement.status, companyName: latestPlacement.company.name }
      : null;

    res.json({
      placement: activePlacement,
      latestRequest,
      currentStep: latestRequest ? (STEP_MAP[latestRequest.status] || 0) : 0,
      reportCount,
      nextVisit,
      unreadMessages,
      unreadAnnouncements,
      interimDue,
      finalDue,
      progressPct,
      daysToEnd,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyPlacement = async (req, res) => {
  try {
    const placement = await getCurrentPlacement(req.user.id);
    if (!placement) return res.status(404).json({ error: 'No placement found' });
    res.json(placement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getChangeRequests = async (req, res) => {
  try {
    const requests = await prisma.placementChangeRequest.findMany({
      where: { requestedById: req.user.id },
      include: { placement: { select: { id: true, roleTitle: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.submitChangeRequest = async (req, res) => {
  try {
    const { requestType, details } = req.body;
    const placement = await getCurrentPlacement(req.user.id);
    if (!placement) return res.status(404).json({ error: 'No active placement to raise a request against' });

    const request = await prisma.placementChangeRequest.create({
      data: { placementId: placement.id, requestedById: req.user.id, requestType, details },
    });

    if (placement.tutorId) {
      await prisma.notification.create({
        data: { userId: placement.tutorId, type: 'change_request', title: 'New change request', body: `${req.user.fullName} submitted a ${requestType} request.`, link: `/tutor/requests` },
      });
    }
    await logAction(req.user.id, 'submit_change_request', 'placement_change_requests', request.id);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacementRequestContext = async (req, res) => {
  try {
    const studentId = req.user.id;
    const existingPlacement = await prisma.placement.findFirst({
      where: { studentId, status: { notIn: ['REJECTED', 'TERMINATED'] } },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    let draft = null;
    const editId = Number(req.query.edit);
    if (editId) {
      const placement = await prisma.placement.findFirst({
        where: { id: editId, studentId, status: 'DRAFT' },
        include: { company: true },
      });
      if (placement) {
        draft = {
          id: placement.id,
          companyName: placement.company.name,
          companyAddress: placement.company.address,
          sector: placement.company.sector,
          companyLat: placement.company.latitude,
          companyLng: placement.company.longitude,
          roleTitle: placement.roleTitle,
          jobDescription: placement.jobDescription,
          startDate: placement.startDate ? placement.startDate.toISOString().slice(0, 10) : '',
          endDate: placement.endDate ? placement.endDate.toISOString().slice(0, 10) : '',
          salary: placement.salary ? String(placement.salary) : '',
          workingPattern: placement.workingPattern,
          supervisorName: placement.supervisorName,
          supervisorEmail: placement.supervisorEmail,
          supervisorPhone: placement.supervisorPhone,
        };
      }
    }

    res.json({ existingPlacement, draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function companyNameInEmail(companyName, email) {
  const words = companyName.toLowerCase().split(/[\s\-&.,/()]+/).filter((w) => w.length > 2);
  const emailLower = email.toLowerCase();
  return words.some((w) => emailLower.includes(w));
}

exports.submitPlacementRequest = async (req, res) => {
  try {
    const studentId = req.user.id;
    const {
      companyName, companyAddress, sector, companyLat, companyLng,
      roleTitle, jobDescription, startDate, endDate, salary, workingPattern,
      supervisorName, supervisorEmail, supervisorPhone,
      action, editPlacementId,
    } = req.body;

    const isDraft = action === 'draft';

    if (!isDraft && supervisorEmail && companyName && !companyNameInEmail(companyName, supervisorEmail)) {
      return res.status(400).json({ error: `The supervisor email must contain the company name somewhere in the address (e.g., supervisor@${companyName.replace(/\s+/g, '').toLowerCase()}.com). The email domain should be from the company you are placed at: ${companyName}.` });
    }

    const lat = companyLat && !Number.isNaN(Number(companyLat)) ? Number(companyLat) : null;
    const lng = companyLng && !Number.isNaN(Number(companyLng)) ? Number(companyLng) : null;

    let company = await prisma.company.findFirst({ where: { name: { equals: companyName, mode: 'insensitive' } } });
    if (company) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          address: companyAddress, sector, contactName: supervisorName, contactEmail: supervisorEmail, contactPhone: supervisorPhone,
          latitude: lat !== null ? lat : undefined, longitude: lng !== null ? lng : undefined,
        },
      });
    } else {
      company = await prisma.company.create({
        data: { name: companyName, address: companyAddress, sector, contactName: supervisorName, contactEmail: supervisorEmail, contactPhone: supervisorPhone, latitude: lat, longitude: lng },
      });
    }

    const status = isDraft ? 'DRAFT' : 'AWAITING_PROVIDER';
    const placementData = {
      companyId: company.id,
      roleTitle: roleTitle || '',
      jobDescription: jobDescription || '',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      salary: salary ? salary.replace(/[^0-9.]/g, '') || null : null,
      workingPattern: workingPattern || null,
      supervisorName: supervisorName || null,
      supervisorEmail: supervisorEmail || null,
      supervisorPhone: supervisorPhone || null,
      status,
    };

    let placement;
    const existingDraftId = Number(editPlacementId);
    if (existingDraftId) {
      const existing = await prisma.placement.findFirst({ where: { id: existingDraftId, studentId, status: 'DRAFT' } });
      if (!existing) return res.status(404).json({ error: 'Draft not found' });
      placement = await prisma.placement.update({ where: { id: existingDraftId }, data: placementData, include: { student: true, company: true } });
    } else {
      placement = await prisma.placement.create({ data: { ...placementData, studentId }, include: { student: true, company: true } });
    }

    if (req.files?.length) {
      await prisma.document.createMany({
        data: req.files.map((f) => ({
          placementId: placement.id,
          uploadedById: studentId,
          fileName: f.originalname,
          filePath: fileUrl(f.filename),
          fileType: f.mimetype,
          fileSize: f.size,
          category: 'offer_letter',
        })),
      });
    }

    await logAction(studentId, isDraft ? 'saved_draft' : 'submitted_placement_request', 'placements', placement.id);

    let notifiedEmail = null;
    if (!isDraft) {
      const providerUser = await prisma.user.findFirst({ where: { role: 'PROVIDER', companyId: company.id, isActive: true } });
      notifiedEmail = providerUser?.email || placement.supervisorEmail;

      if (placement.supervisorEmail || providerUser) {
        const { issueProviderToken } = require('../utils/providerToken');
        await issueProviderToken({
          ...placement,
          supervisorEmail: providerUser?.email || placement.supervisorEmail,
          supervisorName: providerUser?.fullName || placement.supervisorName,
        }, 'confirm_placement');
      }

      const { mailPlacementRequestSubmitted } = require('../utils/mailer');
      await mailPlacementRequestSubmitted(
        req.user.email, req.user.fullName, company.name, placement.roleTitle,
        placement.startDate ? placement.startDate.toLocaleDateString('en-GB') : '',
        placement.endDate ? placement.endDate.toLocaleDateString('en-GB') : '',
      );
    }

    res.status(existingDraftId ? 200 : 201).json({
      placementId: placement.id,
      message: isDraft
        ? (existingDraftId ? 'Draft updated successfully!' : 'Draft saved successfully! You can come back and submit it later.')
        : `Your placement request has been submitted! A notification was sent to: ${notifiedEmail || 'the provider'}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVisits = async (req, res) => {
  try {
    const placement = await getCurrentPlacement(req.user.id);
    if (!placement) return res.json([]);
    const visits = await prisma.visit.findMany({
      where: { placementId: placement.id },
      include: { tutor: { select: { fullName: true, email: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReflections = async (req, res) => {
  try {
    const reflections = await prisma.reflection.findMany({ where: { studentId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json(reflections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createReflection = async (req, res) => {
  try {
    const { title, content, weekNumber } = req.body;
    const placement = await getCurrentPlacement(req.user.id);
    if (!placement) return res.status(404).json({ error: 'No active placement' });
    const reflection = await prisma.reflection.create({
      data: { placementId: placement.id, studentId: req.user.id, title, content, weekNumber: weekNumber ? Number(weekNumber) : null, status: 'submitted' },
    });
    res.status(201).json(reflection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const studentId = req.user.id;
    const placement = await prisma.placement.findFirst({
      where: { studentId, status: { in: ['APPROVED', 'ACTIVE'] } },
      orderBy: { createdAt: 'desc' },
    });

    let interimDue = null;
    let finalDue = null;
    if (placement) {
      const start = new Date(placement.startDate);
      const end = new Date(placement.endDate);
      interimDue = new Date(start); interimDue.setMonth(interimDue.getMonth() + 4);
      finalDue = new Date(end); finalDue.setMonth(finalDue.getMonth() - 1);
    }

    let interimReport = null;
    let finalReport = null;
    if (placement) {
      [interimReport, finalReport] = await Promise.all([
        prisma.report.findFirst({ where: { placementId: placement.id, studentId, reportType: 'interim' }, orderBy: { submittedAt: 'desc' } }),
        prisma.report.findFirst({ where: { placementId: placement.id, studentId, reportType: 'final' }, orderBy: { submittedAt: 'desc' } }),
      ]);
    }

    let reviewed = 0, pending = 0, overdue = 0, upcoming = 0;
    if (placement) {
      if (finalReport) {
        if (finalReport.status === 'reviewed') reviewed += 1; else pending += 1;
      } else {
        const today = new Date();
        if (finalDue && today > finalDue) overdue += 1;
        else if (finalDue) {
          const daysLeft = Math.round((finalDue - today) / 86400000);
          if (daysLeft > 30) upcoming += 1;
        }
      }
    }

    res.json({
      hasPlacement: !!placement,
      interimDue, finalDue,
      interimReport, finalReport,
      summary: { reviewed, pending, overdue, upcoming },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadReport = async (req, res) => {
  try {
    const { reportType } = req.body;
    if (!['interim', 'final'].includes(reportType)) return res.status(400).json({ error: 'reportType must be "interim" or "final"' });
    if (!req.file) return res.status(400).json({ error: 'Please choose a PDF file' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'Only PDF files are allowed' });

    const placement = await prisma.placement.findFirst({ where: { studentId: req.user.id, status: { in: ['APPROVED', 'ACTIVE'] } } });
    if (!placement) return res.status(404).json({ error: 'No active placement' });

    const existing = await prisma.report.findFirst({ where: { placementId: placement.id, studentId: req.user.id, reportType } });
    if (existing) return res.status(400).json({ error: `${reportType === 'interim' ? 'Interim' : 'Final'} report has already been submitted` });

    const report = await prisma.report.create({
      data: {
        placementId: placement.id,
        studentId: req.user.id,
        title: `${reportType === 'interim' ? 'Interim' : 'Final'} Placement Report`,
        reportType,
        filePath: fileUrl(req.file.filename),
        fileSize: req.file.size,
        status: 'pending',
      },
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const documents = await prisma.document.findMany({ where: { uploadedById: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const placement = await getCurrentPlacement(req.user.id);
    const document = await prisma.document.create({
      data: {
        placementId: placement ? placement.id : null,
        uploadedById: req.user.id,
        fileName: req.file.originalname,
        filePath: fileUrl(req.file.filename),
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        category: req.body.category || 'other',
      },
    });
    res.status(201).json(document);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const announcements = await prisma.announcement.findMany({
      where: {
        AND: [
          { OR: [{ audienceRole: null }, { audienceRole: 'STUDENT' }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
        ],
      },
      include: { postedBy: { select: { fullName: true, avatarInitials: true } }, reads: { where: { userId } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    const all = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.content,
      isPinned: a.isPinned,
      expiresAt: a.expiresAt,
      createdAt: a.createdAt,
      authorName: a.postedBy.fullName,
      authorInitials: a.postedBy.avatarInitials,
      audienceRole: a.audienceRole,
      isRead: a.reads.length > 0,
    }));

    const totalCount = all.length;
    const unreadCount = all.filter((a) => !a.isRead).length;
    const displayed = req.query.filter === 'unread' ? all.filter((a) => !a.isRead) : all;

    if (displayed.length > 0) {
      await prisma.announcementRead.createMany({
        data: displayed.map((a) => ({ announcementId: a.id, userId })),
        skipDuplicates: true,
      });
    }

    res.json({ totalCount, unreadCount, announcements: displayed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAnnouncementRead = async (req, res) => {
  try {
    await prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: Number(req.params.id), userId: req.user.id } },
      update: {},
      create: { announcementId: Number(req.params.id), userId: req.user.id },
    });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

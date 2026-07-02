const prisma = require('../config/db');
const { fileUrl } = require('../utils/storage');
const { logAction } = require('../utils/auditLog');

const placementInclude = {
  company: true,
  tutor: { select: { id: true, fullName: true, email: true, avatarInitials: true } },
};

async function getCurrentPlacement(studentId) {
  return prisma.placement.findFirst({
    where: { studentId },
    include: placementInclude,
    orderBy: { createdAt: 'desc' },
  });
}

exports.getDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    const placement = await getCurrentPlacement(studentId);

    const [upcomingVisits, unreadMessages, unreadNotifications] = await Promise.all([
      placement ? prisma.visit.count({ where: { placementId: placement.id, status: 'scheduled', scheduledAt: { gte: new Date() } } }) : 0,
      prisma.message.count({ where: { receiverId: studentId, isRead: false } }),
      prisma.notification.count({ where: { userId: studentId, isRead: false } }),
    ]);

    res.json({ placement, upcomingVisits, unreadMessages, unreadNotifications });
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
    const reports = await prisma.report.findMany({ where: { studentId: req.user.id }, orderBy: { submittedAt: 'desc' } });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadReport = async (req, res) => {
  try {
    const { title } = req.body;
    const placement = await getCurrentPlacement(req.user.id);
    if (!placement) return res.status(404).json({ error: 'No active placement' });
    const filePath = req.file ? fileUrl(req.file.filename) : null;
    const report = await prisma.report.create({
      data: { placementId: placement.id, studentId: req.user.id, title, filePath, status: 'submitted' },
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
    const announcements = await prisma.announcement.findMany({
      where: { OR: [{ audienceRole: null }, { audienceRole: 'STUDENT' }] },
      include: { reads: { where: { userId: req.user.id } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(announcements.map((a) => ({ ...a, isRead: a.reads.length > 0, reads: undefined })));
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

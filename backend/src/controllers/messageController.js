const prisma = require('../config/db');
const { mailNewMessage } = require('../utils/mailer');

exports.getContacts = async (req, res) => {
  try {
    const user = req.user;
    const contacts = [];
    const meta = new Map(); // contactId -> { roleTitles: Set, companies: Set }

    const attach = (contact, roleTitle, companyName) => {
      if (!contact) return;
      contacts.push(contact);
      if (!meta.has(contact.id)) meta.set(contact.id, { roleTitles: new Set(), companies: new Set() });
      const m = meta.get(contact.id);
      if (roleTitle) m.roleTitles.add(roleTitle);
      if (companyName) m.companies.add(companyName);
    };

    if (user.role === 'STUDENT') {
      const placements = await prisma.placement.findMany({ where: { studentId: user.id }, include: { tutor: true, company: { include: { users: true } } } });
      for (const p of placements) {
        attach(p.tutor, p.roleTitle, p.company.name);
        p.company.users.forEach((u) => attach(u, p.roleTitle, p.company.name));
      }
    } else if (user.role === 'TUTOR') {
      const placements = await prisma.placement.findMany({ where: { tutorId: user.id }, include: { student: true, company: { include: { users: true } } } });
      for (const p of placements) {
        attach(p.student, p.roleTitle, p.company.name);
        p.company.users.forEach((u) => attach(u, p.roleTitle, p.company.name));
      }
    } else if (user.role === 'PROVIDER') {
      const placements = await prisma.placement.findMany({ where: { companyId: user.companyId }, include: { student: true, tutor: true } });
      for (const p of placements) {
        attach(p.student, p.roleTitle, null);
        attach(p.tutor, p.roleTitle, null);
      }
    } else {
      const others = await prisma.user.findMany({ where: { approvalStatus: 'APPROVED', id: { not: user.id } }, take: 50 });
      others.forEach((u) => attach(u, null, null));
    }

    const unique = Array.from(new Map(contacts.map((c) => [c.id, c])).values());
    res.json(unique.map(({ id, fullName, email, role, avatarInitials }) => ({
      id, fullName, email, role, avatarInitials,
      placementCount: meta.get(id)?.roleTitles.size || 0,
      roleTitles: Array.from(meta.get(id)?.roleTitles || []).join(' • '),
      companies: Array.from(meta.get(id)?.companies || []).join(' • '),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getThreads = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: { select: { id: true, fullName: true, avatarInitials: true, role: true } },
        receiver: { select: { id: true, fullName: true, avatarInitials: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const threads = new Map();
    for (const m of messages) {
      const partner = m.senderId === userId ? m.receiver : m.sender;
      if (!threads.has(partner.id)) {
        threads.set(partner.id, { partner, lastMessage: m, unreadCount: 0 });
      }
      if (m.receiverId === userId && !m.isRead) threads.get(partner.id).unreadCount += 1;
    }
    res.json(Array.from(threads.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getThread = async (req, res) => {
  try {
    const userId = req.user.id;
    const partnerId = Number(req.params.userId);
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    await prisma.message.updateMany({ where: { senderId: partnerId, receiverId: userId, isRead: false }, data: { isRead: true } });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, body } = req.body;
    if (!receiverId || !body) return res.status(400).json({ error: 'receiverId and body are required' });

    const receiver = await prisma.user.findUnique({ where: { id: Number(receiverId) } });
    if (!receiver) return res.status(404).json({ error: 'Recipient not found' });

    const message = await prisma.message.create({
      data: { senderId: req.user.id, receiverId: Number(receiverId), body },
    });

    await mailNewMessage(receiver.email, receiver.fullName, req.user.fullName, body);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await prisma.notification.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data: { isRead: true },
    });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

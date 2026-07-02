const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/contacts', messageController.getContacts);
router.get('/threads', messageController.getThreads);
router.get('/thread/:userId', messageController.getThread);
router.post('/', messageController.sendMessage);

router.get('/notifications', messageController.getNotifications);
router.post('/notifications/:id/read', messageController.markNotificationRead);
router.post('/notifications/read-all', messageController.markAllNotificationsRead);

module.exports = router;

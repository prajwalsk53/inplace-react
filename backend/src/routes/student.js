const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../utils/storage');

router.use(authenticate, requireRole('STUDENT'));

router.get('/dashboard', studentController.getDashboard);
router.get('/placement', studentController.getMyPlacement);

router.get('/change-requests', studentController.getChangeRequests);
router.post('/change-requests', studentController.submitChangeRequest);

router.get('/placement-request', studentController.getPlacementRequestContext);
router.post('/placement-request', upload.array('documents', 10), studentController.submitPlacementRequest);

router.get('/visits', studentController.getVisits);
router.put('/visits/:id/notes', studentController.saveVisitNote);

router.get('/reflections', studentController.getReflections);
router.post('/reflections', studentController.createReflection);

router.get('/reports', studentController.getReports);
router.post('/reports', upload.single('file'), studentController.uploadReport);

router.get('/documents', studentController.getDocuments);
router.post('/documents', upload.single('file'), studentController.uploadDocument);

router.get('/announcements', studentController.getAnnouncements);
router.post('/announcements/:id/read', studentController.markAnnouncementRead);

module.exports = router;

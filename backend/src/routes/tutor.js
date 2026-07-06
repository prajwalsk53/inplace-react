const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('TUTOR'));

router.get('/dashboard', tutorController.getDashboard);
router.get('/dashboard-metrics', tutorController.getDashboardMetrics);

router.get('/placements', tutorController.getPlacements);
router.get('/placements/at-risk', tutorController.getAtRiskPlacements);
router.get('/placements/filters', tutorController.getPlacementFilterOptions);
router.get('/placements/export/csv', tutorController.exportAllPlacementsCsv);
router.get('/placements/:id', tutorController.getPlacement);
router.post('/placements', tutorController.createPlacement);
router.put('/placements/:id', tutorController.updatePlacement);
router.post('/placements/:id/terminate', tutorController.terminatePlacement);

router.get('/students', tutorController.getStudents);
router.get('/available-students', tutorController.getAvailableStudents);

router.get('/visits', tutorController.getVisits);
router.post('/visits', tutorController.scheduleVisit);
router.put('/visits/:id/notes', tutorController.saveVisitNotes);
router.get('/visits/:id/ics', tutorController.downloadVisitIcs);

router.get('/providers', tutorController.getProviders);
router.get('/provider-meetings', tutorController.getProviderMeetings);
router.post('/provider-meetings', tutorController.requestProviderMeeting);

router.get('/requests', tutorController.getChangeRequests);
router.post('/requests/:id/respond', tutorController.respondChangeRequest);

router.get('/reports', tutorController.getReflectionsAndReports);
router.put('/reflections/:id/feedback', tutorController.giveReflectionFeedback);
router.put('/reports/:id/feedback', tutorController.giveReportFeedback);

router.get('/announcements', tutorController.getAnnouncements);
router.post('/announcements', tutorController.createAnnouncement);
router.put('/announcements/:id', tutorController.updateAnnouncement);
router.delete('/announcements/:id', tutorController.deleteAnnouncement);
router.post('/announcements/:id/toggle-pin', tutorController.togglePinAnnouncement);

router.get('/map', tutorController.getMapPlacements);

router.get('/settings', tutorController.getSettings);
router.put('/settings', tutorController.updateSettings);

module.exports = router;

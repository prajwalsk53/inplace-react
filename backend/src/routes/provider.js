const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('PROVIDER'));

router.get('/dashboard', providerController.getDashboard);

router.get('/placements', providerController.getPlacements);
router.get('/placements/:id', providerController.getPlacement);
router.post('/placements/:id/confirm', providerController.confirmPlacement);
router.post('/placements/:id/feedback', providerController.provideFeedback);

router.get('/visits', providerController.getVisits);
router.get('/visits/:id', providerController.getVisit);
router.put('/visits/:id/respond', providerController.respondVisit);

router.get('/meetings', providerController.getMeetings);

router.get('/change-requests', providerController.getChangeRequests);
router.put('/change-requests/:id/respond', providerController.respondChangeRequest);

router.get('/issues', providerController.getIssues);
router.post('/issues', providerController.createIssue);

router.get('/evaluation-candidates', providerController.getEvaluationCandidates);
router.get('/evaluations', providerController.getEvaluations);
router.post('/evaluations', providerController.saveEvaluation);

router.get('/opportunities', providerController.getOpportunities);
router.post('/opportunities', providerController.createOpportunity);
router.put('/opportunities/:id', providerController.updateOpportunity);
router.put('/opportunities/:id/toggle', providerController.toggleOpportunity);
router.delete('/opportunities/:id', providerController.deleteOpportunity);

router.get('/notifications', providerController.getPlacementNotifications);
router.post('/notifications', providerController.createPlacementNotification);

router.get('/settings', providerController.getSettings);
router.put('/settings', providerController.updateSettings);

module.exports = router;

const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('PROVIDER'));

router.get('/dashboard', providerController.getDashboard);

router.get('/placements', providerController.getPlacements);
router.get('/placements/:id', providerController.getPlacement);
router.post('/placements/:id/confirm', providerController.confirmPlacement);
router.post('/placements/:id/flag-termination', providerController.flagTermination);

router.get('/visits', providerController.getVisits);
router.get('/visits/:id', providerController.getVisit);

router.get('/meetings', providerController.getMeetings);
router.put('/meetings/:id/respond', providerController.respondMeeting);

router.get('/issues', providerController.getIssues);
router.post('/issues', providerController.createIssue);
router.put('/issues/:id', providerController.updateIssue);

router.get('/evaluations', providerController.getEvaluations);
router.post('/evaluations', providerController.createEvaluation);

router.get('/settings', providerController.getSettings);
router.put('/settings', providerController.updateSettings);

module.exports = router;

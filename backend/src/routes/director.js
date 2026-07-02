const express = require('express');
const router = express.Router();
const directorController = require('../controllers/directorController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('DIRECTOR'));

router.get('/dashboard', directorController.getDashboard);
router.get('/placements', directorController.getPlacements);
router.get('/placements/:id', directorController.getPlacement);
router.get('/at-risk', directorController.getAtRiskPlacements);
router.get('/feedback', directorController.getFeedback);
router.get('/map', directorController.getMapPlacements);
router.get('/reports', directorController.getReportsSummary);

module.exports = router;

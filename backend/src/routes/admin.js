const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('ADMIN'));

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);

router.get('/registrations', adminController.getRegistrations);
router.post('/registrations/:id/approve', adminController.approveRegistration);
router.post('/registrations/:id/reject', adminController.rejectRegistration);

router.get('/placements', adminController.getPlacements);
router.put('/placements/:id', adminController.updatePlacement);
router.get('/placements/export/csv', adminController.exportPlacementsCsv);

router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

router.get('/logs', adminController.getLogs);

module.exports = router;

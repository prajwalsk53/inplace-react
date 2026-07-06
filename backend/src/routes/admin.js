const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('ADMIN'));

router.get('/dashboard', adminController.getDashboard);
router.get('/companies', adminController.getCompanies);

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);
router.post('/users/:id/activate', adminController.activateUser);
router.delete('/users/:id', adminController.deleteUser);
router.delete('/users/:id/hard', adminController.hardDeleteUser);

router.get('/registrations', adminController.getRegistrations);
router.get('/registrations/filters', adminController.getRegistrationFilters);
router.post('/registrations/:id/approve', adminController.approveRegistration);
router.post('/registrations/:id/reject', adminController.rejectRegistration);
router.post('/registrations/bulk-approve', adminController.bulkApproveRegistrations);
router.post('/registrations/bulk-reject', adminController.bulkRejectRegistrations);

router.get('/placements', adminController.getPlacements);
router.get('/placements/stats', adminController.getPlacementStats);
router.get('/placements/export/csv', adminController.exportPlacementsCsv);
router.get('/placements/:id', adminController.getPlacement);
router.put('/placements/:id', adminController.updatePlacement);

router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

router.get('/logs', adminController.getLogs);

router.get('/backup', adminController.backupDatabase);

module.exports = router;

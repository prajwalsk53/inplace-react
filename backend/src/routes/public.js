const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/provider-confirm/:token', publicController.getProviderConfirmation);
router.post('/provider-confirm/:token', publicController.respondProviderConfirmation);

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { verifyRecaptcha } = require('../middleware/recaptcha');

router.post('/register', verifyRecaptcha, authController.register);
router.post('/register/send-otp', authController.sendRegistrationOtp);
router.post('/login', verifyRecaptcha, authController.login);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtpCode);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.checkResetToken);
router.post('/reset-password', authController.resetPassword);

router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;

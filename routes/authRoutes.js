const express = require('express');
const router = express.Router();
const {
    sendOTP,
    verifyOTP,
    resendOTP,
    loginWithOTP,
    refreshToken,
    logout,
    checkPhoneRegistration
} = require('../controllers/authController');
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/authMiddleware');

// @desc    Send OTP for registration/login
// @route   POST /api/auth/send-otp
// @access  Public
router.post('/send-otp', otpLimiter, sendOTP);

// @desc    Check if phone number is registered
// @route   POST /api/auth/check-phone
// @access  Public
router.post('/check-phone', checkPhoneRegistration);

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', verifyOTP);

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
router.post('/resend-otp', otpLimiter, resendOTP);

// @desc    Login with OTP
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginLimiter, loginWithOTP);

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', refreshToken);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, logout);

module.exports = router;
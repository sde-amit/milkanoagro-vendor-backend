const express = require('express');
const router = express.Router();
const {
    registerVendor,
    submitOnboardingForm,
    getVendorProfile,
    updateVendorProfile,
    getOnboardingStatus,
    getAllVendors,
    approveVendor,
    rejectVendor
} = require('../controllers/vendorController');
const { protect, adminOnly, verifiedOnly } = require('../middleware/authMiddleware');

// @desc    Register new vendor
// @route   POST /api/vendor/register
// @access  Public
router.post('/register', registerVendor);

// @desc    Submit vendor onboarding form
// @route   POST /api/vendor/onboarding
// @access  Private (Verified users only)
router.post('/onboarding', protect, verifiedOnly, submitOnboardingForm);

// @desc    Get vendor profile
// @route   GET /api/vendor/profile
// @access  Private
router.get('/profile', protect, getVendorProfile);

// @desc    Update vendor profile
// @route   PUT /api/vendor/profile
// @access  Private
router.put('/profile', protect, updateVendorProfile);

// @desc    Get onboarding status
// @route   GET /api/vendor/onboarding-status
// @access  Private
router.get('/onboarding-status', protect, getOnboardingStatus);

// Admin routes
// @desc    Get all vendors
// @route   GET /api/vendor/all
// @access  Private (Admin only)
router.get('/all', protect, adminOnly, getAllVendors);

// @desc    Approve vendor
// @route   PUT /api/vendor/:id/approve
// @access  Private (Admin only)
router.put('/:id/approve', protect, adminOnly, approveVendor);

// @desc    Reject vendor
// @route   PUT /api/vendor/:id/reject
// @access  Private (Admin only)
router.put('/:id/reject', protect, adminOnly, rejectVendor);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
    uploadFiles,
    getUserFiles,
    deleteFile,
    getFileDownloadUrl
} = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const UploadService = require('../services/uploadService');

// Configure multer for S3 upload
const upload = UploadService.createS3Upload();

// @desc    Upload files
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.array('files', 10), uploadFiles);

// @desc    Upload files for specific vendor onboarding
// @route   POST /api/upload/vendor/:vendorId
// @access  Private
router.post('/vendor/:vendorId', protect, upload.array('files', 10), uploadFiles);

// @desc    Get user files
// @route   GET /api/upload/files
// @access  Private
router.get('/files', protect, getUserFiles);

// @desc    Get files for specific vendor onboarding
// @route   GET /api/upload/files/vendor/:vendorId
// @access  Private
router.get('/files/vendor/:vendorId', protect, getUserFiles);

// @desc    Delete file
// @route   DELETE /api/upload/:fileId
// @access  Private
router.delete('/:fileId', protect, deleteFile);

// @desc    Get file download URL
// @route   GET /api/upload/download/:fileId
// @access  Private
router.get('/download/:fileId', protect, getFileDownloadUrl);

module.exports = router;
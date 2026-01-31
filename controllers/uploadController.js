const asyncHandler = require('express-async-handler');
const UploadService = require('../services/uploadService');
const { getConnection } = require('../config/database');
const Logger = require('../utils/logger');

// @desc    Upload files
// @route   POST /api/upload
// @access  Private
const uploadFiles = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const vendorOnboardingId = req.params.vendorId || req.body.vendorOnboardingId || null;
    const category = req.body.category || 'general';

    if (!req.files || req.files.length === 0) {
        res.status(400);
        throw new Error('No files uploaded');
    }

    try {
        // Save file information to database
        const uploadedFiles = await UploadService.uploadMultipleFiles(
            req.files,
            userId,
            vendorOnboardingId,
            category
        );

        // Log activity
        const connection = getConnection();
        await connection.execute(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [userId, 'FILES_UPLOADED', `Uploaded ${req.files.length} files`, req.ip]
        );

        // Emit real-time event
        req.io?.emit('files_uploaded', {
            userId,
            vendorOnboardingId,
            filesCount: req.files.length,
            category,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: `${req.files.length} file(s) uploaded successfully`,
            data: {
                files: uploadedFiles,
                count: uploadedFiles.length
            }
        });

    } catch (error) {
        // Clean up uploaded files if database save fails
        if (req.files) {
            for (const file of req.files) {
                try {
                    await UploadService.deleteFile(file.key);
                } catch (cleanupError) {
                    Logger.error('File cleanup error during upload failure', cleanupError);
                }
            }
        }

        res.status(500);
        throw new Error('File upload failed: ' + error.message);
    }
});

// @desc    Get user files
// @route   GET /api/upload/files
// @access  Private
const getUserFiles = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const vendorOnboardingId = req.params.vendorId || req.query.vendorId || null;
    const category = req.query.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    try {
        const connection = getConnection();

        // Build query
        let query = `
            SELECT id, file_name, original_name, file_path, file_size, mime_type, 
                   file_type, category, s3_url, created_at
            FROM file_uploads 
            WHERE user_id = ?
        `;
        const params = [userId];

        if (vendorOnboardingId) {
            query += ' AND vendor_onboarding_id = ?';
            params.push(vendorOnboardingId);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, (page - 1) * limit);

        const [files] = await connection.execute(query, params);

        // Generate signed URLs for files
        const filesWithUrls = await Promise.all(files.map(async (file) => {
            try {
                const downloadUrl = await UploadService.getSignedUrl(file.file_path);
                return {
                    ...file,
                    downloadUrl,
                    fileSize: `${(file.file_size / 1024 / 1024).toFixed(2)} MB`
                };
            } catch (error) {
                return {
                    ...file,
                    downloadUrl: null,
                    fileSize: `${(file.file_size / 1024 / 1024).toFixed(2)} MB`
                };
            }
        }));

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM file_uploads WHERE user_id = ?';
        const countParams = [userId];

        if (vendorOnboardingId) {
            countQuery += ' AND vendor_onboarding_id = ?';
            countParams.push(vendorOnboardingId);
        }

        if (category) {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }

        const [countResult] = await connection.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.status(200).json({
            success: true,
            data: {
                files: filesWithUrls,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        res.status(500);
        throw new Error('Failed to fetch files');
    }
});

// @desc    Delete file
// @route   DELETE /api/upload/:fileId
// @access  Private
const deleteFile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const fileId = req.params.fileId;

    try {
        const connection = getConnection();

        // Get file info
        const [fileRows] = await connection.execute(
            'SELECT file_path, original_name FROM file_uploads WHERE id = ? AND user_id = ?',
            [fileId, userId]
        );

        if (fileRows.length === 0) {
            res.status(404);
            throw new Error('File not found or access denied');
        }

        const file = fileRows[0];

        // Delete from S3
        await UploadService.deleteFile(file.file_path);

        // Delete from database
        await connection.execute(
            'DELETE FROM file_uploads WHERE id = ? AND user_id = ?',
            [fileId, userId]
        );

        // Log activity
        await connection.execute(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [userId, 'FILE_DELETED', `Deleted file: ${file.original_name}`, req.ip]
        );

        // Emit real-time event
        req.io?.emit('file_deleted', {
            userId,
            fileId,
            fileName: file.original_name,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        res.status(500);
        throw new Error('Failed to delete file: ' + error.message);
    }
});

// @desc    Get file download URL
// @route   GET /api/upload/download/:fileId
// @access  Private
const getFileDownloadUrl = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const fileId = req.params.fileId;
    const expiresIn = parseInt(req.query.expires) || 3600; // 1 hour default

    try {
        const connection = getConnection();

        // Get file info
        const [fileRows] = await connection.execute(
            'SELECT file_path, original_name, mime_type FROM file_uploads WHERE id = ? AND user_id = ?',
            [fileId, userId]
        );

        if (fileRows.length === 0) {
            res.status(404);
            throw new Error('File not found or access denied');
        }

        const file = fileRows[0];

        // Generate signed URL
        const downloadUrl = await UploadService.getSignedUrl(file.file_path, expiresIn);

        // Log activity
        await connection.execute(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [userId, 'FILE_ACCESSED', `Generated download URL for: ${file.original_name}`, req.ip]
        );

        res.status(200).json({
            success: true,
            data: {
                downloadUrl,
                fileName: file.original_name,
                mimeType: file.mime_type,
                expiresIn,
                expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
            }
        });

    } catch (error) {
        res.status(500);
        throw new Error('Failed to generate download URL');
    }
});

module.exports = {
    uploadFiles,
    getUserFiles,
    deleteFile,
    getFileDownloadUrl
};
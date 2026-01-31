const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const CleanupService = require('../services/cleanupService');
const { getConnection } = require('../config/database');
const asyncHandler = require('express-async-handler');

// @desc    Manual cleanup trigger
// @route   POST /api/admin/cleanup
// @access  Private (Admin only)
router.post('/cleanup', protect, adminOnly, asyncHandler(async (req, res) => {
    const results = await CleanupService.manualCleanup();

    res.status(200).json({
        success: true,
        message: 'Manual cleanup completed',
        data: results
    });
}));

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
router.get('/stats', protect, adminOnly, asyncHandler(async (req, res) => {
    const connection = getConnection();

    // Get various statistics
    const [userStats] = await connection.execute(`
        SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) as verified_users,
            SUM(CASE WHEN role = 'vendor' THEN 1 ELSE 0 END) as vendors,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
        FROM users
    `);

    const [vendorStats] = await connection.execute(`
        SELECT 
            COUNT(*) as total_vendors,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_vendors,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_vendors,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_vendors
        FROM vendor_profiles
    `);

    const [onboardingStats] = await connection.execute(`
        SELECT 
            COUNT(*) as total_onboarding,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_forms,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_forms,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_forms,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_forms
        FROM vendor_onboarding
    `);

    const [fileStats] = await connection.execute(`
        SELECT 
            COUNT(*) as total_files,
            SUM(file_size) as total_size,
            AVG(file_size) as avg_file_size
        FROM file_uploads
    `);

    const [recentActivity] = await connection.execute(`
        SELECT action, COUNT(*) as count
        FROM activity_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
    `);

    res.status(200).json({
        success: true,
        data: {
            users: userStats[0],
            vendors: vendorStats[0],
            onboarding: onboardingStats[0],
            files: {
                ...fileStats[0],
                total_size_mb: Math.round(fileStats[0].total_size / 1024 / 1024 * 100) / 100,
                avg_file_size_mb: Math.round(fileStats[0].avg_file_size / 1024 / 1024 * 100) / 100
            },
            recent_activity: recentActivity,
            timestamp: new Date().toISOString()
        }
    });
}));

// @desc    Get recent activity logs
// @route   GET /api/admin/activity
// @access  Private (Admin only)
router.get('/activity', protect, adminOnly, asyncHandler(async (req, res) => {
    const connection = getConnection();
    const { page = 1, limit = 50, action, userId } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (action) {
        whereClause += ' WHERE action = ?';
        params.push(action);
    }

    if (userId) {
        whereClause += whereClause ? ' AND user_id = ?' : ' WHERE user_id = ?';
        params.push(userId);
    }

    const [logs] = await connection.execute(`
        SELECT al.*, u.phone, u.email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM activity_logs al
        ${whereClause}
    `, params);

    const total = countResult[0].total;

    res.status(200).json({
        success: true,
        data: {
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
}));

// @desc    System health check
// @route   GET /api/admin/health
// @access  Private (Admin only)
router.get('/health', protect, adminOnly, asyncHandler(async (req, res) => {
    const connection = getConnection();
    const healthChecks = {
        database: false,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
    };

    try {
        await connection.execute('SELECT 1');
        healthChecks.database = true;
    } catch (error) {
        healthChecks.database = false;
        healthChecks.database_error = error.message;
    }

    const status = healthChecks.database ? 200 : 503;

    res.status(status).json({
        success: healthChecks.database,
        message: healthChecks.database ? 'System healthy' : 'System issues detected',
        data: healthChecks
    });
}));

module.exports = router;
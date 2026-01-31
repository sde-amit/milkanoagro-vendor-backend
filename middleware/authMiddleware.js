const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { getConnection } = require('../config/database');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from database
            const connection = getConnection();
            const [rows] = await connection.execute(
                'SELECT id, phone, email, is_verified, is_active, role FROM users WHERE id = ?',
                [decoded.id]
            );

            if (rows.length === 0) {
                res.status(401);
                throw new Error('User not found');
            }

            const user = rows[0];

            if (!user.is_active) {
                res.status(401);
                throw new Error('Account is deactivated');
            }

            // Add user to request object
            req.user = user;
            next();

        } catch (error) {
            console.error('Auth middleware error:', error.message);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const adminOnly = asyncHandler(async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403);
        throw new Error('Access denied. Admin privileges required.');
    }
});

const verifiedOnly = asyncHandler(async (req, res, next) => {
    if (req.user && req.user.is_verified) {
        next();
    } else {
        res.status(403);
        throw new Error('Account verification required');
    }
});

module.exports = { protect, adminOnly, verifiedOnly };
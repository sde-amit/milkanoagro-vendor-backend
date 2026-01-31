const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const OTPService = require('../services/otpService');
const ValidationService = require('../services/validationService');

// Generate JWT tokens
const generateTokens = (id) => {
    const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

// @desc    Send OTP for registration/login
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = asyncHandler(async (req, res) => {
    const { phone, purpose = 'registration' } = req.body;

    // Validate phone number
    const validPhone = ValidationService.validatePhone(phone);

    // If purpose is login, check if user exists
    if (purpose === 'login') {
        const connection = getConnection();
        const [existingUser] = await connection.execute(
            'SELECT id, is_active FROM users WHERE phone = ?',
            [validPhone]
        );

        if (existingUser.length === 0) {
            res.status(404);
            throw new Error('Phone number not registered. Please register first.');
        }

        if (!existingUser[0].is_active) {
            res.status(401);
            throw new Error('Account is deactivated. Please contact support.');
        }
    }

    // Send OTP
    const result = await OTPService.sendOTP(validPhone, purpose);

    // Log activity
    req.io?.emit('otp_sent', {
        phone: validPhone,
        purpose,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        success: true,
        message: result.message,
        data: {
            phone: result.phone,
            expiresAt: result.expiresAt
        }
    });
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { phone, otp, purpose = 'registration' } = req.body;

    // Validate inputs
    const validPhone = ValidationService.validatePhone(phone);
    const validOTP = ValidationService.validateOTP(otp);

    // Verify OTP
    const result = await OTPService.verifyOTP(validPhone, validOTP, purpose);

    const connection = getConnection();

    // Check if user exists
    const [existingUser] = await connection.execute(
        'SELECT id, phone, email, is_verified, role FROM users WHERE phone = ?',
        [validPhone]
    );

    let user;
    if (existingUser.length > 0) {
        // Update existing user as verified
        await connection.execute(
            'UPDATE users SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE phone = ?',
            [validPhone]
        );
        user = { ...existingUser[0], is_verified: true };
    } else {
        // Create new user
        const [insertResult] = await connection.execute(
            'INSERT INTO users (phone, is_verified) VALUES (?, TRUE)',
            [validPhone]
        );
        user = {
            id: insertResult.insertId,
            phone: validPhone,
            email: null,
            is_verified: true,
            role: 'vendor'
        };
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Log activity
    await connection.execute(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [user.id, 'OTP_VERIFIED', `OTP verified for ${purpose}`, req.ip]
    );

    // Emit real-time event
    req.io?.emit('user_verified', {
        userId: user.id,
        phone: validPhone,
        purpose,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                isVerified: user.is_verified,
                role: user.role
            },
            accessToken,
            refreshToken
        }
    });
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
    const { phone, purpose = 'registration' } = req.body;

    // Validate phone number
    const validPhone = ValidationService.validatePhone(phone);

    // Resend OTP
    const result = await OTPService.resendOTP(validPhone, purpose);

    // Emit real-time event
    req.io?.emit('otp_resent', {
        phone: validPhone,
        purpose,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        success: true,
        message: result.message,
        data: {
            phone: result.phone,
            expiresAt: result.expiresAt
        }
    });
});

// @desc    Login with OTP
// @route   POST /api/auth/login
// @access  Public
const loginWithOTP = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;

    // Validate inputs
    const validPhone = ValidationService.validatePhone(phone);
    const validOTP = ValidationService.validateOTP(otp);

    // Verify OTP
    await OTPService.verifyOTP(validPhone, validOTP, 'login');

    const connection = getConnection();

    // Get user
    const [rows] = await connection.execute(
        'SELECT id, phone, email, is_verified, is_active, role FROM users WHERE phone = ? AND is_active = TRUE',
        [validPhone]
    );

    if (rows.length === 0) {
        res.status(401);
        throw new Error('User not found or account deactivated');
    }

    const user = rows[0];

    if (!user.is_verified) {
        res.status(401);
        throw new Error('Account not verified');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Log activity
    await connection.execute(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [user.id, 'LOGIN', 'User logged in with OTP', req.ip]
    );

    // Emit real-time event
    req.io?.emit('user_login', {
        userId: user.id,
        phone: validPhone,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                isVerified: user.is_verified,
                role: user.role
            },
            accessToken,
            refreshToken
        }
    });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;

    if (!token) {
        res.status(401);
        throw new Error('Refresh token required');
    }

    try {
        // Verify refresh token
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        const connection = getConnection();

        // Get user
        const [rows] = await connection.execute(
            'SELECT id, phone, email, is_verified, is_active, role FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.id]
        );

        if (rows.length === 0) {
            res.status(401);
            throw new Error('User not found');
        }

        const user = rows[0];

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken,
                refreshToken: newRefreshToken
            }
        });

    } catch (error) {
        res.status(401);
        throw new Error('Invalid refresh token');
    }
});

// @desc    Check if phone number is registered
// @route   POST /api/auth/check-phone
// @access  Public
const checkPhoneRegistration = asyncHandler(async (req, res) => {
    const { phone } = req.body;

    // Validate phone number
    const validPhone = ValidationService.validatePhone(phone);

    const connection = getConnection();
    const [existingUser] = await connection.execute(
        'SELECT id, is_verified, is_active FROM users WHERE phone = ?',
        [validPhone]
    );

    const isRegistered = existingUser.length > 0;
    const isActive = isRegistered ? existingUser[0].is_active : false;
    const isVerified = isRegistered ? existingUser[0].is_verified : false;

    res.status(200).json({
        success: true,
        data: {
            phone: validPhone,
            isRegistered,
            isActive,
            isVerified,
            canLogin: isRegistered && isActive && isVerified,
            canRegister: !isRegistered
        }
    });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
    const connection = getConnection();

    // Log activity
    await connection.execute(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [req.user.id, 'LOGOUT', 'User logged out', req.ip]
    );

    // Emit real-time event
    req.io?.emit('user_logout', {
        userId: req.user.id,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = {
    sendOTP,
    verifyOTP,
    resendOTP,
    loginWithOTP,
    refreshToken,
    logout,
    checkPhoneRegistration
};
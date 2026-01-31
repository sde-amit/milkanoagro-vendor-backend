const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const Logger = require('../utils/logger');

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const connection = getConnection();
        const [rows] = await connection.execute(
            'SELECT id, phone, email, is_verified, is_active, role FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.id]
        );

        if (rows.length === 0) {
            return next(new Error('Authentication error: User not found'));
        }

        const user = rows[0];
        socket.userId = user.id;
        socket.userRole = user.role;
        socket.userPhone = user.phone;

        next();
    } catch (error) {
        next(new Error('Authentication error: Invalid token'));
    }
};

// Main socket handler
const socketHandler = (io) => {
    // Use authentication middleware
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        // Join user to their personal room
        socket.join(`user_${socket.userId}`);

        // Join admin users to admin room
        if (socket.userRole === 'admin') {
            socket.join('admin_room');
        }

        // Handle vendor status updates
        socket.on('vendor_status_update', async (data) => {
            try {
                if (socket.userRole !== 'admin') {
                    socket.emit('error', { message: 'Unauthorized action' });
                    return;
                }

                const { vendorId, status, reason } = data;
                const connection = getConnection();

                // Update vendor status
                await connection.execute(
                    'UPDATE vendor_profiles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [status, vendorId]
                );

                // Get vendor details
                const [vendorRows] = await connection.execute(`
                    SELECT vp.*, u.phone FROM vendor_profiles vp
                    JOIN users u ON vp.user_id = u.id
                    WHERE vp.id = ?
                `, [vendorId]);

                if (vendorRows.length > 0) {
                    const vendor = vendorRows[0];

                    // Notify the specific vendor
                    io.to(`user_${vendor.user_id}`).emit('vendor_status_changed', {
                        status,
                        reason,
                        timestamp: new Date().toISOString()
                    });

                    // Notify all admins
                    io.to('admin_room').emit('vendor_status_updated', {
                        vendorId,
                        entityName: vendor.entity_name,
                        status,
                        updatedBy: socket.userId,
                        timestamp: new Date().toISOString()
                    });

                    // Log activity
                    await connection.execute(
                        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
                        [socket.userId, 'VENDOR_STATUS_UPDATED', `Updated vendor ${vendor.entity_name} status to ${status}`, socket.handshake.address]
                    );
                }

            } catch (error) {
                socket.emit('error', { message: 'Failed to update vendor status' });
            }
        });

        // Handle real-time form progress updates
        socket.on('form_progress', (data) => {
            const { step, progress, formData } = data;

            // Broadcast to admins for real-time monitoring
            io.to('admin_room').emit('vendor_form_progress', {
                userId: socket.userId,
                userPhone: socket.userPhone,
                step,
                progress,
                timestamp: new Date().toISOString()
            });
        });

        // Handle OTP verification status
        socket.on('otp_verification_attempt', async (data) => {
            try {
                const { phone, success, attempts } = data;

                // Notify admins about OTP verification attempts
                io.to('admin_room').emit('otp_verification_status', {
                    userId: socket.userId,
                    phone,
                    success,
                    attempts,
                    timestamp: new Date().toISOString()
                });

                // Log suspicious activity (too many failed attempts)
                if (!success && attempts >= 3) {
                    const connection = getConnection();
                    await connection.execute(
                        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
                        [socket.userId, 'SUSPICIOUS_OTP_ACTIVITY', `Multiple failed OTP attempts for ${phone}`, socket.handshake.address]
                    );
                }

            } catch (error) {
                Logger.error('OTP verification tracking error', error);
            }
        });

        // Handle file upload progress
        socket.on('file_upload_progress', (data) => {
            const { fileName, progress, status } = data;

            // Emit progress back to user
            socket.emit('upload_progress_update', {
                fileName,
                progress,
                status,
                timestamp: new Date().toISOString()
            });
        });

        // Handle typing indicators for chat/support
        socket.on('typing_start', (data) => {
            socket.broadcast.to('admin_room').emit('user_typing', {
                userId: socket.userId,
                userPhone: socket.userPhone,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('typing_stop', (data) => {
            socket.broadcast.to('admin_room').emit('user_stopped_typing', {
                userId: socket.userId,
                userPhone: socket.userPhone,
                timestamp: new Date().toISOString()
            });
        });

        // Handle support messages
        socket.on('support_message', async (data) => {
            try {
                const { message, type = 'text' } = data;
                const connection = getConnection();

                // Save message to database (you might want to create a support_messages table)
                // For now, just log it
                await connection.execute(
                    'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
                    [socket.userId, 'SUPPORT_MESSAGE', `Support message: ${message}`, socket.handshake.address]
                );

                // Forward to admin room
                io.to('admin_room').emit('new_support_message', {
                    userId: socket.userId,
                    userPhone: socket.userPhone,
                    message,
                    type,
                    timestamp: new Date().toISOString()
                });

                // Confirm receipt to user
                socket.emit('message_sent', {
                    message: 'Message sent successfully',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle admin responses
        socket.on('admin_response', async (data) => {
            try {
                if (socket.userRole !== 'admin') {
                    socket.emit('error', { message: 'Unauthorized action' });
                    return;
                }

                const { userId, message, type = 'text' } = data;
                const connection = getConnection();

                // Log admin response
                await connection.execute(
                    'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
                    [socket.userId, 'ADMIN_RESPONSE', `Response to user ${userId}: ${message}`, socket.handshake.address]
                );

                // Send to specific user
                io.to(`user_${userId}`).emit('admin_message', {
                    message,
                    type,
                    adminId: socket.userId,
                    timestamp: new Date().toISOString()
                });

                // Confirm to admin
                socket.emit('response_sent', {
                    userId,
                    message: 'Response sent successfully',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                socket.emit('error', { message: 'Failed to send response' });
            }
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            // Notify admins about user disconnect
            io.to('admin_room').emit('user_disconnected', {
                userId: socket.userId,
                userPhone: socket.userPhone,
                reason,
                timestamp: new Date().toISOString()
            });
        });

        // Handle connection errors
        socket.on('error', (error) => {
            Logger.error(`Socket error for user ${socket.userId}`, error);
        });

        // Send welcome message
        socket.emit('connected', {
            message: 'Connected to Milkano Agro India server',
            userId: socket.userId,
            role: socket.userRole,
            timestamp: new Date().toISOString()
        });

        // Notify admins about new connection
        io.to('admin_room').emit('user_connected', {
            userId: socket.userId,
            userPhone: socket.userPhone,
            role: socket.userRole,
            timestamp: new Date().toISOString()
        });
    });

    // Handle connection errors
    io.on('connect_error', (error) => {
        Logger.error('Socket.IO connection error', error);
    });
};

module.exports = socketHandler;
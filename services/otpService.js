const twilio = require('twilio');
const { getConnection } = require('../config/database');
const Logger = require('../utils/logger');

// Initialize Twilio client with better error handling
let twilioClient = null;

function initializeTwilioClient() {
    if (!twilioClient) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
        }

        twilioClient = twilio(accountSid, authToken);
    }

    return twilioClient;
}

class OTPService {
    // Generate 6-digit OTP
    static generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Format phone number to E.164 format
    static formatPhoneNumber(phone) {
        // Remove all non-digits
        const cleanPhone = phone.replace(/\D/g, '');

        // Handle different phone number formats
        if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
            // Already has country code
            return `+${cleanPhone}`;
        } else if (cleanPhone.length === 10) {
            // Indian mobile number without country code
            return `+91${cleanPhone}`;
        } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
            // Indian number with leading 0
            return `+91${cleanPhone.substring(1)}`;
        } else {
            // Assume it needs +91 prefix
            return `+91${cleanPhone}`;
        }
    }

    // Send OTP via SMS
    static async sendOTP(phone, purpose = 'registration') {
        try {
            const connection = getConnection();

            // Clean and format phone number
            const cleanPhone = phone.replace(/\D/g, '');
            const formattedPhone = this.formatPhoneNumber(phone);

            // Check rate limiting - max 3 OTPs per phone per 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const [recentOtps] = await connection.execute(
                'SELECT COUNT(*) as count FROM otps WHERE phone = ? AND created_at > ?',
                [cleanPhone, fiveMinutesAgo]
            );

            if (recentOtps[0].count >= 3) {
                throw new Error('Too many OTP requests. Please wait 5 minutes before requesting another OTP.');
            }

            // Generate OTP
            const otpCode = this.generateOTP();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

            // Save OTP to database
            await connection.execute(
                'INSERT INTO otps (phone, otp_code, purpose, expires_at) VALUES (?, ?, ?, FROM_UNIXTIME(?))',
                [cleanPhone, otpCode, purpose, Math.floor(expiresAt.getTime() / 1000)]
            );

            // Prepare SMS message
            const message = `Your Milkano Agro India verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;

            // Check if we should send real SMS
            const shouldSendSMS = process.env.NODE_ENV === 'production' || process.env.SEND_SMS_IN_DEV === 'true';

            if (shouldSendSMS) {
                try {
                    // Initialize Twilio client
                    const client = initializeTwilioClient();
                    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

                    if (!fromNumber) {
                        throw new Error('Twilio phone number not configured. Please set TWILIO_PHONE_NUMBER');
                    }

                    // Send SMS via Twilio
                    const result = await client.messages.create({
                        body: message,
                        from: fromNumber,
                        to: formattedPhone
                    });

                } catch (twilioError) {
                    // Handle specific Twilio errors
                    if (twilioError.code === 21211) {
                        throw new Error('Invalid phone number format. Please check the phone number.');
                    } else if (twilioError.code === 21614) {
                        throw new Error('Phone number is not valid for SMS delivery.');
                    } else if (twilioError.code === 21408) {
                        throw new Error('SMS service temporarily unavailable. Please try again later.');
                    } else if (twilioError.code === 20003) {
                        throw new Error('Twilio authentication failed. Please check your credentials.');
                    } else if (twilioError.code === 63038) {
                        throw new Error('Daily SMS limit exceeded. Please upgrade your Twilio account.');
                    } else {
                        // Log the OTP for development purposes as fallback
                        throw new Error(`SMS delivery failed: ${twilioError.message} (Code: ${twilioError.code || 'Unknown'})`);
                    }
                }
            } else {
                // Development mode - just log the OTP
                Logger.debug(`DEV MODE - OTP for ${formattedPhone}: ${otpCode}`);
            }

            return {
                success: true,
                message: 'OTP sent successfully',
                phone: cleanPhone,
                expiresAt,
                // Include formatted phone for debugging
                formattedPhone: formattedPhone
            };

        } catch (error) {
            throw error;
        }
    }

    // Verify OTP
    static async verifyOTP(phone, otpCode, purpose = 'registration') {
        try {
            const connection = getConnection();
            const cleanPhone = phone.replace(/\D/g, '');

            // Find valid OTP
            const [rows] = await connection.execute(`
                SELECT id, otp_code, expires_at, attempts, is_used 
                FROM otps 
                WHERE phone = ? AND purpose = ? AND is_used = FALSE 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [cleanPhone, purpose]);

            if (rows.length === 0) {
                throw new Error('No valid OTP found. Please request a new one.');
            }

            const otpRecord = rows[0];

            // Check if OTP is expired
            if (new Date() > new Date(otpRecord.expires_at)) {
                await connection.execute(
                    'UPDATE otps SET is_used = TRUE WHERE id = ?',
                    [otpRecord.id]
                );
                throw new Error('OTP has expired. Please request a new one.');
            }

            // Check attempts (max 3 attempts)
            if (otpRecord.attempts >= 3) {
                await connection.execute(
                    'UPDATE otps SET is_used = TRUE WHERE id = ?',
                    [otpRecord.id]
                );
                throw new Error('Maximum OTP attempts exceeded. Please request a new one.');
            }

            // Verify OTP code
            if (otpRecord.otp_code !== otpCode) {
                // Increment attempts
                await connection.execute(
                    'UPDATE otps SET attempts = attempts + 1 WHERE id = ?',
                    [otpRecord.id]
                );
                throw new Error('Invalid OTP code');
            }

            // Mark OTP as used
            await connection.execute(
                'UPDATE otps SET is_used = TRUE WHERE id = ?',
                [otpRecord.id]
            );

            return {
                success: true,
                message: 'OTP verified successfully',
                phone: cleanPhone
            };

        } catch (error) {
            throw error;
        }
    }

    // Verify Twilio configuration
    static async verifyTwilioConfig() {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

            if (!accountSid || !authToken || !phoneNumber) {
                return {
                    success: false,
                    message: 'Twilio configuration incomplete. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER'
                };
            }

            const client = initializeTwilioClient();

            // Verify account by fetching account details
            const account = await client.api.accounts(accountSid).fetch();

            return {
                success: true,
                message: `Twilio configuration is valid. Account: ${account.friendlyName} (${account.status})`,
                account: {
                    friendlyName: account.friendlyName,
                    status: account.status,
                    type: account.type
                }
            };

        } catch (error) {
            return {
                success: false,
                message: `Twilio configuration error: ${error.message}`
            };
        }
    }

    // Test SMS sending function
    static async testSMS(phoneNumber) {
        try {
            const testMessage = 'Test message from Milkano Agro India - SMS service is working! 🎉';
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            const formattedPhone = this.formatPhoneNumber(phoneNumber);

            const client = initializeTwilioClient();
            const fromNumber = process.env.TWILIO_PHONE_NUMBER;

            if (!fromNumber) {
                throw new Error('Twilio phone number not configured');
            }

            const result = await client.messages.create({
                body: testMessage,
                from: fromNumber,
                to: formattedPhone
            });

            return {
                success: true,
                message: `Test SMS sent successfully to ${formattedPhone}`,
                messageSid: result.sid
            };

        } catch (error) {
            return {
                success: false,
                message: `Test SMS failed: ${error.message}`
            };
        }
    }
    static async cleanExpiredOTPs() {
        try {
            const connection = getConnection();
            const [result] = await connection.execute(
                'DELETE FROM otps WHERE expires_at < NOW() OR is_used = TRUE'
            );

            if (result.affectedRows > 0) {
                Logger.info(`Cleaned ${result.affectedRows} expired/used OTPs`);
            }

            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }

    // Resend OTP (with rate limiting)
    static async resendOTP(phone, purpose = 'registration') {
        try {
            const connection = getConnection();
            const cleanPhone = phone.replace(/\D/g, '');

            // Check if there's a recent OTP (within 1 minute)
            const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
            const [recentOtp] = await connection.execute(
                'SELECT id FROM otps WHERE phone = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1',
                [cleanPhone, oneMinuteAgo]
            );

            if (recentOtp.length > 0) {
                throw new Error('Please wait 1 minute before requesting another OTP');
            }

            // Mark previous OTPs as used
            await connection.execute(
                'UPDATE otps SET is_used = TRUE WHERE phone = ? AND is_used = FALSE',
                [cleanPhone]
            );

            // Send new OTP
            return await this.sendOTP(phone, purpose);

        } catch (error) {
            throw error;
        }
    }
}

module.exports = OTPService;
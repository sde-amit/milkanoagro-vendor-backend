const { connectDB, getConnection } = require('../config/database');
const Logger = require('../utils/logger');
require('dotenv').config();

async function fixConstraints() {
    try {
        // Connect to database first
        await connectDB();
        const connection = getConnection();

        // Drop problematic constraints
        const constraintsToRemove = [
            'chk_expires_future',
            'chk_phone_format',
            'chk_email_format',
            'chk_otp_code_format',
            'chk_attempts_positive',
            'chk_max_attempts_positive'
        ];

        for (const constraint of constraintsToRemove) {
            try {
                await connection.execute(`ALTER TABLE otps DROP CHECK ${constraint}`);
            } catch (error) {
                if (error.code === 'ER_CHECK_CONSTRAINT_NOT_FOUND') {
                    Logger.info(`Constraint ${constraint} not found (already removed)`);
                } else {
                    Logger.warning(`Could not remove ${constraint}: ${error.message}`);
                }
            }
        }

        // Also try to remove from other tables
        const tables = ['users', 'vendor_profiles', 'vendor_onboarding', 'file_uploads', 'activity_logs'];

        for (const table of tables) {
            for (const constraint of constraintsToRemove) {
                try {
                    await connection.execute(`ALTER TABLE ${table} DROP CHECK ${constraint}`);
                } catch (error) {
                    // Ignore errors - constraint might not exist
                }
            }
        }

    } catch (error) {
        Logger.error('Error fixing constraints', error);
    }
}

if (require.main === module) {
    fixConstraints().then(() => process.exit(0));
}

module.exports = fixConstraints;
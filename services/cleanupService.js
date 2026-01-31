const { getConnection } = require('../config/database');
const OTPService = require('./otpService');
const Logger = require('../utils/logger');

class CleanupService {
    // Clean expired OTPs
    static async cleanExpiredOTPs() {
        try {
            const deletedCount = await OTPService.cleanExpiredOTPs();
            if (deletedCount > 0) {
                Logger.info(`Cleaned ${deletedCount} expired OTPs`);
            }
            return deletedCount;
        } catch (error) {
            Logger.error('Error cleaning expired OTPs:', error);
            throw error;
        }
    }

    // Clean old activity logs (older than 90 days)
    static async cleanOldActivityLogs() {
        try {
            const connection = getConnection();
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

            const [result] = await connection.execute(
                'DELETE FROM activity_logs WHERE created_at < ?',
                [ninetyDaysAgo]
            );

            if (result.affectedRows > 0) {
                Logger.info(`Cleaned ${result.affectedRows} old activity logs`);
            }

            return result.affectedRows;
        } catch (error) {
            Logger.error('Error cleaning old activity logs:', error);
            throw error;
        }
    }

    // Clean orphaned file records (files without corresponding S3 objects)
    static async cleanOrphanedFileRecords() {
        try {
            const connection = getConnection();

            // This is a placeholder - in a real implementation, you'd check S3 for file existence
            // For now, we'll just clean files older than 30 days that might be orphaned
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const [result] = await connection.execute(`
                DELETE FROM file_uploads 
                WHERE created_at < ? 
                AND vendor_onboarding_id IS NULL 
                AND category = 'temp'
            `, [thirtyDaysAgo]);

            if (result.affectedRows > 0) {
                Logger.info(`Cleaned ${result.affectedRows} orphaned file records`);
            }

            return result.affectedRows;
        } catch (error) {
            Logger.error('Error cleaning orphaned file records:', error);
            throw error;
        }
    }

    // Clean inactive user sessions (this would be more relevant if you store sessions in DB)
    static async cleanInactiveSessions() {
        try {
            // Placeholder for session cleanup
            // In a real implementation, you might have a sessions table to clean
            Logger.debug('Session cleanup completed (placeholder)');
            return 0;
        } catch (error) {
            Logger.error('Error cleaning inactive sessions:', error);
            throw error;
        }
    }

    // Optimize database tables
    static async optimizeTables() {
        try {
            const connection = getConnection();
            const tables = [
                'users', 'otps', 'vendor_profiles', 'vendor_onboarding',
                'vendor_products', 'file_uploads', 'activity_logs'
            ];

            for (const table of tables) {
                await connection.execute(`OPTIMIZE TABLE ${table}`);
            }

            Logger.info(`Optimized ${tables.length} database tables`);
            return tables.length;
        } catch (error) {
            Logger.error('Error optimizing database tables:', error);
            throw error;
        }
    }

    // Run all cleanup tasks
    static async runAllCleanupTasks() {
        Logger.info('Starting scheduled cleanup tasks...');

        const results = {
            expiredOTPs: 0,
            oldActivityLogs: 0,
            orphanedFiles: 0,
            inactiveSessions: 0,
            optimizedTables: 0,
            errors: []
        };

        try {
            results.expiredOTPs = await this.cleanExpiredOTPs();
        } catch (error) {
            results.errors.push('cleanExpiredOTPs: ' + error.message);
        }

        try {
            results.oldActivityLogs = await this.cleanOldActivityLogs();
        } catch (error) {
            results.errors.push('cleanOldActivityLogs: ' + error.message);
        }

        try {
            results.orphanedFiles = await this.cleanOrphanedFileRecords();
        } catch (error) {
            results.errors.push('cleanOrphanedFileRecords: ' + error.message);
        }

        try {
            results.inactiveSessions = await this.cleanInactiveSessions();
        } catch (error) {
            results.errors.push('cleanInactiveSessions: ' + error.message);
        }

        try {
            results.optimizedTables = await this.optimizeTables();
        } catch (error) {
            results.errors.push('optimizeTables: ' + error.message);
        }

        const totalCleaned = results.expiredOTPs + results.oldActivityLogs + results.orphanedFiles;

        if (results.errors.length === 0) {
            Logger.success(`Cleanup completed successfully. Total items cleaned: ${totalCleaned}`);
        } else {
            Logger.warning(`Cleanup completed with ${results.errors.length} errors. Total items cleaned: ${totalCleaned}`);
            results.errors.forEach(error => Logger.error(error));
        }

        return results;
    }

    // Schedule periodic cleanup
    static startPeriodicCleanup() {
        // Run cleanup every 6 hours
        const cleanupInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

        setInterval(async () => {
            try {
                await this.runAllCleanupTasks();
            } catch (error) {
                Logger.error('Periodic cleanup failed:', error);
            }
        }, cleanupInterval);

        // Run initial cleanup after 5 minutes
        setTimeout(async () => {
            try {
                await this.runAllCleanupTasks();
            } catch (error) {
                Logger.error('Initial cleanup failed:', error);
            }
        }, 5 * 60 * 1000);

        Logger.info('Periodic cleanup service started (runs every 6 hours)');
    }

    // Manual cleanup trigger
    static async manualCleanup() {
        Logger.info('Manual cleanup triggered');
        return await this.runAllCleanupTasks();
    }
}

module.exports = CleanupService;
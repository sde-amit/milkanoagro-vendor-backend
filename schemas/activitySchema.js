/**
 * Activity and Audit Schema Definitions
 * Handles system activity logging, audit trails, and notifications
 */

const activityLogsSchema = `
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT COMMENT 'User who performed the action (NULL for system actions)',
        session_id VARCHAR(128) COMMENT 'Session identifier',
        
        -- Action Information
        action VARCHAR(100) NOT NULL COMMENT 'Action performed (LOGIN, REGISTER, etc.)',
        action_category ENUM('auth', 'vendor', 'admin', 'file', 'system', 'security') DEFAULT 'system' COMMENT 'Category of action',
        action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'other') DEFAULT 'other' COMMENT 'Type of action',
        
        -- Target Information
        target_type VARCHAR(50) COMMENT 'Type of target object (user, vendor, file, etc.)',
        target_id INT COMMENT 'ID of target object',
        target_identifier VARCHAR(255) COMMENT 'Human-readable identifier of target',
        
        -- Action Details
        description TEXT COMMENT 'Detailed description of the action',
        old_values JSON COMMENT 'Previous values (for updates)',
        new_values JSON COMMENT 'New values (for updates)',
        metadata JSON COMMENT 'Additional metadata in JSON format',
        
        -- Request Information
        ip_address VARCHAR(45) COMMENT 'IP address of the request',
        user_agent TEXT COMMENT 'User agent string',
        request_method VARCHAR(10) COMMENT 'HTTP method (GET, POST, etc.)',
        request_url VARCHAR(500) COMMENT 'Request URL',
        request_headers JSON COMMENT 'Request headers (filtered)',
        
        -- Response Information
        response_status INT COMMENT 'HTTP response status code',
        response_time_ms INT COMMENT 'Response time in milliseconds',
        
        -- Status and Classification
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low' COMMENT 'Action severity level',
        status ENUM('success', 'failure', 'warning', 'error') DEFAULT 'success' COMMENT 'Action status',
        is_suspicious BOOLEAN DEFAULT FALSE COMMENT 'Whether action is flagged as suspicious',
        requires_attention BOOLEAN DEFAULT FALSE COMMENT 'Whether action requires admin attention',
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Action timestamp',
        processed_at TIMESTAMP NULL COMMENT 'When log was processed/reviewed',
        
        -- Foreign Keys
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        
        -- Indexes
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_action_category (action_category),
        INDEX idx_action_type (action_type),
        INDEX idx_target_type_id (target_type, target_id),
        INDEX idx_ip_address (ip_address),
        INDEX idx_created_at (created_at),
        INDEX idx_severity (severity),
        INDEX idx_status (status),
        INDEX idx_is_suspicious (is_suspicious),
        INDEX idx_requires_attention (requires_attention),
        INDEX idx_session_id (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System activity and audit logging'
`;

module.exports = {
    activityLogs: {
        tableName: 'activity_logs',
        schema: activityLogsSchema,
        description: 'System activity and audit logging'
    },
    constraints: [
        `ALTER TABLE activity_logs ADD CONSTRAINT chk_response_status_valid CHECK (response_status IS NULL OR (response_status >= 100 AND response_status < 600))`,
        `ALTER TABLE activity_logs ADD CONSTRAINT chk_response_time_positive CHECK (response_time_ms IS NULL OR response_time_ms >= 0)`
    ],
    indexes: [
        `CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(user_id, action, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_activity_logs_suspicious ON activity_logs(is_suspicious, severity, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_activity_logs_cleanup ON activity_logs(created_at, severity)`
    ],
    triggers: []
};
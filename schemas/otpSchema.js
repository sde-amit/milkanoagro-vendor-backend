/**
 * OTP Schema Definition
 * Handles OTP generation, storage, and verification
 */

const otpTableSchema = `
    CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(15) NOT NULL COMMENT 'Phone number for OTP',
        otp_code VARCHAR(6) NOT NULL COMMENT '6-digit OTP code',
        purpose ENUM('registration', 'login', 'verification', 'password_reset') DEFAULT 'registration' COMMENT 'Purpose of OTP',
        expires_at TIMESTAMP NOT NULL COMMENT 'OTP expiration time',
        is_used BOOLEAN DEFAULT FALSE COMMENT 'Whether OTP has been used',
        attempts INT DEFAULT 0 COMMENT 'Number of verification attempts',
        max_attempts INT DEFAULT 3 COMMENT 'Maximum allowed attempts',
        ip_address VARCHAR(45) COMMENT 'IP address from which OTP was requested',
        user_agent TEXT COMMENT 'User agent string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'OTP creation time',
        used_at TIMESTAMP NULL COMMENT 'OTP usage time',
        
        -- Indexes for performance
        INDEX idx_phone_otp (phone, otp_code),
        INDEX idx_phone_purpose (phone, purpose),
        INDEX idx_expires_at (expires_at),
        INDEX idx_is_used (is_used),
        INDEX idx_created_at (created_at),
        INDEX idx_phone_expires (phone, expires_at, is_used)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OTP storage and verification table'
`;

const otpConstraints = [
    `ALTER TABLE otps ADD CONSTRAINT chk_otp_code_format CHECK (otp_code REGEXP '^[0-9]{6}$')`,
    `ALTER TABLE otps ADD CONSTRAINT chk_attempts_positive CHECK (attempts >= 0)`,
    `ALTER TABLE otps ADD CONSTRAINT chk_max_attempts_positive CHECK (max_attempts > 0)`,
    `ALTER TABLE otps ADD CONSTRAINT chk_expires_future CHECK (expires_at > created_at)`
];

const otpIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_otps_cleanup ON otps(expires_at, is_used)`,
    `CREATE INDEX IF NOT EXISTS idx_otps_phone_active ON otps(phone, is_used, expires_at)`
];

const otpTriggers = [
    `
    CREATE TRIGGER IF NOT EXISTS trg_otp_used_timestamp 
    BEFORE UPDATE ON otps 
    FOR EACH ROW 
    BEGIN 
        IF NEW.is_used = TRUE AND OLD.is_used = FALSE THEN 
            SET NEW.used_at = CURRENT_TIMESTAMP; 
        END IF; 
    END
    `
];

module.exports = {
    tableName: 'otps',
    schema: otpTableSchema,
    constraints: otpConstraints,
    indexes: otpIndexes,
    triggers: otpTriggers,
    description: 'OTP generation, storage, and verification management'
};
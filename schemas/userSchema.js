/**
 * User Schema Definition
 * Handles user authentication and basic profile information
 */

const userTableSchema = `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(15) UNIQUE NOT NULL COMMENT 'User phone number (unique identifier)',
        email VARCHAR(255) UNIQUE COMMENT 'User email address',
        is_verified BOOLEAN DEFAULT FALSE COMMENT 'Phone/email verification status',
        is_active BOOLEAN DEFAULT TRUE COMMENT 'Account active status',
        role ENUM('vendor', 'admin') DEFAULT 'vendor' COMMENT 'User role in the system',
        last_login TIMESTAMP NULL COMMENT 'Last login timestamp',
        login_attempts INT DEFAULT 0 COMMENT 'Failed login attempts counter',
        locked_until TIMESTAMP NULL COMMENT 'Account lock expiry time',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation time',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
        
        -- Indexes for performance
        INDEX idx_phone (phone),
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_is_active (is_active),
        INDEX idx_is_verified (is_verified),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User authentication and basic profile table'
`;

const userConstraints = [
    // Add any additional constraints if needed
    `ALTER TABLE users ADD CONSTRAINT chk_phone_format CHECK (phone REGEXP '^[0-9]{10}$')`,
    `ALTER TABLE users ADD CONSTRAINT chk_email_format CHECK (email REGEXP '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' OR email IS NULL)`
];

const userIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone, is_verified)`,
    `CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active)`
];

module.exports = {
    tableName: 'users',
    schema: userTableSchema,
    constraints: userConstraints,
    indexes: userIndexes,
    description: 'User authentication and basic profile management'
};
/**
 * File Management Schema Definition
 * Handles file uploads, storage, and metadata
 */

const fileUploadsSchema = `
    CREATE TABLE IF NOT EXISTS file_uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT 'Reference to users table',
        vendor_onboarding_id INT COMMENT 'Reference to vendor onboarding (optional)',
        
        -- File Information
        file_name VARCHAR(255) NOT NULL COMMENT 'Generated unique file name',
        original_name VARCHAR(255) NOT NULL COMMENT 'Original file name from user',
        file_path VARCHAR(500) NOT NULL COMMENT 'File path/key in storage system',
        file_size INT NOT NULL COMMENT 'File size in bytes',
        mime_type VARCHAR(100) NOT NULL COMMENT 'MIME type of the file',
        file_type ENUM('document', 'image', 'video', 'audio', 'other') DEFAULT 'document' COMMENT 'General file type category',
        file_extension VARCHAR(10) COMMENT 'File extension',
        
        -- Categorization
        category VARCHAR(100) COMMENT 'File category (documents, certificates, etc.)',
        subcategory VARCHAR(100) COMMENT 'File subcategory for better organization',
        document_type ENUM('gstin', 'pan', 'aadhar', 'bank_statement', 'license', 'certificate', 'other') COMMENT 'Specific document type',
        
        -- Storage Information
        storage_provider ENUM('s3', 'local', 'gcs', 'azure') DEFAULT 's3' COMMENT 'Storage provider used',
        s3_bucket VARCHAR(100) COMMENT 'S3 bucket name',
        s3_key VARCHAR(500) COMMENT 'S3 object key',
        s3_url VARCHAR(500) COMMENT 'S3 object URL',
        s3_etag VARCHAR(100) COMMENT 'S3 ETag for integrity',
        
        -- Security and Access
        is_public BOOLEAN DEFAULT FALSE COMMENT 'Whether file is publicly accessible',
        access_level ENUM('private', 'vendor', 'admin', 'public') DEFAULT 'private' COMMENT 'File access level',
        encryption_status ENUM('none', 'at_rest', 'in_transit', 'both') DEFAULT 'at_rest' COMMENT 'Encryption status',
        
        -- Metadata
        file_hash VARCHAR(64) COMMENT 'SHA-256 hash of file content',
        thumbnail_path VARCHAR(500) COMMENT 'Path to thumbnail (for images)',
        metadata JSON COMMENT 'Additional file metadata in JSON format',
        
        -- Status and Tracking
        upload_status ENUM('uploading', 'completed', 'failed', 'processing') DEFAULT 'completed' COMMENT 'Upload status',
        virus_scan_status ENUM('pending', 'clean', 'infected', 'failed') DEFAULT 'pending' COMMENT 'Virus scan status',
        is_verified BOOLEAN DEFAULT FALSE COMMENT 'Whether file has been verified by admin',
        verified_by INT COMMENT 'Admin who verified the file',
        verified_at TIMESTAMP NULL COMMENT 'File verification timestamp',
        
        -- Timestamps
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'File upload time',
        last_accessed TIMESTAMP NULL COMMENT 'Last file access time',
        expires_at TIMESTAMP NULL COMMENT 'File expiration time (if applicable)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
        
        -- Foreign Keys
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vendor_onboarding_id) REFERENCES vendor_onboarding(id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
        
        -- Indexes
        INDEX idx_user_id (user_id),
        INDEX idx_vendor_onboarding_id (vendor_onboarding_id),
        INDEX idx_file_type (file_type),
        INDEX idx_category (category),
        INDEX idx_document_type (document_type),
        INDEX idx_upload_status (upload_status),
        INDEX idx_virus_scan_status (virus_scan_status),
        INDEX idx_is_verified (is_verified),
        INDEX idx_uploaded_at (uploaded_at),
        INDEX idx_expires_at (expires_at),
        INDEX idx_file_hash (file_hash),
        INDEX idx_s3_key (s3_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File upload and storage management'
`;

module.exports = {
    fileUploads: {
        tableName: 'file_uploads',
        schema: fileUploadsSchema,
        description: 'File upload and storage management'
    },
    constraints: [
        `ALTER TABLE file_uploads ADD CONSTRAINT chk_file_size_positive CHECK (file_size > 0)`,
        `ALTER TABLE file_uploads ADD CONSTRAINT chk_file_extension_format CHECK (file_extension REGEXP '^\\.[a-zA-Z0-9]{1,10}$' OR file_extension IS NULL)`,
        `ALTER TABLE file_uploads ADD CONSTRAINT chk_file_hash_format CHECK (file_hash REGEXP '^[a-fA-F0-9]{64}$' OR file_hash IS NULL)`,
        `ALTER TABLE file_uploads ADD CONSTRAINT chk_expires_future CHECK (expires_at IS NULL OR expires_at > created_at)`
    ],
    indexes: [
        `CREATE INDEX IF NOT EXISTS idx_file_uploads_user_category ON file_uploads(user_id, category)`,
        `CREATE INDEX IF NOT EXISTS idx_file_uploads_type_status ON file_uploads(file_type, upload_status)`,
        `CREATE INDEX IF NOT EXISTS idx_file_uploads_vendor_document ON file_uploads(vendor_onboarding_id, document_type)`,
        `CREATE INDEX IF NOT EXISTS idx_file_uploads_cleanup ON file_uploads(expires_at, upload_status)`
    ],
    triggers: [
        `
        CREATE TRIGGER IF NOT EXISTS trg_file_extension_extract 
        BEFORE INSERT ON file_uploads 
        FOR EACH ROW 
        BEGIN 
            IF NEW.file_extension IS NULL THEN 
                SET NEW.file_extension = SUBSTRING(NEW.original_name, LOCATE('.', NEW.original_name)); 
            END IF; 
        END
        `
    ]
};
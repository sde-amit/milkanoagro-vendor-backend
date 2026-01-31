const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const crypto = require('crypto');
const { getConnection } = require('../config/database');

// Validate required environment variables
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.S3_BUCKET_NAME) {
    console.error("❌ Missing AWS S3 configuration:");
    console.error("AWS_REGION:", process.env.AWS_REGION ? "✓" : "✗");
    console.error("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "✓" : "✗");
    console.error("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "✓" : "✗");
    console.error("S3_BUCKET_NAME:", process.env.S3_BUCKET_NAME ? "✓" : "✗");
    throw new Error("Missing required AWS S3 configuration in environment variables");
}

// AWS SDK v3 S3 client
let s3;
try {
    s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
} catch (error) {
    console.error("❌ Failed to initialize S3Client:", error);
    throw error;
}

class UploadService {
    // File type validation
    static allowedExtensions = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|csv|txt/;

    static allowedMimeTypes = {
        images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        documents: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/excel',
            'application/csv',
            'text/csv',
            'text/comma-separated-values',
            'text/plain'
        ]
    };

    // Get file category based on mime type
    static getFileCategory(mimetype) {
        if (this.allowedMimeTypes.images.includes(mimetype)) {
            return 'image';
        } else if (this.allowedMimeTypes.documents.includes(mimetype)) {
            return 'document';
        }
        return 'other';
    }

    // File filter function
    static fileFilter = (req, file, cb) => {
        try {
            const ext = path.extname(file.originalname).toLowerCase();
            const mimetype = file.mimetype;

            // Validate both extension and mimetype for better security
            const validMimetypes = /image\/(jpeg|jpg|png|gif|webp)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|excel|csv)|text\/(plain|csv|comma-separated-values)/;

            if (UploadService.allowedExtensions.test(ext) && validMimetypes.test(mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT. Received: ${mimetype}`));
            }
        } catch (error) {
            cb(error);
        }
    };

    // Generate unique filename with date organization
    static generateFileName(originalName, category = 'general') {
        const ext = path.extname(originalName).toLowerCase();
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Organize files by date and category: vendor-documents/2025/01/07/category/timestamp-random.ext
        const filename = `vendor-documents/${year}/${month}/${day}/${category}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        return filename;
    };

    // Configure multer for S3 upload
    static createS3Upload() {
        return multer({
            storage: multerS3({
                s3: s3,
                bucket: process.env.S3_BUCKET_NAME,
                contentType: multerS3.AUTO_CONTENT_TYPE,
                metadata: function (req, file, cb) {
                    try {
                        cb(null, {
                            fieldName: file.fieldname,
                            originalName: file.originalname,
                            uploadedBy: req.user?.id?.toString() || 'anonymous',
                            uploadedAt: new Date().toISOString(),
                            category: req.body.category || 'general'
                        });
                    } catch (error) {
                        cb(error);
                    }
                },
                key: function (req, file, cb) {
                    try {
                        const category = req.body.category || file.fieldname || 'general';
                        const filename = UploadService.generateFileName(file.originalname, category);
                        cb(null, filename);
                    } catch (error) {
                        cb(error);
                    }
                }
            }),
            fileFilter: this.fileFilter,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
                files: 10 // Maximum 10 files per request
            }
        });
    }

    // Save file info to database
    static async saveFileInfo(userId, fileData, vendorOnboardingId = null, category = null) {
        try {
            const connection = getConnection();

            const fileInfo = {
                user_id: userId,
                vendor_onboarding_id: vendorOnboardingId,
                file_name: fileData.key.split('/').pop(),
                original_name: fileData.originalname,
                file_path: fileData.key,
                file_size: fileData.size,
                mime_type: fileData.mimetype,
                file_type: this.getFileCategory(fileData.mimetype),
                category: category || fileData.metadata?.category || 'general',
                s3_url: fileData.location
            };

            const [result] = await connection.execute(`
                INSERT INTO file_uploads 
                (user_id, vendor_onboarding_id, file_name, original_name, file_path, file_size, mime_type, file_type, category, s3_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                fileInfo.user_id,
                fileInfo.vendor_onboarding_id,
                fileInfo.file_name,
                fileInfo.original_name,
                fileInfo.file_path,
                fileInfo.file_size,
                fileInfo.mime_type,
                fileInfo.file_type,
                fileInfo.category,
                fileInfo.s3_url
            ]);

            return {
                id: result.insertId,
                ...fileInfo
            };

        } catch (error) {
            console.error('❌ Error saving file info:', error.message);
            throw error;
        }
    }

    // Get signed URL for private file access (AWS SDK v3)
    static async getSignedUrl(fileKey, expiresIn = 3600) {
        try {
            const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
            const { GetObjectCommand } = require('@aws-sdk/client-s3');

            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileKey,
            });

            const signedUrl = await getSignedUrl(s3, command, { expiresIn });
            return signedUrl;

        } catch (error) {
            console.error('❌ Error generating signed URL:', error.message);
            throw new Error('Failed to generate file access URL');
        }
    }

    // Delete file from S3 (AWS SDK v3)
    static async deleteFile(fileKey) {
        try {
            const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

            const command = new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileKey
            });

            await s3.send(command);

        } catch (error) {
            console.error('❌ Error deleting file from S3:', error.message);
            throw error;
        }
    }

    // Get user files
    static async getUserFiles(userId, vendorOnboardingId = null) {
        try {
            const connection = getConnection();

            let query = `
                SELECT id, file_name, original_name, file_path, file_size, mime_type, 
                       file_type, category, s3_url, created_at
                FROM file_uploads 
                WHERE user_id = ?
            `;
            const params = [userId];

            if (vendorOnboardingId) {
                query += ' AND vendor_onboarding_id = ?';
                params.push(vendorOnboardingId);
            }

            query += ' ORDER BY created_at DESC';

            const [rows] = await connection.execute(query, params);

            // Generate signed URLs for private files
            const filesWithUrls = await Promise.all(rows.map(async (file) => {
                try {
                    const signedUrl = await this.getSignedUrl(file.file_path);
                    return {
                        ...file,
                        downloadUrl: signedUrl
                    };
                } catch (error) {
                    console.error(`Error generating URL for file ${file.id}:`, error.message);
                    return {
                        ...file,
                        downloadUrl: null
                    };
                }
            }));

            return filesWithUrls;

        } catch (error) {
            console.error('❌ Error fetching user files:', error.message);
            throw error;
        }
    }

    // Delete file record and S3 file
    static async deleteFileRecord(fileId, userId) {
        try {
            const connection = getConnection();

            // Get file info first
            const [rows] = await connection.execute(
                'SELECT file_path FROM file_uploads WHERE id = ? AND user_id = ?',
                [fileId, userId]
            );

            if (rows.length === 0) {
                throw new Error('File not found or access denied');
            }

            const filePath = rows[0].file_path;

            // Delete from S3
            await this.deleteFile(filePath);

            // Delete from database
            await connection.execute(
                'DELETE FROM file_uploads WHERE id = ? AND user_id = ?',
                [fileId, userId]
            );

        } catch (error) {
            console.error('❌ Error deleting file record:', error.message);
            throw error;
        }
    }

    // Validate file before upload
    static validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            ...this.allowedMimeTypes.images,
            ...this.allowedMimeTypes.documents
        ];

        if (!file) {
            throw new Error('No file provided');
        }

        if (file.size > maxSize) {
            throw new Error('File size exceeds 10MB limit');
        }

        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error(`File type ${file.mimetype} is not allowed`);
        }

        return true;
    }

    // Bulk file upload
    static async uploadMultipleFiles(files, userId, vendorOnboardingId = null, category = null) {
        try {
            const uploadedFiles = [];

            for (const file of files) {
                this.validateFile(file);
                const fileInfo = await this.saveFileInfo(userId, file, vendorOnboardingId, category);
                uploadedFiles.push(fileInfo);
            }

            return uploadedFiles;

        } catch (error) {
            console.error('❌ Error in bulk file upload:', error.message);
            throw error;
        }
    }
}

module.exports = UploadService;
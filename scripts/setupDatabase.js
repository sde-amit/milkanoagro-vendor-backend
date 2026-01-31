const mysql = require('mysql2/promise');
const colors = require('colors');
require('dotenv').config();

const setupDatabase = async () => {
    let connection;

    try {
        console.log('🔄 Setting up database...'.yellow);

        // Connect to MySQL without specifying database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            charset: 'utf8mb4'
        });

        console.log(`✅ Connected to MySQL server: ${process.env.DB_HOST}`.cyan);

        // Create database if it doesn't exist
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`✅ Database '${process.env.DB_NAME}' created/verified`.green);

        // Close connection and reconnect to the specific database
        await connection.end();

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4'
        });

        // Create tables
        console.log('🔄 Creating tables...'.yellow);

        // Users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone VARCHAR(15) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE,
                is_verified BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                role ENUM('vendor', 'admin') DEFAULT 'vendor',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_phone (phone),
                INDEX idx_email (email)
            )
        `);
        console.log('✅ Users table created'.green);

        // OTPs table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS otps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone VARCHAR(15) NOT NULL,
                otp_code VARCHAR(6) NOT NULL,
                purpose ENUM('registration', 'login', 'verification') DEFAULT 'registration',
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                attempts INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_phone_otp (phone, otp_code),
                INDEX idx_expires (expires_at)
            )
        `);
        console.log('✅ OTPs table created'.green);

        // Vendor profiles table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS vendor_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                entity_type VARCHAR(100),
                entity_name VARCHAR(255),
                supplier_type VARCHAR(100),
                state VARCHAR(100),
                city VARCHAR(100),
                pincode VARCHAR(10),
                authorized_person_name VARCHAR(255),
                contact_number VARCHAR(15),
                email VARCHAR(255),
                category VARCHAR(255),
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status)
            )
        `);
        console.log('✅ Vendor profiles table created'.green);

        // Vendor onboarding table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS vendor_onboarding (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                company_type VARCHAR(100),
                supply_to VARCHAR(100),
                state VARCHAR(100),
                city VARCHAR(100),
                multiple_store VARCHAR(100),
                
                name_of_authorized_person VARCHAR(255),
                name_of_entity VARCHAR(255),
                name_of_establishment VARCHAR(255),
                type_of_supplier VARCHAR(100),
                gstin_number VARCHAR(20),
                mobile_no VARCHAR(15),
                email_id VARCHAR(255),
                
                building_name VARCHAR(255),
                flat_no VARCHAR(100),
                ward_no VARCHAR(100),
                reg_state VARCHAR(100),
                reg_dist VARCHAR(100),
                reg_pincode VARCHAR(10),
                
                same_as_registered BOOLEAN DEFAULT FALSE,
                corr_building_name VARCHAR(255),
                corr_flat_no VARCHAR(100),
                corr_ward_no VARCHAR(100),
                corr_state VARCHAR(100),
                corr_dist VARCHAR(100),
                corr_pincode VARCHAR(10),
                
                contact_person VARCHAR(255),
                designation VARCHAR(100),
                mobile_number VARCHAR(15),
                email_address VARCHAR(255),
                
                gstin_reg_no VARCHAR(20),
                vat_cst VARCHAR(50),
                tin_no VARCHAR(50),
                import_export_code VARCHAR(50),
                
                account_no VARCHAR(50),
                bank_name VARCHAR(255),
                branch VARCHAR(255),
                ifsc_code VARCHAR(15),
                
                credit_period VARCHAR(50),
                electronic_credit VARCHAR(10),
                lead_time_delivery VARCHAR(50),
                buying_module VARCHAR(100),
                margin_percent VARCHAR(10),
                
                status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status)
            )
        `);
        console.log('✅ Vendor onboarding table created'.green);

        // Vendor products table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS vendor_products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_onboarding_id INT NOT NULL,
                product_category VARCHAR(100),
                sub_category VARCHAR(100),
                micro_category VARCHAR(100),
                brand VARCHAR(100),
                product_name VARCHAR(255),
                quantity INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_onboarding_id) REFERENCES vendor_onboarding(id) ON DELETE CASCADE,
                INDEX idx_vendor_onboarding (vendor_onboarding_id)
            )
        `);
        console.log('✅ Vendor products table created'.green);

        // File uploads table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS file_uploads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                vendor_onboarding_id INT,
                file_name VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INT,
                mime_type VARCHAR(100),
                file_type ENUM('document', 'image', 'other') DEFAULT 'document',
                category VARCHAR(100),
                s3_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (vendor_onboarding_id) REFERENCES vendor_onboarding(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_vendor_onboarding (vendor_onboarding_id)
            )
        `);
        console.log('✅ File uploads table created'.green);

        // Activity logs table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action VARCHAR(100) NOT NULL,
                description TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_action (action),
                INDEX idx_created_at (created_at)
            )
        `);
        console.log('✅ Activity logs table created'.green);

        // Create a default admin user
        const adminPhone = '9999999999';
        const [existingAdmin] = await connection.execute(
            'SELECT id FROM users WHERE phone = ?',
            [adminPhone]
        );

        if (existingAdmin.length === 0) {
            await connection.execute(
                'INSERT INTO users (phone, is_verified, role) VALUES (?, TRUE, "admin")',
                [adminPhone]
            );
            console.log(`✅ Default admin user created with phone: ${adminPhone}`.green);
        } else {
            console.log(`ℹ️  Admin user already exists with phone: ${adminPhone}`.blue);
        }

        console.log('🎉 Database setup completed successfully!'.green.bold);
        console.log('📝 You can now start the server with: npm run dev'.cyan);

    } catch (error) {
        console.error(`❌ Database setup failed: ${error.message}`.red.bold);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
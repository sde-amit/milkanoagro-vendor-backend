/**
 * Vendor Schema Definitions
 * Handles vendor profiles, onboarding, and product information
 */

const vendorProfileSchema = `
    CREATE TABLE IF NOT EXISTS vendor_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT 'Reference to users table',
        entity_type VARCHAR(100) COMMENT 'Type of business entity',
        entity_name VARCHAR(255) NOT NULL COMMENT 'Legal name of the entity',
        supplier_type VARCHAR(100) COMMENT 'Type of supplier (Manufacturer, Trader, etc.)',
        state VARCHAR(100) NOT NULL COMMENT 'State of operation',
        city VARCHAR(100) NOT NULL COMMENT 'City of operation',
        pincode VARCHAR(10) NOT NULL COMMENT 'Postal code',
        authorized_person_name VARCHAR(255) NOT NULL COMMENT 'Name of authorized person',
        contact_number VARCHAR(15) NOT NULL COMMENT 'Primary contact number',
        email VARCHAR(255) COMMENT 'Business email address',
        category VARCHAR(255) COMMENT 'Business category/products dealt with',
        terms_accepted BOOLEAN DEFAULT FALSE COMMENT 'Terms and conditions acceptance',
        status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending' COMMENT 'Approval status',
        rejection_reason TEXT COMMENT 'Reason for rejection if applicable',
        approved_by INT COMMENT 'Admin user who approved',
        approved_at TIMESTAMP NULL COMMENT 'Approval timestamp',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Profile creation time',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
        
        -- Foreign Keys
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        
        -- Indexes
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_state_city (state, city),
        INDEX idx_entity_name (entity_name),
        INDEX idx_contact_number (contact_number),
        INDEX idx_created_at (created_at),
        INDEX idx_approved_at (approved_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vendor profile and basic information'
`;

const vendorOnboardingSchema = `
    CREATE TABLE IF NOT EXISTS vendor_onboarding (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT 'Reference to users table',
        
        -- Profile Information
        company_type VARCHAR(100) COMMENT 'Company type (Private Limited, etc.)',
        supply_to VARCHAR(100) COMMENT 'Supply destination type',
        state VARCHAR(100) COMMENT 'Operating state',
        city VARCHAR(100) COMMENT 'Operating city',
        multiple_store VARCHAR(100) COMMENT 'Multiple store selection',
        
        -- Entity Details
        name_of_authorized_person VARCHAR(255) COMMENT 'Authorized person name',
        name_of_entity VARCHAR(255) COMMENT 'Legal entity name',
        name_of_establishment VARCHAR(255) COMMENT 'Establishment name',
        type_of_supplier VARCHAR(100) COMMENT 'Supplier type',
        gstin_number VARCHAR(20) COMMENT 'GST identification number',
        mobile_no VARCHAR(15) COMMENT 'Mobile number',
        email_id VARCHAR(255) COMMENT 'Email address',
        
        -- Registered Address
        building_name VARCHAR(255) COMMENT 'Building name/number',
        flat_no VARCHAR(100) COMMENT 'Flat/unit number',
        ward_no VARCHAR(100) COMMENT 'Ward number',
        reg_state VARCHAR(100) COMMENT 'Registered address state',
        reg_dist VARCHAR(100) COMMENT 'Registered address district',
        reg_pincode VARCHAR(10) COMMENT 'Registered address pincode',
        
        -- Correspondence Address
        same_as_registered BOOLEAN DEFAULT FALSE COMMENT 'Same as registered address flag',
        corr_building_name VARCHAR(255) COMMENT 'Correspondence building name',
        corr_flat_no VARCHAR(100) COMMENT 'Correspondence flat number',
        corr_ward_no VARCHAR(100) COMMENT 'Correspondence ward number',
        corr_state VARCHAR(100) COMMENT 'Correspondence state',
        corr_dist VARCHAR(100) COMMENT 'Correspondence district',
        corr_pincode VARCHAR(10) COMMENT 'Correspondence pincode',
        
        -- Contact Details
        contact_person VARCHAR(255) COMMENT 'Primary contact person',
        designation VARCHAR(100) COMMENT 'Contact person designation',
        mobile_number VARCHAR(15) COMMENT 'Contact mobile number',
        email_address VARCHAR(255) COMMENT 'Contact email address',
        
        -- Tax Details
        gstin_reg_no VARCHAR(20) COMMENT 'GSTIN registration number',
        vat_cst VARCHAR(50) COMMENT 'VAT/CST number',
        tin_no VARCHAR(50) COMMENT 'TIN number',
        import_export_code VARCHAR(50) COMMENT 'Import/Export code',
        
        -- Bank Details
        account_no VARCHAR(50) COMMENT 'Bank account number',
        bank_name VARCHAR(255) COMMENT 'Bank name',
        branch VARCHAR(255) COMMENT 'Bank branch',
        ifsc_code VARCHAR(15) COMMENT 'IFSC code',
        
        -- TGT Terms
        credit_period VARCHAR(50) COMMENT 'Credit period terms',
        electronic_credit VARCHAR(10) COMMENT 'Electronic credit acceptance',
        lead_time_delivery VARCHAR(50) COMMENT 'Lead time for delivery',
        buying_module VARCHAR(100) COMMENT 'Buying module preference',
        margin_percent VARCHAR(10) COMMENT 'Margin percentage',
        
        -- Status and Tracking
        status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'requires_changes') DEFAULT 'draft' COMMENT 'Onboarding status',
        completion_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Form completion percentage',
        submitted_at TIMESTAMP NULL COMMENT 'Form submission time',
        reviewed_by INT COMMENT 'Admin who reviewed',
        reviewed_at TIMESTAMP NULL COMMENT 'Review timestamp',
        review_notes TEXT COMMENT 'Review notes/feedback',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
        
        -- Foreign Keys
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        
        -- Indexes
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_gstin_number (gstin_number),
        INDEX idx_mobile_no (mobile_no),
        INDEX idx_email_id (email_id),
        INDEX idx_submitted_at (submitted_at),
        INDEX idx_reviewed_at (reviewed_at),
        INDEX idx_completion_percentage (completion_percentage)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Detailed vendor onboarding information'
`;

const vendorProductsSchema = `
    CREATE TABLE IF NOT EXISTS vendor_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_onboarding_id INT NOT NULL COMMENT 'Reference to vendor onboarding',
        product_category VARCHAR(100) NOT NULL COMMENT 'Main product category',
        sub_category VARCHAR(100) COMMENT 'Product sub-category',
        micro_category VARCHAR(100) COMMENT 'Micro category/specific type',
        brand VARCHAR(100) COMMENT 'Product brand',
        product_name VARCHAR(255) NOT NULL COMMENT 'Product name/description',
        quantity INT DEFAULT 0 COMMENT 'Available quantity',
        unit VARCHAR(50) DEFAULT 'pieces' COMMENT 'Unit of measurement',
        price_per_unit DECIMAL(10,2) COMMENT 'Price per unit',
        minimum_order_quantity INT COMMENT 'Minimum order quantity',
        product_description TEXT COMMENT 'Detailed product description',
        product_specifications JSON COMMENT 'Product specifications in JSON format',
        is_active BOOLEAN DEFAULT TRUE COMMENT 'Product active status',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Product addition time',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
        
        -- Foreign Keys
        FOREIGN KEY (vendor_onboarding_id) REFERENCES vendor_onboarding(id) ON DELETE CASCADE,
        
        -- Indexes
        INDEX idx_vendor_onboarding (vendor_onboarding_id),
        INDEX idx_product_category (product_category),
        INDEX idx_sub_category (sub_category),
        INDEX idx_brand (brand),
        INDEX idx_product_name (product_name),
        INDEX idx_is_active (is_active),
        INDEX idx_category_subcategory (product_category, sub_category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vendor product catalog'
`;

const vendorConstraints = [
    `ALTER TABLE vendor_profiles ADD CONSTRAINT chk_pincode_format CHECK (pincode REGEXP '^[0-9]{6}$')`,
    `ALTER TABLE vendor_profiles ADD CONSTRAINT chk_contact_number_format CHECK (contact_number REGEXP '^[0-9]{10}$')`,
    `ALTER TABLE vendor_onboarding ADD CONSTRAINT chk_reg_pincode_format CHECK (reg_pincode REGEXP '^[0-9]{6}$')`,
    `ALTER TABLE vendor_onboarding ADD CONSTRAINT chk_corr_pincode_format CHECK (corr_pincode REGEXP '^[0-9]{6}$' OR corr_pincode IS NULL)`,
    `ALTER TABLE vendor_onboarding ADD CONSTRAINT chk_mobile_format CHECK (mobile_no REGEXP '^[0-9]{10}$')`,
    `ALTER TABLE vendor_onboarding ADD CONSTRAINT chk_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100)`,
    `ALTER TABLE vendor_products ADD CONSTRAINT chk_quantity_positive CHECK (quantity >= 0)`,
    `ALTER TABLE vendor_products ADD CONSTRAINT chk_price_positive CHECK (price_per_unit IS NULL OR price_per_unit >= 0)`,
    `ALTER TABLE vendor_products ADD CONSTRAINT chk_min_order_positive CHECK (minimum_order_quantity IS NULL OR minimum_order_quantity > 0)`
];

const vendorIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_vendor_profiles_status_created ON vendor_profiles(status, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_vendor_onboarding_status_submitted ON vendor_onboarding(status, submitted_at)`,
    `CREATE INDEX IF NOT EXISTS idx_vendor_products_category_active ON vendor_products(product_category, is_active)`
];

module.exports = {
    vendorProfile: {
        tableName: 'vendor_profiles',
        schema: vendorProfileSchema,
        description: 'Vendor profile and basic business information'
    },
    vendorOnboarding: {
        tableName: 'vendor_onboarding',
        schema: vendorOnboardingSchema,
        description: 'Detailed vendor onboarding form data'
    },
    vendorProducts: {
        tableName: 'vendor_products',
        schema: vendorProductsSchema,
        description: 'Vendor product catalog and inventory'
    },
    constraints: vendorConstraints,
    indexes: vendorIndexes
};
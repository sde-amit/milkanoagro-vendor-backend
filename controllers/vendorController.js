const asyncHandler = require('express-async-handler');
const { getConnection } = require('../config/database');
const ValidationService = require('../services/validationService');

// @desc    Register new vendor
// @route   POST /api/vendor/register
// @access  Public
const registerVendor = asyncHandler(async (req, res) => {
    const connection = getConnection();

    // Validate input data
    const validatedData = ValidationService.validateVendorRegistration(req.body);

    // Check if phone number already exists
    const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE phone = ?',
        [validatedData.contactNumber]
    );

    if (existingUser.length > 0) {
        res.status(400);
        throw new Error('Phone number already registered');
    }

    // Check if email already exists
    if (validatedData.email) {
        const [existingEmail] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [validatedData.email]
        );

        if (existingEmail.length > 0) {
            res.status(400);
            throw new Error('Email already registered');
        }
    }

    // Create user
    const [userResult] = await connection.execute(
        'INSERT INTO users (phone, email, is_verified, role) VALUES (?, ?, FALSE, "vendor")',
        [validatedData.contactNumber, validatedData.email]
    );

    const userId = userResult.insertId;

    // Create vendor profile
    const [profileResult] = await connection.execute(`
        INSERT INTO vendor_profiles 
        (user_id, entity_type, entity_name, supplier_type, state, city, pincode, 
         authorized_person_name, contact_number, email, category, terms_accepted, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
        userId,
        validatedData.entityType,
        validatedData.entityName,
        validatedData.supplierType,
        validatedData.state,
        validatedData.city,
        validatedData.pincode,
        validatedData.authorizedPersonName,
        validatedData.contactNumber,
        validatedData.email,
        validatedData.category,
        validatedData.termsAccepted || false
    ]);

    // Log activity
    await connection.execute(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [userId, 'VENDOR_REGISTERED', 'Vendor registration completed', req.ip]
    );

    // Emit real-time event
    req.io?.emit('vendor_registered', {
        userId,
        entityName: validatedData.entityName,
        contactNumber: validatedData.contactNumber,
        timestamp: new Date().toISOString()
    });

    res.status(201).json({
        success: true,
        message: 'Vendor registered successfully. Please verify your phone number.',
        data: {
            userId,
            profileId: profileResult.insertId,
            phone: validatedData.contactNumber,
            email: validatedData.email,
            status: 'pending'
        }
    });
});

// @desc    Submit vendor onboarding form
// @route   POST /api/vendor/onboarding
// @access  Private (Verified users only)
const submitOnboardingForm = asyncHandler(async (req, res) => {
    const connection = getConnection();
    const userId = req.user.id;

    // Check if this is a draft save (from query parameter or request body)
    const isDraft = req.query.draft === 'true' || req.body.isDraft === true || req.body.isDraft === 'true';

    // Debug logging
    console.log('🔍 Onboarding Debug:', {
        queryDraft: req.query.draft,
        bodyIsDraft: req.body.isDraft,
        bodyIsDraftType: typeof req.body.isDraft,
        isDraft: isDraft,
        hasProducts: !!req.body.products,
        productsLength: req.body.products?.length || 0,
        firstProduct: req.body.products?.[0] || null
    });

    // Use appropriate validation based on whether it's a draft or final submission
    const validatedData = isDraft
        ? ValidationService.validateVendorOnboarding(req.body)
        : ValidationService.validateVendorOnboardingFinal(req.body);

    // Convert empty strings to null for fields with database constraints
    // Note: Database constraints expect exact formats or NULL
    if (validatedData.regPincode === '') validatedData.regPincode = null;
    if (validatedData.corrPincode === '') validatedData.corrPincode = null;
    if (validatedData.mobileNo === '') validatedData.mobileNo = null;
    if (validatedData.mobileNumber === '') validatedData.mobileNumber = null;

    // Check if user already has an onboarding record
    const [existingOnboarding] = await connection.execute(
        'SELECT id FROM vendor_onboarding WHERE user_id = ?',
        [userId]
    );

    let onboardingId;

    if (existingOnboarding.length > 0) {
        // Update existing record
        onboardingId = existingOnboarding[0].id;

        await connection.execute(`
            UPDATE vendor_onboarding SET
                company_type = ?, supply_to = ?, state = ?, city = ?, multiple_store = ?,
                name_of_authorized_person = ?, name_of_entity = ?, name_of_establishment = ?,
                type_of_supplier = ?, gstin_number = ?, mobile_no = ?, email_id = ?,
                building_name = ?, flat_no = ?, ward_no = ?, reg_state = ?, reg_dist = ?, reg_pincode = ?,
                same_as_registered = ?, corr_building_name = ?, corr_flat_no = ?, corr_ward_no = ?,
                corr_state = ?, corr_dist = ?, corr_pincode = ?,
                contact_person = ?, designation = ?, mobile_number = ?, email_address = ?,
                gstin_reg_no = ?, vat_cst = ?, tin_no = ?, import_export_code = ?,
                account_no = ?, bank_name = ?, branch = ?, ifsc_code = ?,
                credit_period = ?, electronic_credit = ?, lead_time_delivery = ?,
                buying_module = ?, margin_percent = ?, status = 'submitted',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            validatedData.companyType, validatedData.supplyTo, validatedData.state,
            validatedData.city, validatedData.multipleStore, validatedData.nameOfAuthorizedPerson,
            validatedData.nameOfEntity, validatedData.nameOfEstablishment, validatedData.typeOfSupplier,
            validatedData.gstinNumber, validatedData.mobileNo, validatedData.emailId,
            validatedData.buildingName, validatedData.flatNo, validatedData.wardNo,
            validatedData.state, validatedData.regDist, validatedData.regPincode,
            validatedData.sameAsRegistered, validatedData.corrBuildingName, validatedData.corrFlatNo,
            validatedData.corrWardNo, validatedData.corrState, validatedData.corrDist,
            validatedData.corrPincode, validatedData.contactPerson, validatedData.designation,
            validatedData.mobileNumber, validatedData.emailAddress, validatedData.gstinRegNo,
            validatedData.vatCst, validatedData.tinNo, validatedData.importExportCode,
            validatedData.accountNo, validatedData.bankName, validatedData.branch,
            validatedData.ifscCode, validatedData.creditPeriod, validatedData.electronicCredit,
            validatedData.leadTimeDelivery, validatedData.buyingModule, validatedData.marginPercent,
            onboardingId
        ]);

        // Delete existing products
        await connection.execute(
            'DELETE FROM vendor_products WHERE vendor_onboarding_id = ?',
            [onboardingId]
        );

    } else {
        // Create new record
        const [onboardingResult] = await connection.execute(`
            INSERT INTO vendor_onboarding 
            (user_id, company_type, supply_to, state, city, multiple_store,
             name_of_authorized_person, name_of_entity, name_of_establishment,
             type_of_supplier, gstin_number, mobile_no, email_id,
             building_name, flat_no, ward_no, reg_state, reg_dist, reg_pincode,
             same_as_registered, corr_building_name, corr_flat_no, corr_ward_no,
             corr_state, corr_dist, corr_pincode,
             contact_person, designation, mobile_number, email_address,
             gstin_reg_no, vat_cst, tin_no, import_export_code,
             account_no, bank_name, branch, ifsc_code,
             credit_period, electronic_credit, lead_time_delivery,
             buying_module, margin_percent, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
        `, [
            userId, validatedData.companyType, validatedData.supplyTo, validatedData.state,
            validatedData.city, validatedData.multipleStore, validatedData.nameOfAuthorizedPerson,
            validatedData.nameOfEntity, validatedData.nameOfEstablishment, validatedData.typeOfSupplier,
            validatedData.gstinNumber, validatedData.mobileNo, validatedData.emailId,
            validatedData.buildingName, validatedData.flatNo, validatedData.wardNo,
            validatedData.state, validatedData.regDist, validatedData.regPincode,
            validatedData.sameAsRegistered, validatedData.corrBuildingName, validatedData.corrFlatNo,
            validatedData.corrWardNo, validatedData.corrState, validatedData.corrDist,
            validatedData.corrPincode, validatedData.contactPerson, validatedData.designation,
            validatedData.mobileNumber, validatedData.emailAddress, validatedData.gstinRegNo,
            validatedData.vatCst, validatedData.tinNo, validatedData.importExportCode,
            validatedData.accountNo, validatedData.bankName, validatedData.branch,
            validatedData.ifscCode, validatedData.creditPeriod, validatedData.electronicCredit,
            validatedData.leadTimeDelivery, validatedData.buyingModule, validatedData.marginPercent
        ]);

        onboardingId = onboardingResult.insertId;
    }

    // Insert products
    if (validatedData.products && validatedData.products.length > 0) {
        for (const product of validatedData.products) {
            await connection.execute(`
                INSERT INTO vendor_products 
                (vendor_onboarding_id, product_category, sub_category, micro_category, 
                 brand, product_name, quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                onboardingId,
                product.productCategory,
                product.subCategory,
                product.microCategory,
                product.brand,
                product.productName,
                product.quantity
            ]);
        }
    }

    // Update any uploaded files to link them to this onboarding record
    await connection.execute(
        'UPDATE file_uploads SET vendor_onboarding_id = ? WHERE user_id = ? AND vendor_onboarding_id IS NULL',
        [onboardingId, userId]
    );

    // Log activity
    await connection.execute(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [userId, 'ONBOARDING_SUBMITTED', 'Vendor onboarding form submitted', req.ip]
    );

    // Emit real-time event
    req.io?.emit('onboarding_submitted', {
        userId,
        onboardingId,
        entityName: validatedData.nameOfEntity,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        success: true,
        message: 'Onboarding form submitted successfully',
        data: {
            onboardingId,
            status: 'submitted',
            productsCount: validatedData.products?.length || 0
        }
    });
});

// @desc    Get vendor profile
// @route   GET /api/vendor/profile
// @access  Private
const getVendorProfile = asyncHandler(async (req, res) => {
    const connection = getConnection();
    const userId = req.user.id;

    // Get vendor profile
    const [profileRows] = await connection.execute(`
        SELECT vp.*, u.phone, u.email as user_email, u.is_verified, u.created_at as user_created_at
        FROM vendor_profiles vp
        JOIN users u ON vp.user_id = u.id
        WHERE vp.user_id = ?
    `, [userId]);

    if (profileRows.length === 0) {
        res.status(404);
        throw new Error('Vendor profile not found');
    }

    const profile = profileRows[0];

    // Get onboarding details if exists
    const [onboardingRows] = await connection.execute(`
        SELECT * FROM vendor_onboarding WHERE user_id = ?
    `, [userId]);

    const onboarding = onboardingRows.length > 0 ? onboardingRows[0] : null;

    // Get products if onboarding exists
    let products = [];
    if (onboarding) {
        const [productRows] = await connection.execute(`
            SELECT * FROM vendor_products WHERE vendor_onboarding_id = ?
        `, [onboarding.id]);
        products = productRows;
    }

    // Get uploaded files with S3 URLs
    let uploadedFiles = {};
    const [fileRows] = await connection.execute(`
        SELECT id, file_name, original_name, file_path, file_size, mime_type, 
               category, s3_url, created_at
        FROM file_uploads 
        WHERE user_id = ? AND (vendor_onboarding_id = ? OR vendor_onboarding_id IS NULL)
        ORDER BY created_at DESC
    `, [userId, onboarding?.id || null]);

    if (fileRows.length > 0) {
        const UploadService = require('../services/uploadService');

        for (const file of fileRows) {
            try {
                // Generate fresh signed URL for each file
                const downloadUrl = await UploadService.getSignedUrl(file.file_path);

                // Group files by category for easy access
                const category = file.category || 'general';
                if (!uploadedFiles[category]) {
                    uploadedFiles[category] = [];
                }

                uploadedFiles[category].push({
                    id: file.id,
                    name: file.original_name,
                    size: file.file_size,
                    type: file.mime_type,
                    url: downloadUrl,
                    s3Url: file.s3_url,
                    serverPath: file.file_path,
                    uploadedAt: file.created_at
                });
            } catch (error) {
                console.error(`Error generating URL for file ${file.id}:`, error.message);
            }
        }
    }

    res.status(200).json({
        success: true,
        data: {
            profile,
            onboarding,
            products,
            uploadedFiles
        }
    });
});

// @desc    Update vendor profile
// @route   PUT /api/vendor/profile
// @access  Private
const updateVendorProfile = asyncHandler(async (req, res) => {
    const connection = getConnection();
    const userId = req.user.id;

    // Validate input data (partial validation for updates)
    const sanitizedData = ValidationService.sanitizeInput(req.body);

    // Update vendor profile
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
        'entity_type', 'entity_name', 'supplier_type', 'state', 'city',
        'pincode', 'authorized_person_name', 'contact_number', 'email', 'category'
    ];

    for (const field of allowedFields) {
        if (sanitizedData[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(sanitizedData[field]);
        }
    }

    if (updateFields.length === 0) {
        res.status(400);
        throw new Error('No valid fields to update');
    }

    updateValues.push(userId);

    await connection.execute(`
        UPDATE vendor_profiles SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
    `, updateValues);

    // Log activity
    await connection.execute(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [userId, 'PROFILE_UPDATED', 'Vendor profile updated', req.ip]
    );

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully'
    });
});

// @desc    Get onboarding status
// @route   GET /api/vendor/onboarding-status
// @access  Private
const getOnboardingStatus = asyncHandler(async (req, res) => {
    const connection = getConnection();
    const userId = req.user.id;

    // Get onboarding status
    const [rows] = await connection.execute(`
        SELECT vo.status, vo.created_at, vo.updated_at,
               vp.status as profile_status,
               COUNT(vpr.id) as products_count
        FROM vendor_onboarding vo
        LEFT JOIN vendor_profiles vp ON vo.user_id = vp.user_id
        LEFT JOIN vendor_products vpr ON vo.id = vpr.vendor_onboarding_id
        WHERE vo.user_id = ?
        GROUP BY vo.id, vp.id
    `, [userId]);

    if (rows.length === 0) {
        // No onboarding record exists yet - this is normal for new users
        res.status(200).json({
            success: true,
            data: {
                onboardingStatus: 'not_started',
                profileStatus: 'incomplete',
                productsCount: 0,
                submittedAt: null,
                lastUpdated: null
            }
        });
        return;
    }

    const status = rows[0];

    res.status(200).json({
        success: true,
        data: {
            onboardingStatus: status.status,
            profileStatus: status.profile_status,
            productsCount: status.products_count,
            submittedAt: status.created_at,
            lastUpdated: status.updated_at
        }
    });
});

// Admin Controllers

// @desc    Get all vendors
// @route   GET /api/vendor/all
// @access  Private (Admin only)
const getAllVendors = asyncHandler(async (req, res) => {
    const connection = getConnection();
    const { page = 1, limit = 10, status, search } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = '';
    const queryParams = [];

    // Build where clause
    const conditions = [];

    if (status) {
        conditions.push('vp.status = ?');
        queryParams.push(status);
    }

    if (search) {
        conditions.push('(vp.entity_name LIKE ? OR vp.authorized_person_name LIKE ? OR u.phone LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get vendors with pagination
    const [vendors] = await connection.execute(`
        SELECT vp.*, u.phone, u.email, u.is_verified, u.created_at as registered_at,
               vo.status as onboarding_status, vo.created_at as onboarding_submitted_at
        FROM vendor_profiles vp
        JOIN users u ON vp.user_id = u.id
        LEFT JOIN vendor_onboarding vo ON vp.user_id = vo.user_id
        ${whereClause}
        ORDER BY vp.created_at DESC
        LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    // Get total count
    const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM vendor_profiles vp
        JOIN users u ON vp.user_id = u.id
        LEFT JOIN vendor_onboarding vo ON vp.user_id = vo.user_id
        ${whereClause}
    `, queryParams);

    const total = countResult[0].total;

    res.status(200).json({
        success: true,
        data: {
            vendors,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

// @desc    Approve vendor
// @route   PUT /api/vendor/:id/approve
// @access  Private (Admin only)
const approveVendor = asyncHandler(async (req, res) => {
    const connection = getConnection();
    const vendorId = req.params.id;

    // Update vendor status
    await connection.execute(
        'UPDATE vendor_profiles SET status = "approved", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [vendorId]
    );

    // Get vendor details for notification
    const [vendorRows] = await connection.execute(`
        SELECT vp.*, u.phone FROM vendor_profiles vp
        JOIN users u ON vp.user_id = u.id
        WHERE vp.id = ?
    `, [vendorId]);

    if (vendorRows.length === 0) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    const vendor = vendorRows[0];

    // Log activity
    await connection.execute(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [req.user.id, 'VENDOR_APPROVED', `Approved vendor: ${vendor.entity_name}`, req.ip]
    );

    // Emit real-time event
    req.io?.emit('vendor_approved', {
        vendorId,
        entityName: vendor.entity_name,
        phone: vendor.phone,
        approvedBy: req.user.id,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        success: true,
        message: 'Vendor approved successfully',
        data: {
            vendorId,
            status: 'approved'
        }
    });
});

// @desc    Reject vendor
// @route   PUT /api/vendor/:id/reject
// @access  Private (Admin only)
const rejectVendor = asyncHandler(async (req, res) => {
    const connection = getConnection();
    const vendorId = req.params.id;
    const { reason } = req.body;

    // Update vendor status
    await connection.execute(
        'UPDATE vendor_profiles SET status = "rejected", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [vendorId]
    );

    // Get vendor details
    const [vendorRows] = await connection.execute(`
        SELECT vp.*, u.phone FROM vendor_profiles vp
        JOIN users u ON vp.user_id = u.id
        WHERE vp.id = ?
    `, [vendorId]);

    if (vendorRows.length === 0) {
        res.status(404);
        throw new Error('Vendor not found');
    }

    const vendor = vendorRows[0];

    // Log activity
    await connection.execute(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [req.user.id, 'VENDOR_REJECTED', `Rejected vendor: ${vendor.entity_name}. Reason: ${reason || 'Not specified'}`, req.ip]
    );

    // Emit real-time event
    req.io?.emit('vendor_rejected', {
        vendorId,
        entityName: vendor.entity_name,
        phone: vendor.phone,
        reason,
        rejectedBy: req.user.id,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        success: true,
        message: 'Vendor rejected successfully',
        data: {
            vendorId,
            status: 'rejected',
            reason
        }
    });
});

module.exports = {
    registerVendor,
    submitOnboardingForm,
    getVendorProfile,
    updateVendorProfile,
    getOnboardingStatus,
    getAllVendors,
    approveVendor,
    rejectVendor
};
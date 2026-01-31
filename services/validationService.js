const { z } = require('zod');

class ValidationService {
    // Phone number validation
    static phoneSchema = z.string()
        .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
        .transform(val => val.replace(/\D/g, ''));

    // Email validation
    static emailSchema = z.string()
        .email('Invalid email format')
        .min(5, 'Email must be at least 5 characters')
        .max(255, 'Email must not exceed 255 characters');

    // OTP validation
    static otpSchema = z.string()
        .regex(/^\d{6}$/, 'OTP must be exactly 6 digits');

    // Vendor registration validation
    static vendorRegistrationSchema = z.object({
        entityType: z.string().min(1, 'Entity type is required'),
        entityName: z.string().min(2, 'Entity name must be at least 2 characters'),
        supplierType: z.string().min(1, 'Supplier type is required'),
        state: z.string().min(1, 'State is required'),
        city: z.string().min(1, 'City is required'),
        pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
        authorizedPersonName: z.string().min(2, 'Authorized person name must be at least 2 characters'),
        contactNumber: this.phoneSchema,
        email: this.emailSchema,
        category: z.string().min(1, 'Category is required')
    });

    // Vendor onboarding validation
    static vendorOnboardingSchema = z.object({
        // Profile section
        companyType: z.string().optional(),
        supplyTo: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        multipleStore: z.string().optional(),

        // Entity Details
        nameOfAuthorizedPerson: z.string().optional(),
        nameOfEntity: z.string().optional(),
        nameOfEstablishment: z.string().optional(),
        typeOfSupplier: z.string().optional(),
        gstinNumber: z.string().optional(),
        mobileNo: z.string().optional(),
        emailId: z.string().optional(),

        // Registered Address
        buildingName: z.string().optional(),
        flatNo: z.string().optional(),
        wardNo: z.string().optional(),
        regState: z.string().optional(),
        regDist: z.string().optional(),
        regPincode: z.string().optional(),

        // Correspondence Address
        sameAsRegistered: z.union([z.boolean(), z.string(), z.number()]).transform(val => {
            if (typeof val === 'boolean') return val;
            if (typeof val === 'string') return val === 'true' || val === '1';
            if (typeof val === 'number') return val === 1;
            return false;
        }),
        corrBuildingName: z.string().optional(),
        corrFlatNo: z.string().optional(),
        corrWardNo: z.string().optional(),
        corrState: z.string().optional(),
        corrDist: z.string().optional(),
        corrPincode: z.string().optional(),

        // Contact Details
        contactPerson: z.string().optional(),
        designation: z.string().optional(),
        mobileNumber: z.string().optional(),
        emailAddress: z.string().optional(),

        // Tax Details
        gstinRegNo: z.string().optional(),
        vatCst: z.string().optional(),
        tinNo: z.string().optional(),
        importExportCode: z.string().optional(),

        // Bank Details
        accountNo: z.string().optional(),
        bankName: z.string().optional(),
        branch: z.string().optional(),
        ifscCode: z.string().optional(),

        // TGT Terms
        creditPeriod: z.string().optional(),
        electronicCredit: z.string().optional(),
        leadTimeDelivery: z.string().optional(),
        buyingModule: z.string().optional(),
        marginPercent: z.string().optional(),

        // Products - Optional for draft saves, and individual products can be incomplete
        products: z.array(z.object({
            productCategory: z.string().optional().default(''),
            subCategory: z.string().optional().default(''),
            microCategory: z.string().optional().default(''),
            brand: z.string().optional().default(''),
            productName: z.string().optional().default(''),
            quantity: z.number().optional().default(0)
        })).optional().default([])
    });

    // Vendor onboarding validation for final submission (stricter)
    static vendorOnboardingFinalSchema = z.object({
        // Profile section
        companyType: z.string().optional(),
        supplyTo: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        multipleStore: z.string().optional(),

        // Entity Details
        nameOfAuthorizedPerson: z.string().optional(),
        nameOfEntity: z.string().optional(),
        nameOfEstablishment: z.string().optional(),
        typeOfSupplier: z.string().optional(),
        gstinNumber: z.string().optional(),
        mobileNo: z.string().optional(),
        emailId: z.string().optional(),

        // Registered Address
        buildingName: z.string().optional(),
        flatNo: z.string().optional(),
        wardNo: z.string().optional(),
        regState: z.string().optional(),
        regDist: z.string().optional(),
        regPincode: z.string().optional(),

        // Correspondence Address
        sameAsRegistered: z.union([z.boolean(), z.string(), z.number()]).transform(val => {
            if (typeof val === 'boolean') return val;
            if (typeof val === 'string') return val === 'true' || val === '1';
            if (typeof val === 'number') return val === 1;
            return false;
        }),
        corrBuildingName: z.string().optional(),
        corrFlatNo: z.string().optional(),
        corrWardNo: z.string().optional(),
        corrState: z.string().optional(),
        corrDist: z.string().optional(),
        corrPincode: z.string().optional(),

        // Contact Details
        contactPerson: z.string().optional(),
        designation: z.string().optional(),
        mobileNumber: z.string().optional(),
        emailAddress: z.string().optional(),

        // Tax Details
        gstinRegNo: z.string().optional(),
        vatCst: z.string().optional(),
        tinNo: z.string().optional(),
        importExportCode: z.string().optional(),

        // Bank Details
        accountNo: z.string().optional(),
        bankName: z.string().optional(),
        branch: z.string().optional(),
        ifscCode: z.string().optional(),

        // TGT Terms
        creditPeriod: z.string().optional(),
        electronicCredit: z.string().optional(),
        leadTimeDelivery: z.string().optional(),
        buyingModule: z.string().optional(),
        marginPercent: z.string().optional(),

        // Products - Optional for all submissions
        products: z.array(z.object({
            productCategory: z.string().optional().default(''),
            subCategory: z.string().optional().default(''),
            microCategory: z.string().optional().default(''),
            brand: z.string().optional().default(''),
            productName: z.string().optional().default(''),
            quantity: z.number().optional().default(0)
        })).optional().default([])
    });

    // File upload validation
    static fileUploadSchema = z.object({
        fieldname: z.string(),
        originalname: z.string(),
        mimetype: z.string(),
        size: z.number().max(10 * 1024 * 1024, 'File size must not exceed 10MB'), // 10MB limit
        buffer: z.any().optional(),
        filename: z.string().optional(),
        path: z.string().optional()
    });

    // Validate phone number
    static validatePhone(phone) {
        try {
            return this.phoneSchema.parse(phone);
        } catch (error) {
            throw new Error(error.errors[0]?.message || 'Invalid phone number');
        }
    }

    // Validate email
    static validateEmail(email) {
        try {
            return this.emailSchema.parse(email);
        } catch (error) {
            throw new Error(error.errors[0]?.message || 'Invalid email');
        }
    }

    // Validate OTP
    static validateOTP(otp) {
        try {
            return this.otpSchema.parse(otp);
        } catch (error) {
            throw new Error(error.errors[0]?.message || 'Invalid OTP');
        }
    }

    // Validate vendor registration
    static validateVendorRegistration(data) {
        try {
            return this.vendorRegistrationSchema.parse(data);
        } catch (error) {
            if (error.errors && Array.isArray(error.errors)) {
                const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
                throw new Error(errorMessages.join(', '));
            } else if (error.message) {
                throw new Error(error.message);
            } else {
                throw new Error('Validation failed');
            }
        }
    }

    // Validate vendor onboarding (for draft saves - more lenient)
    static validateVendorOnboarding(data) {
        try {
            // Handle correspondence address validation
            if (data.sameAsRegistered) {
                data.corrBuildingName = data.buildingName;
                data.corrFlatNo = data.flatNo;
                data.corrWardNo = data.wardNo;
                data.corrState = data.regState;
                data.corrDist = data.regDist;
                data.corrPincode = data.regPincode;
            }

            console.log('🔍 Draft validation - completely skipping product validation');

            // For draft saves, use the existing schema which already has optional products
            const validatedData = this.vendorOnboardingSchema.parse(data);

            return validatedData;
        } catch (error) {
            // Debug: Log the actual error to see what's happening
            console.log('🔍 Validation Error Debug:', {
                hasErrors: !!error.errors,
                isArray: Array.isArray(error.errors),
                errorType: typeof error,
                errorConstructor: error.constructor.name,
                errorMessage: error.message,
                fullError: error
            });

            // Handle Zod validation errors
            if (error.errors && Array.isArray(error.errors)) {
                console.log('🔍 Processing Zod Errors:', error.errors.length, 'errors found');

                // Format validation errors into user-friendly messages
                const errorMessages = error.errors.map(err => {
                    // Create more user-friendly field names
                    const fieldPath = err.path.join('.');
                    let fieldName = fieldPath;

                    // Convert technical field names to user-friendly names
                    if (fieldPath.includes('products.')) {
                        const productIndex = fieldPath.match(/products\.(\d+)\./)?.[1];
                        const field = fieldPath.split('.').pop();

                        const fieldMap = {
                            'productCategory': 'Product Category',
                            'subCategory': 'Sub Category',
                            'microCategory': 'Micro Category',
                            'brand': 'Brand',
                            'productName': 'Product Name',
                            'quantity': 'Quantity'
                        };

                        const friendlyField = fieldMap[field] || field;
                        fieldName = productIndex ? `Product ${parseInt(productIndex) + 1} - ${friendlyField}` : friendlyField;
                    }

                    return `${fieldName}: ${err.message}`;
                });

                // Create a readable error message
                const formattedMessage = errorMessages.length === 1
                    ? errorMessages[0]
                    : `Please fix the following errors:\n• ${errorMessages.join('\n• ')}`;

                console.log('🔍 Throwing formatted error:', formattedMessage);
                throw new Error(formattedMessage);
            } else if (error.message) {
                console.log('🔍 Throwing original error message:', error.message);
                throw new Error(error.message);
            } else {
                console.log('🔍 Throwing generic validation failed error');
                throw new Error('Validation failed');
            }
        }
    }

    // Validate vendor onboarding for final submission (stricter validation)
    static validateVendorOnboardingFinal(data) {
        try {
            // Handle correspondence address validation
            if (data.sameAsRegistered) {
                data.corrBuildingName = data.buildingName;
                data.corrFlatNo = data.flatNo;
                data.corrWardNo = data.wardNo;
                data.corrState = data.regState;
                data.corrDist = data.regDist;
                data.corrPincode = data.regPincode;
            }

            // Ensure products is an array
            if (!data.products || !Array.isArray(data.products)) {
                data.products = [];
            }

            return this.vendorOnboardingFinalSchema.parse(data);
        } catch (error) {
            // Handle Zod validation errors
            if (error.errors && Array.isArray(error.errors)) {
                // Format validation errors into user-friendly messages
                const errorMessages = error.errors.map(err => {
                    // Create more user-friendly field names
                    const fieldPath = err.path.join('.');
                    let fieldName = fieldPath;

                    // Convert technical field names to user-friendly names
                    if (fieldPath.includes('products.')) {
                        const productIndex = fieldPath.match(/products\.(\d+)\./)?.[1];
                        const field = fieldPath.split('.').pop();

                        const fieldMap = {
                            'productCategory': 'Product Category',
                            'subCategory': 'Sub Category',
                            'microCategory': 'Micro Category',
                            'brand': 'Brand',
                            'productName': 'Product Name',
                            'quantity': 'Quantity'
                        };

                        const friendlyField = fieldMap[field] || field;
                        fieldName = productIndex ? `Product ${parseInt(productIndex) + 1} - ${friendlyField}` : friendlyField;
                    }

                    return `${fieldName}: ${err.message}`;
                });

                // Create a readable error message
                const formattedMessage = errorMessages.length === 1
                    ? errorMessages[0]
                    : `Please fix the following errors:\n• ${errorMessages.join('\n• ')}`;

                throw new Error(formattedMessage);
            } else if (error.message) {
                throw new Error(error.message);
            } else {
                throw new Error('Validation failed');
            }
        }
    }

    // Validate file upload
    static validateFileUpload(file) {
        try {
            return this.fileUploadSchema.parse(file);
        } catch (error) {
            throw new Error(error.errors[0]?.message || 'Invalid file');
        }
    }

    // Sanitize input data
    static sanitizeInput(data) {
        if (typeof data === 'string') {
            return data.trim().replace(/[<>]/g, '');
        }

        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                sanitized[key] = this.sanitizeInput(value);
            }
            return sanitized;
        }

        return data;
    }

    // Check for SQL injection patterns
    static checkSQLInjection(input) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /(--|\/\*|\*\/|;|'|"|`)/,
            /(\bOR\b|\bAND\b).*(\b=\b|\b<\b|\b>\b)/i
        ];

        const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

        for (const pattern of sqlPatterns) {
            if (pattern.test(inputStr)) {
                throw new Error('Invalid input detected');
            }
        }

        return true;
    }

    // Comprehensive validation
    static async validateAndSanitize(data, schema) {
        try {
            // Check for SQL injection
            this.checkSQLInjection(data);

            // Sanitize input
            const sanitizedData = this.sanitizeInput(data);

            // Validate with schema
            const validatedData = schema.parse(sanitizedData);

            return validatedData;
        } catch (error) {
            if (error.errors && Array.isArray(error.errors)) {
                const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
                throw new Error(errorMessages.join(', '));
            } else if (error.message) {
                throw new Error(error.message);
            } else {
                throw new Error('Validation failed');
            }
        }
    }
}

module.exports = ValidationService;
/**
 * Schema Index File
 * Central registry for all database schemas
 */

const userSchema = require('./userSchema');
const otpSchema = require('./otpSchema');
const vendorSchema = require('./vendorSchema');
const fileSchema = require('./fileSchema');
const activitySchema = require('./activitySchema');

/**
 * All database schemas organized by category
 */
const schemas = {
    // Core User Management
    user: userSchema,
    otp: otpSchema,

    // Vendor Management
    vendorProfile: vendorSchema.vendorProfile,
    vendorOnboarding: vendorSchema.vendorOnboarding,
    vendorProducts: vendorSchema.vendorProducts,

    // File Management
    fileUploads: fileSchema.fileUploads,

    // Activity and System
    activityLogs: activitySchema.activityLogs
};

/**
 * All constraints organized by category
 */
const constraints = {
    vendor: vendorSchema.constraints,
    file: fileSchema.constraints,
    activity: activitySchema.constraints,
    user: userSchema.constraints,
    otp: otpSchema.constraints
};

/**
 * All indexes organized by category
 */
const indexes = {
    vendor: vendorSchema.indexes,
    file: fileSchema.indexes,
    activity: activitySchema.indexes,
    user: userSchema.indexes,
    otp: otpSchema.indexes
};

/**
 * All triggers organized by category
 */
const triggers = {
    otp: otpSchema.triggers,
    file: fileSchema.triggers,
    activity: activitySchema.triggers
};

/**
 * Schema creation order (respects foreign key dependencies)
 */
const creationOrder = [
    'user',                 // Base table - no dependencies
    'otp',                  // Depends on users (soft dependency)
    'vendorProfile',        // Depends on users
    'vendorOnboarding',     // Depends on users
    'vendorProducts',       // Depends on vendor_onboarding
    'fileUploads',          // Depends on users and vendor_onboarding
    'activityLogs'          // Depends on users (soft dependency)
];

/**
 * Get schema by name
 * @param {string} schemaName - Name of the schema
 * @returns {Object} Schema object
 */
const getSchema = (schemaName) => {
    return schemas[schemaName];
};

/**
 * Get all schemas in creation order
 * @returns {Array} Array of schema objects in creation order
 */
const getSchemasInOrder = () => {
    return creationOrder.map(name => ({
        name,
        ...schemas[name]
    }));
};

/**
 * Get all constraints
 * @returns {Array} Array of all constraint statements
 */
const getAllConstraints = () => {
    return Object.values(constraints).flat();
};

/**
 * Get all indexes
 * @returns {Array} Array of all index statements
 */
const getAllIndexes = () => {
    return Object.values(indexes).flat();
};

/**
 * Get all triggers
 * @returns {Array} Array of all trigger statements
 */
const getAllTriggers = () => {
    return Object.values(triggers).flat();
};

/**
 * Schema metadata for documentation and validation
 */
const schemaMetadata = {
    version: '1.0.0',
    lastUpdated: '2026-01-29',
    totalTables: Object.keys(schemas).length,
    categories: {
        'User Management': ['user', 'otp'],
        'Vendor Management': ['vendorProfile', 'vendorOnboarding', 'vendorProducts'],
        'File Management': ['fileUploads'],
        'System & Activity': ['activityLogs']
    },
    features: [
        'User authentication and authorization',
        'OTP-based verification system',
        'Comprehensive vendor onboarding',
        'File upload and management',
        'Activity logging and audit trails'
    ]
};

/**
 * Validation functions for schema integrity
 */
const validation = {
    /**
     * Validate schema structure
     * @param {string} schemaName - Name of schema to validate
     * @returns {boolean} Whether schema is valid
     */
    validateSchema: (schemaName) => {
        const schema = schemas[schemaName];
        return schema &&
            schema.tableName &&
            schema.schema &&
            schema.description;
    },

    /**
     * Check for circular dependencies
     * @returns {boolean} Whether there are circular dependencies
     */
    checkCircularDependencies: () => {
        // Implementation would check for circular foreign key references
        // For now, return false (no circular dependencies)
        return false;
    },

    /**
     * Validate foreign key relationships
     * @returns {Array} Array of validation errors
     */
    validateForeignKeys: () => {
        const errors = [];
        // Implementation would validate all foreign key relationships
        // For now, return empty array (no errors)
        return errors;
    }
};

module.exports = {
    schemas,
    constraints,
    indexes,
    triggers,
    creationOrder,
    schemaMetadata,

    // Helper functions
    getSchema,
    getSchemasInOrder,
    getAllConstraints,
    getAllIndexes,
    getAllTriggers,
    validation
};
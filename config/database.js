const mysql = require('mysql2/promise');
const Logger = require('../utils/logger');

let pool = null;

const connectDB = async () => {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4',
            timezone: '+00:00',
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            idleTimeout: 300000,
            maxIdle: 10
        });

        // Test the connection
        const connection = await pool.getConnection();
        Logger.success(`MySQL Connected: ${connection.config.host}`);
        connection.release();

        // Initialize schema manager and create tables
        const SchemaManager = require('../utils/schemaManager');
        const schemaManager = new SchemaManager();
        await schemaManager.init();
        await schemaManager.setupDatabase();

    } catch (error) {
        Logger.error(`Database connection error: ${error.message}`, error);
        process.exit(1);
    }
};

const getConnection = () => {
    if (!pool) {
        throw new Error('Database connection pool not established');
    }
    return pool;
};

module.exports = { connectDB, getConnection };
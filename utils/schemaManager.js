const { getConnection } = require('../config/database');
const {
    getSchemasInOrder,
    getAllConstraints,
    getAllIndexes,
    getAllTriggers,
    schemaMetadata,
    validation
} = require('../schemas');
const Logger = require('./logger');

class SchemaManager {
    constructor() {
        this.connection = null;
    }

    async init() {
        this.connection = getConnection();
    }

    async createTables() {
        try {
            Logger.info('Starting database schema creation...');

            const schemas = getSchemasInOrder();
            let createdCount = 0;

            for (const schema of schemas) {
                try {
                    await this.connection.execute(schema.schema);
                    Logger.success(`✅ Table '${schema.tableName}' created successfully`);
                    createdCount++;
                } catch (error) {
                    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                        Logger.info(`ℹ️  Table '${schema.tableName}' already exists`);
                    } else {
                        Logger.error(`❌ Failed to create table '${schema.tableName}':`, error);
                        throw error;
                    }
                }
            }

            Logger.success(`Database schema creation completed. ${createdCount} tables processed.`);
            return createdCount;

        } catch (error) {
            Logger.error('Schema creation failed:', error);
            throw error;
        }
    }

    async addConstraints() {
        try {
            Logger.info('Adding database constraints...');

            const constraints = getAllConstraints();
            let addedCount = 0;

            for (const constraint of constraints) {
                try {
                    await this.connection.execute(constraint);
                    addedCount++;
                } catch (error) {
                    if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_CHECK_CONSTRAINT_DUP_NAME') {
                        Logger.debug(`Constraint already exists: ${constraint.substring(0, 50)}...`);
                    } else {
                        Logger.warning(`Failed to add constraint: ${error.message}`);
                    }
                }
            }

            Logger.success(`Constraints processing completed. ${addedCount} constraints added.`);
            return addedCount;

        } catch (error) {
            Logger.error('Constraint addition failed:', error);
            throw error;
        }
    }

    async createIndexes() {
        try {
            Logger.info('Creating database indexes...');

            const indexes = getAllIndexes();
            let createdCount = 0;

            for (const index of indexes) {
                try {
                    await this.connection.execute(index);
                    createdCount++;
                } catch (error) {
                    if (error.code === 'ER_DUP_KEYNAME') {
                        Logger.debug(`Index already exists: ${index.substring(0, 50)}...`);
                    } else {
                        Logger.warning(`Failed to create index: ${error.message}`);
                    }
                }
            }

            Logger.success(`Index creation completed. ${createdCount} indexes created.`);
            return createdCount;

        } catch (error) {
            Logger.error('Index creation failed:', error);
            throw error;
        }
    }

    /**
     * Create all database triggers
     */
    async createTriggers() {
        try {
            Logger.info('Creating database triggers...');

            const triggers = getAllTriggers();
            let createdCount = 0;

            for (const trigger of triggers) {
                try {
                    await this.connection.execute(trigger);
                    createdCount++;
                } catch (error) {
                    if (error.code === 'ER_TRG_ALREADY_EXISTS') {
                        Logger.debug(`Trigger already exists: ${trigger.substring(0, 50)}...`);
                    } else {
                        Logger.warning(`Failed to create trigger: ${error.message}`);
                    }
                }
            }

            Logger.success(`Trigger creation completed. ${createdCount} triggers created.`);
            return createdCount;

        } catch (error) {
            Logger.error('Trigger creation failed:', error);
            throw error;
        }
    }

    async setupDatabase() {
        try {
            Logger.info('🚀 Starting complete database setup...');

            const results = {
                tables: 0,
                constraints: 0,
                indexes: 0,
                triggers: 0,
                startTime: new Date(),
                endTime: null,
                duration: null
            };

            results.tables = await this.createTables();

            results.constraints = await this.addConstraints();

            results.indexes = await this.createIndexes();

            results.triggers = await this.createTriggers();

            results.endTime = new Date();
            results.duration = results.endTime - results.startTime;

            Logger.success('🎉 Database setup completed successfully!');
            Logger.info(`📊 Setup Summary:
                - Tables: ${results.tables}
                - Constraints: ${results.constraints}
                - Indexes: ${results.indexes}
                - Triggers: ${results.triggers}
                - Duration: ${results.duration}ms
            `);

            return results;

        } catch (error) {
            Logger.error('Complete database setup failed:', error);
            throw error;
        }
    }

    // Validate database schema integrity
    async validateSchema() {
        try {
            Logger.info('Validating database schema...');

            const issues = [];

            // Check if all tables exist
            const schemas = getSchemasInOrder();
            for (const schema of schemas) {
                const [rows] = await this.connection.execute(
                    'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
                    [process.env.DB_NAME, schema.tableName]
                );

                if (rows[0].count === 0) {
                    issues.push(`Missing table: ${schema.tableName}`);
                }
            }

            // Validate foreign key relationships
            const fkErrors = validation.validateForeignKeys();
            issues.push(...fkErrors);

            // Check for circular dependencies
            if (validation.checkCircularDependencies()) {
                issues.push('Circular dependencies detected in schema');
            }

            if (issues.length === 0) {
                Logger.success('✅ Schema validation passed - no issues found');
            } else {
                Logger.warning(`⚠️  Schema validation found ${issues.length} issues:`);
                issues.forEach(issue => Logger.warning(`  - ${issue}`));
            }

            return {
                valid: issues.length === 0,
                issues
            };

        } catch (error) {
            Logger.error('Schema validation failed:', error);
            throw error;
        }
    }


    async getSchemaInfo() {
        try {
            const info = {
                metadata: schemaMetadata,
                tables: {},
                statistics: {}
            };

            // Get table information
            const [tables] = await this.connection.execute(`
                SELECT 
                    table_name,
                    table_rows,
                    data_length,
                    index_length,
                    create_time,
                    update_time,
                    table_comment
                FROM information_schema.tables 
                WHERE table_schema = ?
                ORDER BY table_name
            `, [process.env.DB_NAME]);

            info.tables = tables.reduce((acc, table) => {
                acc[table.table_name] = {
                    rows: table.table_rows,
                    dataSize: table.data_length,
                    indexSize: table.index_length,
                    created: table.create_time,
                    updated: table.update_time,
                    comment: table.table_comment
                };
                return acc;
            }, {});

            // Calculate statistics
            info.statistics = {
                totalTables: tables.length,
                totalRows: tables.reduce((sum, table) => sum + (table.table_rows || 0), 0),
                totalDataSize: tables.reduce((sum, table) => sum + (table.data_length || 0), 0),
                totalIndexSize: tables.reduce((sum, table) => sum + (table.index_length || 0), 0)
            };

            return info;

        } catch (error) {
            Logger.error('Failed to get schema info:', error);
            throw error;
        }
    }


    async dropAllTables() {
        try {
            Logger.warning('⚠️  Dropping all tables - this will delete all data!');

            // Disable foreign key checks
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');

            const [tables] = await this.connection.execute(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = ?
            `, [process.env.DB_NAME]);

            let droppedCount = 0;
            for (const table of tables) {
                await this.connection.execute(`DROP TABLE IF EXISTS ${table.table_name}`);
                droppedCount++;
                Logger.info(`Dropped table: ${table.table_name}`);
            }

            // Re-enable foreign key checks
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');

            Logger.warning(`🗑️  All tables dropped. ${droppedCount} tables removed.`);
            return droppedCount;

        } catch (error) {
            Logger.error('Failed to drop tables:', error);
            throw error;
        }
    }

    async generateBackupScript() {
        try {
            Logger.info('Generating database backup script...');

            let script = `-- Database Backup Script\n`;
            script += `-- Generated: ${new Date().toISOString()}\n`;
            script += `-- Database: ${process.env.DB_NAME}\n\n`;

            script += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

            const schemas = getSchemasInOrder();
            for (const schema of schemas) {
                script += `-- Table: ${schema.tableName}\n`;
                script += `-- Description: ${schema.description}\n`;
                script += `${schema.schema};\n\n`;
            }

            script += `SET FOREIGN_KEY_CHECKS = 1;\n`;

            return script;

        } catch (error) {
            Logger.error('Failed to generate backup script:', error);
            throw error;
        }
    }
}

module.exports = SchemaManager;
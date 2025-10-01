/**
 * Dynamic Table Service
 *
 * Manages creation and manipulation of dynamic tables for each form
 * Each form gets its own table with columns based on form fields
 */

const { Pool } = require('pg');
const {
  generateTableName,
  generateColumnName,
  getPostgreSQLType,
  isValidTableName
} = require('../utils/tableNameHelper');

class DynamicTableService {
  constructor(pool) {
    this.pool = pool || new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'qcollector_db',
      user: process.env.POSTGRES_USER || 'qcollector',
      password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
    });
  }

  /**
   * Create table for a form
   * @param {Object} form - Form object with id, title, and fields
   * @returns {Promise<string>} - Created table name
   */
  async createFormTable(form) {
    const tableName = generateTableName(form.title, form.id);

    if (!isValidTableName(tableName)) {
      throw new Error(`Invalid table name generated: ${tableName}`);
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if table already exists
      const existsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `;
      const existsResult = await client.query(existsQuery, [tableName]);

      if (existsResult.rows[0].exists) {
        console.log(`Table ${tableName} already exists. Updating columns...`);
        await this.updateFormTableColumns(form, tableName, client);
      } else {
        // Create new table with base columns
        const createTableQuery = `
          CREATE TABLE ${tableName} (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            submission_number INTEGER,
            status VARCHAR(50) DEFAULT 'submitted',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;

        await client.query(createTableQuery);
        console.log(`Created table: ${tableName}`);

        // Add columns for each field
        await this.addFormFieldColumns(form.fields || [], tableName, client);

        // Create indexes
        await client.query(`CREATE INDEX idx_${tableName}_form_id ON ${tableName}(form_id);`);
        await client.query(`CREATE INDEX idx_${tableName}_user_id ON ${tableName}(user_id);`);
        await client.query(`CREATE INDEX idx_${tableName}_submitted_at ON ${tableName}(submitted_at);`);
      }

      // Store table name mapping in forms table
      await client.query(
        'UPDATE forms SET table_name = $1 WHERE id = $2',
        [tableName, form.id]
      );

      await client.query('COMMIT');
      return tableName;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating form table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add columns for form fields
   */
  async addFormFieldColumns(fields, tableName, client) {
    for (const field of fields) {
      const columnName = generateColumnName(field.label || field.title, field.id);
      const dataType = getPostgreSQLType(field.type);

      try {
        const addColumnQuery = `
          ALTER TABLE ${tableName}
          ADD COLUMN IF NOT EXISTS ${columnName} ${dataType};
        `;
        await client.query(addColumnQuery);
        console.log(`Added column: ${columnName} (${dataType})`);
      } catch (error) {
        console.error(`Error adding column ${columnName}:`, error.message);
        // Continue with other columns even if one fails
      }
    }
  }

  /**
   * Update table columns when form fields change
   */
  async updateFormTableColumns(form, tableName, client) {
    // Get existing columns
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name NOT IN ('id', 'form_id', 'user_id', 'submission_number', 'status', 'submitted_at', 'created_at', 'updated_at');
    `;
    const existingColumns = await client.query(columnsQuery, [tableName]);
    const existingColumnNames = new Set(existingColumns.rows.map(r => r.column_name));

    // Add new columns for new fields
    const newFields = (form.fields || []).filter(field => {
      const columnName = generateColumnName(field.label || field.title, field.id);
      return !existingColumnNames.has(columnName);
    });

    if (newFields.length > 0) {
      console.log(`Adding ${newFields.length} new columns to ${tableName}`);
      await this.addFormFieldColumns(newFields, tableName, client);
    }

    // Note: We don't automatically drop columns for removed fields
    // This preserves historical data. Admin can manually drop if needed.
  }

  /**
   * Insert submission into dynamic table
   */
  async insertSubmission(formId, tableName, userId, submissionData) {
    const client = await this.pool.connect();

    try {
      // Prepare columns and values
      const columns = ['form_id', 'user_id'];
      const values = [formId, userId];
      const placeholders = ['$1', '$2'];
      let paramIndex = 3;

      // Add data fields
      for (const [key, value] of Object.entries(submissionData)) {
        columns.push(key);
        values.push(value);
        placeholders.push(`$${paramIndex}`);
        paramIndex++;
      }

      const insertQuery = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *;
      `;

      const result = await client.query(insertQuery, values);
      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Get submissions from dynamic table
   */
  async getSubmissions(tableName, filters = {}) {
    const client = await this.pool.connect();

    try {
      let query = `SELECT * FROM ${tableName}`;
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // Add filters
      if (filters.userId) {
        conditions.push(`user_id = $${paramIndex}`);
        values.push(filters.userId);
        paramIndex++;
      }

      if (filters.status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(filters.status);
        paramIndex++;
      }

      if (filters.startDate) {
        conditions.push(`submitted_at >= $${paramIndex}`);
        values.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        conditions.push(`submitted_at <= $${paramIndex}`);
        values.push(filters.endDate);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY submitted_at DESC';

      if (filters.limit) {
        query += ` LIMIT ${parseInt(filters.limit)}`;
      }

      const result = await client.query(query, values);
      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Drop form table
   */
  async dropFormTable(tableName) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Drop table
      await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
      console.log(`Dropped table: ${tableName}`);

      await client.query('COMMIT');
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error dropping form table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get table structure
   */
  async getTableStructure(tableName) {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position;
      `;

      const result = await client.query(query, [tableName]);
      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Close pool connection
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = DynamicTableService;

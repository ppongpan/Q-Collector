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
    const tableName = await generateTableName(form.title, form.id);

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
        // ✅ Use local timezone (Asia/Bangkok) for submitted_at
        const createTableQuery = `
          CREATE TABLE ${tableName} (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
            username VARCHAR(100),
            submitted_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')
          );
        `;

        await client.query(createTableQuery);
        console.log(`Created table: ${tableName}`);

        // Add columns for each field
        await this.addFormFieldColumns(form.fields || [], tableName, client);

        // Create indexes
        await client.query(`CREATE INDEX idx_${tableName}_form_id ON ${tableName}(form_id);`);
        await client.query(`CREATE INDEX idx_${tableName}_username ON ${tableName}(username);`);
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
   * ✅ FIXED: Only add columns for fields that belong to this form (exclude sub-form fields)
   * @param {Array} fields - Array of field objects
   * @param {string} tableName - Table name
   * @param {Object} client - Database client
   * @param {boolean} isSubForm - Whether this is a sub-form table (skip filtering)
   */
  async addFormFieldColumns(fields, tableName, client, isSubForm = false) {
    const addedColumns = new Set(); // Track added column names to detect duplicates

    // ✅ FILTER: For main forms, exclude sub-form fields
    // For sub-forms, include ALL fields (they already have sub_form_id)
    const fieldsToAdd = isSubForm
      ? fields
      : fields.filter(field => !field.sub_form_id && !field.subFormId);

    console.log(`Adding ${fieldsToAdd.length} ${isSubForm ? 'sub-form' : 'main form'} field columns (from ${fields.length} total fields)`);

    for (const field of fieldsToAdd) {
      const columnName = await generateColumnName(field.label || field.title, field.id);
      const dataType = getPostgreSQLType(field.type);

      // ✅ NEW: Check for duplicate column names
      if (addedColumns.has(columnName)) {
        const errorMsg = `Duplicate column name detected: "${columnName}" (from field "${field.label || field.title}"). Please use different field names.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const addColumnQuery = `
          ALTER TABLE ${tableName}
          ADD COLUMN IF NOT EXISTS ${columnName} ${dataType};
        `;
        await client.query(addColumnQuery);
        console.log(`Added column: ${columnName} (${dataType})`);
        addedColumns.add(columnName);
      } catch (error) {
        // Check if error is due to duplicate column (PostgreSQL error 42701)
        if (error.message.includes('already exists') || error.code === '42701') {
          const errorMsg = `Column "${columnName}" already exists in table ${tableName}. Field "${field.label || field.title}" translates to existing column name.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        console.error(`Error adding column ${columnName}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Update table columns when form fields change
   * ✅ FIXED: Only update columns for main form fields (exclude sub-form fields)
   */
  async updateFormTableColumns(form, tableName, client) {
    // Get existing columns
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name NOT IN ('id', 'form_id', 'parent_id', 'sub_form_id', 'username', 'order', 'submitted_at');
    `;
    const existingColumns = await client.query(columnsQuery, [tableName]);
    const existingColumnNames = new Set(existingColumns.rows.map(r => r.column_name));

    // ✅ FILTER: Only process main form fields (exclude sub-form fields)
    const mainFormFields = (form.fields || []).filter(field => !field.sub_form_id && !field.subFormId);
    console.log(`Processing ${mainFormFields.length} main form fields (filtered from ${form.fields?.length || 0} total fields)`);

    // Add new columns for new fields
    const newFields = [];
    for (const field of mainFormFields) {
      const columnName = await generateColumnName(field.label || field.title, field.id);
      if (!existingColumnNames.has(columnName)) {
        newFields.push(field);
      }
    }

    if (newFields.length > 0) {
      console.log(`Adding ${newFields.length} new columns to ${tableName}`);
      await this.addFormFieldColumns(newFields, tableName, client);
    }

    // Note: We don't automatically drop columns for removed fields
    // This preserves historical data. Admin can manually drop if needed.
  }

  /**
   * Create table for a sub-form
   * @param {Object} subForm - Sub-form object with id, title, and fields
   * @param {string} mainTableName - Parent table name
   * @param {string} formId - Parent form ID
   * @returns {Promise<string>} - Created sub-form table name
   */
  async createSubFormTable(subForm, mainTableName, formId) {
    const subFormTableName = await generateTableName(subForm.title, subForm.id);

    if (!isValidTableName(subFormTableName)) {
      throw new Error(`Invalid sub-form table name generated: ${subFormTableName}`);
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
      const existsResult = await client.query(existsQuery, [subFormTableName]);

      if (existsResult.rows[0].exists) {
        console.log(`Sub-form table ${subFormTableName} already exists. Updating columns...`);
        await this.updateFormTableColumns(
          { id: subForm.id, title: subForm.title, fields: subForm.fields },
          subFormTableName,
          client
        );
      } else {
        // Create new sub-form table with minimal base columns
        // ✅ COLUMN ORDER: id, parent_id, main_form_subid (3rd position), username, order, submitted_at
        // ✅ Use local timezone (Asia/Bangkok) for submitted_at
        // ✅ parent_id: FK to submissions.id (maintains data integrity)
        // ✅ main_form_subid: The ACTUAL parent main form submission ID from dynamic table (3rd column)
        const createTableQuery = `
          CREATE TABLE ${subFormTableName} (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            parent_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
            main_form_subid UUID,
            username VARCHAR(100),
            "order" INTEGER DEFAULT 0,
            submitted_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')
          );
        `;

        await client.query(createTableQuery);
        console.log(`Created sub-form table: ${subFormTableName}`);

        // Add columns for each field (✅ CRITICAL: Set isSubForm = true to skip filtering)
        await this.addFormFieldColumns(subForm.fields || [], subFormTableName, client, true);

        // Create indexes (only for parent_id and username)
        await client.query(`CREATE INDEX idx_${subFormTableName}_parent_id ON ${subFormTableName}(parent_id);`);
        await client.query(`CREATE INDEX idx_${subFormTableName}_username ON ${subFormTableName}(username);`);
      }

      // Store table name mapping in sub_forms table
      await client.query(
        'UPDATE sub_forms SET table_name = $1 WHERE id = $2',
        [subFormTableName, subForm.id]
      );

      await client.query('COMMIT');
      return subFormTableName;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating sub-form table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert submission into dynamic table
   * ✅ CRITICAL FIX: Use submissionId as the id in dynamic table (no UUID generation)
   * @param {string} submissionId - Submission ID from submissions table
   * @param {string} formId - Form ID
   * @param {string} tableName - Table name
   * @param {string} username - Username
   * @param {Object} submissionData - Submission data
   */
  async insertSubmission(submissionId, formId, tableName, username, submissionData) {
    const client = await this.pool.connect();

    try {
      // ✅ CRITICAL: Include 'id' in columns and use submissionId
      // This ensures dynamic table id matches submissions table id
      const columns = ['"id"', '"form_id"', '"username"'];
      const values = [submissionId, formId, username];
      const placeholders = ['$1', '$2', '$3'];
      let paramIndex = 4;

      // Add data fields
      for (const [key, value] of Object.entries(submissionData)) {
        columns.push(`"${key}"`); // Quote column names for PostgreSQL

        // ✅ CRITICAL FIX: Convert coordinate objects to PostgreSQL POINT format
        // PostgreSQL POINT format: POINT(longitude, latitude)
        // Frontend sends: {lat: 13.806..., lng: 100.522...}
        if (value && typeof value === 'object' && 'lat' in value && 'lng' in value) {
          // Convert to POINT format: POINT(lng, lat) - note the order!
          // Use direct SQL instead of parameterized query for POINT type
          placeholders.push(`POINT(${value.lng}, ${value.lat})`);
          console.log(`✅ Converted coordinates {lat: ${value.lat}, lng: ${value.lng}} to POINT format`);
        } else if (Array.isArray(value)) {
          // ✅ NEW FIX: Convert arrays to plain text
          // Factory/dropdown fields come as arrays: ["โรงงานระยอง"]
          // Extract first element or join multiple values
          const plainValue = value.length === 1 ? value[0] : value.join(', ');
          placeholders.push(`$${paramIndex}`);
          values.push(plainValue);
          console.log(`✅ Converted array [${value.join(', ')}] to plain text: "${plainValue}"`);
          paramIndex++;
        } else {
          placeholders.push(`$${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      const insertQuery = `
        INSERT INTO "${tableName}" (${columns.join(', ')})
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
      if (filters.username) {
        conditions.push(`username = $${paramIndex}`);
        values.push(filters.username);
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
   * Insert sub-form data
   * @param {string} subFormTableName - Sub-form table name
   * @param {string} parentId - Parent submission ID (from submissions table)
   * @param {string} mainFormSubId - Main form submission ID from dynamic table (the actual parent)
   * @param {string} username - Username
   * @param {Object} submissionData - Sub-form data
   * @param {number} orderIndex - Order index for multiple entries
   * @returns {Promise<Object>} - Inserted record
   */
  async insertSubFormData(subFormTableName, parentId, mainFormSubId, username, submissionData, orderIndex = 0) {
    const client = await this.pool.connect();

    try {
      // ✅ CRITICAL FIX: Only use parent_id and main_form_subid (parent_id2 is deprecated)
      // parent_id: FK to submissions.id (maintains data integrity)
      // main_form_subid: The ACTUAL parent main form submission ID from dynamic table
      const columns = ['"parent_id"', '"main_form_subid"', '"username"', '"order"'];
      const values = [parentId, mainFormSubId, username, orderIndex];
      const placeholders = ['$1', '$2', '$3', '$4'];
      let paramIndex = 5;

      // Add data fields with quoted column names
      for (const [key, value] of Object.entries(submissionData)) {
        columns.push(`"${key}"`); // Quote column names for PostgreSQL

        // ✅ CRITICAL FIX: Convert coordinate objects to PostgreSQL POINT format
        // PostgreSQL POINT format: POINT(longitude, latitude)
        // Frontend sends: {lat: 13.806..., lng: 100.522...}
        if (value && typeof value === 'object' && 'lat' in value && 'lng' in value) {
          // Convert to POINT format: POINT(lng, lat) - note the order!
          // Use direct SQL instead of parameterized query for POINT type
          placeholders.push(`POINT(${value.lng}, ${value.lat})`);
          console.log(`✅ Converted coordinates {lat: ${value.lat}, lng: ${value.lng}} to POINT format`);
        } else if (Array.isArray(value)) {
          // ✅ NEW FIX: Convert arrays to plain text
          // Factory/dropdown fields come as arrays: ["โรงงานระยอง"]
          // Extract first element or join multiple values
          const plainValue = value.length === 1 ? value[0] : value.join(', ');
          placeholders.push(`$${paramIndex}`);
          values.push(plainValue);
          console.log(`✅ Converted array [${value.join(', ')}] to plain text: "${plainValue}"`);
          paramIndex++;
        } else {
          placeholders.push(`$${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      const insertQuery = `
        INSERT INTO "${subFormTableName}" (${columns.join(', ')})
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
   * Get sub-form data by parent ID
   * @param {string} subFormTableName - Sub-form table name
   * @param {string} parentId - Parent submission ID
   * @returns {Promise<Array>} - Array of sub-form records
   */
  async getSubFormData(subFormTableName, parentId) {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM ${subFormTableName}
        WHERE parent_id = $1
        ORDER BY "order" ASC, submitted_at ASC;
      `;

      const result = await client.query(query, [parentId]);
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

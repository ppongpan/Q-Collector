/**
 * SchemaGenerator - PostgreSQL Schema Generation from Form Definitions
 *
 * Generates CREATE TABLE statements and manages database schema
 * for Q-Collector forms with Thai→English name translation.
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

const SQLNameNormalizer = require('./SQLNameNormalizer');

/**
 * Q-Collector Field Type to PostgreSQL Data Type Mapping
 */
const FIELD_TYPE_MAPPING = {
  // Text fields
  'short_answer': 'VARCHAR(255)',
  'paragraph': 'TEXT',
  'email': 'VARCHAR(255)',
  'phone': 'VARCHAR(20)',
  'url': 'TEXT',

  // Numeric fields
  'number': 'DECIMAL(10, 2)',
  'rating': 'INTEGER',
  'slider': 'INTEGER',

  // Date/Time fields
  'date': 'DATE',
  'time': 'TIME',
  'datetime': 'TIMESTAMP',

  // Selection fields
  'multiple_choice': 'TEXT',  // Store as comma-separated or JSON
  'dropdown': 'TEXT',
  'checkbox': 'BOOLEAN',

  // File fields
  'file_upload': 'TEXT',  // Store file path/URL
  'image_upload': 'TEXT', // Store image path/URL

  // Location fields
  'lat_long': 'POINT',    // PostgreSQL geometric type
  'province': 'VARCHAR(100)',
  'factory': 'VARCHAR(255)',

  // Special fields
  'formula': 'TEXT',      // Store calculated value as text
  'reference': 'INTEGER'  // Foreign key to referenced table
};

/**
 * Default column constraints
 */
const DEFAULT_CONSTRAINTS = {
  primary_key: 'SERIAL PRIMARY KEY',
  created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  form_id: 'UUID NOT NULL',  // Changed from INTEGER to UUID
  user_id: 'UUID'              // Changed from INTEGER to UUID
};

class SchemaGenerator {
  /**
   * Generate PostgreSQL CREATE TABLE statement from form definition
   * 🔄 ASYNC: Now uses LibreTranslate API for accurate translation
   *
   * @param {Object} formDefinition - Form definition object
   * @param {string} formDefinition.id - Form ID
   * @param {string} formDefinition.name - Form name (Thai or English)
   * @param {Array<Object>} formDefinition.fields - Form fields
   * @param {Array<Object>} formDefinition.subForms - Sub-forms (optional)
   * @param {Object} options - Generation options
   * @param {string} options.tablePrefix - Table name prefix (default: 'form_')
   * @param {boolean} options.includeMetadata - Include metadata columns (default: true)
   * @param {boolean} options.includeIndexes - Include CREATE INDEX statements (default: true)
   * @returns {Promise<Object>} Schema generation result
   */
  static async generateSchema(formDefinition, options = {}) {
    const {
      tablePrefix = 'form_',
      includeMetadata = true,
      includeIndexes = true
    } = options;

    if (!formDefinition || !formDefinition.name) {
      throw new Error('Form definition must include a name');
    }

    const result = {
      mainTable: null,
      subTables: [],
      indexes: [],
      relationships: [],
      metadata: {
        formId: formDefinition.id,
        formName: formDefinition.name,
        createdAt: new Date().toISOString()
      }
    };

    // Generate main table (NOW ASYNC)
    result.mainTable = await this.generateMainTable(formDefinition, {
      tablePrefix,
      includeMetadata,
      includeIndexes
    });

    // Generate sub-form tables (NOW ASYNC)
    if (formDefinition.subForms && formDefinition.subForms.length > 0) {
      for (const subForm of formDefinition.subForms) {
        const subTable = await this.generateSubFormTable(
          subForm,
          result.mainTable.tableName,
          {
            tablePrefix,
            includeMetadata,
            includeIndexes
          }
        );
        result.subTables.push(subTable);

        // Track relationship
        result.relationships.push({
          subTable: subTable.tableName,
          mainTable: result.mainTable.tableName,
          foreignKey: subTable.foreignKey
        });
      }
    }

    // Collect all indexes
    if (includeIndexes) {
      result.indexes.push(...result.mainTable.indexes);
      result.subTables.forEach(subTable => {
        result.indexes.push(...subTable.indexes);
      });
    }

    return result;
  }

  /**
   * Generate main table schema
   * 🔄 ASYNC: Now uses LibreTranslate API
   *
   * @param {Object} formDefinition - Form definition
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Main table schema
   */
  static async generateMainTable(formDefinition, options = {}) {
    const {
      tablePrefix = 'form_',
      includeMetadata = true,
      includeIndexes = true
    } = options;

    // Generate table name (NOW ASYNC)
    const tableName = await SQLNameNormalizer.generateTableName(
      formDefinition.name,
      { prefix: tablePrefix }
    );

    // Build columns
    const columns = [];
    const existingNames = new Set();

    // Primary key
    columns.push({
      name: 'id',
      type: DEFAULT_CONSTRAINTS.primary_key,
      isPrimary: true
    });
    existingNames.add('id');

    // Form ID reference (to forms table)
    columns.push({
      name: 'form_id',
      type: DEFAULT_CONSTRAINTS.form_id,
      comment: 'Reference to forms table'
    });
    existingNames.add('form_id');

    // User ID (submission owner)
    if (includeMetadata) {
      columns.push({
        name: 'user_id',
        type: DEFAULT_CONSTRAINTS.user_id,
        comment: 'User who submitted this form'
      });
      existingNames.add('user_id');
    }

    // Form fields (NOW ASYNC)
    if (formDefinition.fields && formDefinition.fields.length > 0) {
      for (const field of formDefinition.fields) {
        const column = await this.generateColumnFromField(field, existingNames);
        if (column) {
          columns.push(column);
          existingNames.add(column.name);
        }
      }
    }

    // Metadata columns
    if (includeMetadata) {
      columns.push({
        name: 'created_at',
        type: DEFAULT_CONSTRAINTS.created_at,
        comment: 'Record creation timestamp'
      });
      columns.push({
        name: 'updated_at',
        type: DEFAULT_CONSTRAINTS.updated_at,
        comment: 'Record last update timestamp'
      });
    }

    // Generate CREATE TABLE statement
    const createStatement = this.buildCreateTableStatement(tableName, columns);

    // Generate indexes
    const indexes = [];
    if (includeIndexes) {
      indexes.push(this.buildIndexStatement(tableName, ['form_id']));
      if (includeMetadata) {
        indexes.push(this.buildIndexStatement(tableName, ['user_id']));
        indexes.push(this.buildIndexStatement(tableName, ['created_at']));
      }
    }

    return {
      tableName,
      columns,
      createStatement,
      indexes,
      metadata: {
        formId: formDefinition.id,
        formName: formDefinition.name
      }
    };
  }

  /**
   * Generate sub-form table schema
   *
   * @param {Object} subForm - Sub-form definition
   * @param {string} mainTableName - Main table name (for foreign key)
   * @param {Object} options - Generation options
   * @returns {Object} Sub-form table schema
   */
  static async generateSubFormTable(subForm, mainTableName, options = {}) {
    const {
      tablePrefix = 'form_',
      includeMetadata = true,
      includeIndexes = true
    } = options;

    // Generate table name (NOW ASYNC)
    const tableName = await SQLNameNormalizer.generateTableName(
      subForm.name,
      { prefix: tablePrefix }
    );

    // Build columns
    const columns = [];
    const existingNames = new Set();

    // Primary key
    columns.push({
      name: 'id',
      type: DEFAULT_CONSTRAINTS.primary_key,
      isPrimary: true
    });
    existingNames.add('id');

    // Foreign key to main table
    const foreignKeyColumn = `${mainTableName}_id`;
    columns.push({
      name: foreignKeyColumn,
      type: 'INTEGER NOT NULL',
      isForeignKey: true,
      references: {
        table: mainTableName,
        column: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      comment: `Reference to ${mainTableName} table`
    });
    existingNames.add(foreignKeyColumn);

    // Sub-form fields (NOW ASYNC)
    if (subForm.fields && subForm.fields.length > 0) {
      for (const field of subForm.fields) {
        const column = await this.generateColumnFromField(field, existingNames);
        if (column) {
          columns.push(column);
          existingNames.add(column.name);
        }
      }
    }

    // Metadata columns
    if (includeMetadata) {
      columns.push({
        name: 'created_at',
        type: DEFAULT_CONSTRAINTS.created_at,
        comment: 'Record creation timestamp'
      });
      columns.push({
        name: 'updated_at',
        type: DEFAULT_CONSTRAINTS.updated_at,
        comment: 'Record last update timestamp'
      });
    }

    // Generate CREATE TABLE statement
    const createStatement = this.buildCreateTableStatement(tableName, columns);

    // Generate indexes
    const indexes = [];
    if (includeIndexes) {
      indexes.push(this.buildIndexStatement(tableName, [foreignKeyColumn]));
      if (includeMetadata) {
        indexes.push(this.buildIndexStatement(tableName, ['created_at']));
      }
    }

    return {
      tableName,
      columns,
      createStatement,
      indexes,
      foreignKey: foreignKeyColumn,
      metadata: {
        subFormId: subForm.id,
        subFormName: subForm.name,
        mainTable: mainTableName
      }
    };
  }

  /**
   * Generate column definition from field
   * 🔄 ASYNC: Now uses LibreTranslate API
   *
   * @param {Object} field - Field definition
   * @param {Set<string>} existingNames - Set of existing column names
   * @returns {Promise<Object|null>} Column definition or null if invalid
   */
  static async generateColumnFromField(field, existingNames) {
    if (!field || !field.label) {
      return null;
    }

    // Generate column name (NOW ASYNC)
    let columnName = await SQLNameNormalizer.generateColumnName(field.label);

    // Ensure uniqueness
    columnName = SQLNameNormalizer.ensureUnique(columnName, existingNames);

    // Map field type to PostgreSQL type
    const dataType = FIELD_TYPE_MAPPING[field.type] || 'TEXT';

    // Build constraints
    const constraints = [];
    if (field.required) {
      constraints.push('NOT NULL');
    }
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      constraints.push(`DEFAULT '${field.defaultValue}'`);
    }

    // Combine type and constraints
    const typeWithConstraints = constraints.length > 0
      ? `${dataType} ${constraints.join(' ')}`
      : dataType;

    return {
      name: columnName,
      type: typeWithConstraints,
      originalLabel: field.label,
      fieldType: field.type,
      required: field.required || false,
      comment: field.description || field.label
    };
  }

  /**
   * Build CREATE TABLE statement
   *
   * @param {string} tableName - Table name
   * @param {Array<Object>} columns - Column definitions
   * @returns {string} CREATE TABLE SQL statement
   */
  static buildCreateTableStatement(tableName, columns) {
    const columnDefs = columns.map(col => {
      let def = `  ${col.name} ${col.type}`;

      // Add foreign key constraint if applicable
      if (col.isForeignKey && col.references) {
        const ref = col.references;
        def += `,\n  FOREIGN KEY (${col.name}) REFERENCES ${ref.table}(${ref.column})`;
        if (ref.onDelete) {
          def += ` ON DELETE ${ref.onDelete}`;
        }
        if (ref.onUpdate) {
          def += ` ON UPDATE ${ref.onUpdate}`;
        }
      }

      return def;
    }).join(',\n');

    return `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnDefs}\n);`;
  }

  /**
   * Build CREATE INDEX statement
   *
   * @param {string} tableName - Table name
   * @param {Array<string>} columns - Columns to index
   * @param {Object} options - Index options
   * @returns {string} CREATE INDEX SQL statement
   */
  static buildIndexStatement(tableName, columns, options = {}) {
    const indexName = `idx_${tableName}_${columns.join('_')}`;
    const columnList = columns.join(', ');
    return `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnList});`;
  }

  /**
   * Generate ALTER TABLE statement to add column
   *
   * @param {string} tableName - Table name
   * @param {Object} column - Column definition
   * @returns {string} ALTER TABLE SQL statement
   */
  static buildAddColumnStatement(tableName, column) {
    return `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`;
  }

  /**
   * Generate DROP TABLE statement
   *
   * @param {string} tableName - Table name
   * @param {boolean} cascade - Use CASCADE (default: false)
   * @returns {string} DROP TABLE SQL statement
   */
  static buildDropTableStatement(tableName, cascade = false) {
    const cascadeStr = cascade ? ' CASCADE' : '';
    return `DROP TABLE IF EXISTS ${tableName}${cascadeStr};`;
  }

  /**
   * Get SQL data type for field type
   *
   * @param {string} fieldType - Q-Collector field type
   * @returns {string} PostgreSQL data type
   */
  static getDataType(fieldType) {
    return FIELD_TYPE_MAPPING[fieldType] || 'TEXT';
  }

  /**
   * Get all supported field types
   *
   * @returns {Object} Field type mapping
   */
  static getFieldTypeMapping() {
    return { ...FIELD_TYPE_MAPPING };
  }
}

module.exports = SchemaGenerator;

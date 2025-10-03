/**
 * Create Dynamic Tables for Existing Forms
 *
 * This script generates dynamic PostgreSQL tables for forms that don't have them yet.
 * It uses SchemaGenerator to create tables based on form definitions.
 *
 * Usage: node backend/scripts/create-dynamic-tables.js
 *
 * @version 1.0.0
 * @since 2025-10-02
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const SchemaGenerator = require('../services/SchemaGenerator');
const SQLNameNormalizer = require('../services/SQLNameNormalizer');

// Database connection
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

/**
 * Main migration function
 */
async function createDynamicTables() {
  console.log('\n=================================================');
  console.log('🔧 Create Dynamic Tables for Existing Forms');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get all forms without table_name
    const [forms] = await sequelize.query(`
      SELECT
        id,
        title,
        description,
        table_name
      FROM forms
      WHERE table_name IS NULL
      ORDER BY "createdAt" ASC
    `);

    if (forms.length === 0) {
      console.log('ℹ️  No forms need dynamic tables. All forms already have tables.\n');
      return;
    }

    console.log(`Found ${forms.length} forms without dynamic tables\n`);

    // Process each form
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      console.log(`\n[${ i + 1}/${forms.length}] Processing: "${form.title}"`);
      console.log('─'.repeat(80));

      try {
        // Get form fields
        const [fields] = await sequelize.query(`
          SELECT
            id,
            type,
            title,
            placeholder,
            required,
            "order",
            options
          FROM fields
          WHERE form_id = :formId
          AND sub_form_id IS NULL
          ORDER BY "order" ASC
        `, {
          replacements: { formId: form.id }
        });

        console.log(`  📋 Found ${fields.length} fields`);

        // Build form definition for SchemaGenerator
        const formDefinition = {
          id: form.id,
          name: form.title,
          description: form.description,
          fields: fields.map(f => ({
            id: f.id,
            label: f.title,
            type: f.type,
            required: f.required,
            order: f.order,
            options: f.options
          }))
        };

        // Generate schema (ASYNC - uses LibreTranslate if needed)
        console.log(`  🔄 Generating schema...`);
        const schema = await SchemaGenerator.generateSchema(formDefinition, {
          tablePrefix: 'form_',
          includeMetadata: true,
          includeIndexes: true
        });

        const tableName = schema.mainTable.tableName;
        console.log(`  📊 Table name: ${tableName}`);

        // Create the table
        console.log(`  🔨 Creating table in PostgreSQL...`);
        await sequelize.query(schema.mainTable.createStatement);
        console.log(`  ✅ Table created successfully`);

        // Create indexes
        if (schema.mainTable.indexes.length > 0) {
          console.log(`  📑 Creating ${schema.mainTable.indexes.length} indexes...`);
          for (const indexStatement of schema.mainTable.indexes) {
            await sequelize.query(indexStatement);
          }
          console.log(`  ✅ Indexes created`);
        }

        // Update form's table_name
        await sequelize.query(`
          UPDATE forms
          SET table_name = :tableName,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = :formId
        `, {
          replacements: { tableName, formId: form.id }
        });
        console.log(`  ✅ Updated forms.table_name`);

        console.log(`  ✅ Completed: "${form.title}"`);

      } catch (error) {
        console.error(`  ❌ Error processing "${form.title}":`, error.message);
        console.error(`     Stack: ${error.stack}`);
        throw error; // Stop on first error
      }
    }

    console.log('\n=================================================');
    console.log('✅ All Dynamic Tables Created Successfully!');
    console.log('=================================================\n');

    // Show summary
    console.log('📊 Summary:\n');
    const [updatedForms] = await sequelize.query(`
      SELECT title, table_name
      FROM forms
      WHERE table_name IS NOT NULL
      ORDER BY "createdAt" ASC
    `);

    updatedForms.forEach((form, index) => {
      console.log(`  ${index + 1}. "${form.title}"`);
      console.log(`     Table: ${form.table_name}\n`);
    });

    console.log('=================================================\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration
if (require.main === module) {
  createDynamicTables()
    .then(() => {
      console.log('✅ Migration completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createDynamicTables };

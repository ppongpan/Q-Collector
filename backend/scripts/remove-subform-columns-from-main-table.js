const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

async function removeSubFormColumnsFromMainTable() {
  try {
    const formId = 'd905bceb-c4ea-4534-a3cf-b8f25df76413';

    // Get the form table name
    const [forms] = await sequelize.query(`
      SELECT id, title, table_name
      FROM forms
      WHERE id = '${formId}'
    `);

    if (forms.length === 0) {
      console.log('Form not found');
      return;
    }

    const tableName = forms[0].table_name;
    console.log(`\n=== Form: ${forms[0].title} ===`);
    console.log(`Table: ${tableName}`);

    // Get all fields for this form
    const [fields] = await sequelize.query(`
      SELECT id, form_id, sub_form_id, title, type, "order"
      FROM fields
      WHERE form_id = '${formId}'
      ORDER BY "order"
    `);

    // Separate main form fields and sub-form fields
    const mainFormFields = fields.filter(f => !f.sub_form_id);
    const subFormFields = fields.filter(f => f.sub_form_id);

    console.log(`\n=== FIELD COUNT ===`);
    console.log(`Main form fields: ${mainFormFields.length}`);
    console.log(`Sub-form fields: ${subFormFields.length}`);

    console.log(`\n=== MAIN FORM FIELDS (should have columns) ===`);
    mainFormFields.forEach(f => {
      console.log(`- ${f.title} (${f.type})`);
    });

    console.log(`\n=== SUB-FORM FIELDS (should NOT have columns in main table) ===`);
    subFormFields.forEach(f => {
      console.log(`- ${f.title} (${f.type})`);
    });

    // Get current table columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      AND column_name NOT IN ('id', 'form_id', 'username', 'submission_number', 'submitted_at')
      ORDER BY ordinal_position
    `);

    console.log(`\n=== CURRENT TABLE COLUMNS (excluding system columns) ===`);
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

    // Columns to remove (sub-form field columns)
    const columnsToRemove = [
      'worker_name',
      'date_of_call',
      'customers_state',
      'geolocation',
      'factory_where_the_goods_are_shipped',
      'customer_contact_number'
    ];

    console.log(`\n=== REMOVING SUB-FORM COLUMNS FROM MAIN TABLE ===`);

    for (const columnName of columnsToRemove) {
      try {
        console.log(`Dropping column: ${columnName}`);
        await sequelize.query(`
          ALTER TABLE ${tableName}
          DROP COLUMN IF EXISTS ${columnName}
        `);
        console.log(`✅ Dropped: ${columnName}`);
      } catch (error) {
        console.error(`❌ Error dropping ${columnName}:`, error.message);
      }
    }

    // Verify final state
    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `);

    console.log(`\n=== FINAL TABLE STRUCTURE ===`);
    finalColumns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

    await sequelize.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeSubFormColumnsFromMainTable();

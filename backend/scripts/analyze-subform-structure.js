const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    logging: false
  }
);

async function analyzeSubFormStructure() {
  try {
    const formId = 'd905bceb-c4ea-4534-a3cf-b8f25df76413';

    // Get the form data
    const [forms] = await sequelize.query(`
      SELECT id, title, table_name
      FROM forms
      WHERE id = '${formId}'
    `);

    console.log('=== FORM DATA ===');
    console.log(JSON.stringify(forms[0], null, 2));

    // Get all fields for this form
    const [fields] = await sequelize.query(`
      SELECT id, form_id, sub_form_id, title, type, "order"
      FROM fields
      WHERE form_id = '${formId}'
      ORDER BY "order"
    `);

    console.log('\n=== MAIN FORM FIELDS ===');
    fields.forEach(f => {
      console.log(`${f.order}. ${f.title} (${f.type}) - ID: ${f.id}, sub_form_id: ${f.sub_form_id || 'null'}`);
    });

    // Get sub-form fields (fields that have a sub_form_id)
    const subformField = fields.find(f => f.sub_form_id);
    if (subformField) {
      console.log(`\n=== SUB-FORM FIELD INFO ===`);
      console.log(`ID: ${subformField.id}, Title: ${subformField.title}, sub_form_id: ${subformField.sub_form_id}`);

      const [subformFields] = await sequelize.query(`
        SELECT id, form_id, sub_form_id, title, type, "order"
        FROM fields
        WHERE sub_form_id = '${subformField.sub_form_id}'
        ORDER BY "order"
      `);

      console.log('\n=== SUB-FORM FIELDS (should NOT be in main table) ===');
      subformFields.forEach(f => {
        console.log(`${f.order}. ${f.title} (${f.type}) - sub_form_id: ${f.sub_form_id}`);
      });

      // Check main form table columns
      const tableName = forms[0].table_name;
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `);

      console.log(`\n=== MAIN FORM TABLE (${tableName}) COLUMNS ===`);
      columns.forEach(col => {
        console.log(`${col.column_name} (${col.data_type})`);
      });

      // Check if sub-form has its own table
      const [subforms] = await sequelize.query(`
        SELECT id, title, table_name
        FROM sub_forms
        WHERE id = '${subformField.sub_form_id}'
      `);

      if (subforms.length > 0) {
        console.log(`\n=== SUB-FORM TABLE (${subforms[0].table_name}) ===`);
        const [subColumns] = await sequelize.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${subforms[0].table_name}'
          ORDER BY ordinal_position
        `);

        console.log('Columns:');
        subColumns.forEach(col => {
          console.log(`${col.column_name} (${col.data_type})`);
        });
      }
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeSubFormStructure();

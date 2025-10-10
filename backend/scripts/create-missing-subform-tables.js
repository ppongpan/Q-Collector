/**
 * Create Missing Sub-Form Tables
 * Creates tables for sub-forms that have table_name = NULL
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
const DynamicTableService = require('../services/DynamicTableService');

const sequelize = new Sequelize({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  username: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  dialect: 'postgres',
  logging: false
});

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

const dynamicTableService = new DynamicTableService(pool);

async function createMissingSubFormTables() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Create Missing Sub-Form Tables                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await sequelize.authenticate();

    // Get sub-forms without tables
    const [subForms] = await sequelize.query(`
      SELECT sf.id, sf.title, sf.form_id, sf.table_name, f.table_name as main_table_name
      FROM sub_forms sf
      JOIN forms f ON sf.form_id = f.id
      WHERE sf.table_name IS NULL
      ORDER BY sf."createdAt" DESC;
    `);

    if (subForms.length === 0) {
      console.log('✅ All sub-forms have tables.\n');
      await sequelize.close();
      await pool.end();
      return;
    }

    console.log(`Found ${subForms.length} sub-forms without tables:\n`);

    for (const subForm of subForms) {
      console.log(`📋 Sub-Form: "${subForm.title}"`);
      console.log(`   Form ID: ${subForm.form_id}`);
      console.log(`   Main Table: ${subForm.main_table_name || 'NULL'}`);

      if (!subForm.main_table_name) {
        console.log(`   ⚠️  Main form has no table, skipping...\n`);
        continue;
      }

      // Get sub-form fields
      const [fields] = await sequelize.query(`
        SELECT id, type, title
        FROM fields
        WHERE sub_form_id = '${subForm.id}'
        ORDER BY "order" ASC;
      `);

      console.log(`   Fields: ${fields.length}`);

      // Create sub-form object
      const subFormObj = {
        id: subForm.id,
        title: subForm.title,
        fields: fields.map(f => ({
          id: f.id,
          type: f.type,
          label: f.title,
          title: f.title
        }))
      };

      try {
        console.log(`   🌐 Translating and creating table...\n`);

        const tableName = await dynamicTableService.createSubFormTable(
          subFormObj,
          subForm.main_table_name,
          subForm.form_id
        );

        console.log(`   ✅ Table created: ${tableName}\n`);
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Complete                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await sequelize.close();
    await pool.end();
  }
}

createMissingSubFormTables().catch(console.error);

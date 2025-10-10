/**
 * Fix Missing Tables
 * Creates tables for forms that have table_name = NULL
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

async function fixMissingTables() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Fix Missing Tables                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await sequelize.authenticate();

    // ==========================================
    // Fix Main Forms without tables
    // ==========================================
    const [formsWithoutTables] = await sequelize.query(`
      SELECT id, title, table_name
      FROM forms
      WHERE table_name IS NULL
      ORDER BY "createdAt" DESC;
    `);

    console.log(`📋 Main Forms without tables: ${formsWithoutTables.length}\n`);

    for (const form of formsWithoutTables) {
      console.log(`🔧 Fixing: "${form.title}"`);
      console.log(`   Form ID: ${form.id}`);

      // Get form fields
      const [fields] = await sequelize.query(`
        SELECT id, type, title
        FROM fields
        WHERE form_id = '${form.id}'
        AND sub_form_id IS NULL
        ORDER BY "order" ASC;
      `);

      console.log(`   Fields: ${fields.length}`);

      // Create form object
      const formObj = {
        id: form.id,
        title: form.title,
        fields: fields.map(f => ({
          id: f.id,
          type: f.type,
          label: f.title,
          title: f.title
        }))
      };

      try {
        console.log(`   🌐 Translating and creating table...\n`);

        const tableName = await dynamicTableService.createFormTable(formObj);

        console.log(`   ✅ Table created: ${tableName}\n`);
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }

    // ==========================================
    // Fix Sub-Forms without tables
    // ==========================================
    const [subFormsWithoutTables] = await sequelize.query(`
      SELECT sf.id, sf.title, sf.table_name, sf.form_id, f.table_name as main_table_name
      FROM sub_forms sf
      JOIN forms f ON sf.form_id = f.id
      WHERE sf.table_name IS NULL
      ORDER BY sf."createdAt" DESC;
    `);

    console.log(`📋 Sub-Forms without tables: ${subFormsWithoutTables.length}\n`);

    for (const subForm of subFormsWithoutTables) {
      console.log(`🔧 Fixing: "${subForm.title}"`);
      console.log(`   Sub-Form ID: ${subForm.id}`);
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

    // ==========================================
    // Summary
    // ==========================================
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Complete                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`   Main Forms fixed: ${formsWithoutTables.length}`);
    console.log(`   Sub-Forms fixed: ${subFormsWithoutTables.length}\n`);

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

fixMissingTables().catch(console.error);

/**
 * Check All Forms and Dynamic Tables
 * Lists all forms, sub-forms, and dynamic tables in the database
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkForms() {
  try {
    // Get all forms
    const formsResult = await pool.query('SELECT id, title, table_name, "createdAt" FROM forms ORDER BY "createdAt" DESC;');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║               Forms in Database                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Total Forms: ${formsResult.rows.length}\n`);

    formsResult.rows.forEach((form, i) => {
      console.log(`${i+1}. ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name || 'NULL'}`);
      console.log(`   Created: ${form.createdAt}`);
      console.log('');
    });

    // Get all sub-forms
    const subFormsResult = await pool.query('SELECT id, title, table_name, form_id FROM sub_forms;');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║               Sub-Forms in Database                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Total Sub-Forms: ${subFormsResult.rows.length}\n`);

    subFormsResult.rows.forEach((sf, i) => {
      console.log(`${i+1}. ${sf.title}`);
      console.log(`   ID: ${sf.id}`);
      console.log(`   Table: ${sf.table_name || 'NULL'}`);
      console.log(`   Form ID: ${sf.form_id}`);
      console.log('');
    });

    // Get all dynamic tables (tables NOT in system tables)
    const systemTables = [
      'forms',
      'users',
      'sub_forms',
      'fields',
      'submissions',
      'audit_logs',
      'SequelizeMeta',
      'sessions',
      'telegram_notifications',
      'telegram_queue',
      'trusted_devices'
    ];

    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const allTables = tablesResult.rows.map(r => r.table_name);
    const dynamicTables = allTables.filter(name => !systemTables.includes(name));

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║               System Tables (DO NOT DELETE)                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    systemTables.forEach((table, i) => {
      const exists = allTables.includes(table);
      console.log(`${i+1}. ${table} ${exists ? '✅' : '❌ Not Found'}`);
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          Dynamic Tables (Form Tables - CAN DELETE)         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Total Dynamic Tables: ${dynamicTables.length}\n`);

    if (dynamicTables.length === 0) {
      console.log('   ✅ No dynamic tables found\n');
    } else {
      dynamicTables.forEach((table, i) => {
        console.log(`${i+1}. ${table}`);
      });
      console.log('');
    }

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                       Summary                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`   Forms in DB: ${formsResult.rows.length}`);
    console.log(`   Sub-Forms in DB: ${subFormsResult.rows.length}`);
    console.log(`   Dynamic Tables: ${dynamicTables.length}`);
    console.log(`   System Tables: ${systemTables.length} (protected)\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkForms();

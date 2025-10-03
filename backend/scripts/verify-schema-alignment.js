/**
 * Verify Form Structure and Dynamic Table Schema Alignment
 * Check if form models match dynamic table creation logic
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function verifySchemaAlignment() {
  try {
    console.log('🔍 Verifying Form Structure and Schema Alignment\n');
    console.log('=' .repeat(80));

    // 1. Check forms table structure
    console.log('\n📋 1. Forms Table Structure:');
    const formsColumns = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'forms'
      ORDER BY ordinal_position;
    `);

    console.log(`\nForms table has ${formsColumns.rows.length} columns:`);
    formsColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check for table_name column
    const hasTableName = formsColumns.rows.some(c => c.column_name === 'table_name');
    console.log(`\n  ✅ table_name column: ${hasTableName ? 'EXISTS' : '❌ MISSING'}`);

    // 2. Check fields table structure
    console.log('\n📋 2. Fields Table Structure:');
    const fieldsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'fields'
      ORDER BY ordinal_position;
    `);

    console.log(`\nFields table has ${fieldsColumns.rows.length} columns:`);
    const requiredFieldColumns = ['id', 'form_id', 'title', 'type', 'required', 'order', 'order_index'];
    requiredFieldColumns.forEach(reqCol => {
      const exists = fieldsColumns.rows.some(c => c.column_name === reqCol);
      console.log(`  ${exists ? '✅' : '❌'} ${reqCol}`);
    });

    // 3. Check sub_forms table structure
    console.log('\n📋 3. Sub-Forms Table Structure:');
    const subFormsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sub_forms'
      ORDER BY ordinal_position;
    `);

    console.log(`\nSub-forms table has ${subFormsColumns.rows.length} columns:`);
    const requiredSubFormColumns = ['id', 'form_id', 'title', 'order', 'order_index', 'table_name'];
    requiredSubFormColumns.forEach(reqCol => {
      const exists = subFormsColumns.rows.some(c => c.column_name === reqCol);
      console.log(`  ${exists ? '✅' : '❌'} ${reqCol}`);
    });

    // 4. Verify field type mappings
    console.log('\n📋 4. Field Type → PostgreSQL Type Mappings:');
    const fieldTypeMappings = {
      'short_answer': 'VARCHAR(500)',
      'paragraph': 'TEXT',
      'email': 'VARCHAR(255)',
      'phone': 'VARCHAR(20)',
      'number': 'NUMERIC',
      'url': 'VARCHAR(1000)',
      'date': 'DATE',
      'time': 'TIME',
      'datetime': 'TIMESTAMP',
      'multiple_choice': 'VARCHAR(255)',
      'rating': 'INTEGER',
      'slider': 'INTEGER',
      'file_upload': 'TEXT',
      'image_upload': 'TEXT',
      'lat_long': 'POINT',
      'province': 'VARCHAR(100)',
      'factory': 'VARCHAR(255)'
    };

    console.log('\nField types supported:');
    Object.entries(fieldTypeMappings).forEach(([fieldType, pgType]) => {
      console.log(`  ✅ ${fieldType.padEnd(20)} → ${pgType}`);
    });

    // 5. Check current form records
    console.log('\n📋 5. Current Forms in Database:');
    const forms = await pool.query('SELECT id, title, table_name FROM forms ORDER BY "createdAt" DESC;');

    if (forms.rows.length === 0) {
      console.log('\n  ℹ️  No forms in database (expected after cleanup)');
    } else {
      console.log(`\nFound ${forms.rows.length} forms:`);
      forms.rows.forEach((form, idx) => {
        console.log(`  ${idx + 1}. ${form.title}`);
        console.log(`     ID: ${form.id}`);
        console.log(`     Table: ${form.table_name || 'NULL (needs update)'}`);
      });
    }

    // 6. Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Schema Alignment Summary:\n');

    const checks = [
      { name: 'Forms table exists', passed: formsColumns.rows.length > 0 },
      { name: 'Forms.table_name column exists', passed: hasTableName },
      { name: 'Fields table exists', passed: fieldsColumns.rows.length > 0 },
      { name: 'Fields.order_index exists', passed: fieldsColumns.rows.some(c => c.column_name === 'order_index') },
      { name: 'Sub-forms table exists', passed: subFormsColumns.rows.length > 0 },
      { name: 'Sub-forms.table_name exists', passed: subFormsColumns.rows.some(c => c.column_name === 'table_name') },
      { name: 'Sub-forms.order_index exists', passed: subFormsColumns.rows.some(c => c.column_name === 'order_index') }
    ];

    checks.forEach(check => {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.passed);

    console.log('\n' + '='.repeat(80));
    if (allPassed) {
      console.log('\n✅ Schema alignment verified! Ready to create new forms.');
    } else {
      console.log('\n⚠️  Some schema issues detected. Please fix before creating forms.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

verifySchemaAlignment().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

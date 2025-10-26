/**
 * Fix All Data Consistency Issues
 * Automatically fix all forms with missing tables or data mismatches
 *
 * Run: node backend/scripts/fix-all-data-consistency-issues.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');
const { Form, Field, Submission, SubmissionData } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * Generate unique table name from form ID
 */
function generateUniqueTableName(formId, formTitle) {
  // Use last 12 chars of form ID for uniqueness
  const uniqueSuffix = formId.replace(/-/g, '').substring(formId.length - 12);

  // Clean form title for table name prefix
  let prefix = formTitle
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  // If Thai characters remain, use generic name
  if (/[\u0E00-\u0E7F]/.test(prefix)) {
    prefix = 'form';
  }

  // Limit prefix length
  prefix = prefix.substring(0, 50);

  return `${prefix}_${uniqueSuffix}`;
}

/**
 * Map field type to PostgreSQL type
 */
function mapFieldTypeToPostgres(fieldType) {
  switch (fieldType) {
    case 'number':
    case 'rating':
    case 'slider':
      return 'NUMERIC';
    case 'date':
      return 'DATE';
    case 'time':
      return 'TIME';
    case 'datetime':
      return 'TIMESTAMP';
    case 'file_upload':
    case 'image_upload':
      return 'JSONB';
    default:
      return 'TEXT';
  }
}

/**
 * Generate column name from field
 */
function generateColumnName(field, index) {
  let columnName = field.title
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  // If Thai characters remain, use field type + index
  if (/[\u0E00-\u0E7F]/.test(columnName)) {
    columnName = `${field.type}_${index + 1}`;
  }

  return columnName;
}

/**
 * Create dynamic table for a form
 */
async function createDynamicTableForForm(form, fields) {
  console.log(`\n🏗️  Creating dynamic table for form: ${form.title}`);
  console.log(`   Form ID: ${form.id}`);

  const tableName = form.table_name;
  console.log(`   Table Name: ${tableName}`);

  // Build CREATE TABLE statement
  let createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
  createTableSQL += `  submission_id UUID PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,\n`;
  createTableSQL += `  submitted_at TIMESTAMP WITH TIME ZONE,\n`;

  const columnMappings = [];

  fields.forEach((field, index) => {
    const columnName = generateColumnName(field, index);
    const pgType = mapFieldTypeToPostgres(field.type);

    createTableSQL += `  "${columnName}" ${pgType},\n`;

    columnMappings.push({
      fieldId: field.id,
      columnName: columnName,
      fieldTitle: field.title,
      fieldType: field.type
    });
  });

  createTableSQL += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n`;
  createTableSQL += `  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n`;
  createTableSQL += `);`;

  // Create table
  await sequelize.query(createTableSQL);
  console.log(`   ✅ Table created successfully`);

  // Save column mappings
  const mappingDir = path.join(__dirname, '..', 'config', 'table-mappings');
  if (!fs.existsSync(mappingDir)) {
    fs.mkdirSync(mappingDir, { recursive: true });
  }

  const mappingFile = path.join(mappingDir, `${tableName}.json`);
  fs.writeFileSync(
    mappingFile,
    JSON.stringify({
      formId: form.id,
      tableName: tableName,
      createdAt: new Date().toISOString(),
      columnMappings: columnMappings
    }, null, 2)
  );

  return columnMappings;
}

/**
 * Backfill submissions into dynamic table
 */
async function backfillSubmissions(form, columnMappings) {
  console.log(`\n📥 Backfilling submissions for form: ${form.title}`);

  const submissions = await Submission.findAll({
    where: { form_id: form.id },
    include: [
      {
        model: SubmissionData,
        as: 'submissionData',
        include: [
          {
            model: Field,
            as: 'field',
            attributes: ['id', 'title', 'type']
          }
        ]
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  console.log(`   Found ${submissions.length} submissions to backfill`);

  let successCount = 0;
  let errorCount = 0;

  for (const submission of submissions) {
    try {
      const columnNames = ['submission_id', 'submitted_at'];
      const values = [
        `'${submission.id}'`,
        submission.submitted_at ? `'${submission.submitted_at.toISOString()}'` : 'NULL'
      ];

      // Map submission data to columns
      const dataMap = new Map();
      if (submission.submissionData) {
        submission.submissionData.forEach(sd => {
          dataMap.set(sd.field_id, sd);
        });
      }

      columnMappings.forEach(mapping => {
        const submissionData = dataMap.get(mapping.fieldId);

        let value = 'NULL';
        if (submissionData) {
          const rawValue = submissionData.getDecryptedValue();

          if (rawValue !== null && rawValue !== undefined) {
            if (mapping.fieldType === 'number' || mapping.fieldType === 'rating' || mapping.fieldType === 'slider') {
              value = isNaN(rawValue) ? 'NULL' : rawValue;
            } else if (mapping.fieldType === 'file_upload' || mapping.fieldType === 'image_upload') {
              value = `'${JSON.stringify(rawValue).replace(/'/g, "''")}'::jsonb`;
            } else {
              const escapedValue = String(rawValue).replace(/'/g, "''");
              value = `'${escapedValue}'`;
            }
          }
        }

        columnNames.push(`"${mapping.columnName}"`);
        values.push(value);
      });

      const insertSQL = `
        INSERT INTO "${form.table_name}" (${columnNames.join(', ')})
        VALUES (${values.join(', ')})
        ON CONFLICT (submission_id) DO UPDATE SET
          submitted_at = EXCLUDED.submitted_at,
          ${columnMappings.map(m => `"${m.columnName}" = EXCLUDED."${m.columnName}"`).join(',\n          ')}
      `;

      await sequelize.query(insertSQL);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`   ❌ Error backfilling submission ${submission.id.substring(0, 8)}: ${error.message}`);
    }
  }

  console.log(`   ✅ Success: ${successCount} submissions`);
  console.log(`   ❌ Errors: ${errorCount} submissions`);

  return { successCount, errorCount };
}

/**
 * Sync data by removing orphaned rows
 */
async function syncDynamicTable(form) {
  console.log(`\n🔄 Syncing dynamic table: ${form.table_name}`);

  // Get submission IDs from EAV
  const submissions = await Submission.findAll({
    where: { form_id: form.id },
    attributes: ['id'],
    raw: true
  });

  const submissionIds = submissions.map(s => s.id);

  if (submissionIds.length === 0) {
    console.log(`   ⚠️ No submissions in EAV - will clear dynamic table`);
    await sequelize.query(`DELETE FROM "${form.table_name}"`);
    return;
  }

  // Delete rows not in EAV
  const deleteSQL = `
    DELETE FROM "${form.table_name}"
    WHERE submission_id NOT IN (${submissionIds.map(id => `'${id}'`).join(', ')})
  `;

  const result = await sequelize.query(deleteSQL);
  console.log(`   ✅ Removed orphaned rows`);
}

/**
 * Fix duplicate table names by updating form metadata
 */
async function fixDuplicateTableNames(forms) {
  // Find forms with duplicate table names
  const tableNameCounts = {};
  forms.forEach(form => {
    if (form.table_name) {
      tableNameCounts[form.table_name] = (tableNameCounts[form.table_name] || 0) + 1;
    }
  });

  const duplicateTableNames = Object.keys(tableNameCounts).filter(name => tableNameCounts[name] > 1);

  if (duplicateTableNames.length === 0) {
    console.log('\n✅ No duplicate table names found');
    return;
  }

  console.log(`\n⚠️ Found ${duplicateTableNames.length} duplicate table name(s):`);
  duplicateTableNames.forEach(name => {
    console.log(`   - ${name} (used by ${tableNameCounts[name]} forms)`);
  });

  console.log('\n🔧 Fixing duplicate table names...\n');

  for (const tableName of duplicateTableNames) {
    const formsWithSameName = forms.filter(f => f.table_name === tableName);

    // Keep the oldest form with the original name, rename the others
    formsWithSameName.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (let i = 1; i < formsWithSameName.length; i++) {
      const form = formsWithSameName[i];
      const newTableName = generateUniqueTableName(form.id, form.title);

      console.log(`   Renaming: ${form.title}`);
      console.log(`   Old: ${form.table_name}`);
      console.log(`   New: ${newTableName}`);

      await Form.update(
        { table_name: newTableName },
        { where: { id: form.id } }
      );

      // Update the form object
      form.table_name = newTableName;

      console.log(`   ✅ Updated\n`);
    }
  }
}

/**
 * Main function
 */
async function fixAllDataConsistency() {
  console.log('🔧 Fixing All Data Consistency Issues...\n');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all forms
    const forms = await Form.findAll({
      attributes: ['id', 'title', 'table_name', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📋 Found ${forms.length} forms\n`);

    // STEP 1: Fix duplicate table names
    console.log('='.repeat(80));
    console.log('STEP 1: Fix Duplicate Table Names');
    console.log('='.repeat(80));
    await fixDuplicateTableNames(forms);

    // STEP 2: Create missing tables and backfill
    console.log('\n');
    console.log('='.repeat(80));
    console.log('STEP 2: Create Missing Tables & Backfill Data');
    console.log('='.repeat(80));

    for (const form of forms) {
      if (!form.table_name) {
        console.log(`\n⚠️ Skipping ${form.title} - no table_name configured`);
        continue;
      }

      // Check if table exists
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as table_exists;
      `;

      const [tableCheck] = await sequelize.query(tableCheckQuery, {
        bind: [form.table_name],
        type: sequelize.QueryTypes.SELECT
      });

      if (!tableCheck.table_exists) {
        console.log(`\n📝 Form: ${form.title} - MISSING TABLE`);

        // Get fields
        const fields = await Field.findAll({
          where: { form_id: form.id, sub_form_id: null },
          order: [['order', 'ASC']]
        });

        console.log(`   Found ${fields.length} fields`);

        // Create table
        const columnMappings = await createDynamicTableForForm(form, fields);

        // Backfill data
        await backfillSubmissions(form, columnMappings);
      }
    }

    // STEP 3: Sync existing tables (fix mismatches)
    console.log('\n');
    console.log('='.repeat(80));
    console.log('STEP 3: Sync Existing Tables');
    console.log('='.repeat(80));

    for (const form of forms) {
      if (!form.table_name) continue;

      // Check if table exists
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as table_exists;
      `;

      const [tableCheck] = await sequelize.query(tableCheckQuery, {
        bind: [form.table_name],
        type: sequelize.QueryTypes.SELECT
      });

      if (tableCheck.table_exists) {
        // Count EAV submissions
        const eavCount = await Submission.count({
          where: { form_id: form.id }
        });

        // Count dynamic table rows
        const countQuery = `SELECT COUNT(*) as count FROM "${form.table_name}"`;
        const [countResult] = await sequelize.query(countQuery, {
          type: sequelize.QueryTypes.SELECT
        });

        const dynamicCount = parseInt(countResult.count) || 0;

        if (eavCount !== dynamicCount) {
          console.log(`\n📝 Form: ${form.title} - DATA MISMATCH`);
          console.log(`   EAV: ${eavCount} vs Dynamic: ${dynamicCount}`);

          // Step 1: Remove orphaned rows
          await syncDynamicTable(form);

          // Step 2: Backfill missing rows
          // Get fields and column mappings
          const fields = await Field.findAll({
            where: { form_id: form.id, sub_form_id: null },
            order: [['order', 'ASC']]
          });

          const columnMappings = [];
          fields.forEach((field, index) => {
            columnMappings.push({
              fieldId: field.id,
              columnName: generateColumnName(field, index),
              fieldTitle: field.title,
              fieldType: field.type
            });
          });

          await backfillSubmissions(form, columnMappings);
        }
      }
    }

    // Final verification
    console.log('\n');
    console.log('='.repeat(80));
    console.log('✅ FINAL VERIFICATION');
    console.log('='.repeat(80));
    console.log('\n');

    let allConsistent = true;

    for (const form of forms) {
      if (!form.table_name) continue;

      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as table_exists;
      `;

      const [tableCheck] = await sequelize.query(tableCheckQuery, {
        bind: [form.table_name],
        type: sequelize.QueryTypes.SELECT
      });

      if (!tableCheck.table_exists) {
        console.log(`❌ ${form.title} - Table still missing`);
        allConsistent = false;
        continue;
      }

      const eavCount = await Submission.count({
        where: { form_id: form.id }
      });

      const countQuery = `SELECT COUNT(*) as count FROM "${form.table_name}"`;
      const [countResult] = await sequelize.query(countQuery, {
        type: sequelize.QueryTypes.SELECT
      });

      const dynamicCount = parseInt(countResult.count) || 0;

      if (eavCount === dynamicCount) {
        console.log(`✅ ${form.title} - Consistent (${eavCount} = ${dynamicCount})`);
      } else {
        console.log(`❌ ${form.title} - Still inconsistent (EAV: ${eavCount}, Dynamic: ${dynamicCount})`);
        allConsistent = false;
      }
    }

    console.log('\n');
    console.log('='.repeat(80));
    if (allConsistent) {
      console.log('🎉 ALL FORMS ARE NOW CONSISTENT!');
    } else {
      console.log('⚠️ Some forms still have issues - please review');
    }
    console.log('='.repeat(80));
    console.log('\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

fixAllDataConsistency();

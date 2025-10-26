/**
 * Migrate Old Schema Dynamic Tables
 * Drop and recreate tables with new schema (submission_id + foreign key CASCADE)
 *
 * Run: node backend/scripts/migrate-old-schema-tables.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');
const { Form, Field, Submission, SubmissionData } = require('../models');
const fs = require('fs');
const path = require('path');

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
 * Backup table data to JSON
 */
async function backupTableData(tableName) {
  console.log(`\n💾 Backing up data from ${tableName}...`);

  const query = `SELECT * FROM "${tableName}"`;
  const data = await sequelize.query(query, {
    type: sequelize.QueryTypes.SELECT
  });

  console.log(`   Found ${data.length} rows to backup`);

  // Create backup directory
  const backupDir = path.join(__dirname, '..', 'backups', 'dynamic-tables');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `${tableName}_${timestamp}.json`);

  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));

  console.log(`   ✅ Backed up to: ${backupFile}`);

  return data.length;
}

/**
 * Recreate table with new schema
 */
async function recreateTable(form, fields) {
  console.log(`\n🔨 Recreating table: ${form.table_name}`);

  const tableName = form.table_name;

  // Build CREATE TABLE statement
  let createTableSQL = `CREATE TABLE "${tableName}" (\n`;
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

  // Drop old table
  console.log(`   Dropping old table...`);
  await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);

  // Create new table
  console.log(`   Creating new table with updated schema...`);
  await sequelize.query(createTableSQL);

  console.log(`   ✅ Table recreated successfully`);

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
 * Backfill submissions
 */
async function backfillSubmissions(form, columnMappings) {
  console.log(`\n📥 Backfilling submissions from EAV...`);

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

  console.log(`   Found ${submissions.length} submissions in EAV`);

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
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`   ✅ Success: ${successCount} submissions`);
  console.log(`   ❌ Errors: ${errorCount} submissions`);

  return { successCount, errorCount };
}

/**
 * Detect old schema tables
 */
async function detectOldSchemaTables() {
  console.log('\n🔍 Detecting tables with old schema...\n');

  const forms = await Form.findAll({
    where: { table_name: { [require('sequelize').Op.ne]: null } },
    attributes: ['id', 'title', 'table_name']
  });

  const oldSchemaTables = [];

  for (const form of forms) {
    try {
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
        continue;
      }

      // Check if table has old schema (has 'id' column instead of 'submission_id')
      const columnQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name IN ('id', 'submission_id');
      `;

      const columns = await sequelize.query(columnQuery, {
        bind: [form.table_name],
        type: sequelize.QueryTypes.SELECT
      });

      const hasIdColumn = columns.some(c => c.column_name === 'id');
      const hasSubmissionIdColumn = columns.some(c => c.column_name === 'submission_id');

      if (hasIdColumn && !hasSubmissionIdColumn) {
        console.log(`⚠️ Old schema: ${form.table_name}`);
        console.log(`   Form: ${form.title}`);
        console.log(`   Form ID: ${form.id}`);

        // Count rows
        const countQuery = `SELECT COUNT(*) as count FROM "${form.table_name}"`;
        const [countResult] = await sequelize.query(countQuery, {
          type: sequelize.QueryTypes.SELECT
        });

        const rowCount = parseInt(countResult.count) || 0;
        console.log(`   Rows: ${rowCount}`);

        oldSchemaTables.push({
          form: form,
          rowCount: rowCount
        });

        console.log('');
      }
    } catch (error) {
      console.error(`❌ Error checking ${form.table_name}: ${error.message}`);
    }
  }

  return oldSchemaTables;
}

/**
 * Main function
 */
async function migrateOldSchemaTables() {
  console.log('🔄 Migrating Old Schema Dynamic Tables...\n');
  console.log('='.repeat(80));

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Detect old schema tables
    const oldSchemaTables = await detectOldSchemaTables();

    if (oldSchemaTables.length === 0) {
      console.log('✅ No old schema tables found. All tables are up to date!\n');
      await sequelize.close();
      process.exit(0);
    }

    console.log('='.repeat(80));
    console.log(`\nFound ${oldSchemaTables.length} table(s) with old schema\n`);
    console.log('='.repeat(80));

    // Process each table
    for (const { form, rowCount } of oldSchemaTables) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 Processing: ${form.title}`);
      console.log(`   Table: ${form.table_name}`);
      console.log(`   Old rows: ${rowCount}`);
      console.log('='.repeat(80));

      // Step 1: Backup
      await backupTableData(form.table_name);

      // Step 2: Get fields
      const fields = await Field.findAll({
        where: { form_id: form.id, sub_form_id: null },
        order: [['order', 'ASC']]
      });

      console.log(`\n   Found ${fields.length} fields for this form`);

      // Step 3: Recreate table
      const columnMappings = await recreateTable(form, fields);

      // Step 4: Backfill from EAV
      await backfillSubmissions(form, columnMappings);

      // Step 5: Verify
      const countQuery = `SELECT COUNT(*) as count FROM "${form.table_name}"`;
      const [countResult] = await sequelize.query(countQuery, {
        type: sequelize.QueryTypes.SELECT
      });

      const newRowCount = parseInt(countResult.count) || 0;

      console.log(`\n📊 Migration Summary:`);
      console.log(`   Old table rows: ${rowCount}`);
      console.log(`   New table rows: ${newRowCount}`);

      if (newRowCount > 0) {
        console.log(`   ✅ Migration successful`);
      } else {
        console.log(`   ⚠️ Warning: No rows in new table`);
      }
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('🎉 MIGRATION COMPLETE');
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

migrateOldSchemaTables();

/**
 * Create Missing Dynamic Table for PDPA Demo Form
 * Backfill data from EAV to dynamic table
 *
 * Run: node backend/scripts/create-missing-dynamic-table.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');
const { Field, Submission, SubmissionData } = require('../models');

async function createMissingDynamicTable() {
  console.log('🔧 Creating missing dynamic table for PDPA Demo form...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const formId = 'db30fe84-e8da-463a-a4c8-1e1e246432c2';
    const tableName = 'pdpa_demo_1761351036248';

    // Step 1: Get all fields for this form
    const fields = await Field.findAll({
      where: { form_id: formId },
      order: [['order', 'ASC']]
    });

    console.log(`📋 Found ${fields.length} fields in form\n`);

    // Step 2: Build CREATE TABLE statement
    let createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    createTableSQL += `  submission_id UUID PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,\n`;
    createTableSQL += `  submitted_at TIMESTAMP WITH TIME ZONE,\n`;

    const columnMappings = [];

    fields.forEach((field, index) => {
      // Generate column name (Thai -> English)
      let columnName = field.title
        .toLowerCase()
        .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      // If Thai characters remain, create transliteration or use field ID
      if (/[\u0E00-\u0E7F]/.test(columnName)) {
        // Use field type + index for Thai field names
        columnName = `${field.type}_${index + 1}`;
      }

      // Map field type to PostgreSQL type
      let pgType = 'TEXT';
      switch (field.type) {
        case 'number':
        case 'rating':
        case 'slider':
          pgType = 'NUMERIC';
          break;
        case 'date':
          pgType = 'DATE';
          break;
        case 'time':
          pgType = 'TIME';
          break;
        case 'datetime':
          pgType = 'TIMESTAMP';
          break;
        case 'file_upload':
        case 'image_upload':
          pgType = 'JSONB';
          break;
        default:
          pgType = 'TEXT';
      }

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

    console.log('🏗️  Creating table...\n');
    console.log('SQL:\n', createTableSQL, '\n');

    await sequelize.query(createTableSQL);
    console.log(`✅ Table "${tableName}" created successfully\n`);

    // Step 3: Get all submissions for this form
    const submissions = await Submission.findAll({
      where: { form_id: formId },
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

    console.log(`📊 Found ${submissions.length} submissions to backfill\n`);

    // Step 4: Backfill data
    let successCount = 0;
    let errorCount = 0;

    for (const submission of submissions) {
      try {
        // Build INSERT statement
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
            // Get decrypted value
            const rawValue = submissionData.getDecryptedValue();

            if (rawValue !== null && rawValue !== undefined) {
              // Handle different types
              if (mapping.fieldType === 'number' || mapping.fieldType === 'rating' || mapping.fieldType === 'slider') {
                value = isNaN(rawValue) ? 'NULL' : rawValue;
              } else if (mapping.fieldType === 'file_upload' || mapping.fieldType === 'image_upload') {
                // Store as JSONB
                value = `'${JSON.stringify(rawValue).replace(/'/g, "''")}'::jsonb`;
              } else {
                // Text fields
                const escapedValue = String(rawValue).replace(/'/g, "''");
                value = `'${escapedValue}'`;
              }
            }
          }

          columnNames.push(`"${mapping.columnName}"`);
          values.push(value);
        });

        const insertSQL = `
          INSERT INTO ${tableName} (${columnNames.join(', ')})
          VALUES (${values.join(', ')})
          ON CONFLICT (submission_id) DO UPDATE SET
            submitted_at = EXCLUDED.submitted_at,
            ${columnMappings.map(m => `"${m.columnName}" = EXCLUDED."${m.columnName}"`).join(',\n            ')}
        `;

        await sequelize.query(insertSQL);
        successCount++;
        console.log(`✅ [${successCount}/${submissions.length}] Backfilled submission ${submission.id.substring(0, 8)}...`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error backfilling submission ${submission.id.substring(0, 8)}:`, error.message);
      }
    }

    console.log('\n📊 BACKFILL SUMMARY:');
    console.log('===================');
    console.log(`✅ Success: ${successCount} submissions`);
    console.log(`❌ Errors: ${errorCount} submissions`);
    console.log('');

    // Step 5: Verify
    const [count] = await sequelize.query(`SELECT COUNT(*) as total FROM ${tableName}`);
    console.log(`✅ Total rows in ${tableName}: ${count[0].total}\n`);

    // Save column mappings to a file for reference
    const fs = require('fs');
    const mappingFilePath = `./backend/config/table-mappings/${tableName}.json`;

    // Create directory if not exists
    if (!fs.existsSync('./backend/config/table-mappings')) {
      fs.mkdirSync('./backend/config/table-mappings', { recursive: true });
    }

    fs.writeFileSync(
      mappingFilePath,
      JSON.stringify({
        formId: formId,
        tableName: tableName,
        createdAt: new Date().toISOString(),
        columnMappings: columnMappings
      }, null, 2)
    );

    console.log(`📄 Column mappings saved to: ${mappingFilePath}\n`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

createMissingDynamicTable();

/**
 * Script to create tables for existing sub-forms that don't have table_name
 */

const { SubForm, Form, Field } = require('../models');
const DynamicTableService = require('../services/DynamicTableService');
const logger = require('../utils/logger.util');

// Instantiate DynamicTableService
const dynamicTableService = new DynamicTableService();

async function createSubFormTables() {
  try {
    // Find all sub-forms without table_name
    const subFormsWithoutTable = await SubForm.findAll({
      where: {
        table_name: null
      },
      include: [
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title', 'table_name']
        },
        {
          model: Field,
          as: 'fields',
          attributes: ['id', 'title', 'type', 'required', 'order', 'options']
        }
      ]
    });

    console.log(`\n📋 Found ${subFormsWithoutTable.length} sub-forms without tables\n`);

    for (const subForm of subFormsWithoutTable) {
      try {
        const mainTableName = subForm.form.table_name;

        if (!mainTableName) {
          console.log(`⚠️  Skipping sub-form "${subForm.title}" - main form has no table`);
          continue;
        }

        console.log(`\n🔨 Creating table for sub-form: ${subForm.title}`);
        console.log(`   Main form: ${subForm.form.title} (${mainTableName})`);
        console.log(`   Fields: ${subForm.fields.length}`);

        // Create sub-form table
        const subFormTableName = await dynamicTableService.createSubFormTable(
          {
            id: subForm.id,
            title: subForm.title,
            fields: subForm.fields || []
          },
          mainTableName,
          subForm.form.id
        );

        // Save table_name back to SubForm
        subForm.table_name = subFormTableName;
        await subForm.save();

        console.log(`✅ Created table: ${subFormTableName}`);
        logger.info(`Sub-form table created: ${subFormTableName} for sub-form ${subForm.id}`);

      } catch (error) {
        console.error(`❌ Failed to create table for sub-form "${subForm.title}":`, error.message);
        logger.error(`Failed to create sub-form table for ${subForm.id}:`, error);
      }
    }

    console.log(`\n✅ Done! Created tables for ${subFormsWithoutTable.length} sub-forms\n`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    logger.error('Create sub-form tables script failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
createSubFormTables();

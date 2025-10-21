/**
 * Script to check SheetImportConfig for foreign key mappings
 */

const { SheetImportConfig, Form, SubForm } = require('../models');
const { sequelize } = require('../config/database.config');

async function checkConfigs() {
  try {
    console.log('🔍 Checking SheetImportConfig for foreign_key_mappings...\n');

    // Get all configs
    const configs = await SheetImportConfig.findAll({
      include: [
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title']
        },
        {
          model: SubForm,
          as: 'subForm',
          required: false,
          attributes: ['id', 'title']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`Total configs found: ${configs.length}\n`);

    configs.forEach((config, index) => {
      console.log(`\n${'='.repeat(100)}`);
      console.log(`Config #${index + 1}`);
      console.log(`${'='.repeat(100)}`);
      console.log(`ID: ${config.id}`);
      console.log(`Form: ${config.form.title}`);
      console.log(`Sub-Form: ${config.subForm ? config.subForm.title : 'NULL (Main form import)'}`);
      console.log(`Sheet URL: ${config.sheet_url}`);
      console.log(`Sheet Name: ${config.sheet_name}`);
      console.log(`Field Mapping: ${JSON.stringify(config.field_mapping, null, 2)}`);
      console.log(`Foreign Key Mappings: ${JSON.stringify(config.foreign_key_mappings, null, 2)}`);
      console.log(`Last Import: ${config.last_import_at || 'Never'}`);
      console.log(`Total Imports: ${config.total_imports}`);

      if (config.sub_form_id && (!config.foreign_key_mappings || config.foreign_key_mappings.length === 0)) {
        console.log(`\n⚠️  WARNING: This is a SUB-FORM config but has NO foreign_key_mappings!`);
        console.log(`This will cause subform submissions to be created without parent_id.`);
      }
    });

    await sequelize.close();
  } catch (error) {
    console.error('Error checking configs:', error);
    process.exit(1);
  }
}

checkConfigs();

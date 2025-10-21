/**
 * Check FK mappings in recent subform imports
 */

const { Form, SubForm, Field, SheetImportConfig, sequelize } = require('../models');

async function checkFKMappings() {
  try {
    console.log('🔍 Checking recent subform imports for FK mappings...\n');

    // Find recent subforms
    const subForms = await SubForm.findAll({
      order: [['created_at', 'DESC']],
      limit: 5,
      include: [
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title', 'table_name']
        },
        {
          model: Field,
          as: 'fields',
          attributes: ['id', 'title', 'type'],
          separate: true
        }
      ]
    });

    console.log(`Found ${subForms.length} recent subforms:\n`);

    for (const subForm of subForms) {
      console.log(`📋 SubForm: ${subForm.title}`);
      console.log(`   ID: ${subForm.id}`);
      console.log(`   Parent Form: ${subForm.form?.title || 'N/A'}`);
      console.log(`   Table: ${subForm.table_name || 'NOT SET'}`);
      console.log(`   Fields: ${subForm.fields?.length || 0}`);
      console.log(`   Created: ${subForm.created_at}`);

      // Try to find sheet import config
      if (global.SheetImportConfig) {
        const config = await SheetImportConfig.findOne({
          where: { sub_form_id: subForm.id },
          order: [['created_at', 'DESC']]
        });

        if (config) {
          console.log(`   Sheet Import Config Found:`);
          console.log(`     - FK Mappings:`, config.fk_mappings || []);
        }
      }

      console.log('');
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFKMappings();

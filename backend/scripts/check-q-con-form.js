/**
 * Check Q-CON Service Center form and data
 */

const { Form, SubForm, Submission, Field, sequelize } = require('../models');

async function checkQConForm() {
  try {
    console.log('🔍 Checking Q-CON Service Center form...\n');

    // Find Q-CON forms
    const forms = await Form.findAll({
      where: {
        title: {
          [sequelize.Sequelize.Op.like]: '%Q-CON%'
        }
      },
      include: [
        {
          model: SubForm,
          as: 'subForms',
          required: false
        },
        {
          model: Field,
          as: 'fields',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log(`Found ${forms.length} forms with "Q-CON" in title:\n`);

    for (const form of forms) {
      console.log(`📋 Form: ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name || 'NOT SET'}`);
      console.log(`   Created: ${form.createdAt}`);
      console.log(`   Fields: ${form.fields?.length || 0}`);
      console.log(`   Subforms: ${form.subForms?.length || 0}`);

      // Count submissions in submissions table
      const submissionCount = await Submission.count({
        where: { form_id: form.id }
      });
      console.log(`   Submissions (EAV): ${submissionCount}`);

      // Check dynamic table data if table_name exists
      if (form.table_name) {
        try {
          const [results] = await sequelize.query(
            `SELECT COUNT(*) as count FROM "${form.table_name}"`
          );
          console.log(`   Submissions (Dynamic Table): ${results[0].count}`);

          // Sample first 3 rows
          const [samples] = await sequelize.query(
            `SELECT * FROM "${form.table_name}" LIMIT 3`
          );
          if (samples.length > 0) {
            console.log(`   Sample row columns:`, Object.keys(samples[0]).join(', '));
          }
        } catch (err) {
          console.log(`   ⚠️  Dynamic table error: ${err.message}`);
        }
      }

      // Check subforms
      if (form.subForms && form.subForms.length > 0) {
        for (const sf of form.subForms) {
          console.log(`     └─ SubForm: ${sf.title} (ID: ${sf.id})`);
          console.log(`        Table: ${sf.table_name || 'NOT SET'}`);

          if (sf.table_name) {
            try {
              const [results] = await sequelize.query(
                `SELECT COUNT(*) as count FROM "${sf.table_name}"`
              );
              console.log(`        Data rows: ${results[0].count}`);
            } catch (err) {
              console.log(`        ⚠️  Subform table error: ${err.message}`);
            }
          }
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

checkQConForm();

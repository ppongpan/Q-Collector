/**
 * Migration Script: Remove 'moderator' from all forms' roles_allowed
 *
 * This script removes the 'moderator' role from all forms in the database
 * after the moderator role was removed from the system in v0.8.1
 *
 * @version 0.8.1
 * @date 2025-10-23
 */

const { sequelize } = require('../config/database.config');
const { QueryTypes } = require('sequelize');

(async () => {
  try {
    console.log('=== Remove Moderator from Forms Migration ===\n');

    // 1. Check total forms count
    const totalFormsResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM forms',
      { type: QueryTypes.SELECT }
    );
    console.log(`Total forms in database: ${totalFormsResult[0].count}\n`);

    // 2. Find forms that have 'moderator' in roles_allowed
    const formsWithModerator = await sequelize.query(`
      SELECT id, title, roles_allowed
      FROM forms
      WHERE roles_allowed @> '["moderator"]'::jsonb
    `, { type: QueryTypes.SELECT });

    console.log(`Forms with 'moderator' in roles_allowed: ${formsWithModerator.length}\n`);

    if (formsWithModerator.length === 0) {
      console.log('✅ No forms found with moderator role. Database is clean!');
      await sequelize.close();
      process.exit(0);
    }

    // 3. Show forms that will be updated
    console.log('Forms to be updated:');
    console.log('─'.repeat(80));
    formsWithModerator.forEach((form, index) => {
      console.log(`${index + 1}. Form ID: ${form.id}`);
      console.log(`   Title: ${form.title}`);
      console.log(`   Current roles_allowed: ${JSON.stringify(form.roles_allowed)}`);
      console.log('');
    });
    console.log('─'.repeat(80));
    console.log('');

    // 4. Ask for confirmation (auto-proceed after 3 seconds)
    console.log('⚠️  This script will remove "moderator" from all forms\' roles_allowed arrays.');
    console.log('   Starting update in 3 seconds... (Press Ctrl+C to cancel)\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Update all forms - remove 'moderator' from roles_allowed
    console.log('🔄 Starting migration...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const form of formsWithModerator) {
      try {
        // Remove 'moderator' from the array
        const newRolesAllowed = form.roles_allowed.filter(role => role !== 'moderator');

        // Update the form
        await sequelize.query(`
          UPDATE forms
          SET roles_allowed = :roles_allowed
          WHERE id = :id
        `, {
          replacements: {
            id: form.id,
            roles_allowed: JSON.stringify(newRolesAllowed)
          },
          type: QueryTypes.UPDATE
        });

        successCount++;
        console.log(`✅ Updated form ${form.id}: "${form.title}"`);
        console.log(`   New roles_allowed: ${JSON.stringify(newRolesAllowed)}\n`);

      } catch (error) {
        errorCount++;
        errors.push({ formId: form.id, title: form.title, error: error.message });
        console.error(`❌ Failed to update form ${form.id}: "${form.title}"`);
        console.error(`   Error: ${error.message}\n`);
      }
    }

    // 6. Show summary
    console.log('\n' + '='.repeat(80));
    console.log('Migration Summary:');
    console.log('='.repeat(80));
    console.log(`Total forms processed: ${formsWithModerator.length}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log('='.repeat(80));

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => {
        console.log(`- Form ${err.formId} (${err.title}): ${err.error}`);
      });
    }

    // 7. Verify the update
    console.log('\n🔍 Verifying results...\n');

    const remainingFormsWithModerator = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM forms
      WHERE roles_allowed @> '["moderator"]'::jsonb
    `, { type: QueryTypes.SELECT });

    console.log(`Forms still containing 'moderator': ${remainingFormsWithModerator[0].count}`);

    if (parseInt(remainingFormsWithModerator[0].count) === 0) {
      console.log('\n✅ Migration completed successfully! All forms have been updated.');
    } else {
      console.log('\n⚠️  Some forms still contain "moderator". Please check the errors above.');
    }

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
})();

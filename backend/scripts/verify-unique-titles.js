/**
 * Verify Form Titles Are Unique Script
 *
 * This script checks if there are any duplicate form titles in the database.
 * Useful for verifying the cleanup script worked correctly or before running migrations.
 *
 * Usage: node backend/scripts/verify-unique-titles.js
 */

const { sequelize } = require('../models');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  try {
    log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
    log('║      Verify Form Title Uniqueness Script                 ║', 'bright');
    log('║      Q-Collector v0.8.4-dev                               ║', 'bright');
    log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

    log('🔍 Checking for duplicate form titles...\n', 'cyan');

    const duplicates = await sequelize.query(`
      SELECT
        title,
        COUNT(*) as count,
        array_agg(id::text ORDER BY created_at) as form_ids,
        array_agg(created_at::text ORDER BY created_at) as created_dates
      FROM forms
      GROUP BY title
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, title
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const totalForms = await sequelize.query(`
      SELECT COUNT(*) as count FROM forms
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    log(`📊 Database Statistics:`, 'cyan');
    log(`   Total forms: ${totalForms[0].count}`, 'cyan');
    log(`   Duplicate titles found: ${duplicates.length}\n`, duplicates.length > 0 ? 'yellow' : 'green');

    if (duplicates.length === 0) {
      log('✅ SUCCESS: All form titles are unique!', 'green');
      log('   The database is ready for UNIQUE constraint migration.\n', 'green');
      await sequelize.close();
      process.exit(0);
    }

    log('❌ DUPLICATES FOUND:\n', 'red');

    duplicates.forEach((dup, index) => {
      log(`   ${index + 1}. Title: "${dup.title}"`, 'yellow');
      log(`      Count: ${dup.count} forms`, 'yellow');
      log(`      Form IDs: ${dup.form_ids.join(', ')}`, 'yellow');
      log(`      Created dates:`, 'yellow');
      dup.created_dates.forEach((date, i) => {
        log(`        - Form ${dup.form_ids[i]}: ${date}`, 'yellow');
      });
      log(''); // Empty line
    });

    log('⚠️  ACTION REQUIRED:', 'red');
    log('   Run the cleanup script to fix duplicates:', 'yellow');
    log('   → node backend/scripts/fix-duplicate-form-titles.js\n', 'yellow');

    await sequelize.close();
    process.exit(1);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };

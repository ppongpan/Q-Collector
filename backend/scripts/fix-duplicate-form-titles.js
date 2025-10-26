/**
 * Fix Duplicate Form Titles Script
 *
 * This script finds all forms with duplicate titles and renames them
 * by appending a number suffix (2), (3), etc.
 *
 * The oldest form (by created_at) keeps the original title.
 *
 * Usage: node backend/scripts/fix-duplicate-form-titles.js
 */

const { sequelize, Form } = require('../models');
const { Op } = require('sequelize');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Find all duplicate form titles
 * @returns {Promise<Array>} Array of duplicate title groups
 */
async function findDuplicateTitles() {
  log('\n🔍 Step 1: Finding duplicate form titles...', 'cyan');

  const duplicates = await sequelize.query(`
    SELECT title, COUNT(*) as count
    FROM forms
    GROUP BY title
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, title
  `, {
    type: sequelize.QueryTypes.SELECT
  });

  if (duplicates.length === 0) {
    log('✅ No duplicate titles found!', 'green');
    return [];
  }

  log(`\n⚠️  Found ${duplicates.length} duplicate title(s):\n`, 'yellow');

  duplicates.forEach((dup, index) => {
    log(`   ${index + 1}. "${dup.title}" → ${dup.count} forms`, 'yellow');
  });

  return duplicates;
}

/**
 * Get all forms with a specific title, sorted by created_at
 * @param {string} title - Form title to search for
 * @returns {Promise<Array>} Array of forms with that title
 */
async function getFormsByTitle(title) {
  return await Form.findAll({
    where: { title },
    order: [['createdAt', 'ASC']], // Oldest first
    attributes: ['id', 'title', 'createdAt', 'created_by'],
  });
}

/**
 * Generate unique title by appending number
 * @param {string} baseTitle - Original title
 * @param {number} suffix - Number to append
 * @returns {string} New unique title
 */
function generateUniqueTitle(baseTitle, suffix) {
  return `${baseTitle} (${suffix})`;
}

/**
 * Rename duplicate forms
 * @param {Array} duplicates - Array of duplicate title groups
 * @returns {Promise<Object>} Summary of changes
 */
async function renameDuplicates(duplicates) {
  log('\n📝 Step 2: Renaming duplicate forms...\n', 'cyan');

  const changes = [];
  const errors = [];

  for (const duplicate of duplicates) {
    const title = duplicate.title;
    const forms = await getFormsByTitle(title);

    log(`   Processing: "${title}" (${forms.length} forms)`, 'blue');

    // Keep oldest form with original title
    const [keepOriginal, ...toRename] = forms;

    log(`   ✓ Keeping original: Form ID ${keepOriginal.id} (created: ${keepOriginal.createdAt})`, 'green');

    // Rename the rest
    for (let i = 0; i < toRename.length; i++) {
      const form = toRename[i];
      const newTitle = generateUniqueTitle(title, i + 2);

      try {
        await form.update({ title: newTitle });

        changes.push({
          formId: form.id,
          oldTitle: title,
          newTitle: newTitle,
          createdAt: form.createdAt,
          createdBy: form.created_by,
        });

        log(`   ✓ Renamed: Form ID ${form.id} → "${newTitle}"`, 'green');
      } catch (error) {
        errors.push({
          formId: form.id,
          oldTitle: title,
          error: error.message,
        });

        log(`   ✗ Failed: Form ID ${form.id} → ${error.message}`, 'red');
      }
    }

    log(''); // Empty line for readability
  }

  return { changes, errors };
}

/**
 * Verify no duplicates remain
 * @returns {Promise<boolean>} True if no duplicates found
 */
async function verifyNoDuplicates() {
  log('\n🔍 Step 3: Verifying all titles are unique...', 'cyan');

  const duplicates = await sequelize.query(`
    SELECT title, COUNT(*) as count
    FROM forms
    GROUP BY title
    HAVING COUNT(*) > 1
  `, {
    type: sequelize.QueryTypes.SELECT
  });

  if (duplicates.length === 0) {
    log('✅ Verification passed: All form titles are now unique!', 'green');
    return true;
  }

  log('❌ Verification failed: Still found duplicates:', 'red');
  duplicates.forEach((dup) => {
    log(`   - "${dup.title}" → ${dup.count} forms`, 'red');
  });

  return false;
}

/**
 * Create audit log of changes
 * @param {Object} summary - Summary of changes
 */
function createAuditLog(summary) {
  const timestamp = new Date().toISOString();
  const logContent = {
    timestamp,
    script: 'fix-duplicate-form-titles.js',
    summary: {
      totalRenamed: summary.changes.length,
      totalErrors: summary.errors.length,
    },
    changes: summary.changes,
    errors: summary.errors,
  };

  const logFilePath = `backend/logs/form-title-cleanup-${timestamp.replace(/:/g, '-').split('.')[0]}.json`;

  const fs = require('fs');
  const path = require('path');
  const logsDir = path.join(__dirname, '..', 'logs');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(__dirname, '..', 'logs', `form-title-cleanup-${timestamp.replace(/:/g, '-').split('.')[0]}.json`),
    JSON.stringify(logContent, null, 2)
  );

  log(`\n📄 Audit log created: logs/form-title-cleanup-${timestamp.replace(/:/g, '-').split('.')[0]}.json`, 'magenta');
}

/**
 * Print summary
 * @param {Object} summary - Summary of changes
 */
function printSummary(summary) {
  log('\n' + '='.repeat(60), 'bright');
  log('                    SUMMARY', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  log(`Total forms renamed: ${summary.changes.length}`, 'green');

  if (summary.errors.length > 0) {
    log(`Total errors: ${summary.errors.length}`, 'red');
  }

  if (summary.changes.length > 0) {
    log('\nChanges made:', 'cyan');
    summary.changes.forEach((change, index) => {
      log(`  ${index + 1}. Form ${change.formId}:`, 'yellow');
      log(`     Old: "${change.oldTitle}"`, 'yellow');
      log(`     New: "${change.newTitle}"`, 'green');
    });
  }

  if (summary.errors.length > 0) {
    log('\nErrors encountered:', 'red');
    summary.errors.forEach((error, index) => {
      log(`  ${index + 1}. Form ${error.formId}: ${error.error}`, 'red');
    });
  }

  log('\n' + '='.repeat(60) + '\n', 'bright');
}

/**
 * Main execution function
 */
async function main() {
  try {
    log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
    log('║          Fix Duplicate Form Titles Script                ║', 'bright');
    log('║          Q-Collector v0.8.4-dev                           ║', 'bright');
    log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

    // Step 1: Find duplicates
    const duplicates = await findDuplicateTitles();

    if (duplicates.length === 0) {
      log('\n✅ No work needed. All form titles are already unique.\n', 'green');
      await sequelize.close();
      process.exit(0);
    }

    // Confirm before proceeding
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const shouldProceed = await new Promise((resolve) => {
      rl.question('\nProceed with renaming? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });

    if (!shouldProceed) {
      log('\n❌ Operation cancelled by user.\n', 'yellow');
      await sequelize.close();
      process.exit(0);
    }

    // Step 2: Rename duplicates
    const summary = await renameDuplicates(duplicates);

    // Step 3: Verify
    const verified = await verifyNoDuplicates();

    // Create audit log
    createAuditLog(summary);

    // Print summary
    printSummary(summary);

    if (verified && summary.errors.length === 0) {
      log('✅ Success! All duplicate form titles have been fixed.\n', 'green');
      await sequelize.close();
      process.exit(0);
    } else {
      log('⚠️  Script completed with warnings. Please review the log file.\n', 'yellow');
      await sequelize.close();
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { findDuplicateTitles, renameDuplicates, verifyNoDuplicates };

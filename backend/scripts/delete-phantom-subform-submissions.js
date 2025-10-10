/**
 * Delete phantom sub-form submissions
 * These are submissions created automatically before the fix
 */

const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../config/database.config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

async function deletePhantomSubmissions() {
  try {
    console.log('🔍 Finding phantom sub-form submissions...\n');

    // Find submissions that have parent_id but no actual data
    const [phantomSubmissions] = await sequelize.query(`
      SELECT
        s.id,
        s.parent_id,
        s.form_id,
        s.submitted_at,
        COUNT(sd.id) as data_count
      FROM submissions s
      LEFT JOIN submission_data sd ON s.id = sd.submission_id
      WHERE s.parent_id IS NOT NULL  -- Is a sub-form submission
      GROUP BY s.id, s.parent_id, s.form_id, s.submitted_at
      HAVING COUNT(sd.id) = 0  -- Has NO data
      ORDER BY s.submitted_at DESC;
    `);

    if (phantomSubmissions.length === 0) {
      console.log('✅ No phantom submissions found!');
      await sequelize.close();
      return;
    }

    console.log(`❌ Found ${phantomSubmissions.length} phantom sub-form submissions:\n`);
    console.table(phantomSubmissions);

    console.log('\n⚠️  These submissions have NO data and will be deleted.\n');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Delete these phantom submissions? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        const ids = phantomSubmissions.map(s => s.id);

        const [result] = await sequelize.query(`
          DELETE FROM submissions
          WHERE id IN (:ids)
        `, {
          replacements: { ids },
          type: QueryTypes.DELETE
        });

        console.log(`\n✅ Deleted ${phantomSubmissions.length} phantom submissions`);
      } else {
        console.log('\n❌ Cancelled - No submissions deleted');
      }

      readline.close();
      await sequelize.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

deletePhantomSubmissions();

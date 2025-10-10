/**
 * Get 2FA Backup Codes for User
 *
 * Usage: node get-backup-codes.js pongpanp
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

async function getBackupCodes() {
  const username = process.argv[2] || 'pongpanp';

  // Database connection
  const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'qcollector_db',
    process.env.POSTGRES_USER || 'qcollector',
    process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
    {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      dialect: 'postgres',
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const [results] = await sequelize.query(`
      SELECT *
      FROM users
      WHERE username = :username
    `, {
      replacements: { username }
    });

    if (results.length === 0) {
      console.log('❌ User not found:', username);
      process.exit(1);
    }

    const user = results[0];
    console.log('\n📋 User Information:');
    console.log(JSON.stringify(user, null, 2));

    // Find backup codes column (could be backup_codes, backupCodes, etc.)
    const backupCodesKey = Object.keys(user).find(key =>
      key.toLowerCase().includes('backup')
    );

    if (backupCodesKey && user[backupCodesKey]) {
      console.log(`\n🔑 Backup Codes (from column: ${backupCodesKey}):`);
      try {
        const codes = JSON.parse(user[backupCodesKey]);
        codes.forEach((code, index) => {
          console.log(`  ${index + 1}. ${code}`);
        });
        console.log('\n💡 Use any of these codes for 2FA verification in tests');
      } catch (error) {
        console.log('⚠️ Could not parse backup codes:', user[backupCodesKey]);
      }
    } else {
      console.log('\n⚠️ No backup codes found in any column');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

getBackupCodes();

const { sequelize } = require('../config/database.config');

async function dropTables() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Drop tables in correct order (foreign key dependencies)
    await sequelize.query('DROP TABLE IF EXISTS field_migrations CASCADE;');
    console.log('Dropped field_migrations table');

    await sequelize.query('DROP TABLE IF EXISTS field_data_backups CASCADE;');
    console.log('Dropped field_data_backups table');

    console.log('✅ Successfully dropped migration tables');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
  } finally {
    await sequelize.close();
  }
}

dropTables();

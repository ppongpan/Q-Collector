/**
 * List all PDPA forms
 */
const { sequelize } = require('../config/database.config');

(async () => {
  await sequelize.authenticate();
  const [forms] = await sequelize.query(`
    SELECT id, title, table_name, "createdAt"
    FROM forms
    WHERE title LIKE '%PDPA%'
    ORDER BY "createdAt" DESC
    LIMIT 10
  `);

  console.log(`Found ${forms.length} PDPA forms:\n`);
  forms.forEach((f, i) => {
    console.log(`${i+1}. ${f.title}`);
    console.log(`   ID: ${f.id}`);
    console.log(`   Table: ${f.table_name || '(none)'}`);
    console.log(`   Created: ${new Date(f.createdAt).toLocaleString('th-TH')}`);
    console.log('');
  });

  await sequelize.close();
  process.exit(0);
})().catch(console.error);

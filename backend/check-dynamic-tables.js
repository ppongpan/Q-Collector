/**
 * Check if dynamic tables have data
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '../.env' });

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkDynamicTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Check the dynamic table for the form
    const dynamicTable = 'technical_service_team_appointment_form_ab066a0f7688';

    console.log('='.repeat(80));
    console.log(`📋 Checking Dynamic Table: ${dynamicTable}`);
    console.log('='.repeat(80));

    // Check if table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${dynamicTable}'
      ) as exists;
    `);

    if (!tableExists[0].exists) {
      console.log(`\n❌ Dynamic table '${dynamicTable}' does NOT exist!`);
      console.log('This means the dual-write system is NOT creating dynamic tables.');
      console.log('\n💡 Solution: The system should create this table when submissions are saved.');
    } else {
      console.log(`\n✅ Dynamic table exists!`);

      // Get row count
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as count FROM public.${dynamicTable};
      `);
      const rowCount = parseInt(countResult[0].count);
      console.log(`📊 Row count: ${rowCount}`);

      if (rowCount > 0) {
        // Show columns
        const [columns] = await sequelize.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${dynamicTable}'
          ORDER BY ordinal_position;
        `);

        console.log(`\n🏗️  Table Structure (${columns.length} columns):`);
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        // Show sample data
        const [data] = await sequelize.query(`
          SELECT * FROM public.${dynamicTable} LIMIT 5;
        `);

        console.log(`\n📝 Sample Data:`);
        data.forEach((row, idx) => {
          console.log(`\nRow ${idx + 1}:`);
          console.log(JSON.stringify(row, null, 2));
        });
      } else {
        console.log(`\n⚠️  Dynamic table exists but is EMPTY!`);
        console.log('This means submissions are stored in EAV (submissions + submission_data) but not in dynamic table.');
      }
    }

    // Check sub-forms
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 Checking Sub-Forms');
    console.log('='.repeat(80));

    const [subForms] = await sequelize.query(`
      SELECT
        sf.id,
        sf.title,
        sf.description,
        sf.table_name,
        sf.form_id,
        f.title as parent_form_title,
        sf."createdAt",
        sf."updatedAt"
      FROM public.sub_forms sf
      LEFT JOIN public.forms f ON sf.form_id = f.id
      ORDER BY sf."createdAt";
    `);

    if (subForms.length === 0) {
      console.log('\n❌ No sub-forms found!');
    } else {
      console.log(`\n✅ Found ${subForms.length} sub-form(s):`);
      for (const sf of subForms) {
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`Sub-Form: ${sf.title}`);
        console.log(`${'─'.repeat(80)}`);
        console.log(`ID: ${sf.id}`);
        console.log(`Description: ${sf.description || 'N/A'}`);
        console.log(`Table Name: ${sf.table_name || 'N/A'}`);
        console.log(`Parent Form: ${sf.parent_form_title} (${sf.form_id})`);
        console.log(`Created: ${sf.createdAt}`);

        // Check if sub-form has fields
        const [fields] = await sequelize.query(`
          SELECT id, title, type, "order"
          FROM public.fields
          WHERE sub_form_id = '${sf.id}'
          ORDER BY "order";
        `);

        console.log(`\nFields (${fields.length}):`);
        fields.forEach((field, idx) => {
          console.log(`  ${idx + 1}. ${field.title} (${field.type})`);
        });

        // Check if sub-form table exists
        if (sf.table_name) {
          const [subTableExists] = await sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = '${sf.table_name}'
            ) as exists;
          `);

          if (subTableExists[0].exists) {
            const [subCount] = await sequelize.query(`
              SELECT COUNT(*) as count FROM public.${sf.table_name};
            `);
            console.log(`\nDynamic Table (${sf.table_name}): ✅ Exists`);
            console.log(`Row count: ${subCount[0].count}`);
          } else {
            console.log(`\nDynamic Table (${sf.table_name}): ❌ Does NOT exist`);
          }
        }
      }
    }

    console.log('\n');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDynamicTables();

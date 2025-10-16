/**
 * Check if tables are used in the system or just test tables
 * Tables to check: public.sub_forms, public.submission_data, public.submissions
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'qcollector_dev',
  process.env.DB_USER || 'qcollector_dev',
  process.env.DB_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    const tablesToCheck = ['sub_forms', 'submission_data', 'submissions'];

    for (const tableName of tablesToCheck) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Checking table: public.${tableName}`);
      console.log('='.repeat(60));

      // Check if table exists
      const [tableExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        ) as exists;
      `);

      if (!tableExists[0].exists) {
        console.log(`❌ Table public.${tableName} does NOT exist\n`);
        continue;
      }

      console.log(`✅ Table exists`);

      // Get row count
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as count FROM public.${tableName};
      `);
      const rowCount = parseInt(countResult[0].count);
      console.log(`📊 Row count: ${rowCount}`);

      // Get table structure
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `);

      console.log(`\n🏗️  Table Structure (${columns.length} columns):`);
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Show sample data if exists
      if (rowCount > 0) {
        const [sampleData] = await sequelize.query(`
          SELECT * FROM public.${tableName} LIMIT 5;
        `);
        console.log(`\n📝 Sample Data (first 5 rows):`);
        console.log(JSON.stringify(sampleData, null, 2));
      }

      // Check for foreign key references
      const [fkReferences] = await sequelize.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = '${tableName}';
      `);

      if (fkReferences.length > 0) {
        console.log(`\n🔗 Foreign Key References:`);
        fkReferences.forEach(fk => {
          console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }

      // Check what references this table
      const [referencedBy] = await sequelize.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = '${tableName}';
      `);

      if (referencedBy.length > 0) {
        console.log(`\n🔗 Referenced by other tables:`);
        referencedBy.forEach(ref => {
          console.log(`  - ${ref.table_name}.${ref.column_name} -> ${ref.referenced_column}`);
        });
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));

    // Check if these tables are used in Sequelize models
    console.log('\n🔍 Checking Sequelize models usage...');

    const modelsDir = './backend/models';
    const fs = require('fs');
    const path = require('path');

    if (fs.existsSync(modelsDir)) {
      const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

      for (const tableName of tablesToCheck) {
        console.log(`\n📁 Checking if '${tableName}' is defined in models:`);
        let found = false;

        for (const modelFile of modelFiles) {
          const content = fs.readFileSync(path.join(modelsDir, modelFile), 'utf8');
          if (content.includes(`tableName: '${tableName}'`) ||
              content.includes(`"${tableName}"`) ||
              content.includes(`'${tableName}'`)) {
            console.log(`  ✅ Found in ${modelFile}`);
            found = true;
          }
        }

        if (!found) {
          console.log(`  ❌ NOT found in any model files`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 RECOMMENDATION');
    console.log('='.repeat(60));

    for (const tableName of tablesToCheck) {
      const [tableExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        ) as exists;
      `);

      if (!tableExists[0].exists) {
        console.log(`\n${tableName}: Table does not exist - SKIP`);
        continue;
      }

      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as count FROM public.${tableName};
      `);
      const rowCount = parseInt(countResult[0].count);

      console.log(`\n${tableName}:`);
      console.log(`  - Row count: ${rowCount}`);

      if (rowCount === 0) {
        console.log(`  ⚠️  RECOMMENDATION: Safe to DELETE (no data)`);
      } else {
        console.log(`  ⚠️  WARNING: Contains ${rowCount} rows - need manual verification`);
      }
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTables();

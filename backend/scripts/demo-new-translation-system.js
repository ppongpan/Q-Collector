/**
 * Demo New Translation System (v0.7.5)
 * Shows clean English column names with MyMemory API
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const DynamicTableService = require('../services/DynamicTableService');

const sequelize = new Sequelize({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  username: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  dialect: 'postgres',
  logging: false
});

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

const dynamicTableService = new DynamicTableService(pool);

const demoForm = {
  id: uuidv4(),
  title: 'รายการนัดหมายทีมบริการเทคนิค',
  description: 'Demo v0.7.5 - Clean English Names',
  fields: [
    {
      id: uuidv4(),
      label: 'ชื่อลูกค้า',
      title: 'ชื่อลูกค้า',
      type: 'short_answer',
      required: true
    },
    {
      id: uuidv4(),
      label: 'อีเมลติดต่อ',
      title: 'อีเมลติดต่อ',
      type: 'email',
      required: true
    },
    {
      id: uuidv4(),
      label: 'เบอร์โทรศัพท์',
      title: 'เบอร์โทรศัพท์',
      type: 'phone',
      required: true
    },
    {
      id: uuidv4(),
      label: 'วันที่นัดหมาย',
      title: 'วันที่นัดหมาย',
      type: 'date',
      required: true
    },
    {
      id: uuidv4(),
      label: 'รายละเอียดปัญหา',
      title: 'รายละเอียดปัญหา',
      type: 'paragraph',
      required: false
    }
  ],
  subForms: [
    {
      id: uuidv4(),
      title: 'บันทึกการเข้าให้บริการ',
      description: 'บันทึกรายละเอียดการเข้าให้บริการลูกค้า',
      order_index: 1,
      fields: [
        {
          id: uuidv4(),
          label: 'ชื่อช่างเทคนิค',
          title: 'ชื่อช่างเทคนิค',
          type: 'short_answer',
          required: true
        },
        {
          id: uuidv4(),
          label: 'วันที่เข้าให้บริการ',
          title: 'วันที่เข้าให้บริการ',
          type: 'date',
          required: true
        },
        {
          id: uuidv4(),
          label: 'เวลาเริ่ม',
          title: 'เวลาเริ่ม',
          type: 'time',
          required: true
        },
        {
          id: uuidv4(),
          label: 'เวลาสิ้นสุด',
          title: 'เวลาสิ้นสุด',
          type: 'time',
          required: true
        },
        {
          id: uuidv4(),
          label: 'งานที่ทำ',
          title: 'งานที่ทำ',
          type: 'paragraph',
          required: false
        }
      ]
    }
  ]
};

async function demoNewSystem() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Demo: New Translation System v0.7.5                 ║');
  console.log('║       Clean English Names - No Hash Suffix                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let mainTableName = null;
  const subFormTableNames = [];

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Create form record
    console.log(`📋 Creating Form: "${demoForm.title}"\n`);
    await sequelize.query(`
      INSERT INTO forms (id, title, description, is_active, "createdAt", "updatedAt", roles_allowed, version)
      VALUES (
        '${demoForm.id}',
        '${demoForm.title}',
        '${demoForm.description}',
        true,
        NOW(),
        NOW(),
        '["super_admin", "admin"]'::jsonb,
        1
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create sub-form records
    for (const subForm of demoForm.subForms) {
      await sequelize.query(`
        INSERT INTO sub_forms (
          id, form_id, title, description, order_index,
          "createdAt", "updatedAt"
        )
        VALUES (
          '${subForm.id}',
          '${demoForm.id}',
          '${subForm.title}',
          '${subForm.description}',
          ${subForm.order_index},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // Create main table
    console.log('🌐 Translating Main Form...\n');
    mainTableName = await dynamicTableService.createFormTable(demoForm);
    console.log(`\n✅ Main Table: ${mainTableName}\n`);

    // Verify main table columns
    const [mainColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${mainTableName}'
      AND column_name NOT IN ('id', 'form_id', 'user_id', 'submission_number', 'status', 'submitted_at', 'created_at', 'updated_at')
      ORDER BY ordinal_position;
    `);

    console.log('📋 Main Form Columns (Clean English):');
    demoForm.fields.forEach((field, index) => {
      if (mainColumns[index]) {
        console.log(`   ✅ "${field.label}" → ${mainColumns[index].column_name}`);
      }
    });

    // Create sub-form tables
    console.log('\n🌐 Translating Sub-Forms...\n');
    for (const subForm of demoForm.subForms) {
      const subFormTableName = await dynamicTableService.createSubFormTable(
        subForm,
        mainTableName,
        demoForm.id
      );
      subFormTableNames.push(subFormTableName);

      console.log(`\n✅ Sub-Form Table: ${subFormTableName}\n`);

      // Verify sub-form columns
      const [subColumns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${subFormTableName}'
        AND column_name NOT IN ('id', 'parent_id', 'form_id', 'sub_form_id', 'user_id', 'submission_number', 'order_index', 'status', 'submitted_at', 'created_at', 'updated_at')
        ORDER BY ordinal_position;
      `);

      console.log(`📋 Sub-Form "${subForm.title}" Columns (Clean English):`);
      subForm.fields.forEach((field, index) => {
        if (subColumns[index]) {
          console.log(`   ✅ "${field.label}" → ${subColumns[index].column_name}`);
        }
      });
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  🎉 Success                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Main Table: ${mainTableName}`);
    console.log(`   - Clean table name from Thai`);
    console.log(`   - ${demoForm.fields.length} fields with meaningful English names`);
    console.log(`   - No hash suffix!\n`);

    subFormTableNames.forEach((tableName, i) => {
      console.log(`✅ Sub-Form Table ${i+1}: ${tableName}`);
      console.log(`   - Clean table name from Thai`);
      console.log(`   - ${demoForm.subForms[i].fields.length} fields with meaningful English names`);
      console.log(`   - No hash suffix!\n`);
    });

    console.log('🎯 Ready for PowerBI/SQL queries with readable column names!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await sequelize.close();
    await pool.end();
  }
}

console.log('Starting demo...\n');
demoNewSystem().catch(console.error);

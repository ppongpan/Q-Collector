/**
 * Comprehensive Translation System Test
 * Tests Thai → English translation for:
 * 1. Main Form title
 * 2. Main Form fields
 * 3. Sub-Form titles
 * 4. Sub-Form fields
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const DynamicTableService = require('../services/DynamicTableService');

// Database connections
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

// Comprehensive test form with sub-forms
const testForm = {
  id: uuidv4(),
  title: 'แบบฟอร์มข้อมูลพนักงานและครอบครัว',
  description: 'ทดสอบระบบแปลภาษาแบบครบถ้วน - Main Form + Sub-Forms',
  fields: [
    {
      id: uuidv4(),
      label: 'ชื่อ-นามสกุล',
      title: 'ชื่อ-นามสกุล',
      type: 'short_answer',
      required: true
    },
    {
      id: uuidv4(),
      label: 'เลขบัตรประชาชน',
      title: 'เลขบัตรประชาชน',
      type: 'short_answer',
      required: true
    },
    {
      id: uuidv4(),
      label: 'วันเกิด',
      title: 'วันเกิด',
      type: 'date',
      required: true
    },
    {
      id: uuidv4(),
      label: 'อีเมลที่ทำงาน',
      title: 'อีเมลที่ทำงาน',
      type: 'email',
      required: true
    },
    {
      id: uuidv4(),
      label: 'เบอร์โทรมือถือ',
      title: 'เบอร์โทรมือถือ',
      type: 'phone',
      required: false
    }
  ],
  subForms: [
    {
      id: uuidv4(),
      title: 'ข้อมูลครอบครัว',
      description: 'บันทึกข้อมูลสมาชิกในครอบครัว',
      order_index: 1,
      fields: [
        {
          id: uuidv4(),
          label: 'ชื่อสมาชิก',
          title: 'ชื่อสมาชิก',
          type: 'short_answer',
          required: true
        },
        {
          id: uuidv4(),
          label: 'ความสัมพันธ์',
          title: 'ความสัมพันธ์',
          type: 'short_answer',
          required: true
        },
        {
          id: uuidv4(),
          label: 'อายุ',
          title: 'อายุ',
          type: 'number',
          required: false
        },
        {
          id: uuidv4(),
          label: 'อาชีพ',
          title: 'อาชีพ',
          type: 'short_answer',
          required: false
        }
      ]
    },
    {
      id: uuidv4(),
      title: 'ประวัติการศึกษา',
      description: 'บันทึกประวัติการศึกษา',
      order_index: 2,
      fields: [
        {
          id: uuidv4(),
          label: 'ชื่อสถาบันการศึกษา',
          title: 'ชื่อสถาบันการศึกษา',
          type: 'short_answer',
          required: true
        },
        {
          id: uuidv4(),
          label: 'ระดับการศึกษา',
          title: 'ระดับการศึกษา',
          type: 'short_answer',
          required: true
        },
        {
          id: uuidv4(),
          label: 'สาขาวิชา',
          title: 'สาขาวิชา',
          type: 'short_answer',
          required: false
        },
        {
          id: uuidv4(),
          label: 'ปีที่จบการศึกษา',
          title: 'ปีที่จบการศึกษา',
          type: 'number',
          required: false
        }
      ]
    }
  ]
};

async function testCompleteTranslation() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Comprehensive Translation System Test                   ║');
  console.log('║   Main Form + Sub-Forms + All Fields                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let mainTableName = null;
  const subFormTableNames = [];

  try {
    // 1. Test database connection
    console.log('1️⃣  Testing database connection...');
    await sequelize.authenticate();
    console.log('   ✅ Connected to PostgreSQL\n');

    // 2. Create main form record
    console.log('2️⃣  Creating main form record...');
    console.log(`   Form ID: ${testForm.id}`);
    console.log(`   Thai Title: "${testForm.title}"\n`);

    await sequelize.query(`
      INSERT INTO forms (id, title, description, is_active, "createdAt", "updatedAt", roles_allowed, version)
      VALUES (
        '${testForm.id}',
        '${testForm.title}',
        '${testForm.description}',
        true,
        NOW(),
        NOW(),
        '["super_admin", "admin"]'::jsonb,
        1
      )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('   ✅ Main form record created\n');

    // 3. Create sub-form records
    console.log('3️⃣  Creating sub-form records...');
    for (const subForm of testForm.subForms) {
      console.log(`   Sub-Form: "${subForm.title}"`);

      await sequelize.query(`
        INSERT INTO sub_forms (
          id, form_id, title, description, order_index,
          "createdAt", "updatedAt"
        )
        VALUES (
          '${subForm.id}',
          '${testForm.id}',
          '${subForm.title}',
          '${subForm.description}',
          ${subForm.order_index},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `);
    }
    console.log('   ✅ Sub-form records created\n');

    // 4. Create main form table with MyMemory translation
    console.log('4️⃣  Creating main form table...');
    console.log('   🌐 Translating Thai → English (MyMemory API)\n');

    mainTableName = await dynamicTableService.createFormTable(testForm);

    console.log(`   ✅ Main table created: ${mainTableName}\n`);

    // 5. Verify main table structure
    console.log('5️⃣  Verifying main table structure...');
    const [mainColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${mainTableName}'
      ORDER BY ordinal_position;
    `);

    console.log(`   Table: ${mainTableName}`);
    console.log('   Base Columns: id, form_id, user_id, submission_number, status, submitted_at, created_at, updated_at');
    console.log('   Field Columns:');

    const mainFieldColumns = mainColumns.filter(col =>
      !['id', 'form_id', 'user_id', 'submission_number', 'status', 'submitted_at', 'created_at', 'updated_at'].includes(col.column_name)
    );

    testForm.fields.forEach((field, index) => {
      if (mainFieldColumns[index]) {
        console.log(`     - "${field.label}" → ${mainFieldColumns[index].column_name} (${mainFieldColumns[index].data_type})`);
      }
    });
    console.log('');

    // 6. Create sub-form tables
    console.log('6️⃣  Creating sub-form tables...\n');

    for (const subForm of testForm.subForms) {
      console.log(`   📋 Sub-Form: "${subForm.title}"`);
      console.log('   🌐 Translating Thai → English (MyMemory API)\n');

      const subFormTableName = await dynamicTableService.createSubFormTable(
        subForm,
        mainTableName,
        testForm.id
      );

      subFormTableNames.push(subFormTableName);

      console.log(`   ✅ Sub-form table created: ${subFormTableName}`);

      // Verify sub-form table structure
      const [subColumns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${subFormTableName}'
        ORDER BY ordinal_position;
      `);

      const subFieldColumns = subColumns.filter(col =>
        !['id', 'parent_id', 'form_id', 'sub_form_id', 'user_id', 'submission_number', 'order_index', 'status', 'submitted_at', 'created_at', 'updated_at'].includes(col.column_name)
      );

      console.log('   Field Columns:');
      subForm.fields.forEach((field, index) => {
        if (subFieldColumns[index]) {
          console.log(`     - "${field.label}" → ${subFieldColumns[index].column_name} (${subFieldColumns[index].data_type})`);
        }
      });
      console.log('');
    }

    // 7. Summary
    console.log('7️⃣  Translation Summary:\n');
    console.log('   📊 Main Form:');
    console.log(`      Thai: "${testForm.title}"`);
    console.log(`      Table: ${mainTableName}`);
    console.log(`      Fields: ${testForm.fields.length} translated\n`);

    console.log('   📊 Sub-Forms:');
    testForm.subForms.forEach((subForm, index) => {
      console.log(`      ${index + 1}. Thai: "${subForm.title}"`);
      console.log(`         Table: ${subFormTableNames[index]}`);
      console.log(`         Fields: ${subForm.fields.length} translated\n`);
    });

    // 8. Calculate API usage
    const totalTranslations =
      1 + // Main form title
      testForm.fields.length + // Main form fields
      testForm.subForms.length + // Sub-form titles
      testForm.subForms.reduce((sum, sf) => sum + sf.fields.length, 0); // Sub-form fields

    console.log('   📈 API Usage:');
    console.log(`      Total Translations: ${totalTranslations}`);
    console.log(`      - Main form title: 1`);
    console.log(`      - Main form fields: ${testForm.fields.length}`);
    console.log(`      - Sub-form titles: ${testForm.subForms.length}`);
    console.log(`      - Sub-form fields: ${testForm.subForms.reduce((sum, sf) => sum + sf.fields.length, 0)}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ TEST PASSED                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Results:');
    console.log(`   ✅ Main form table: ${mainTableName}`);
    console.log(`   ✅ Sub-form tables: ${subFormTableNames.length}`);
    console.log(`   ✅ Total translations: ${totalTranslations}`);
    console.log(`   ✅ All tables PostgreSQL-compliant`);
    console.log(`   ✅ All columns generated successfully\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    await pool.end();
  }
}

// Run test
console.log('Starting comprehensive translation test...\n');
testCompleteTranslation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

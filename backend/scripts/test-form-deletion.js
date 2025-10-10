/**
 * Test Form Deletion
 * Verify that deleting a form removes all data from database including dynamic tables
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const DynamicTableService = require('../services/DynamicTableService');
const FormService = require('../services/FormService');

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

// Test user (admin)
const ADMIN_USER_ID = 'cc72d54e-f4d1-4b87-9e3f-25d91706a319'; // pongpanp (super_admin)

async function testFormDeletion() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║             Test Form Deletion                             ║');
  console.log('║  Verify Complete Data Removal from Database               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let testFormId = uuidv4();
  let mainTableName = null;
  let subFormTableNames = [];

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // ==========================================
    // STEP 1: Create a test form with sub-forms
    // ==========================================
    console.log('1️⃣  Creating test form...\n');

    const testForm = {
      id: testFormId,
      title: 'ทดสอบการลบฟอร์ม',
      description: 'ฟอร์มทดสอบการลบข้อมูลจาก database',
      fields: [
        {
          id: uuidv4(),
          label: 'ชื่อ',
          title: 'ชื่อ',
          type: 'short_answer'
        },
        {
          id: uuidv4(),
          label: 'อีเมล',
          title: 'อีเมล',
          type: 'email'
        }
      ],
      subForms: [
        {
          id: uuidv4(),
          title: 'บันทึกเพิ่มเติม',
          description: 'ข้อมูลเพิ่มเติม',
          order_index: 1,
          fields: [
            {
              id: uuidv4(),
              label: 'หมายเหตุ',
              title: 'หมายเหตุ',
              type: 'paragraph'
            }
          ]
        }
      ]
    };

    // Create form record
    await sequelize.query(`
      INSERT INTO forms (id, title, description, is_active, "createdAt", "updatedAt", roles_allowed, version, created_by)
      VALUES (
        '${testForm.id}',
        '${testForm.title}',
        '${testForm.description}',
        true,
        NOW(),
        NOW(),
        '["super_admin", "admin"]'::jsonb,
        1,
        '${ADMIN_USER_ID}'
      );
    `);

    // Create sub-form record
    const subFormId = testForm.subForms[0].id;
    await sequelize.query(`
      INSERT INTO sub_forms (
        id, form_id, title, description, order_index,
        "createdAt", "updatedAt"
      )
      VALUES (
        '${subFormId}',
        '${testForm.id}',
        '${testForm.subForms[0].title}',
        '${testForm.subForms[0].description}',
        ${testForm.subForms[0].order_index},
        NOW(),
        NOW()
      );
    `);

    // Create dynamic tables
    mainTableName = await dynamicTableService.createFormTable(testForm);
    console.log(`   ✅ Main table created: ${mainTableName}`);

    const subFormTableName = await dynamicTableService.createSubFormTable(
      testForm.subForms[0],
      mainTableName,
      testForm.id
    );
    subFormTableNames.push(subFormTableName);
    console.log(`   ✅ Sub-form table created: ${subFormTableName}\n`);

    // ==========================================
    // STEP 2: Verify form exists in database
    // ==========================================
    console.log('2️⃣  Verifying form exists in database...\n');

    const [forms] = await sequelize.query(`SELECT id, title, table_name FROM forms WHERE id = '${testFormId}';`);
    console.log(`   ✅ Form record: ${forms[0]?.title || 'NOT FOUND'}`);

    const [subForms] = await sequelize.query(`SELECT id, title, table_name FROM sub_forms WHERE form_id = '${testFormId}';`);
    console.log(`   ✅ Sub-form records: ${subForms.length}`);

    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '${mainTableName}'
      );
    `);
    console.log(`   ✅ Main table exists: ${tableExists[0].exists}`);

    const [subTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '${subFormTableName}'
      );
    `);
    console.log(`   ✅ Sub-form table exists: ${subTableExists[0].exists}\n`);

    // ==========================================
    // STEP 3: Delete form using FormService
    // ==========================================
    console.log('3️⃣  Deleting form using FormService.deleteForm()...\n');

    await FormService.deleteForm(testFormId, ADMIN_USER_ID);

    console.log('   ✅ Form deleted successfully\n');

    // ==========================================
    // STEP 4: Verify all data removed
    // ==========================================
    console.log('4️⃣  Verifying complete data removal...\n');

    const [formsAfter] = await sequelize.query(`SELECT id FROM forms WHERE id = '${testFormId}';`);
    console.log(`   ${formsAfter.length === 0 ? '✅' : '❌'} Form record removed: ${formsAfter.length === 0}`);

    const [subFormsAfter] = await sequelize.query(`SELECT id FROM sub_forms WHERE form_id = '${testFormId}';`);
    console.log(`   ${subFormsAfter.length === 0 ? '✅' : '❌'} Sub-form records removed: ${subFormsAfter.length === 0}`);

    const [fieldsAfter] = await sequelize.query(`SELECT id FROM fields WHERE form_id = '${testFormId}';`);
    console.log(`   ${fieldsAfter.length === 0 ? '✅' : '❌'} Field records removed: ${fieldsAfter.length === 0}`);

    const [mainTableExistsAfter] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '${mainTableName}'
      );
    `);
    console.log(`   ${!mainTableExistsAfter[0].exists ? '✅' : '❌'} Main table dropped: ${!mainTableExistsAfter[0].exists}`);

    const [subTableExistsAfter] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '${subFormTableName}'
      );
    `);
    console.log(`   ${!subTableExistsAfter[0].exists ? '✅' : '❌'} Sub-form table dropped: ${!subTableExistsAfter[0].exists}\n`);

    // ==========================================
    // Summary
    // ==========================================
    const allRemoved =
      formsAfter.length === 0 &&
      subFormsAfter.length === 0 &&
      fieldsAfter.length === 0 &&
      !mainTableExistsAfter[0].exists &&
      !subTableExistsAfter[0].exists;

    console.log('╔════════════════════════════════════════════════════════════╗');
    if (allRemoved) {
      console.log('║            ✅ TEST PASSED                                 ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log('   ✅ All form data completely removed from database');
      console.log('   ✅ No orphaned records');
      console.log('   ✅ Dynamic tables dropped');
      console.log('   ✅ CASCADE delete working correctly\n');
    } else {
      console.log('║            ❌ TEST FAILED                                 ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log('   ❌ Some data still remains in database!');
      console.log('   Check the verification results above.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    await pool.end();
  }
}

console.log('Starting form deletion test...\n');
testFormDeletion().catch(console.error);

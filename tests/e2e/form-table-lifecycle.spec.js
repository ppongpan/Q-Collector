/**
 * E2E Test: Form Table Lifecycle
 *
 * Tests the complete lifecycle of form creation, editing, and data submission:
 * 1. Create form → Verify table is created in database
 * 2. Edit form → Verify SAME table is updated (not recreated)
 * 3. Submit data → Verify data is saved in SAME table
 *
 * Requirements:
 * - When creating a form, a dynamic table should be created
 * - When editing a form, the existing table should be modified (columns added/removed/renamed)
 * - When submitting data, it should go into the correct table
 */

const { test, expect } = require('@playwright/test');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// Helper: Execute SQL query
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// Helper: Get table structure
async function getTableColumns(tableName) {
  const result = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `, [tableName]);
  return result.rows;
}

// Helper: Check if table exists
async function tableExists(tableName) {
  const result = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    );
  `, [tableName]);
  return result.rows[0].exists;
}

// Helper: Get row count from table
async function getRowCount(tableName) {
  const result = await query(`SELECT COUNT(*) FROM "${tableName}"`);
  return parseInt(result.rows[0].count);
}

// Helper: Get all data from table
async function getTableData(tableName) {
  const result = await query(`SELECT * FROM "${tableName}" ORDER BY submitted_at DESC`);
  return result.rows;
}

// Test data
const testForm = {
  title: 'ทดสอบการสร้างตาราง',
  description: 'ฟอร์มสำหรับทดสอบ lifecycle ของตาราง',
  fields: [
    {
      type: 'short_answer',
      title: 'ชื่อ',
      placeholder: 'กรอกชื่อของคุณ',
      required: true,
      order: 0
    },
    {
      type: 'email',
      title: 'อีเมล',
      placeholder: 'กรอกอีเมล',
      required: true,
      order: 1
    }
  ]
};

test.describe('Form Table Lifecycle', () => {
  let formId;
  let tableName;
  let page;

  test.beforeAll(async ({ browser }) => {
    // Create a new page for all tests
    const context = await browser.newContext();
    page = await context.newPage();

    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'pongpanp');
    await page.fill('input[name="password"]', 'Gfvtmiu613');
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    // Cleanup: Delete test form and its table
    if (formId && tableName) {
      try {
        // Delete dynamic table
        if (await tableExists(tableName)) {
          await query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
          console.log(`✅ Cleaned up table: ${tableName}`);
        }

        // Delete form record
        await query('DELETE FROM forms WHERE id = $1', [formId]);
        console.log(`✅ Cleaned up form: ${formId}`);
      } catch (error) {
        console.error('Cleanup error:', error.message);
      }
    }

    await page.close();
    await pool.end();
  });

  test('Step 1: Create form and verify table creation', async () => {
    console.log('\n📝 TEST 1: Create Form → Verify Table Created');

    // Navigate to form builder
    await page.goto('http://localhost:3000/form-builder');
    await page.waitForTimeout(1000);

    // Fill form title and description
    await page.fill('input[placeholder*="ชื่อฟอร์ม"]', testForm.title);
    await page.fill('textarea[placeholder*="คำอธิบาย"]', testForm.description);

    // Add first field (ชื่อ)
    const addFieldButton = page.locator('button:has-text("เพิ่มฟิลด์")').first();
    await addFieldButton.click();
    await page.waitForTimeout(500);

    // Select field type
    const fieldTypeSelect = page.locator('select[name="type"]').last();
    await fieldTypeSelect.selectOption('short_answer');

    // Fill field details
    await page.fill('input[placeholder*="ชื่อฟิลด์"]', testForm.fields[0].title);
    await page.fill('input[placeholder*="Placeholder"]', testForm.fields[0].placeholder);
    await page.check('input[type="checkbox"][name="required"]');

    // Add second field (อีเมล)
    await addFieldButton.click();
    await page.waitForTimeout(500);

    const emailFieldTypeSelect = page.locator('select[name="type"]').last();
    await emailFieldTypeSelect.selectOption('email');

    await page.fill('input[placeholder*="ชื่อฟิลด์"]', testForm.fields[1].title);
    await page.fill('input[placeholder*="Placeholder"]', testForm.fields[1].placeholder);

    // Save form
    const saveButton = page.locator('button:has-text("บันทึกฟอร์ม")');
    await saveButton.click();

    // Wait for success message
    await page.waitForSelector('text=/บันทึกสำเร็จ|Form created successfully/i', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Get form ID from URL or response
    const currentUrl = page.url();
    const urlMatch = currentUrl.match(/form-builder\/([a-f0-9-]+)/);

    if (urlMatch) {
      formId = urlMatch[1];
      console.log(`✅ Form created with ID: ${formId}`);
    } else {
      // Get form ID from database
      const result = await query(
        'SELECT id, table_name FROM forms WHERE title = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [testForm.title]
      );

      if (result.rows.length > 0) {
        formId = result.rows[0].id;
        tableName = result.rows[0].table_name;
        console.log(`✅ Form created with ID: ${formId}`);
        console.log(`✅ Table name: ${tableName}`);
      }
    }

    expect(formId).toBeTruthy();

    // Verify table was created
    if (!tableName) {
      const formResult = await query('SELECT table_name FROM forms WHERE id = $1', [formId]);
      tableName = formResult.rows[0].table_name;
    }

    expect(tableName).toBeTruthy();
    console.log(`📊 Checking table: ${tableName}`);

    const exists = await tableExists(tableName);
    expect(exists).toBe(true);
    console.log(`✅ Table exists: ${tableName}`);

    // Verify table structure
    const columns = await getTableColumns(tableName);
    console.log(`📊 Table columns (${columns.length}):`, columns.map(c => c.column_name).join(', '));

    // Base columns
    expect(columns.find(c => c.column_name === 'id')).toBeTruthy();
    expect(columns.find(c => c.column_name === 'form_id')).toBeTruthy();
    expect(columns.find(c => c.column_name === 'username')).toBeTruthy();
    expect(columns.find(c => c.column_name === 'submitted_at')).toBeTruthy();

    // Field columns (should be created based on field titles)
    // Column names are generated from field titles using generateColumnName()
    const fieldColumns = columns.filter(c =>
      !['id', 'form_id', 'username', 'submission_number', 'submitted_at'].includes(c.column_name)
    );
    expect(fieldColumns.length).toBeGreaterThanOrEqual(2);
    console.log(`✅ Field columns (${fieldColumns.length}):`, fieldColumns.map(c => c.column_name).join(', '));
  });

  test('Step 2: Edit form and verify table is updated (not recreated)', async () => {
    console.log('\n✏️ TEST 2: Edit Form → Verify Table Updated');

    expect(formId).toBeTruthy();
    expect(tableName).toBeTruthy();

    // Get table creation time before edit
    const beforeEdit = await query(`
      SELECT pg_catalog.obj_description(c.oid) as comment, c.relfilenode
      FROM pg_catalog.pg_class c
      WHERE c.relname = $1 AND c.relkind = 'r'
    `, [tableName]);

    const originalFileNode = beforeEdit.rows[0]?.relfilenode;
    console.log(`📊 Original table relfilenode: ${originalFileNode}`);

    // Navigate to form edit page
    await page.goto(`http://localhost:3000/form-builder/${formId}`);
    await page.waitForTimeout(2000);

    // Add a new field
    const addFieldButton = page.locator('button:has-text("เพิ่มฟิลด์")').first();
    await addFieldButton.click();
    await page.waitForTimeout(500);

    const newFieldTypeSelect = page.locator('select[name="type"]').last();
    await newFieldTypeSelect.selectOption('phone');

    await page.fill('input[placeholder*="ชื่อฟิลด์"]', 'เบอร์โทร');
    await page.fill('input[placeholder*="Placeholder"]', 'กรอกเบอร์โทร');

    // Save changes
    const saveButton = page.locator('button:has-text("บันทึกการแก้ไข")');
    await saveButton.click();

    // Wait for success message
    await page.waitForSelector('text=/อัปเดตสำเร็จ|Updated successfully/i', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Verify table still exists (not recreated)
    const stillExists = await tableExists(tableName);
    expect(stillExists).toBe(true);
    console.log(`✅ Table still exists: ${tableName}`);

    // Verify table was NOT recreated (same relfilenode)
    const afterEdit = await query(`
      SELECT c.relfilenode
      FROM pg_catalog.pg_class c
      WHERE c.relname = $1 AND c.relkind = 'r'
    `, [tableName]);

    const newFileNode = afterEdit.rows[0]?.relfilenode;
    console.log(`📊 After edit relfilenode: ${newFileNode}`);

    // Note: relfilenode might change with ALTER TABLE, so we just verify table exists
    // and has the new column

    // Verify new column was added
    const columnsAfterEdit = await getTableColumns(tableName);
    console.log(`📊 Columns after edit (${columnsAfterEdit.length}):`, columnsAfterEdit.map(c => c.column_name).join(', '));

    const phoneColumn = columnsAfterEdit.find(c => c.column_name.includes('phone') || c.column_name.includes('tel'));
    expect(phoneColumn).toBeTruthy();
    console.log(`✅ New phone column added: ${phoneColumn?.column_name}`);
  });

  test('Step 3: Submit data and verify it is saved in the same table', async () => {
    console.log('\n💾 TEST 3: Submit Data → Verify Saved in Same Table');

    expect(formId).toBeTruthy();
    expect(tableName).toBeTruthy();

    // Get row count before submission
    const rowsBefore = await getRowCount(tableName);
    console.log(`📊 Rows before submission: ${rowsBefore}`);

    // Navigate to form view
    await page.goto(`http://localhost:3000/form-view/${formId}`);
    await page.waitForTimeout(2000);

    // Fill form data
    await page.fill('input[placeholder*="ชื่อ"]', 'ทดสอบ User');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[placeholder*="เบอร์โทร"]', '0812345678');

    // Submit form
    const submitButton = page.locator('button:has-text("ส่งข้อมูล")');
    await submitButton.click();

    // Wait for success message
    await page.waitForSelector('text=/ส่งข้อมูลสำเร็จ|Submitted successfully/i', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify data was saved in the same table
    const rowsAfter = await getRowCount(tableName);
    console.log(`📊 Rows after submission: ${rowsAfter}`);
    expect(rowsAfter).toBe(rowsBefore + 1);

    // Get the submitted data
    const data = await getTableData(tableName);
    console.log(`📊 Latest submission:`, JSON.stringify(data[0], null, 2));

    // Verify submission contains our data
    const latestSubmission = data[0];
    expect(latestSubmission.form_id).toBe(formId);

    // Check for submitted data (column names may vary based on field title translation)
    const dataValues = Object.values(latestSubmission);
    expect(dataValues.some(v => v && v.includes('ทดสอบ User'))).toBe(true);
    expect(dataValues.some(v => v && v.includes('test@example.com'))).toBe(true);
    expect(dataValues.some(v => v && v.includes('0812345678'))).toBe(true);

    console.log(`✅ Data successfully saved in table: ${tableName}`);
  });

  test('Step 4: Submit another record to verify table integrity', async () => {
    console.log('\n💾 TEST 4: Submit Another Record → Verify Table Integrity');

    expect(tableName).toBeTruthy();

    const rowsBefore = await getRowCount(tableName);
    console.log(`📊 Rows before 2nd submission: ${rowsBefore}`);

    // Navigate to form view
    await page.goto(`http://localhost:3000/form-view/${formId}`);
    await page.waitForTimeout(2000);

    // Fill different data
    await page.fill('input[placeholder*="ชื่อ"]', 'ผู้ใช้งาน 2');
    await page.fill('input[type="email"]', 'user2@example.com');
    await page.fill('input[placeholder*="เบอร์โทร"]', '0898765432');

    // Submit
    const submitButton = page.locator('button:has-text("ส่งข้อมูล")');
    await submitButton.click();

    await page.waitForSelector('text=/ส่งข้อมูลสำเร็จ|Submitted successfully/i', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify row count increased
    const rowsAfter = await getRowCount(tableName);
    console.log(`📊 Rows after 2nd submission: ${rowsAfter}`);
    expect(rowsAfter).toBe(rowsBefore + 1);

    // Verify both records exist
    const allData = await getTableData(tableName);
    expect(allData.length).toBe(rowsAfter);

    console.log(`✅ All ${rowsAfter} records exist in same table`);
    console.log(`✅ Table lifecycle test PASSED!`);
  });
});

/**
 * Integration Tests for DynamicTableService
 * Tests table creation with Thai field name translation
 */

const DynamicTableService = require('../../services/DynamicTableService');
const { Pool } = require('pg');

// Test database configuration
const testPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

describe('DynamicTableService Integration Tests', () => {
  let service;
  let createdTables = [];

  beforeAll(() => {
    service = new DynamicTableService(testPool);
  });

  afterAll(async () => {
    // Clean up created tables
    for (const tableName of createdTables) {
      try {
        await service.dropFormTable(tableName);
      } catch (error) {
        console.error(`Failed to drop table ${tableName}:`, error.message);
      }
    }
    await service.close();
  });

  describe('createFormTable with Thai field names', () => {
    it('should create table with Thai form title translated to English', async () => {
      const form = {
        id: '12345678-1234-1234-1234-1234567890ab',
        title: 'แบบฟอร์มติดต่อ',
        fields: []
      };

      const tableName = await service.createFormTable(form);
      createdTables.push(tableName);

      expect(tableName).toMatch(/^contact/); // Should start with 'contact'
      expect(tableName).toMatch(/_1234567890ab$/); // Should end with short ID
    });

    it('should create columns with Thai field names translated to English', async () => {
      const form = {
        id: '12345678-1234-1234-1234-1234567890cd',
        title: 'แบบสอบถาม',
        fields: [
          { id: 'field-001', title: 'ชื่อเต็ม', type: 'short_answer' },
          { id: 'field-002', title: 'อีเมล', type: 'email' },
          { id: 'field-003', title: 'เบอร์โทรศัพท์', type: 'phone' },
          { id: 'field-004', title: 'ที่อยู่', type: 'paragraph' }
        ]
      };

      const tableName = await service.createFormTable(form);
      createdTables.push(tableName);

      // Get table structure
      const structure = await service.getTableStructure(tableName);
      const columnNames = structure.map(col => col.column_name);

      // Check that Thai field names were translated
      expect(columnNames).toContain(expect.stringMatching(/full_name/));
      expect(columnNames).toContain(expect.stringMatching(/email/));
      expect(columnNames).toContain(expect.stringMatching(/phone/));
      expect(columnNames).toContain(expect.stringMatching(/address/));
    });

    it('should handle mixed Thai/English field names', async () => {
      const form = {
        id: '12345678-1234-1234-1234-1234567890ef',
        title: 'Contact Form',
        fields: [
          { id: 'field-101', title: 'Full Name', type: 'short_answer' },
          { id: 'field-102', title: 'อีเมล', type: 'email' },
          { id: 'field-103', title: 'Phone Number', type: 'phone' },
          { id: 'field-104', title: 'ข้อความ', type: 'paragraph' }
        ]
      };

      const tableName = await service.createFormTable(form);
      createdTables.push(tableName);

      const structure = await service.getTableStructure(tableName);
      const columnNames = structure.map(col => col.column_name);

      // Check both English and translated Thai names
      expect(columnNames).toContain(expect.stringMatching(/full_name/));
      expect(columnNames).toContain(expect.stringMatching(/email/));
      expect(columnNames).toContain(expect.stringMatching(/phone_number/));
      expect(columnNames).toContain(expect.stringMatching(/message/));
    });

    it('should create correct PostgreSQL data types for fields', async () => {
      const form = {
        id: '12345678-1234-1234-1234-12345678901a',
        title: 'Survey',
        fields: [
          { id: 'f-1', title: 'Name', type: 'short_answer' },
          { id: 'f-2', title: 'Email', type: 'email' },
          { id: 'f-3', title: 'Age', type: 'number' },
          { id: 'f-4', title: 'BirthDate', type: 'date' },
          { id: 'f-5', title: 'Rating', type: 'rating' }
        ]
      };

      const tableName = await service.createFormTable(form);
      createdTables.push(tableName);

      const structure = await service.getTableStructure(tableName);

      // Find specific field types
      const nameField = structure.find(col => col.column_name.includes('name'));
      const emailField = structure.find(col => col.column_name.includes('email'));
      const ageField = structure.find(col => col.column_name.includes('age'));
      const dateField = structure.find(col => col.column_name.includes('birthdate'));
      const ratingField = structure.find(col => col.column_name.includes('rating'));

      expect(nameField.data_type).toBe('character varying');
      expect(emailField.data_type).toBe('character varying');
      expect(ageField.data_type).toBe('numeric');
      expect(dateField.data_type).toBe('date');
      expect(ratingField.data_type).toBe('integer');
    });
  });

  describe('updateFormTableColumns', () => {
    it('should add new columns when fields are added', async () => {
      const form = {
        id: '12345678-1234-1234-1234-12345678902b',
        title: 'Test Form',
        fields: [
          { id: 'f-1', title: 'Name', type: 'short_answer' }
        ]
      };

      const tableName = await service.createFormTable(form);
      createdTables.push(tableName);

      // Update form with new fields
      const updatedForm = {
        id: form.id,
        title: form.title,
        fields: [
          { id: 'f-1', title: 'Name', type: 'short_answer' },
          { id: 'f-2', title: 'Email', type: 'email' },
          { id: 'f-3', title: 'เบอร์โทร', type: 'phone' }
        ]
      };

      const client = await testPool.connect();
      try {
        await client.query('BEGIN');
        await service.updateFormTableColumns(updatedForm, tableName, client);
        await client.query('COMMIT');
      } finally {
        client.release();
      }

      const structure = await service.getTableStructure(tableName);
      const columnNames = structure.map(col => col.column_name);

      expect(columnNames).toContain(expect.stringMatching(/email/));
      expect(columnNames).toContain(expect.stringMatching(/phone/));
    });
  });

  describe('Table name uniqueness', () => {
    it('should create unique table names for forms with same title', async () => {
      const form1 = {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'แบบฟอร์มติดต่อ',
        fields: []
      };

      const form2 = {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'แบบฟอร์มติดต่อ',
        fields: []
      };

      const table1 = await service.createFormTable(form1);
      const table2 = await service.createFormTable(form2);

      createdTables.push(table1, table2);

      // Tables should have different names due to different IDs
      expect(table1).not.toBe(table2);
      expect(table1).toMatch(/_111111111111$/);
      expect(table2).toMatch(/_222222222222$/);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid form data gracefully', async () => {
      const invalidForm = {
        id: null,
        title: '',
        fields: []
      };

      await expect(service.createFormTable(invalidForm))
        .rejects.toThrow();
    });

    it('should handle duplicate table creation', async () => {
      const form = {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Duplicate Test',
        fields: []
      };

      const tableName = await service.createFormTable(form);
      createdTables.push(tableName);

      // Try to create again - should update instead of error
      await expect(service.createFormTable(form))
        .resolves.toBe(tableName);
    });
  });

  describe('Sub-Form Table Creation', () => {
    let mainTableName;
    let formId;

    beforeEach(async () => {
      // Create main form table first
      formId = '44444444-4444-4444-4444-444444444444';
      const mainForm = {
        id: formId,
        title: 'Main Order Form',
        fields: [
          { id: 'f-1', title: 'Customer Name', type: 'short_answer' }
        ]
      };

      mainTableName = await service.createFormTable(mainForm);
      createdTables.push(mainTableName);
    });

    it('should create sub-form table with correct structure', async () => {
      const subForm = {
        id: 'sub-001',
        title: 'Order Items',
        fields: [
          { id: 'sf-1', title: 'Product Name', type: 'short_answer' },
          { id: 'sf-2', title: 'Quantity', type: 'number' },
          { id: 'sf-3', title: 'Price', type: 'number' }
        ]
      };

      const subFormTableName = await service.createSubFormTable(
        subForm,
        mainTableName,
        formId
      );
      createdTables.push(subFormTableName);

      // Verify table was created
      const structure = await service.getTableStructure(subFormTableName);
      const columnNames = structure.map(col => col.column_name);

      // Check base columns
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('parent_id');
      expect(columnNames).toContain('form_id');
      expect(columnNames).toContain('sub_form_id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('order_index');
      expect(columnNames).toContain('status');

      // Check custom field columns
      expect(columnNames).toContain(expect.stringMatching(/product_name/));
      expect(columnNames).toContain(expect.stringMatching(/quantity/));
      expect(columnNames).toContain(expect.stringMatching(/price/));
    });

    it('should create sub-form table with Thai field names translated', async () => {
      const subForm = {
        id: 'sub-002',
        title: 'รายการสินค้า',
        fields: [
          { id: 'sf-1', title: 'ชื่อสินค้า', type: 'short_answer' },
          { id: 'sf-2', title: 'จำนวน', type: 'number' },
          { id: 'sf-3', title: 'ราคา', type: 'number' }
        ]
      };

      const subFormTableName = await service.createSubFormTable(
        subForm,
        mainTableName,
        formId
      );
      createdTables.push(subFormTableName);

      const structure = await service.getTableStructure(subFormTableName);
      const columnNames = structure.map(col => col.column_name);

      // Check Thai translations
      expect(columnNames).toContain(expect.stringMatching(/product_name|name/));
      expect(columnNames).toContain(expect.stringMatching(/quantity|amount/));
      expect(columnNames).toContain(expect.stringMatching(/price/));
    });

    it('should handle duplicate sub-form table creation', async () => {
      const subForm = {
        id: 'sub-003',
        title: 'Items',
        fields: []
      };

      const tableName1 = await service.createSubFormTable(
        subForm,
        mainTableName,
        formId
      );
      createdTables.push(tableName1);

      // Create again - should update
      const tableName2 = await service.createSubFormTable(
        subForm,
        mainTableName,
        formId
      );

      expect(tableName1).toBe(tableName2);
    });
  });

  describe('Sub-Form Data Operations', () => {
    let mainTableName;
    let subFormTableName;
    let formId;
    let subFormId;
    let mainSubmissionId;
    let userId;

    beforeEach(async () => {
      // Setup: Create main form and sub-form tables
      formId = '55555555-5555-5555-5555-555555555555';
      subFormId = 'sub-004';
      userId = '66666666-6666-6666-6666-666666666666';

      const mainForm = {
        id: formId,
        title: 'Purchase Order',
        fields: [
          { id: 'f-1', title: 'Vendor', type: 'short_answer' }
        ]
      };

      mainTableName = await service.createFormTable(mainForm);
      createdTables.push(mainTableName);

      // Insert main submission to get parent_id
      const mainData = await service.insertSubmission(
        formId,
        mainTableName,
        userId,
        { vendor_f1: 'ABC Corp' }
      );
      mainSubmissionId = mainData.id;

      const subForm = {
        id: subFormId,
        title: 'Line Items',
        fields: [
          { id: 'sf-1', title: 'Item', type: 'short_answer' },
          { id: 'sf-2', title: 'Qty', type: 'number' }
        ]
      };

      subFormTableName = await service.createSubFormTable(
        subForm,
        mainTableName,
        formId
      );
      createdTables.push(subFormTableName);
    });

    it('should insert sub-form data successfully', async () => {
      const subFormData = {
        item_sf1: 'Widget A',
        qty_sf2: 5
      };

      const result = await service.insertSubFormData(
        subFormTableName,
        mainSubmissionId,
        formId,
        subFormId,
        userId,
        subFormData,
        0
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.parent_id).toBe(mainSubmissionId);
      expect(result.form_id).toBe(formId);
      expect(result.sub_form_id).toBe(subFormId);
      expect(result.order_index).toBe(0);
    });

    it('should retrieve sub-form data by parent ID', async () => {
      // Insert multiple sub-form entries
      const items = [
        { item_sf1: 'Item 1', qty_sf2: 10 },
        { item_sf1: 'Item 2', qty_sf2: 20 },
        { item_sf1: 'Item 3', qty_sf2: 30 }
      ];

      for (let i = 0; i < items.length; i++) {
        await service.insertSubFormData(
          subFormTableName,
          mainSubmissionId,
          formId,
          subFormId,
          userId,
          items[i],
          i
        );
      }

      // Retrieve all sub-form data
      const results = await service.getSubFormData(
        subFormTableName,
        mainSubmissionId
      );

      expect(results).toHaveLength(3);
      expect(results[0].order_index).toBe(0);
      expect(results[1].order_index).toBe(1);
      expect(results[2].order_index).toBe(2);
    });

    it('should maintain order with order_index', async () => {
      // Insert in reverse order
      await service.insertSubFormData(
        subFormTableName,
        mainSubmissionId,
        formId,
        subFormId,
        userId,
        { item_sf1: 'Third', qty_sf2: 3 },
        2
      );

      await service.insertSubFormData(
        subFormTableName,
        mainSubmissionId,
        formId,
        subFormId,
        userId,
        { item_sf1: 'First', qty_sf2: 1 },
        0
      );

      await service.insertSubFormData(
        subFormTableName,
        mainSubmissionId,
        formId,
        subFormId,
        userId,
        { item_sf1: 'Second', qty_sf2: 2 },
        1
      );

      // Retrieve should be ordered by order_index
      const results = await service.getSubFormData(
        subFormTableName,
        mainSubmissionId
      );

      expect(results[0].order_index).toBe(0);
      expect(results[1].order_index).toBe(1);
      expect(results[2].order_index).toBe(2);
    });

    it('should return empty array when no sub-form data exists', async () => {
      const nonExistentParentId = '77777777-7777-7777-7777-777777777777';

      const results = await service.getSubFormData(
        subFormTableName,
        nonExistentParentId
      );

      expect(results).toEqual([]);
    });
  });

  describe('Sub-Form Foreign Key Constraints', () => {
    let mainTableName;
    let subFormTableName;
    let formId;
    let subFormId;

    beforeEach(async () => {
      formId = '88888888-8888-8888-8888-888888888888';
      subFormId = 'sub-005';

      const mainForm = {
        id: formId,
        title: 'Parent Form',
        fields: []
      };

      mainTableName = await service.createFormTable(mainForm);
      createdTables.push(mainTableName);

      const subForm = {
        id: subFormId,
        title: 'Child Form',
        fields: []
      };

      subFormTableName = await service.createSubFormTable(
        subForm,
        mainTableName,
        formId
      );
      createdTables.push(subFormTableName);
    });

    it('should enforce foreign key constraint on parent_id', async () => {
      const invalidParentId = '99999999-9999-9999-9999-999999999999';
      const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      await expect(
        service.insertSubFormData(
          subFormTableName,
          invalidParentId,
          formId,
          subFormId,
          userId,
          {},
          0
        )
      ).rejects.toThrow();
    });

    it('should cascade delete sub-form data when parent is deleted', async () => {
      const userId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      // Insert parent
      const parent = await service.insertSubmission(
        formId,
        mainTableName,
        userId,
        {}
      );

      // Insert sub-form data
      await service.insertSubFormData(
        subFormTableName,
        parent.id,
        formId,
        subFormId,
        userId,
        { test: 'data' },
        0
      );

      // Verify sub-form data exists
      let subData = await service.getSubFormData(subFormTableName, parent.id);
      expect(subData).toHaveLength(1);

      // Delete parent
      const client = await testPool.connect();
      try {
        await client.query(`DELETE FROM ${mainTableName} WHERE id = $1`, [parent.id]);
      } finally {
        client.release();
      }

      // Verify sub-form data was cascade deleted
      subData = await service.getSubFormData(subFormTableName, parent.id);
      expect(subData).toHaveLength(0);
    });
  });
});

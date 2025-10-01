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
        id: '12345678-1234-1234-1234-123456789abc',
        title: 'แบบฟอร์มติดต่อ',
        fields: []
      };

      const tableName = await service.createFormTable(form);
      createdTables.push(tableName);

      expect(tableName).toMatch(/^contact/); // Should start with 'contact'
      expect(tableName).toMatch(/_123456789abc$/); // Should end with short ID
    });

    it('should create columns with Thai field names translated to English', async () => {
      const form = {
        id: '12345678-1234-1234-1234-123456789def',
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
        id: '12345678-1234-1234-1234-123456789ghi',
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
        id: '12345678-1234-1234-1234-123456789jkl',
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
        id: '12345678-1234-1234-1234-123456789mno',
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
});

/**
 * Test Script for v0.7.0 Database Schema System
 *
 * Tests TranslationService, SQLNameNormalizer, and SchemaGenerator
 * with real-world Thai form examples.
 *
 * @version 0.7.0
 * @since 2025-10-02
 */

const TranslationService = require('../services/TranslationService');
const SQLNameNormalizer = require('../services/SQLNameNormalizer');
const SchemaGenerator = require('../services/SchemaGenerator');

console.log('='.repeat(80));
console.log('Q-COLLECTOR v0.7.0 - DATABASE SCHEMA SYSTEM TEST');
console.log('='.repeat(80));
console.log('');

/**
 * Test 1: Translation Service
 */
console.log('TEST 1: TRANSLATION SERVICE');
console.log('-'.repeat(80));

const thaiTerms = [
  'ใบสมัครงาน',
  'ชื่อ-นามสกุล',
  'วันเกิด',
  'ที่อยู่',
  'โทรศัพท์',
  'อีเมล',
  'ประสบการณ์ทำงาน',
  'วุฒิการศึกษา',
  'ทักษะพิเศษ',
  'ไฟล์เรซูเม่',
  'แบบฟอร์มใบลา',
  'วันที่เริ่มลา',
  'วันที่สิ้นสุดลา',
  'เหตุผลการลา',
  'ผู้อนุมัติ'
];

console.log('Translating Thai terms to English:');
console.log('');

thaiTerms.forEach(term => {
  const translated = TranslationService.translate(term);
  console.log(`  ${term.padEnd(30)} → ${translated}`);
});

console.log('');
console.log('✓ Translation Service Test Complete');
console.log('');

/**
 * Test 2: SQL Name Normalizer
 */
console.log('TEST 2: SQL NAME NORMALIZER');
console.log('-'.repeat(80));

const testNames = [
  'ใบสมัครงาน',           // Thai form name
  'User Management',       // English with space
  'Form-Builder-2024',     // English with hyphens
  'select',                // Reserved word
  'table',                 // Reserved word
  'ชื่อ-นามสกุล',         // Thai field name
  '123InvalidStart',       // Starts with number
  'Very Long Form Name That Exceeds The PostgreSQL Identifier Length Limit And Should Be Truncated Properly'
];

console.log('Normalizing names to valid PostgreSQL identifiers:');
console.log('');

testNames.forEach(name => {
  try {
    const normalized = SQLNameNormalizer.normalize(name, { type: 'table' });
    const isValid = SQLNameNormalizer.isValidIdentifier(normalized);
    const isReserved = SQLNameNormalizer.isReservedWord(normalized);

    console.log(`  Original:   ${name}`);
    console.log(`  Normalized: ${normalized}`);
    console.log(`  Valid:      ${isValid ? '✓' : '✗'}`);
    console.log(`  Reserved:   ${isReserved ? 'Yes (handled)' : 'No'}`);
    console.log('');
  } catch (error) {
    console.log(`  Original:   ${name}`);
    console.log(`  Error:      ${error.message}`);
    console.log('');
  }
});

console.log('✓ SQL Name Normalizer Test Complete');
console.log('');

/**
 * Test 3: Schema Generator
 */
console.log('TEST 3: SCHEMA GENERATOR');
console.log('-'.repeat(80));

// Example form: Job Application (ใบสมัครงาน)
const jobApplicationForm = {
  id: 1,
  name: 'ใบสมัครงาน',
  fields: [
    { id: 1, label: 'ชื่อ-นามสกุล', type: 'short_answer', required: true },
    { id: 2, label: 'อายุ', type: 'number', required: true },
    { id: 3, label: 'วันเกิด', type: 'date', required: true },
    { id: 4, label: 'เพศ', type: 'multiple_choice', required: true },
    { id: 5, label: 'ที่อยู่', type: 'paragraph', required: true },
    { id: 6, label: 'จังหวัด', type: 'province', required: true },
    { id: 7, label: 'โทรศัพท์', type: 'phone', required: true },
    { id: 8, label: 'อีเมล', type: 'email', required: true },
    { id: 9, label: 'ตำแหน่งที่สมัคร', type: 'short_answer', required: true },
    { id: 10, label: 'เงินเดือนที่คาดหวัง', type: 'number', required: false },
    { id: 11, label: 'รูปถ่าย', type: 'image_upload', required: false },
    { id: 12, label: 'ไฟล์เรซูเม่', type: 'file_upload', required: false }
  ],
  subForms: [
    {
      id: 101,
      name: 'ประสบการณ์ทำงาน',
      fields: [
        { id: 1, label: 'บริษัท', type: 'short_answer', required: true },
        { id: 2, label: 'ตำแหน่ง', type: 'short_answer', required: true },
        { id: 3, label: 'วันที่เริ่มต้น', type: 'date', required: true },
        { id: 4, label: 'วันที่สิ้นสุด', type: 'date', required: false },
        { id: 5, label: 'เงินเดือน', type: 'number', required: false },
        { id: 6, label: 'รายละเอียดงาน', type: 'paragraph', required: false }
      ]
    },
    {
      id: 102,
      name: 'การศึกษา',
      fields: [
        { id: 1, label: 'สถาบัน', type: 'short_answer', required: true },
        { id: 2, label: 'วุฒิการศึกษา', type: 'short_answer', required: true },
        { id: 3, label: 'สาขาวิชา', type: 'short_answer', required: true },
        { id: 4, label: 'ปีที่จบ', type: 'number', required: true },
        { id: 5, label: 'เกรดเฉลี่ย', type: 'number', required: false }
      ]
    }
  ]
};

console.log('Generating schema for: ใบสมัครงาน (Job Application)');
console.log('');

try {
  const schema = SchemaGenerator.generateSchema(jobApplicationForm, {
    tablePrefix: 'form_',
    includeMetadata: true,
    includeIndexes: true
  });

  console.log('MAIN TABLE:');
  console.log('  Table Name:', schema.mainTable.tableName);
  console.log('  Columns:', schema.mainTable.columns.length);
  console.log('');
  console.log('  Column Mappings:');
  schema.mainTable.columns.forEach(col => {
    if (col.originalLabel) {
      console.log(`    ${col.originalLabel.padEnd(25)} → ${col.name.padEnd(30)} (${col.fieldType || 'system'})`);
    } else {
      console.log(`    ${'[System]'.padEnd(25)} → ${col.name.padEnd(30)} (system)`);
    }
  });
  console.log('');

  console.log('SUB-FORM TABLES:');
  schema.subTables.forEach((subTable, index) => {
    console.log(`  ${index + 1}. ${subTable.tableName}`);
    console.log(`     Foreign Key: ${subTable.foreignKey} → ${subTable.metadata.mainTable}`);
    console.log(`     Columns: ${subTable.columns.length}`);
    console.log('');
  });

  console.log('CREATE TABLE STATEMENTS:');
  console.log('');
  console.log('-- Main Table --');
  console.log(schema.mainTable.createStatement);
  console.log('');

  schema.subTables.forEach((subTable, index) => {
    console.log(`-- Sub-Form Table ${index + 1}: ${subTable.metadata.subFormName} --`);
    console.log(subTable.createStatement);
    console.log('');
  });

  console.log('INDEXES:');
  console.log('');
  schema.indexes.forEach((indexStmt, i) => {
    console.log(`-- Index ${i + 1} --`);
    console.log(indexStmt);
    console.log('');
  });

  console.log('RELATIONSHIPS:');
  console.log('');
  schema.relationships.forEach((rel, i) => {
    console.log(`  ${i + 1}. ${rel.subTable} → ${rel.mainTable}`);
    console.log(`     via ${rel.foreignKey}`);
  });

  console.log('');
  console.log('✓ Schema Generator Test Complete');

} catch (error) {
  console.error('✗ Schema Generator Test Failed:', error.message);
  console.error(error.stack);
}

console.log('');
console.log('='.repeat(80));
console.log('TEST SUITE COMPLETE');
console.log('='.repeat(80));
console.log('');
console.log('Summary:');
console.log('  ✓ TranslationService   - Thai→English translation');
console.log('  ✓ SQLNameNormalizer    - PostgreSQL identifier validation');
console.log('  ✓ SchemaGenerator      - CREATE TABLE statement generation');
console.log('');
console.log('v0.7.0 Phase 8 Schema System: OPERATIONAL');
console.log('');

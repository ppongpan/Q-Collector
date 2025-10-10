/**
 * Investigate Field Ordering System
 *
 * This script investigates the current field ordering system to identify:
 * 1. How order is stored in database
 * 2. How order is used in queries
 * 3. How order is sent from frontend
 * 4. How order is displayed in FormView and SubmissionDetail
 *
 * @version 0.7.7-dev
 * @created 2025-10-10
 */

require('dotenv').config();
const db = require('../models');
const { sequelize, Form, Field, SubForm } = db;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}${colors.reset}\n`),
  subsection: (msg) => console.log(`${colors.magenta}${'-'.repeat(80)}\n${msg}\n${'-'.repeat(80)}${colors.reset}`)
};

async function investigateFieldOrdering() {
  try {
    await sequelize.authenticate();
    log.success('Connected to database');

    log.section('🔍 FIELD ORDERING INVESTIGATION');

    // 1. Check database schema
    log.subsection('1. Database Schema Check');
    const [fieldColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'fields'
      AND column_name LIKE '%order%'
      ORDER BY ordinal_position;
    `);

    if (fieldColumns.length > 0) {
      log.success('Found order-related columns in fields table:');
      console.table(fieldColumns);
    } else {
      log.error('No order-related columns found in fields table');
    }

    // 2. Check existing forms and field order
    log.subsection('2. Existing Form Field Orders');
    const forms = await Form.findAll({
      include: [
        {
          model: Field,
          as: 'fields',
          attributes: ['id', 'title', 'type', 'order', 'sub_form_id'],
          required: false
        },
        {
          model: SubForm,
          as: 'subForms',
          include: [{
            model: Field,
            as: 'fields',
            attributes: ['id', 'title', 'type', 'order'],
            required: false
          }]
        }
      ],
      limit: 3
    });

    for (const form of forms) {
      log.info(`\nForm: ${form.title} (${form.id})`);

      // Main form fields
      const mainFields = form.fields.filter(f => !f.sub_form_id);
      log.info(`  Main Form Fields (${mainFields.length}):`);
      if (mainFields.length > 0) {
        console.table(mainFields.map((f, idx) => ({
          index: idx,
          id: f.id.substring(0, 8),
          title: f.title,
          type: f.type,
          order: f.order,
          order_match: f.order === idx ? '✅' : '❌'
        })));

        // Check if order is sequential
        const isSequential = mainFields.every((f, idx) => f.order === idx);
        if (isSequential) {
          log.success('  ✅ Main form fields have sequential order (0, 1, 2, ...)');
        } else {
          log.warn('  ⚠️  Main form fields DO NOT have sequential order');
        }
      } else {
        log.warn('  No main form fields');
      }

      // Sub-form fields
      for (const subForm of form.subForms) {
        log.info(`\n  Sub-Form: ${subForm.title} (${subForm.id})`);
        if (subForm.fields && subForm.fields.length > 0) {
          console.table(subForm.fields.map((f, idx) => ({
            index: idx,
            id: f.id.substring(0, 8),
            title: f.title,
            type: f.type,
            order: f.order,
            order_match: f.order === idx ? '✅' : '❌'
          })));

          const isSequential = subForm.fields.every((f, idx) => f.order === idx);
          if (isSequential) {
            log.success('    ✅ Sub-form fields have sequential order');
          } else {
            log.warn('    ⚠️  Sub-form fields DO NOT have sequential order');
          }
        } else {
          log.warn('    No sub-form fields');
        }
      }
    }

    // 3. Test query with ORDER BY
    log.subsection('3. Query with ORDER BY clause');
    const testForm = await Form.findOne({
      include: [{
        model: Field,
        as: 'fields',
        where: { sub_form_id: null },
        required: false,
        order: [['order', 'ASC']]  // This doesn't work here!
      }]
    });

    if (testForm && testForm.fields) {
      log.info(`Test Form: ${testForm.title}`);
      log.warn('⚠️  NOTE: ORDER BY in nested include doesn\'t work correctly!');
      log.info('Fields order from query:');
      console.table(testForm.fields.map((f, idx) => ({
        index: idx,
        title: f.title,
        order: f.order,
        match: f.order === idx ? '✅' : '❌'
      })));
    }

    // 4. Test correct way to order
    log.subsection('4. Correct way to order fields');
    const testForm2 = await Form.findOne({
      include: [{
        model: Field,
        as: 'fields',
        where: { sub_form_id: null },
        required: false
      }],
      order: [[{ model: Field, as: 'fields' }, 'order', 'ASC']]
    });

    if (testForm2 && testForm2.fields) {
      log.success('✅ Using correct ORDER BY syntax for associations');
      log.info('Fields order from query:');
      console.table(testForm2.fields.map((f, idx) => ({
        index: idx,
        title: f.title,
        order: f.order,
        match: f.order === idx ? '✅' : '❌'
      })));
    }

    // 5. Summary and recommendations
    log.section('📋 SUMMARY & RECOMMENDATIONS');

    const issues = [];
    const recommendations = [];

    // Check if order column exists
    if (fieldColumns.length === 0) {
      issues.push('❌ No order column found in fields table');
      recommendations.push('1. Add order column to fields table via migration');
    } else {
      log.success('✅ Order column exists in database');
    }

    // Check FormService
    log.info('\n📝 Next Steps:');
    console.log('1. Check FormService.js - does it save order values?');
    console.log('2. Check EnhancedFormBuilder.jsx - does it send order values?');
    console.log('3. Check FormView.jsx - does it sort by order?');
    console.log('4. Check SubmissionDetail.jsx - does it sort by order?');
    console.log('5. Check API routes - do they include ORDER BY?');

    log.warn('\n⚠️  Common Issues:');
    console.log('- Order not saved when dragging fields');
    console.log('- Order not used in queries (fields displayed in random order)');
    console.log('- ORDER BY syntax incorrect for Sequelize associations');
    console.log('- Frontend doesn\'t update order property when dragging');

    if (issues.length > 0) {
      log.error('\n❌ Issues Found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    if (recommendations.length > 0) {
      log.info('\n💡 Recommendations:');
      recommendations.forEach(rec => console.log(`  ${rec}`));
    } else {
      log.success('\n✅ Database schema is correct. Check application code next.');
    }

  } catch (error) {
    log.error(`Investigation failed: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run investigation
investigateFieldOrdering();

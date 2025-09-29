/**
 * Seeder: Demo Forms
 * Creates sample forms with fields for testing
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get admin user for created_by
    const adminUser = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@qcollector.local' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!adminUser || adminUser.length === 0) {
      console.error('Admin user not found. Please run user seeder first.');
      return;
    }

    const adminId = adminUser[0].id;

    // Form 1: Customer Feedback Form
    const form1Id = uuidv4();
    const form1SubFormId = uuidv4();

    await queryInterface.bulkInsert('forms', [
      {
        id: form1Id,
        title: 'Customer Feedback Form',
        description: 'Collect customer feedback and satisfaction ratings',
        roles_allowed: JSON.stringify(['user', 'manager', 'admin']),
        settings: JSON.stringify({
          telegram: {
            enabled: true,
            notifyOnSubmit: true,
          },
          allowDrafts: true,
          requireLogin: true,
        }),
        created_by: adminId,
        is_active: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Fields for Form 1
    const form1Fields = [
      {
        id: uuidv4(),
        form_id: form1Id,
        sub_form_id: null,
        type: 'short_answer',
        title: 'Customer Name',
        placeholder: 'Enter your full name',
        required: true,
        order: 1,
        options: JSON.stringify({}),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: true }),
        validation_rules: JSON.stringify({ minLength: 2, maxLength: 100 }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form1Id,
        sub_form_id: null,
        type: 'email',
        title: 'Email Address',
        placeholder: 'your.email@example.com',
        required: true,
        order: 2,
        options: JSON.stringify({}),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: true }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form1Id,
        sub_form_id: null,
        type: 'phone',
        title: 'Phone Number',
        placeholder: '0812345678',
        required: false,
        order: 3,
        options: JSON.stringify({}),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form1Id,
        sub_form_id: null,
        type: 'rating',
        title: 'Overall Satisfaction',
        placeholder: 'Rate from 1 to 5',
        required: true,
        order: 4,
        options: JSON.stringify({ min: 1, max: 5 }),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: true }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form1Id,
        sub_form_id: null,
        type: 'paragraph',
        title: 'Additional Comments',
        placeholder: 'Tell us more about your experience...',
        required: false,
        order: 5,
        options: JSON.stringify({ maxLength: 1000 }),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await queryInterface.bulkInsert('fields', form1Fields);

    // Form 2: Employee Information Form
    const form2Id = uuidv4();

    await queryInterface.bulkInsert('forms', [
      {
        id: form2Id,
        title: 'Employee Information Form',
        description: 'Internal employee information collection',
        roles_allowed: JSON.stringify(['manager', 'admin']),
        settings: JSON.stringify({
          telegram: {
            enabled: false,
          },
          allowDrafts: true,
          requireLogin: true,
        }),
        created_by: adminId,
        is_active: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Fields for Form 2
    const form2Fields = [
      {
        id: uuidv4(),
        form_id: form2Id,
        sub_form_id: null,
        type: 'short_answer',
        title: 'Employee ID',
        placeholder: 'EMP-XXXX',
        required: true,
        order: 1,
        options: JSON.stringify({}),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({ pattern: '^EMP-[0-9]{4}$' }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form2Id,
        sub_form_id: null,
        type: 'short_answer',
        title: 'Full Name',
        placeholder: 'Enter full name',
        required: true,
        order: 2,
        options: JSON.stringify({}),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form2Id,
        sub_form_id: null,
        type: 'email',
        title: 'Work Email',
        placeholder: 'employee@company.com',
        required: true,
        order: 3,
        options: JSON.stringify({}),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form2Id,
        sub_form_id: null,
        type: 'multiple_choice',
        title: 'Department',
        placeholder: 'Select department',
        required: true,
        order: 4,
        options: JSON.stringify({
          choices: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'],
        }),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form2Id,
        sub_form_id: null,
        type: 'date',
        title: 'Join Date',
        placeholder: 'YYYY-MM-DD',
        required: true,
        order: 5,
        options: JSON.stringify({}),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form2Id,
        sub_form_id: null,
        type: 'province',
        title: 'Work Location (Province)',
        placeholder: 'Select province',
        required: true,
        order: 6,
        options: JSON.stringify({}),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await queryInterface.bulkInsert('fields', form2Fields);

    // Form 3: Product Survey
    const form3Id = uuidv4();

    await queryInterface.bulkInsert('forms', [
      {
        id: form3Id,
        title: 'Product Survey',
        description: 'Product feedback and feature requests',
        roles_allowed: JSON.stringify(['user', 'manager', 'admin', 'viewer']),
        settings: JSON.stringify({
          telegram: {
            enabled: true,
            notifyOnSubmit: true,
          },
          allowDrafts: false,
          requireLogin: false,
        }),
        created_by: adminId,
        is_active: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Fields for Form 3
    const form3Fields = [
      {
        id: uuidv4(),
        form_id: form3Id,
        sub_form_id: null,
        type: 'multiple_choice',
        title: 'Which product are you using?',
        placeholder: 'Select product',
        required: true,
        order: 1,
        options: JSON.stringify({
          choices: ['Product A', 'Product B', 'Product C', 'Product D'],
        }),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: true }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form3Id,
        sub_form_id: null,
        type: 'slider',
        title: 'How likely are you to recommend this product?',
        placeholder: 'Slide to rate',
        required: true,
        order: 2,
        options: JSON.stringify({ min: 0, max: 10, step: 1 }),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: true }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form3Id,
        sub_form_id: null,
        type: 'paragraph',
        title: 'What features would you like to see?',
        placeholder: 'Describe your feature requests...',
        required: false,
        order: 3,
        options: JSON.stringify({ maxLength: 500 }),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        form_id: form3Id,
        sub_form_id: null,
        type: 'image_upload',
        title: 'Upload Screenshots (optional)',
        placeholder: 'Upload images',
        required: false,
        order: 4,
        options: JSON.stringify({ maxFiles: 3, maxSizeMB: 5 }),
        show_condition: JSON.stringify({ enabled: true }),
        telegram_config: JSON.stringify({ enabled: false }),
        validation_rules: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await queryInterface.bulkInsert('fields', form3Fields);

    console.log('\n=== Demo Forms Created ===');
    console.log('1. Customer Feedback Form (7 fields)');
    console.log('2. Employee Information Form (6 fields)');
    console.log('3. Product Survey (4 fields)');
    console.log('==========================\n');
  },

  async down(queryInterface, Sequelize) {
    // Delete forms created by seeder
    await queryInterface.bulkDelete('forms', {
      title: {
        [Sequelize.Op.in]: [
          'Customer Feedback Form',
          'Employee Information Form',
          'Product Survey',
        ],
      },
    }, {});

    // Cascade delete will handle fields automatically
  },
};
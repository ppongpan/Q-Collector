/**
 * Test Sub-form Validation
 *
 * Simulates the exact validation that happens in subform.routes.js
 */

const { body, param, validationResult } = require('express-validator');

// Sample request data (from frontend logs)
const testRequests = [
  {
    name: 'Valid request',
    params: { subFormId: '194cd9d0-4cc4-4234-8d96-42f7ac402eef' },
    body: {
      parentId: '815e22a5-0dfd-43ce-b268-cc9d0566223c',
      data: {
        'field-1': 'test value',
        'field-2': 123
      }
    }
  },
  {
    name: 'Empty data object',
    params: { subFormId: '194cd9d0-4cc4-4234-8d96-42f7ac402eef' },
    body: {
      parentId: '815e22a5-0dfd-43ce-b268-cc9d0566223c',
      data: {}
    }
  },
  {
    name: 'Missing data field',
    params: { subFormId: '194cd9d0-4cc4-4234-8d96-42f7ac402eef' },
    body: {
      parentId: '815e22a5-0dfd-43ce-b268-cc9d0566223c'
    }
  },
  {
    name: 'Data is array (invalid)',
    params: { subFormId: '194cd9d0-4cc4-4234-8d96-42f7ac402eef' },
    body: {
      parentId: '815e22a5-0dfd-43ce-b268-cc9d0566223c',
      data: ['not', 'an', 'object']
    }
  }
];

// Validation rules from subform.routes.js
const validations = [
  param('subFormId')
    .isUUID()
    .withMessage('Invalid sub-form ID'),
  body('parentId')
    .isUUID()
    .withMessage('Parent submission ID is required'),
  body('data')
    .isObject()
    .withMessage('Data must be an object'),
];

async function testValidation() {
  console.log('🧪 Testing Sub-form Validation Rules\n');
  console.log('='.repeat(60));

  for (const testCase of testRequests) {
    console.log(`\n📋 Test Case: ${testCase.name}`);
    console.log('   Request params:', JSON.stringify(testCase.params));
    console.log('   Request body:', JSON.stringify(testCase.body));

    // Create mock request object
    const req = {
      params: testCase.params,
      body: testCase.body
    };

    // Run all validations
    for (const validation of validations) {
      await validation.run(req);
    }

    // Check for errors
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      console.log('   ✅ PASS - No validation errors');
    } else {
      console.log('   ❌ FAIL - Validation errors:');
      errors.array().forEach(err => {
        console.log(`      - ${err.param}: ${err.msg}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Validation test completed\n');
}

testValidation()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });

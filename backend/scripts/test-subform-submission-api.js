/**
 * Test Sub-Form Submission API
 *
 * This script tests the sub-form submission endpoint to diagnose 400 errors
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test credentials (adjust as needed)
const TEST_USER = {
  identifier: 'pongpanp',
  password: 'Gfvtmiu613'
};

async function testSubFormSubmissionAPI() {
  let token;

  try {
    console.log('🔐 Step 1: Login...\n');

    // Login to get token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    token = loginResponse.data.data?.token || loginResponse.data.token;

    if (!token) {
      console.log('Login response structure:', JSON.stringify(loginResponse.data, null, 2));
      throw new Error('No token received from login');
    }

    console.log('✅ Login successful');
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...\n');

    // Setup axios instance with auth header
    const api = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📋 Step 2: Find a form with sub-forms...\n');

    // Get all forms
    const formsResponse = await api.get('/forms');
    const forms = formsResponse.data.data.forms || formsResponse.data.data;

    console.log(`Found ${forms.length} forms`);

    // Find a form with sub-forms
    let formWithSubForm = null;
    let subForm = null;

    for (const form of forms) {
      const formDetail = await api.get(`/forms/${form.id}`);
      const formData = formDetail.data.data?.form || formDetail.data.data;

      if (formData.subForms && formData.subForms.length > 0) {
        formWithSubForm = formData;
        subForm = formData.subForms[0];
        console.log(`\n✅ Found form with sub-form:`);
        console.log(`   Form: "${formData.title}" (${formData.id})`);
        console.log(`   SubForm: "${subForm.title}" (${subForm.id})`);
        console.log(`   SubForm fields: ${subForm.fields?.length || 0}`);
        break;
      }
    }

    if (!formWithSubForm || !subForm) {
      console.log('❌ No form with sub-forms found. Please create one first.');
      return;
    }

    console.log('\n📝 Step 3: Create a parent submission...\n');

    // Prepare main form data
    const mainFormData = {};
    const mainFields = formWithSubForm.fields?.filter(f => !f.subFormId && !f.sub_form_id) || [];

    console.log(`Main form has ${mainFields.length} fields`);

    for (const field of mainFields) {
      // Provide test data based on field type
      switch (field.type) {
        case 'short_answer':
        case 'email':
        case 'url':
        case 'paragraph':
          mainFormData[field.id] = 'Test value for ' + field.title;
          break;
        case 'number':
          mainFormData[field.id] = 123;
          break;
        case 'phone':
          mainFormData[field.id] = '081-234-5678';
          break;
        case 'date':
          mainFormData[field.id] = '2025-10-09';
          break;
        case 'multiple_choice':
          mainFormData[field.id] = field.options?.[0] || 'Option 1';
          break;
        default:
          mainFormData[field.id] = 'test';
      }
    }

    console.log('Main form data prepared:', Object.keys(mainFormData).length, 'fields');

    // Create parent submission
    const submissionResponse = await api.post(`/forms/${formWithSubForm.id}/submit`, {
      formData: mainFormData,
      status: 'submitted'
    });

    const parentSubmission = submissionResponse.data.data?.submission || submissionResponse.data.data;
    console.log(`✅ Parent submission created: ${parentSubmission.id}\n`);

    console.log('📝 Step 4: Create sub-form submission...\n');

    // Prepare sub-form data
    const subFormData = {};
    const subFormFields = subForm.fields || [];

    console.log(`Sub-form has ${subFormFields.length} fields:`);
    subFormFields.forEach(f => {
      console.log(`   - ${f.title} (${f.type})`);
    });

    for (const field of subFormFields) {
      // Provide test data based on field type
      switch (field.type) {
        case 'short_answer':
        case 'email':
        case 'url':
        case 'paragraph':
          subFormData[field.id] = 'SubForm test value for ' + field.title;
          break;
        case 'number':
          subFormData[field.id] = 456;
          break;
        case 'phone':
          subFormData[field.id] = '089-876-5432';
          break;
        case 'date':
          subFormData[field.id] = '2025-10-10';
          break;
        case 'multiple_choice':
          subFormData[field.id] = field.options?.[0] || 'Option 1';
          break;
        default:
          subFormData[field.id] = 'test';
      }
    }

    console.log('\nSub-form data prepared:', Object.keys(subFormData).length, 'fields');
    console.log('Request payload:');
    console.log(JSON.stringify({
      parentId: parentSubmission.id,
      data: subFormData
    }, null, 2));

    // Create sub-form submission
    console.log(`\n🚀 Sending POST to /subforms/${subForm.id}/submissions\n`);

    const subFormSubmissionResponse = await api.post(
      `/subforms/${subForm.id}/submissions`,
      {
        parentId: parentSubmission.id,
        data: subFormData
      }
    );

    const subFormSubmission = subFormSubmissionResponse.data.data?.submission || subFormSubmissionResponse.data.data;
    console.log('✅ Sub-form submission created:', subFormSubmission.id);

    console.log('\n✅ All tests passed!\n');
    console.log('Summary:');
    console.log(`  Form: ${formWithSubForm.title}`);
    console.log(`  Parent Submission: ${parentSubmission.id}`);
    console.log(`  SubForm: ${subForm.title}`);
    console.log(`  SubForm Submission: ${subFormSubmission.id}`);

  } catch (error) {
    console.error('\n❌ Test failed:');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2));

      // Show detailed validation errors if available
      if (error.response.data.details) {
        console.error('\nValidation errors:');
        error.response.data.details.forEach(err => {
          console.error(`  - ${err.param}: ${err.msg}`);
        });
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

testSubFormSubmissionAPI()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script error:', error.message);
    process.exit(1);
  });

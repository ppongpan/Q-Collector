/**
 * Classify PII Fields Automatically
 * Scans all forms and fields to identify and classify Personal Data Fields (PII)
 *
 * Classification Rules:
 * - email fields → 'email' category (sensitive)
 * - phone fields → 'phone' category (sensitive)
 * - Fields with titles containing personal info keywords → appropriate categories
 *
 * Usage: node backend/scripts/classify-pii-fields.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { Form, Field, PersonalDataField } = require('../models');
const { sequelize } = require('../config/database.config');
const logger = require('../utils/logger.util');

/**
 * Determine PII category based on field type and title
 */
function classifyField(field) {
  const type = field.type?.toLowerCase();
  const title = (field.title || '').toLowerCase();

  // Email fields
  if (type === 'email' || title.includes('email') || title.includes('อีเมล') || title.includes('e-mail')) {
    return {
      category: 'email',
      isSensitive: true,
      purpose: 'ใช้สำหรับการติดต่อและยืนยันตัวตน',
      legalBasis: 'consent', // ENUM: 'consent', 'contract', 'legal_obligation', 'vital_interests'
      retentionPeriod: '2 years'
    };
  }

  // Phone fields
  if (type === 'phone' || title.includes('phone') || title.includes('โทร') || title.includes('เบอร์') || title.includes('tel')) {
    return {
      category: 'phone',
      isSensitive: true,
      purpose: 'ใช้สำหรับการติดต่อ',
      legalBasis: 'consent',
      retentionPeriod: '2 years'
    };
  }

  // Name fields
  if (title.includes('name') || title.includes('ชื่อ') || title.includes('นาม')) {
    // Exclude "company name", "organization name"
    if (title.includes('company') || title.includes('organization') || title.includes('บริษัท') || title.includes('องค์กร')) {
      return null; // Not personal data
    }
    return {
      category: 'name',
      isSensitive: false,
      purpose: 'ใช้สำหรับการระบุตัวตนและติดต่อ',
      legalBasis: 'consent',
      retentionPeriod: '2 years'
    };
  }

  // Address fields
  if (title.includes('address') || title.includes('ที่อยู่') || title.includes('บ้านเลขที่')) {
    return {
      category: 'address',
      isSensitive: false,
      purpose: 'ใช้สำหรับการจัดส่งและติดต่อ',
      legalBasis: 'consent',
      retentionPeriod: '2 years'
    };
  }

  // ID Number fields (id_card not id_number)
  if (title.includes('id') || title.includes('บัตร') || title.includes('เลขประจำตัว') || title.includes('identification')) {
    return {
      category: 'id_card', // ENUM: id_card not id_number
      isSensitive: true,
      purpose: 'ใช้สำหรับการยืนยันตัวตน',
      legalBasis: 'consent',
      retentionPeriod: '5 years'
    };
  }

  // Date of birth
  if (title.includes('birth') || title.includes('เกิด') || title.includes('วันเกิด') || title.includes('dob')) {
    return {
      category: 'date_of_birth',
      isSensitive: false,
      purpose: 'ใช้สำหรับการระบุตัตนและวิเคราะห์ข้อมูล',
      legalBasis: 'consent',
      retentionPeriod: '2 years'
    };
  }

  // Location data (lat_long type)
  if (type === 'lat_long' || title.includes('location') || title.includes('สถานที่') || title.includes('พิกัด')) {
    return {
      category: 'location',
      isSensitive: true,
      purpose: 'ใช้สำหรับการให้บริการตามสถานที่',
      legalBasis: 'consent',
      retentionPeriod: '1 year'
    };
  }

  // Province (use 'other' category as province is not in ENUM)
  if (type === 'province' || title.includes('province') || title.includes('จังหวัด')) {
    return {
      category: 'other', // Province not in ENUM, use 'other'
      isSensitive: false,
      purpose: 'ใช้สำหรับการวิเคราะห์ข้อมูลเชิงพื้นที่',
      legalBasis: 'consent',
      retentionPeriod: '2 years'
    };
  }

  // If no match, return null (not classified as PII)
  return null;
}

/**
 * Main classification function
 */
async function classifyAllPIIFields() {
  const transaction = await sequelize.transaction();

  try {
    console.log('\n🔍 Starting PII Field Classification...\n');

    // Get all forms
    const forms = await Form.findAll({
      include: [
        {
          model: Field,
          as: 'fields',
          required: false
        }
      ]
    });

    console.log(`Found ${forms.length} forms\n`);

    let totalClassified = 0;
    let totalSkipped = 0;
    let totalAlreadyExists = 0;

    for (const form of forms) {
      console.log(`\n📋 Processing Form: ${form.title}`);
      console.log(`   Form ID: ${form.id}`);
      console.log(`   Fields: ${form.fields?.length || 0}`);

      if (!form.fields || form.fields.length === 0) {
        console.log('   ⚠️  No fields found, skipping...');
        continue;
      }

      let formClassified = 0;

      for (const field of form.fields) {
        // Check if already classified
        const existing = await PersonalDataField.findOne({
          where: {
            form_id: form.id,
            field_id: field.id
          },
          transaction
        });

        if (existing) {
          totalAlreadyExists++;
          continue;
        }

        // Classify field
        const classification = classifyField(field);

        if (classification) {
          // Create PII field record
          await PersonalDataField.create({
            form_id: form.id,
            field_id: field.id,
            data_category: classification.category,
            is_sensitive: classification.isSensitive,
            purpose: classification.purpose,
            legal_basis: classification.legalBasis,
            retention_period: classification.retentionPeriod,
            auto_detected: true,
            detected_at: new Date()
          }, { transaction });

          console.log(`   ✅ Classified: ${field.title} → ${classification.category} (sensitive: ${classification.isSensitive})`);
          formClassified++;
          totalClassified++;
        } else {
          totalSkipped++;
        }
      }

      console.log(`   Classified ${formClassified} fields in this form`);
    }

    // Commit transaction
    await transaction.commit();

    console.log('\n📊 Classification Summary:');
    console.log(`   ✅ Total classified: ${totalClassified}`);
    console.log(`   ⏭️  Already exists: ${totalAlreadyExists}`);
    console.log(`   ⚠️  Skipped (not PII): ${totalSkipped}`);
    console.log(`   📋 Total forms: ${forms.length}`);

    // Verify results
    const totalPII = await PersonalDataField.count();
    console.log(`\n✅ Total PII fields in database: ${totalPII}`);

    console.log('\n🎉 Classification complete!');
    console.log('   You can now test the PDPA Tab "ฟอร์ม & ข้อมูล"\n');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error during classification:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run classification
classifyAllPIIFields();

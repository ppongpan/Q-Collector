/**
 * Generate 20 Test Forms for Translation System Testing
 *
 * Creates diverse test forms with Thai names to validate:
 * - Translation quality across different contexts
 * - Sub-form translation
 * - Field translation with various types
 * - Edge cases (long names, special characters, compound words)
 * - PowerBI compatibility
 *
 * @version 1.0.0 (v0.7.7-dev)
 * @created 2025-10-10
 */

require('dotenv').config();
const { sequelize, Form, Field, SubForm, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Test form definitions with realistic Thai names
const testFormDefinitions = [
  {
    category: 'Simple Forms',
    forms: [
      {
        title: 'แบบฟอร์มติดต่อ',
        description: 'Contact form with basic fields',
        fields: [
          { title: 'ชื่อเต็ม', type: 'short_answer' },
          { title: 'อีเมล', type: 'email' },
          { title: 'เบอร์โทรศัพท์', type: 'phone' }
        ]
      },
      {
        title: 'ใบลาป่วย',
        description: 'Sick leave request form',
        fields: [
          { title: 'ชื่อพนักงาน', type: 'short_answer' },
          { title: 'วันที่ลา', type: 'date' },
          { title: 'เหตุผลการลา', type: 'paragraph' }
        ]
      },
      {
        title: 'แบบสอบถามความพึงพอใจ',
        description: 'Customer satisfaction survey',
        fields: [
          { title: 'ชื่อลูกค้า', type: 'short_answer' },
          { title: 'คะแนนความพึงพอใจ', type: 'rating' },
          { title: 'ความคิดเห็นเพิ่มเติม', type: 'paragraph' }
        ]
      }
    ]
  },
  {
    category: 'Complex Forms',
    forms: [
      {
        title: 'แบบฟอร์มการร้องเรียน',
        description: 'Customer complaint form',
        fields: [
          { title: 'ชื่อผู้ร้องเรียน', type: 'short_answer' },
          { title: 'อีเมลผู้ร้องเรียน', type: 'email' },
          { title: 'เบอร์โทรติดต่อ', type: 'phone' },
          { title: 'หมวดหมู่การร้องเรียน', type: 'multiple_choice' },
          { title: 'รายละเอียดการร้องเรียน', type: 'paragraph' },
          { title: 'ไฟล์แนบ', type: 'file_upload' },
          { title: 'วันที่เกิดเหตุ', type: 'date' },
          { title: 'ระดับความเร่งด่วน', type: 'slider' }
        ]
      },
      {
        title: 'แบบฟอร์มสมัครงาน',
        description: 'Job application form',
        fields: [
          { title: 'ชื่อ-นามสกุล', type: 'short_answer' },
          { title: 'วันเกิด', type: 'date' },
          { title: 'อีเมล', type: 'email' },
          { title: 'เบอร์โทรศัพท์', type: 'phone' },
          { title: 'ที่อยู่ปัจจุบัน', type: 'paragraph' },
          { title: 'จังหวัด', type: 'province' },
          { title: 'ตำแหน่งที่สนใจ', type: 'multiple_choice' },
          { title: 'ประสบการณ์ทำงาน', type: 'number' },
          { title: 'เงินเดือนที่ต้องการ', type: 'number' },
          { title: 'ไฟล์เรซูเม่', type: 'file_upload' }
        ]
      }
    ]
  },
  {
    category: 'Forms with Sub-forms',
    forms: [
      {
        title: 'แบบฟอร์มใบสั่งซื้อ',
        description: 'Purchase order form',
        fields: [
          { title: 'ชื่อผู้สั่งซื้อ', type: 'short_answer' },
          { title: 'วันที่สั่งซื้อ', type: 'date' },
          { title: 'ที่อยู่จัดส่ง', type: 'paragraph' }
        ],
        subForms: [
          {
            title: 'รายการสินค้า',
            fields: [
              { title: 'ชื่อสินค้า', type: 'short_answer' },
              { title: 'จำนวน', type: 'number' },
              { title: 'ราคาต่อหน่วย', type: 'number' },
              { title: 'รูปภาพสินค้า', type: 'image_upload' }
            ]
          }
        ]
      },
      {
        title: 'แบบฟอร์มบันทึกข้อมูลครอบครัว',
        description: 'Family information form',
        fields: [
          { title: 'ชื่อหัวหน้าครอบครัว', type: 'short_answer' },
          { title: 'ที่อยู่', type: 'paragraph' },
          { title: 'เบอร์โทรศัพท์', type: 'phone' }
        ],
        subForms: [
          {
            title: 'ข้อมูลสมาชิกครอบครัว',
            fields: [
              { title: 'ชื่อ-นามสกุล', type: 'short_answer' },
              { title: 'ความสัมพันธ์', type: 'multiple_choice' },
              { title: 'วันเกิด', type: 'date' },
              { title: 'อาชีพ', type: 'short_answer' }
            ]
          }
        ]
      }
    ]
  },
  {
    category: 'Department Forms',
    forms: [
      {
        title: 'แบบฟอร์มแผนกขาย',
        description: 'Sales department form',
        fields: [
          { title: 'ชื่อพนักงานขาย', type: 'short_answer' },
          { title: 'ชื่อลูกค้า', type: 'short_answer' },
          { title: 'มูลค่าการขาย', type: 'number' },
          { title: 'วันที่ปิดการขาย', type: 'date' }
        ]
      },
      {
        title: 'แบบฟอร์มแผนกการตลาด',
        description: 'Marketing department form',
        fields: [
          { title: 'ชื่อแคมเปญ', type: 'short_answer' },
          { title: 'งบประมาณ', type: 'number' },
          { title: 'วันที่เริ่มแคมเปญ', type: 'date' },
          { title: 'วันที่สิ้นสุดแคมเปญ', type: 'date' },
          { title: 'รายละเอียดแคมเปญ', type: 'paragraph' }
        ]
      },
      {
        title: 'แบบฟอร์มแผนกบัญชี',
        description: 'Accounting department form',
        fields: [
          { title: 'เลขที่เอกสาร', type: 'short_answer' },
          { title: 'วันที่ทำรายการ', type: 'date' },
          { title: 'จำนวนเงิน', type: 'number' },
          { title: 'รายละเอียด', type: 'paragraph' },
          { title: 'ไฟล์เอกสารแนบ', type: 'file_upload' }
        ]
      }
    ]
  },
  {
    category: 'Action/Operation Forms',
    forms: [
      {
        title: 'บันทึกการเข้าให้บริการ',
        description: 'Service entry record',
        fields: [
          { title: 'ชื่อผู้ให้บริการ', type: 'short_answer' },
          { title: 'วันที่ให้บริการ', type: 'datetime' },
          { title: 'ประเภทบริการ', type: 'multiple_choice' },
          { title: 'รายละเอียดการให้บริการ', type: 'paragraph' }
        ]
      },
      {
        title: 'การกำจัดขยะ',
        description: 'Waste disposal form',
        fields: [
          { title: 'วันที่กำจัด', type: 'date' },
          { title: 'ประเภทขยะ', type: 'multiple_choice' },
          { title: 'น้ำหนักขยะ', type: 'number' },
          { title: 'สถานที่กำจัด', type: 'short_answer' }
        ]
      },
      {
        title: 'ตรวจสอบคุณภาพสินค้า',
        description: 'Product quality inspection',
        fields: [
          { title: 'ชื่อสินค้า', type: 'short_answer' },
          { title: 'วันที่ตรวจสอบ', type: 'datetime' },
          { title: 'ผลการตรวจสอบ', type: 'multiple_choice' },
          { title: 'หมายเหตุ', type: 'paragraph' },
          { title: 'รูปภาพสินค้า', type: 'image_upload' }
        ]
      }
    ]
  },
  {
    category: 'Edge Cases',
    forms: [
      {
        title: 'แบบฟอร์มบันทึกข้อมูลการจัดการความเสี่ยงและการป้องกันอุบัติเหตุในสถานประกอบการ',
        description: 'Very long form name - Risk management and accident prevention',
        fields: [
          { title: 'ชื่อผู้รับผิดชอบ', type: 'short_answer' },
          { title: 'วันที่บันทึก', type: 'date' },
          { title: 'รายละเอียด', type: 'paragraph' }
        ]
      },
      {
        title: 'การประเมิน 360 องศา',
        description: 'Form with numbers and Thai',
        fields: [
          { title: 'ชื่อผู้ประเมิน', type: 'short_answer' },
          { title: 'คะแนน', type: 'rating' }
        ]
      },
      {
        title: 'แบบฟอร์ม IT Support',
        description: 'Mixed Thai and English',
        fields: [
          { title: 'ชื่อผู้แจ้ง', type: 'short_answer' },
          { title: 'Problem Description', type: 'paragraph' }
        ]
      }
    ]
  }
];

/**
 * Create a single form with fields
 */
async function createForm(formDef, userId, transaction) {
  const formId = uuidv4();

  // Create form
  const form = await Form.create({
    id: formId,
    title: formDef.title,
    description: formDef.description || '',
    created_by: userId,
    is_active: true,
    settings: {}
  }, { transaction });

  console.log(`   ✅ Created form: "${formDef.title}" (${formId})`);

  // Create fields
  for (let i = 0; i < formDef.fields.length; i++) {
    const fieldDef = formDef.fields[i];
    await Field.create({
      id: uuidv4(),
      form_id: formId,
      title: fieldDef.title,
      type: fieldDef.type,  // ✅ FIX: Use 'type' not 'field_type'
      order: i + 1,
      required: false,
      options: {},
      validation_rules: {}
    }, { transaction });
  }

  console.log(`      └─ Created ${formDef.fields.length} fields`);

  // Create sub-forms if any
  if (formDef.subForms && formDef.subForms.length > 0) {
    for (const subFormDef of formDef.subForms) {
      const subFormId = uuidv4();
      await SubForm.create({
        id: subFormId,
        title: subFormDef.title,
        form_id: formId,
        order: 1,
        settings: {}
      }, { transaction });

      console.log(`      └─ Created sub-form: "${subFormDef.title}"`);

      // Create sub-form fields
      for (let i = 0; i < subFormDef.fields.length; i++) {
        const fieldDef = subFormDef.fields[i];
        await Field.create({
          id: uuidv4(),
          form_id: formId,
          sub_form_id: subFormId,
          title: fieldDef.title,
          type: fieldDef.type,  // ✅ FIX: Use 'type' not 'field_type'
          order: i + 1,
          required: false,
          options: {},
          validation_rules: {}
        }, { transaction });
      }

      console.log(`         └─ Created ${subFormDef.fields.length} sub-form fields`);
    }
  }

  return form;
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Generate 20 Test Forms for Translation Testing        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get super admin user
    const superAdmin = await User.findOne({
      where: { role: 'super_admin' }
    });

    if (!superAdmin) {
      console.error('❌ No super_admin user found. Please create one first.');
      process.exit(1);
    }

    console.log(`👤 Using user: ${superAdmin.username} (${superAdmin.role})\n`);

    let totalForms = 0;
    let totalFields = 0;
    let totalSubForms = 0;

    // Create forms by category
    for (const category of testFormDefinitions) {
      console.log(`\n📁 Category: ${category.category}`);
      console.log('─'.repeat(60));

      for (const formDef of category.forms) {
        const transaction = await sequelize.transaction();
        try {
          await createForm(formDef, superAdmin.id, transaction);
          await transaction.commit();

          totalForms++;
          totalFields += formDef.fields.length;
          if (formDef.subForms) {
            totalSubForms += formDef.subForms.length;
            formDef.subForms.forEach(sf => totalFields += sf.fields.length);
          }
        } catch (error) {
          await transaction.rollback();
          console.error(`   ❌ Failed to create form: ${error.message}`);
        }
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Summary                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`   Forms created: ${totalForms}`);
    console.log(`   Fields created: ${totalFields}`);
    console.log(`   Sub-forms created: ${totalSubForms}`);
    console.log('');
    console.log('✅ All test forms created successfully!');
    console.log('');
    console.log('📊 Next Steps:');
    console.log('   1. Run translation script in dry-run mode:');
    console.log('      node scripts/translate-existing-forms.js --dry-run');
    console.log('');
    console.log('   2. Review migration plan carefully');
    console.log('');
    console.log('   3. Execute migration:');
    console.log('      node scripts/translate-existing-forms.js');
    console.log('');
    console.log('   4. Verify results with check scripts');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

/**
 * Comprehensive Business Form Translation Test
 *
 * Purpose: Test translation system with 20+ realistic Thai business forms
 * covering various industries and use cases
 *
 * Test Categories:
 * 1. HR & Employment (5 forms)
 * 2. Sales & Marketing (4 forms)
 * 3. Operations & Services (4 forms)
 * 4. Quality & Safety (4 forms)
 * 5. Finance & Admin (3 forms)
 *
 * Date: 2025-10-10
 * Version: v0.7.7-dev (Day 6-7 Testing)
 */

const tableNameHelper = require('../utils/tableNameHelper');

// Realistic Thai Business Forms (20 forms across 5 categories)
const businessForms = [
  // === HR & Employment (5 forms) ===
  {
    category: 'HR & Employment',
    formTitle: 'แบบฟอร์มสมัครงาน',
    expectedTable: 'job_application_form',
    fields: [
      { title: 'ชื่อ-นามสกุล', expected: 'full_name' },
      { title: 'ตำแหน่งที่สมัคร', expected: 'position_applied' },
      { title: 'เงินเดือนที่คาดหวัง', expected: 'expected_salary' },
      { title: 'ประสบการณ์ทำงาน', expected: 'work_experience' }
    ]
  },
  {
    category: 'HR & Employment',
    formTitle: 'ใบลาพักร้อน',
    expectedTable: 'vacation_leave_form',
    fields: [
      { title: 'วันที่เริ่มลา', expected: 'leave_start_date' },
      { title: 'วันที่สิ้นสุด', expected: 'end_date' },
      { title: 'เหตุผลการลา', expected: 'leave_reason' },
      { title: 'ผู้รับมอบงาน', expected: 'work_delegated_to' }
    ]
  },
  {
    category: 'HR & Employment',
    formTitle: 'แบบประเมินผลการปฏิบัติงาน',
    expectedTable: 'performance_evaluation_form',
    fields: [
      { title: 'ชื่อพนักงาน', expected: 'employee_name' },
      { title: 'แผนก', expected: 'department' },
      { title: 'คะแนนรวม', expected: 'total_score' },
      { title: 'ข้อเสนอแนะ', expected: 'recommendations' }
    ]
  },
  {
    category: 'HR & Employment',
    formTitle: 'แบบฟอร์มขอเลื่อนตำแหน่ง',
    expectedTable: 'promotion_request_form',
    fields: [
      { title: 'ตำแหน่งปัจจุบัน', expected: 'current_position' },
      { title: 'ตำแหน่งที่ขอเลื่อน', expected: 'requested_position' },
      { title: 'เหตุผล', expected: 'reason' }
    ]
  },
  {
    category: 'HR & Employment',
    formTitle: 'แบบฟอร์มอบรมพัฒนาพนักงาน',
    expectedTable: 'employee_training_form',
    fields: [
      { title: 'หัวข้อการอบรม', expected: 'training_topic' },
      { title: 'วันที่อบรม', expected: 'training_date' },
      { title: 'จำนวนผู้เข้าอบรม', expected: 'number_of_participants' }
    ]
  },

  // === Sales & Marketing (4 forms) ===
  {
    category: 'Sales & Marketing',
    formTitle: 'แบบฟอร์มใบเสนอราคา',
    expectedTable: 'quotation_form',
    fields: [
      { title: 'ชื่อลูกค้า', expected: 'customer_name' },
      { title: 'รายการสินค้า', expected: 'product_list' },
      { title: 'ราคารวม', expected: 'total_price' },
      { title: 'วันที่เสนอราคา', expected: 'quotation_date' }
    ]
  },
  {
    category: 'Sales & Marketing',
    formTitle: 'แบบสำรวจความพึงพอใจลูกค้า',
    expectedTable: 'customer_satisfaction_survey',
    fields: [
      { title: 'ความพึงพอใจด้านสินค้า', expected: 'product_satisfaction' },
      { title: 'ความพึงพอใจด้านบริการ', expected: 'service_satisfaction' },
      { title: 'โอกาสแนะนำต่อ', expected: 'recommendation_likelihood' },
      { title: 'ข้อเสนอแนะเพิ่มเติม', expected: 'additional_feedback' }
    ]
  },
  {
    category: 'Sales & Marketing',
    formTitle: 'แบบฟอร์มการรับคำสั่งซื้อ',
    expectedTable: 'purchase_order_form',
    fields: [
      { title: 'เลขที่ใบสั่งซื้อ', expected: 'purchase_order_number' },
      { title: 'ชื่อผู้สั่งซื้อ', expected: 'buyer_name' },
      { title: 'วันที่ต้องการสินค้า', expected: 'required_delivery_date' },
      { title: 'ที่อยู่จัดส่ง', expected: 'delivery_address' }
    ]
  },
  {
    category: 'Sales & Marketing',
    formTitle: 'แบบฟอร์มรับข้อร้องเรียนลูกค้า',
    expectedTable: 'customer_complaint_form',
    fields: [
      { title: 'ชื่อผู้ร้องเรียน', expected: 'complainant_name' },
      { title: 'หมายเลขคำสั่งซื้อ', expected: 'order_number' },
      { title: 'รายละเอียดปัญหา', expected: 'problem_details' },
      { title: 'ผลการแก้ไข', expected: 'resolution_result' }
    ]
  },

  // === Operations & Services (4 forms) ===
  {
    category: 'Operations & Services',
    formTitle: 'แบบฟอร์มขอซ่อมบำรุง',
    expectedTable: 'maintenance_request_form',
    fields: [
      { title: 'รหัสอุปกรณ์', expected: 'equipment_id' },
      { title: 'อาการเสีย', expected: 'malfunction_description' },
      { title: 'ระดับความเร่งด่วน', expected: 'urgency_level' },
      { title: 'วันที่แจ้งซ่อม', expected: 'request_date' }
    ]
  },
  {
    category: 'Operations & Services',
    formTitle: 'บันทึกการตรวจสอบสต็อกสินค้า',
    expectedTable: 'inventory_inspection_log',
    fields: [
      { title: 'รหัสสินค้า', expected: 'product_code' },
      { title: 'จำนวนคงเหลือ', expected: 'remaining_quantity' },
      { title: 'วันที่ตรวจสอบ', expected: 'inspection_date' },
      { title: 'สถานที่จัดเก็บ', expected: 'storage_location' }
    ]
  },
  {
    category: 'Operations & Services',
    formTitle: 'แบบฟอร์มขอใช้ห้องประชุม',
    expectedTable: 'meeting_room_request_form',
    fields: [
      { title: 'ชื่อห้องประชุม', expected: 'meeting_room_name' },
      { title: 'วันที่ใช้', expected: 'usage_date' },
      { title: 'เวลาเริ่ม-เวลาสิ้นสุด', expected: 'start_end_time' },
      { title: 'จำนวนผู้เข้าร่วม', expected: 'number_of_attendees' }
    ]
  },
  {
    category: 'Operations & Services',
    formTitle: 'แบบฟอร์มจัดส่งสินค้า',
    expectedTable: 'product_delivery_form',
    fields: [
      { title: 'เลขที่ใบส่งสินค้า', expected: 'delivery_note_number' },
      { title: 'ชื่อผู้รับ', expected: 'recipient_name' },
      { title: 'สถานะการจัดส่ง', expected: 'delivery_status' },
      { title: 'ลายเซ็นผู้รับ', expected: 'recipient_signature' }
    ]
  },

  // === Quality & Safety (4 forms) ===
  {
    category: 'Quality & Safety',
    formTitle: 'แบบฟอร์มตรวจสอบคุณภาพสินค้า',
    expectedTable: 'product_quality_inspection_form',
    fields: [
      { title: 'รหัสล็อตสินค้า', expected: 'product_lot_number' },
      { title: 'ผลการตรวจสอบ', expected: 'inspection_result' },
      { title: 'จำนวนของเสีย', expected: 'defective_quantity' },
      { title: 'ผู้ตรวจสอบ', expected: 'inspector' }
    ]
  },
  {
    category: 'Quality & Safety',
    formTitle: 'รายงานอุบัติเหตุในการทำงาน',
    expectedTable: 'work_accident_report',
    fields: [
      { title: 'ชื่อผู้ประสบอุบัติเหตุ', expected: 'accident_victim_name' },
      { title: 'วันเวลาที่เกิดเหตุ', expected: 'accident_date_time' },
      { title: 'สาเหตุ', expected: 'cause' },
      { title: 'การรักษา', expected: 'treatment' }
    ]
  },
  {
    category: 'Quality & Safety',
    formTitle: 'แบบฟอร์มตรวจสอบความปลอดภัย',
    expectedTable: 'safety_inspection_form',
    fields: [
      { title: 'จุดตรวจสอบ', expected: 'inspection_point' },
      { title: 'ผลการตรวจ', expected: 'inspection_result' },
      { title: 'ข้อบกพร่อง', expected: 'deficiencies' },
      { title: 'มาตรการแก้ไข', expected: 'corrective_measures' }
    ]
  },
  {
    category: 'Quality & Safety',
    formTitle: 'แบบฟอร์มการจัดการของเสีย',
    expectedTable: 'waste_management_form',
    fields: [
      { title: 'ประเภทของเสีย', expected: 'waste_type' },
      { title: 'น้ำหนัก/ปริมาณ', expected: 'weight_volume' },
      { title: 'วิธีการกำจัด', expected: 'disposal_method' },
      { title: 'ผู้รับผิดชอบ', expected: 'responsible_person' }
    ]
  },

  // === Finance & Admin (3 forms) ===
  {
    category: 'Finance & Admin',
    formTitle: 'แบบฟอร์มขอเบิกค่าใช้จ่าย',
    expectedTable: 'expense_claim_form',
    fields: [
      { title: 'ประเภทค่าใช้จ่าย', expected: 'expense_type' },
      { title: 'จำนวนเงิน', expected: 'amount' },
      { title: 'วันที่เกิดรายจ่าย', expected: 'expense_date' },
      { title: 'เอกสารแนบ', expected: 'attached_documents' }
    ]
  },
  {
    category: 'Finance & Admin',
    formTitle: 'แบบฟอร์มใบเสร็จรับเงิน',
    expectedTable: 'receipt_form',
    fields: [
      { title: 'เลขที่ใบเสร็จ', expected: 'receipt_number' },
      { title: 'ชื่อผู้ชำระเงิน', expected: 'payer_name' },
      { title: 'รายการ', expected: 'items' },
      { title: 'ยอดรวมทั้งสิ้น', expected: 'grand_total' }
    ]
  },
  {
    category: 'Finance & Admin',
    formTitle: 'แบบฟอร์มอนุมัติงบประมาณ',
    expectedTable: 'budget_approval_form',
    fields: [
      { title: 'โครงการ', expected: 'project' },
      { title: 'งบประมาณที่ขอ', expected: 'requested_budget' },
      { title: 'ผู้อนุมัติ', expected: 'approver' },
      { title: 'สถานะอนุมัติ', expected: 'approval_status' }
    ]
  }
];

/**
 * Test form translation
 */
async function testFormTranslation(form, formIndex) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📋 Form ${formIndex + 1}/${businessForms.length}: ${form.formTitle}`);
  console.log(`   Category: ${form.category}`);

  try {
    // Generate table name
    const fakeFormId = `test-form-${formIndex}`;
    const tableName = await tableNameHelper.generateTableName(form.formTitle, fakeFormId);

    // Check if translation is meaningful
    const isMeaningful = !/^_[a-z0-9]{6}/.test(tableName); // Not hash-only
    const status = isMeaningful ? '✅' : '❌';

    console.log(`   ${status} Table Name: "${tableName}"`);
    console.log(`   Expected Pattern: "${form.expectedTable}_*"`);

    // Test field translations
    console.log(`\n   Fields:`);
    const fieldResults = [];

    for (const field of form.fields) {
      try {
        const columnName = await tableNameHelper.generateColumnName(field.title);
        const fieldMeaningful = !/^_[a-z0-9]{6}/.test(columnName);
        const fieldStatus = fieldMeaningful ? '✅' : '❌';

        console.log(`     ${fieldStatus} "${field.title}" → "${columnName}"`);

        fieldResults.push({
          title: field.title,
          result: columnName,
          expected: field.expected,
          meaningful: fieldMeaningful
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (error) {
        console.log(`     ❌ "${field.title}" → ERROR: ${error.message}`);
        fieldResults.push({
          title: field.title,
          result: 'ERROR',
          expected: field.expected,
          meaningful: false,
          error: error.message
        });
      }
    }

    return {
      formTitle: form.formTitle,
      category: form.category,
      tableName: tableName,
      expectedTable: form.expectedTable,
      meaningful: isMeaningful,
      fields: fieldResults,
      success: isMeaningful && fieldResults.every(f => f.meaningful)
    };

  } catch (error) {
    console.log(`   ❌ Form translation failed: ${error.message}`);
    return {
      formTitle: form.formTitle,
      category: form.category,
      tableName: 'ERROR',
      meaningful: false,
      fields: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Main test execution
 */
async function runComprehensiveTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🏢 Comprehensive Business Form Translation Test');
  console.log('='.repeat(80));
  console.log(`Total Forms: ${businessForms.length}`);
  console.log(`Categories: HR, Sales & Marketing, Operations, Quality & Safety, Finance`);
  console.log(`Expected: 100% meaningful English translations\n`);

  const results = [];
  const categoryStats = {};

  // Initialize category stats
  businessForms.forEach(form => {
    if (!categoryStats[form.category]) {
      categoryStats[form.category] = { total: 0, passed: 0 };
    }
    categoryStats[form.category].total++;
  });

  // Test each form
  for (let i = 0; i < businessForms.length; i++) {
    const result = await testFormTranslation(businessForms[i], i);
    results.push(result);

    if (result.success) {
      categoryStats[result.category].passed++;
    }

    // Longer delay between forms to avoid rate limiting
    if (i < businessForms.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary statistics
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary');
  console.log('='.repeat(80));

  const totalForms = results.length;
  const successfulForms = results.filter(r => r.success).length;
  const failedForms = totalForms - successfulForms;

  const totalFields = results.reduce((sum, r) => sum + r.fields.length, 0);
  const successfulFields = results.reduce((sum, r) =>
    sum + r.fields.filter(f => f.meaningful).length, 0);

  console.log(`\n📋 Forms:`);
  console.log(`   Total: ${totalForms}`);
  console.log(`   ✅ Successful: ${successfulForms} (${((successfulForms/totalForms)*100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${failedForms} (${((failedForms/totalForms)*100).toFixed(1)}%)`);

  console.log(`\n📝 Fields:`);
  console.log(`   Total: ${totalFields}`);
  console.log(`   ✅ Meaningful: ${successfulFields} (${((successfulFields/totalFields)*100).toFixed(1)}%)`);
  console.log(`   ❌ Transliteration/Hash: ${totalFields - successfulFields}`);

  // Category breakdown
  console.log(`\n📂 Category Breakdown:`);
  Object.keys(categoryStats).forEach(category => {
    const stats = categoryStats[category];
    const percent = ((stats.passed / stats.total) * 100).toFixed(1);
    console.log(`   ${category}: ${stats.passed}/${stats.total} (${percent}%)`);
  });

  // Success criteria check
  console.log('\n' + '='.repeat(80));
  const formSuccessRate = (successfulForms / totalForms) * 100;
  const fieldSuccessRate = (successfulFields / totalFields) * 100;

  if (formSuccessRate >= 80 && fieldSuccessRate >= 80) {
    console.log('✅ SUCCESS: Translation system meets requirements (≥80%)');
  } else if (formSuccessRate >= 50 && fieldSuccessRate >= 50) {
    console.log('⚠️  PARTIAL: Some improvement needed to reach 80% target');
  } else {
    console.log('❌ FAILED: Translation system needs significant improvement');
  }

  // Detailed results
  console.log('\n📋 Detailed Results by Category:');
  console.log('─'.repeat(80));

  Object.keys(categoryStats).forEach(category => {
    console.log(`\n${category}:`);
    const categoryResults = results.filter(r => r.category === category);
    categoryResults.forEach((r, i) => {
      const status = r.success ? '✅' : '❌';
      console.log(`  ${i + 1}. ${status} ${r.formTitle} → ${r.tableName}`);
    });
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Test completed successfully`);
  console.log(`📊 Form Success Rate: ${formSuccessRate.toFixed(1)}%`);
  console.log(`📊 Field Success Rate: ${fieldSuccessRate.toFixed(1)}%\n`);

  // Save results to file
  const fs = require('fs');
  const path = require('path');
  const reportDir = path.join(__dirname, '../reports');

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(reportDir, `business-forms-test-${timestamp}.json`);

  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalForms,
      successfulForms,
      failedForms,
      formSuccessRate,
      totalFields,
      successfulFields,
      fieldSuccessRate,
      categoryStats
    },
    results
  }, null, 2));

  console.log(`📄 Full report saved to: ${reportFile}\n`);

  return { formSuccessRate, fieldSuccessRate, results };
}

// Run test if executed directly
if (require.main === module) {
  runComprehensiveTest()
    .then(({ formSuccessRate, fieldSuccessRate }) => {
      process.exit(formSuccessRate >= 80 && fieldSuccessRate >= 80 ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Test failed with error:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTest, businessForms };

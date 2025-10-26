/**
 * Create PDPA Demo Data Script
 *
 * This script creates:
 * - A test form with PDPA consent items
 * - Email and phone fields
 * - Sample submissions with realistic data
 * - User consent records
 * - Unified user profiles
 *
 * Run: node backend/scripts/create-pdpa-demo-data.js
 */

const { sequelize, Sequelize } = require('../config/database.config');
const { v4: uuidv4 } = require('uuid');

// Sample data for realistic profiles
const DEMO_USERS = [
  {
    fullName: 'สมชาย ใจดี',
    email: 'somchai.jaidee@example.com',
    phone: '0812345678',
    submissionCount: 3
  },
  {
    fullName: 'สมหญิง รักสะอาด',
    email: 'somying.raksaad@example.com',
    phone: '0823456789',
    submissionCount: 2
  },
  {
    fullName: 'ประเสริฐ วิทยากร',
    email: 'prasert.wittayakorn@example.com',
    phone: '0834567890',
    submissionCount: 4
  },
  {
    fullName: 'วิไล สุขใจ',
    email: 'wilai.sukchai@example.com',
    phone: '0845678901',
    submissionCount: 1
  },
  {
    fullName: 'ชาญชัย มั่นคง',
    email: 'chanchai.mankhong@example.com',
    phone: '0856789012',
    submissionCount: 2
  }
];

async function createPDPADemoData() {
  console.log('🚀 Starting PDPA Demo Data creation...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Get or create admin user
    console.log('📊 Step 1: Getting admin user...');
    const [adminUsers] = await sequelize.query(`
      SELECT id, username FROM users WHERE role IN ('super_admin', 'admin') LIMIT 1
    `);

    if (adminUsers.length === 0) {
      throw new Error('No admin user found. Please create an admin user first.');
    }

    const adminUser = adminUsers[0];
    console.log(`   Using admin user: ${adminUser.username} (${adminUser.id})\n`);

    // Step 2: Create test form
    console.log('📊 Step 2: Creating PDPA test form...');

    const formId = uuidv4();
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // 2025-10-25T07-10-03
    const formTitle = `แบบฟอร์มทดสอบระบบ PDPA - Demo ${timestamp}`;

    await sequelize.query(`
      INSERT INTO forms (
        id, title, description, table_name, is_active, version,
        created_by, "createdAt", "updatedAt"
      ) VALUES (
        :formId,
        :formTitle,
        'แบบฟอร์มสำหรับทดสอบการทำงานของระบบจัดการข้อมูลส่วนบุคคล (Consent Items + Digital Signatures)',
        :tableName,
        true,
        1,
        :adminId,
        :now,
        :now
      )
    `, {
      replacements: {
        formId,
        formTitle,
        tableName: `pdpa_demo_${now.getTime()}`,
        adminId: adminUser.id,
        now
      }
    });

    console.log(`   ✅ Created form: ${formTitle}`);
    console.log(`      Form ID: ${formId}\n`);

    // Step 3: Create consent items
    console.log('📊 Step 3: Creating consent items...');

    const consentItem1Id = uuidv4();
    const consentItem2Id = uuidv4();

    await sequelize.query(`
      INSERT INTO consent_items (
        id, form_id, title_th, title_en, description_th, description_en,
        purpose, retention_period, required, "order", version, is_active,
        created_at, updated_at
      ) VALUES
      (
        :id1, :formId,
        'ยินยอมให้เก็บข้อมูลส่วนบุคคล',
        'Consent to Personal Data Collection',
        'ข้าพเจ้ายินยอมให้บริษัทเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อวัตถุประสงค์ในการให้บริการ',
        'I consent to the collection, use, and disclosure of my personal data for service purposes',
        'การให้บริการและติดต่อลูกค้า',
        '2 years',
        true, 1, 1, true,
        :now, :now
      ),
      (
        :id2, :formId,
        'ยินยอมรับข่าวสารการตลาด',
        'Consent to Marketing Communications',
        'ข้าพเจ้ายินยอมให้บริษัทส่งข่าวสาร โปรโมชัน และข้อมูลทางการตลาดมายังข้าพเจ้า',
        'I consent to receiving marketing communications, promotions, and updates',
        'การตลาดและประชาสัมพันธ์',
        '1 year',
        false, 2, 1, true,
        :now, :now
      )
    `, {
      replacements: {
        id1: consentItem1Id,
        id2: consentItem2Id,
        formId,
        now
      }
    });

    console.log(`   ✅ Created 2 consent items\n`);

    // Step 4: Create form fields
    console.log('📊 Step 4: Creating form fields...');

    const nameFieldId = uuidv4();
    const emailFieldId = uuidv4();
    const phoneFieldId = uuidv4();
    const messageFieldId = uuidv4();

    await sequelize.query(`
      INSERT INTO fields (
        id, form_id, type, title, placeholder, required, "order",
        show_in_table, "createdAt", "updatedAt"
      ) VALUES
      (:nameId, :formId, 'short_answer', 'ชื่อ-นามสกุล', 'กรุณากรอกชื่อ-นามสกุล', true, 1, true, :now, :now),
      (:emailId, :formId, 'email', 'อีเมล', 'example@email.com', true, 2, true, :now, :now),
      (:phoneId, :formId, 'phone', 'เบอร์โทรศัพท์', '08X-XXX-XXXX', true, 3, true, :now, :now),
      (:messageId, :formId, 'paragraph', 'ข้อความ', 'กรุณากรอกข้อความ', false, 4, false, :now, :now)
    `, {
      replacements: {
        nameId: nameFieldId,
        emailId: emailFieldId,
        phoneId: phoneFieldId,
        messageId: messageFieldId,
        formId,
        now
      }
    });

    console.log(`   ✅ Created 4 form fields\n`);

    // Step 5: Create submissions and profiles
    console.log('📊 Step 5: Creating sample submissions...');

    let totalSubmissions = 0;
    const profileIds = [];

    for (const user of DEMO_USERS) {
      const profileId = uuidv4();
      profileIds.push(profileId);

      const submissionIds = [];
      const emails = [user.email];
      const phones = [user.phone];
      const names = [user.fullName];

      // Create multiple submissions for each user
      for (let i = 0; i < user.submissionCount; i++) {
        const submissionId = uuidv4();
        submissionIds.push(submissionId);

        const submittedAt = new Date(now.getTime() - (30 - i * 5) * 24 * 60 * 60 * 1000); // Last 30 days

        // Create submission
        await sequelize.query(`
          INSERT INTO submissions (
            id, form_id, submitted_by, status, ip_address, submitted_at,
            "createdAt", "updatedAt"
          ) VALUES (
            :submissionId, :formId, :adminId, 'submitted', '127.0.0.1', :submittedAt, :now, :now
          )
        `, {
          replacements: {
            submissionId,
            formId,
            adminId: adminUser.id,
            submittedAt,
            now
          }
        });

        // Create submission data
        await sequelize.query(`
          INSERT INTO submission_data (
            id, submission_id, field_id, value_text, value_type, is_encrypted,
            "createdAt", "updatedAt"
          ) VALUES
          (:id1, :submissionId, :nameId, :name, 'string', false, :now, :now),
          (:id2, :submissionId, :emailId, :email, 'string', false, :now, :now),
          (:id3, :submissionId, :phoneId, :phone, 'string', false, :now, :now),
          (:id4, :submissionId, :messageId, :message, 'string', false, :now, :now)
        `, {
          replacements: {
            id1: uuidv4(),
            id2: uuidv4(),
            id3: uuidv4(),
            id4: uuidv4(),
            submissionId,
            nameId: nameFieldId,
            emailId: emailFieldId,
            phoneId: phoneFieldId,
            messageId: messageFieldId,
            name: user.fullName,
            email: user.email,
            phone: user.phone,
            message: `ข้อความทดสอบจากการส่งครั้งที่ ${i + 1}`,
            now
          }
        });

        // Create user consents with digital signatures
        // Sample base64 signature (minimal 1x1 transparent PNG)
        const sampleSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        await sequelize.query(`
          INSERT INTO user_consents (
            id, submission_id, form_id, consent_item_id, consent_given,
            full_name, ip_address, user_agent, signature_data, consented_at,
            privacy_notice_accepted, privacy_notice_version, created_at, updated_at
          ) VALUES
          (:id1, :submissionId, :formId, :consent1Id, true, :fullName, '127.0.0.1', :userAgent, :signature, :submittedAt, true, '1.0', :now, :now),
          (:id2, :submissionId, :formId, :consent2Id, :marketingConsent, :fullName, '127.0.0.1', :userAgent, :signature2, :submittedAt, true, '1.0', :now, :now)
        `, {
          replacements: {
            id1: uuidv4(),
            id2: uuidv4(),
            submissionId,
            formId,
            consent1Id: consentItem1Id,
            consent2Id: consentItem2Id,
            fullName: user.fullName,
            userAgent,
            signature: sampleSignature,
            signature2: i % 2 === 0 ? sampleSignature : null, // Add signature only for consented marketing
            submittedAt,
            marketingConsent: i % 2 === 0, // Alternate marketing consent
            now
          }
        });

        totalSubmissions++;
      }

      // Create unified profile
      await sequelize.query(`
        INSERT INTO unified_user_profiles (
          id, primary_email, primary_phone, full_name,
          linked_emails, linked_phones, linked_names,
          submission_ids, form_ids, total_submissions,
          first_submission_date, last_submission_date,
          match_confidence, created_at, updated_at
        ) VALUES (
          :profileId, :email, :phone, :fullName,
          :emails::jsonb, :phones::jsonb, :names::jsonb,
          :submissionIds::jsonb, :formIds::jsonb, :totalSubmissions,
          :firstDate, :lastDate, 100, :now, :now
        )
      `, {
        replacements: {
          profileId,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          emails: JSON.stringify(emails),
          phones: JSON.stringify(phones),
          names: JSON.stringify(names),
          submissionIds: JSON.stringify(submissionIds),
          formIds: JSON.stringify([formId]),
          totalSubmissions: user.submissionCount,
          firstDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          lastDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          now
        }
      });

      console.log(`   ✅ Created profile for ${user.fullName} (${user.submissionCount} submissions)`);
    }

    console.log(`\n   Total: ${totalSubmissions} submissions created\n`);

    // Step 6: Verify results
    console.log('📊 Step 6: Verifying demo data...');

    const [stats] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM unified_user_profiles) as profiles,
        (SELECT COUNT(*) FROM user_consents) as consents,
        (SELECT COUNT(*) FROM submissions WHERE form_id = :formId) as submissions,
        (SELECT COUNT(*) FROM consent_items WHERE form_id = :formId) as consent_items
    `, {
      replacements: { formId }
    });

    console.log('\n📋 Demo Data Summary:');
    console.log(`   📊 Unified Profiles: ${stats[0].profiles}`);
    console.log(`   ✅ User Consents: ${stats[0].consents}`);
    console.log(`   📝 Submissions: ${stats[0].submissions}`);
    console.log(`   📋 Consent Items: ${stats[0].consent_items}`);

    console.log('\n✅ PDPA Demo Data created successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh the Personal Data Management Dashboard (http://localhost:3000)');
    console.log('   2. Click the purple shield icon "จัดการข้อมูลส่วนบุคคล" in the user menu');
    console.log('   3. Explore the dashboard tabs:');
    console.log('      - ภาพรวม (Overview): See statistics');
    console.log('      - รายการผู้ใช้งาน (User Profiles): View 5 demo profiles');
    console.log('      - การจัดการข้อมูล (Data Retention): Check expired data');
    console.log(`\n📝 Test Form ID: ${formId}`);
    console.log(`   Form URL: http://localhost:3000/view/${formId}\n`);

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Demo data creation failed:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Run script
createPDPADemoData();

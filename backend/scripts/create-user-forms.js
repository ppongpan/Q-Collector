/**
 * Create User's Requested Forms
 *
 * Creates the forms that the user mentioned:
 * 1. "Technic Request"
 * 2. "ฟอร์มบันทึกการร้องขอทีมบริการเทคนิค" (Thai)
 * 3. "Test"
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const SchemaGenerator = require('../services/SchemaGenerator');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function createUserForms() {
  console.log('\n=================================================');
  console.log('📝 Creating User Forms with Thai Translation');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get super admin user ID
    const [users] = await sequelize.query(`
      SELECT id FROM users WHERE role = 'super_admin' LIMIT 1
    `);

    if (users.length === 0) {
      console.log('❌ No super admin user found. Please create an admin user first.\n');
      return;
    }

    const userId = users[0].id;
    console.log(`Using user ID: ${userId}\n`);

    // Define forms to create
    const formsToCreate = [
      {
        title: 'Technic Request',
        description: 'Technical service request form',
        fields: [
          { title: 'Full Name', type: 'short_answer', required: true },
          { title: 'Phone Number', type: 'phone', required: true },
          { title: 'Email', type: 'email', required: true },
          { title: 'Request Details', type: 'paragraph', required: true },
          { title: 'Priority', type: 'multiple_choice', options: ['Low', 'Medium', 'High', 'Urgent'] },
        ]
      },
      {
        title: 'ฟอร์มบันทึกการร้องขอทีมบริการเทคนิค',
        description: 'แบบฟอร์มสำหรับบันทึกการร้องขอทีมบริการเทคนิค',
        fields: [
          { title: 'ชื่อเต็ม', type: 'short_answer', required: true },
          { title: 'เบอร์โทรศัพท์', type: 'phone', required: true },
          { title: 'อีเมล', type: 'email', required: true },
          { title: 'รายละเอียดการร้องขอ', type: 'paragraph', required: true },
          { title: 'ระดับความสำคัญ', type: 'multiple_choice', options: ['ต่ำ', 'ปานกลาง', 'สูง', 'เร่งด่วน'] },
        ]
      },
      {
        title: 'Test',
        description: 'Test form for migration',
        fields: [
          { title: 'Name', type: 'short_answer', required: true },
          { title: 'Comment', type: 'paragraph', required: false },
        ]
      }
    ];

    // Create each form
    for (let i = 0; i < formsToCreate.length; i++) {
      const formData = formsToCreate[i];
      console.log(`\n[${i + 1}/${formsToCreate.length}] Creating: "${formData.title}"`);
      console.log('─'.repeat(80));

      const formId = uuidv4();

      // Build form definition for SchemaGenerator
      const formDefinition = {
        id: formId,
        name: formData.title,
        description: formData.description,
        fields: formData.fields.map((f, index) => ({
          id: uuidv4(),
          label: f.title,
          type: f.type,
          required: f.required,
          order: index,
          options: f.options
        }))
      };

      // Generate schema with translation
      console.log(`  🔄 Generating schema with translation...`);
      const schema = await SchemaGenerator.generateSchema(formDefinition, {
        tablePrefix: 'form_',
        includeMetadata: true,
        includeIndexes: true
      });

      const tableName = schema.mainTable.tableName;
      console.log(`  📊 Table name: ${tableName}`);

      // Create the table
      console.log(`  🔨 Creating table in PostgreSQL...`);
      await sequelize.query(schema.mainTable.createStatement);
      console.log(`  ✅ Table created successfully`);

      // Create indexes
      if (schema.mainTable.indexes.length > 0) {
        console.log(`  📑 Creating ${schema.mainTable.indexes.length} indexes...`);
        for (const indexStatement of schema.mainTable.indexes) {
          await sequelize.query(indexStatement);
        }
        console.log(`  ✅ Indexes created`);
      }

      // Insert form into database
      await sequelize.query(`
        INSERT INTO forms (
          id, title, description, table_name, created_by,
          roles_allowed, settings, is_active, version,
          "createdAt", "updatedAt"
        )
        VALUES (
          :id, :title, :description, :tableName, :userId,
          '["super_admin","admin"]'::jsonb, '{}'::jsonb, true, 1,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, {
        replacements: {
          id: formId,
          title: formData.title,
          description: formData.description,
          tableName: tableName,
          userId: userId
        }
      });

      console.log(`  ✅ Form inserted into database`);

      // Insert fields
      for (let j = 0; j < formData.fields.length; j++) {
        const field = formData.fields[j];
        const fieldId = formDefinition.fields[j].id;

        await sequelize.query(`
          INSERT INTO fields (id, form_id, type, title, placeholder, required, "order", options, "createdAt", "updatedAt")
          VALUES (:id, :formId, :type, :title, :title, :isRequired, :order, :options, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, {
          replacements: {
            id: fieldId,
            formId: formId,
            type: field.type,
            title: field.title,
            isRequired: field.required,
            order: j,
            options: field.options ? JSON.stringify(field.options) : '[]'
          }
        });
      }

      console.log(`  ✅ ${formData.fields.length} fields inserted`);
      console.log(`  ✅ Completed: "${formData.title}"`);
    }

    console.log('\n=================================================');
    console.log('✅ All User Forms Created Successfully!');
    console.log('=================================================\n');

    // Show summary
    const [allForms] = await sequelize.query(`
      SELECT title, table_name FROM forms ORDER BY "createdAt" ASC
    `);

    console.log('📊 All Forms in Database:\n');
    allForms.forEach((form, index) => {
      console.log(`  ${index + 1}. "${form.title}"`);
      console.log(`     Table: ${form.table_name}\n`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  createUserForms()
    .then(() => {
      console.log('✅ Script completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createUserForms };

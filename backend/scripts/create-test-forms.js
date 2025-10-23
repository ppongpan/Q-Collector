/**
 * Create Test Forms for User
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

async function createTestForms() {
  console.log('\n=================================================');
  console.log('📝 Creating User Test Forms');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get super admin user
    const [users] = await sequelize.query(`SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`);
    const userId = users[0].id;

    const formsToCreate = [
      {
        title: 'Technic Request',
        description: 'Technical service request form',
        fields: [
          { title: 'Full Name', type: 'short_answer', req: true },
          { title: 'Phone Number', type: 'phone', req: true },
          { title: 'Email', type: 'email', req: true },
        ]
      },
      {
        title: 'ฟอร์มบันทึกการร้องขอทีมบริการเทคนิค',
        description: 'แบบฟอร์มสำหรับบันทึกการร้องขอทีมบริการเทคนิค',
        fields: [
          { title: 'ชื่อเต็ม', type: 'short_answer', req: true },
          { title: 'เบอร์โทรศัพท์', type: 'phone', req: true },
        ]
      },
      {
        title: 'Test',
        description: 'Test form',
        fields: [
          { title: 'Name', type: 'short_answer', req: true },
        ]
      }
    ];

    for (let i = 0; i < formsToCreate.length; i++) {
      const formData = formsToCreate[i];
      console.log(`\n[${i + 1}/${formsToCreate.length}] Creating: "${formData.title}"`);
      console.log('─'.repeat(80));

      const formId = uuidv4();

      // Generate schema
      const formDefinition = {
        id: formId,
        name: formData.title,
        description: formData.description,
        fields: formData.fields.map((f, index) => ({
          id: uuidv4(),
          label: f.title,
          type: f.type,
          required: f.req,
          order: index
        }))
      };

      console.log(`  🔄 Generating schema...`);
      const schema = await SchemaGenerator.generateSchema(formDefinition, {
        tablePrefix: 'form_',
        includeMetadata: true,
        includeIndexes: true
      });

      const tableName = schema.mainTable.tableName;
      console.log(`  📊 Table name: ${tableName}`);

      // Create table
      console.log(`  🔨 Creating table...`);
      await sequelize.query(schema.mainTable.createStatement);

      // Create indexes
      for (const indexStatement of schema.mainTable.indexes) {
        await sequelize.query(indexStatement);
      }
      console.log(`  ✅ Table and indexes created`);

      // Insert form
      await sequelize.query(`
        INSERT INTO forms (
          id, title, description, table_name, created_by,
          roles_allowed, settings, is_active, version,
          "createdAt", "updatedAt"
        ) VALUES (
          '${formId}', '${formData.title.replace(/'/g, "''")}', '${formData.description.replace(/'/g, "''")}', '${tableName}', '${userId}',
          '["super_admin","admin"]'::jsonb, '{}'::jsonb, true, 1,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `);
      console.log(`  ✅ Form inserted`);

      // Insert fields
      for (let j = 0; j < formData.fields.length; j++) {
        const field = formData.fields[j];
        const fieldId = formDefinition.fields[j].id;

        await sequelize.query(`
          INSERT INTO fields (
            id, form_id, type, title, placeholder, required, "order", options,
            "createdAt", "updatedAt"
          ) VALUES (
            '${fieldId}', '${formId}', '${field.type}', '${field.title.replace(/'/g, "''")}',
            '${field.title.replace(/'/g, "''")}', ${field.req}, ${j}, '[]',
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `);
      }
      console.log(`  ✅ ${formData.fields.length} fields inserted`);
      console.log(`  ✅ Completed!`);
    }

    console.log('\n=================================================');
    console.log('✅ All Forms Created Successfully!');
    console.log('=================================================\n');

    const [allForms] = await sequelize.query(`
      SELECT title, table_name FROM forms ORDER BY "createdAt" ASC
    `);

    console.log('📊 All Forms:\n');
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
  createTestForms()
    .then(() => {
      console.log('✅ Done\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

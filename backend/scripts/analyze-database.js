/**
 * Comprehensive Database Analysis
 * Analyzes all tables, relationships, and data integrity
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

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

async function analyzeDatabaseStructure() {
  console.log('\n=================================================');
  console.log('📊 COMPREHENSIVE DATABASE ANALYSIS');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // 1. Get all tables
    const [tables] = await sequelize.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 ALL TABLES IN DATABASE:\n');
    console.log('─'.repeat(80));
    tables.forEach((t, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${t.table_name.padEnd(40)} (${t.column_count} columns)`);
    });
    console.log('─'.repeat(80));
    console.log(`Total tables: ${tables.length}\n`);

    // 2. Analyze Forms
    const [forms] = await sequelize.query(`
      SELECT
        f.id,
        f.title,
        f.table_name,
        f.created_by,
        f.is_active,
        f."createdAt",
        u.username as creator_name,
        (SELECT COUNT(*) FROM fields WHERE form_id = f.id) as field_count,
        (SELECT COUNT(*) FROM sub_forms WHERE form_id = f.id) as subform_count
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.id
      ORDER BY f."createdAt" DESC
    `);

    console.log('📝 FORMS ANALYSIS:\n');
    console.log(`Total Forms: ${forms.length}\n`);

    forms.forEach((f, i) => {
      console.log(`${i + 1}. "${f.title}"`);
      console.log(`   ID: ${f.id}`);
      console.log(`   Table: ${f.table_name || 'NULL ⚠️'}`);
      console.log(`   Creator: ${f.creator_name || 'Unknown'} (${f.created_by || 'NULL'})`);
      console.log(`   Active: ${f.is_active}`);
      console.log(`   Fields: ${f.field_count}`);
      console.log(`   Sub-forms: ${f.subform_count}`);
      console.log(`   Created: ${f.createdAt}\n`);
    });

    // 3. Analyze Sub-forms
    const [subforms] = await sequelize.query(`
      SELECT
        sf.id,
        sf.title,
        sf.table_name,
        sf.form_id,
        f.title as form_title,
        (SELECT COUNT(*) FROM fields WHERE sub_form_id = sf.id) as field_count
      FROM sub_forms sf
      LEFT JOIN forms f ON sf.form_id = f.id
      ORDER BY sf."createdAt" DESC
    `);

    console.log('📋 SUB-FORMS ANALYSIS:\n');
    console.log(`Total Sub-forms: ${subforms.length}\n`);

    if (subforms.length > 0) {
      subforms.forEach((sf, i) => {
        console.log(`${i + 1}. "${sf.title}"`);
        console.log(`   ID: ${sf.id}`);
        console.log(`   Table: ${sf.table_name || 'NULL ⚠️'}`);
        console.log(`   Parent Form: "${sf.form_title || 'ORPHANED ⚠️'}"`);
        console.log(`   Fields: ${sf.field_count}\n`);
      });
    }

    // 4. Analyze Fields
    const [fieldsStats] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE form_id IS NOT NULL AND sub_form_id IS NULL) as main_form_fields,
        COUNT(*) FILTER (WHERE sub_form_id IS NOT NULL) as sub_form_fields,
        COUNT(*) FILTER (WHERE form_id IS NULL AND sub_form_id IS NULL) as orphaned_fields,
        COUNT(*) as total_fields
      FROM fields
    `);

    console.log('📝 FIELDS ANALYSIS:\n');
    console.log(`Total Fields: ${fieldsStats[0].total_fields}`);
    console.log(`  Main Form Fields: ${fieldsStats[0].main_form_fields}`);
    console.log(`  Sub-form Fields: ${fieldsStats[0].sub_form_fields}`);
    console.log(`  Orphaned Fields: ${fieldsStats[0].orphaned_fields} ${fieldsStats[0].orphaned_fields > 0 ? '⚠️' : ''}\n`);

    // 5. Check for orphaned fields
    if (fieldsStats[0].orphaned_fields > 0) {
      const [orphanedFields] = await sequelize.query(`
        SELECT id, title, type FROM fields
        WHERE form_id IS NULL AND sub_form_id IS NULL
        LIMIT 20
      `);
      console.log('⚠️  ORPHANED FIELDS (No Form/Sub-form Link):\n');
      orphanedFields.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.title} (${f.type}) - ID: ${f.id}`);
      });
      console.log();
    }

    // 6. Analyze Submissions
    const [submissionsStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_submissions,
        COUNT(DISTINCT form_id) as forms_with_submissions,
        COUNT(DISTINCT submitted_by) as users_with_submissions
      FROM submissions
    `);

    console.log('📊 SUBMISSIONS ANALYSIS:\n');
    console.log(`Total Submissions: ${submissionsStats[0].total_submissions}`);
    console.log(`Forms with Submissions: ${submissionsStats[0].forms_with_submissions}`);
    console.log(`Users with Submissions: ${submissionsStats[0].users_with_submissions}\n`);

    // 7. Check for orphaned submissions
    const [orphanedSubmissions] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM submissions s
      WHERE NOT EXISTS (SELECT 1 FROM forms f WHERE f.id = s.form_id)
    `);

    if (orphanedSubmissions[0].count > 0) {
      console.log(`⚠️  ORPHANED SUBMISSIONS: ${orphanedSubmissions[0].count} (no matching form)\n`);
    }

    // 8. Analyze Dynamic Tables
    const [dynamicTables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'form_%'
      ORDER BY table_name
    `);

    console.log('📊 DYNAMIC TABLES ANALYSIS:\n');
    console.log(`Total Dynamic Tables: ${dynamicTables.length}\n`);

    // Check for orphaned dynamic tables
    const orphanedTables = [];
    for (const table of dynamicTables) {
      const linkedForm = forms.find(f => f.table_name === table.table_name);
      const linkedSubForm = subforms.find(sf => sf.table_name === table.table_name);

      if (!linkedForm && !linkedSubForm && table.table_name !== 'forms') {
        orphanedTables.push(table.table_name);
      }
    }

    if (orphanedTables.length > 0) {
      console.log('⚠️  ORPHANED DYNAMIC TABLES (No Form/Sub-form Link):\n');
      orphanedTables.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t}`);
      });
      console.log();
    }

    // 9. Analyze Users
    const [usersStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'super_admin') as super_admins,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE two_factor_enabled = true) as with_2fa
      FROM users
    `);

    console.log('👥 USERS ANALYSIS:\n');
    console.log(`Total Users: ${usersStats[0].total_users}`);
    console.log(`  Super Admins: ${usersStats[0].super_admins}`);
    console.log(`  Admins: ${usersStats[0].admins}`);
    console.log(`  Admins: ${usersStats[0].admins}`);
    console.log(`  With 2FA: ${usersStats[0].with_2fa}\n`);

    // 10. Check Foreign Key Constraints
    const [foreignKeys] = await sequelize.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

    console.log('🔗 FOREIGN KEY CONSTRAINTS:\n');
    foreignKeys.forEach((fk, i) => {
      console.log(`${i + 1}. ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`   On Delete: ${fk.delete_rule}\n`);
    });

    // 11. Summary
    console.log('=================================================');
    console.log('📈 SUMMARY:\n');
    console.log(`✅ Total Tables: ${tables.length}`);
    console.log(`✅ Total Forms: ${forms.length}`);
    console.log(`✅ Total Sub-forms: ${subforms.length}`);
    console.log(`✅ Total Fields: ${fieldsStats[0].total_fields}`);
    console.log(`✅ Total Submissions: ${submissionsStats[0].total_submissions}`);
    console.log(`✅ Total Dynamic Tables: ${dynamicTables.length}`);
    console.log(`✅ Total Users: ${usersStats[0].total_users}`);

    console.log('\n⚠️  ISSUES FOUND:\n');
    const issues = [];

    if (fieldsStats[0].orphaned_fields > 0) {
      issues.push(`${fieldsStats[0].orphaned_fields} orphaned fields`);
    }
    if (orphanedSubmissions[0].count > 0) {
      issues.push(`${orphanedSubmissions[0].count} orphaned submissions`);
    }
    if (orphanedTables.length > 0) {
      issues.push(`${orphanedTables.length} orphaned dynamic tables`);
    }

    const formsWithoutTables = forms.filter(f => !f.table_name).length;
    if (formsWithoutTables > 0) {
      issues.push(`${formsWithoutTables} forms without dynamic tables`);
    }

    if (issues.length > 0) {
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    } else {
      console.log('  No issues found! Database is clean. ✨');
    }

    console.log('\n=================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  analyzeDatabaseStructure()
    .then(() => {
      console.log('✅ Analysis completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeDatabaseStructure };

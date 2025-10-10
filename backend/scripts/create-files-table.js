/**
 * Create files table manually
 *
 * This script creates the files table with submission_id as nullable
 * to allow file uploads before submission creation.
 */

const { sequelize } = require('../models');

async function createFilesTable() {
  try {
    console.log('='.repeat(60));
    console.log('Creating files table');
    console.log('='.repeat(60));
    console.log('');

    // Drop the table if it exists
    await sequelize.query('DROP TABLE IF EXISTS files CASCADE');
    console.log('✅ Dropped existing files table (if any)');

    // Create the files table with submission_id nullable
    await sequelize.query(`
      CREATE TABLE files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NULL REFERENCES submissions(id) ON DELETE CASCADE,
        field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size BIGINT NOT NULL CHECK (size >= 0),
        minio_path TEXT NOT NULL,
        minio_bucket VARCHAR(100) NOT NULL DEFAULT 'qcollector',
        checksum VARCHAR(64) NULL,
        uploaded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Created files table with nullable submission_id');

    // Create indexes
    await sequelize.query('CREATE INDEX idx_files_submission_id ON files(submission_id)');
    await sequelize.query('CREATE INDEX idx_files_field_id ON files(field_id)');
    await sequelize.query('CREATE INDEX idx_files_uploaded_by ON files(uploaded_by)');
    await sequelize.query('CREATE INDEX idx_files_mime_type ON files(mime_type)');
    await sequelize.query('CREATE INDEX idx_files_uploaded_at ON files(uploaded_at)');
    console.log('✅ Created indexes on files table');

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Files table created successfully!');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Failed to create files table');
    console.error('='.repeat(60));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

createFilesTable();

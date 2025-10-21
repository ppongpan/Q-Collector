/**
 * Migration: Add image variants columns to files table
 *
 * Adds three new columns for Progressive Image Loading System:
 * - blur_preview: TEXT - Base64 data URL for instant display (10KB, inline)
 * - thumbnail_path: VARCHAR(500) - MinIO path to thumbnail (400px, 50-100KB)
 * - full_path: VARCHAR(500) - MinIO path to full resolution image
 *
 * Part of v0.7.30 Progressive Image Loading System
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 [Migration] Adding image variant columns to files table...');

    // Check if columns exist and add them only if they don't
    try {
      await queryInterface.addColumn('files', 'blur_preview', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Base64 data URL for blur preview (20x20px, inline, no HTTP request)'
      });
      console.log('✅ Added column: blur_preview');
    } catch (err) {
      console.log('⚠️  Column blur_preview already exists, skipping...');
    }

    try {
      await queryInterface.addColumn('files', 'thumbnail_path', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'MinIO path to thumbnail image (400px width, 50-100KB)'
      });
      console.log('✅ Added column: thumbnail_path');
    } catch (err) {
      console.log('⚠️  Column thumbnail_path already exists, skipping...');
    }

    try {
      await queryInterface.addColumn('files', 'full_path', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'MinIO path to full resolution image'
      });
      console.log('✅ Added column: full_path');
    } catch (err) {
      console.log('⚠️  Column full_path already exists, skipping...');
    }

    // Migrate existing files: populate full_path from existing file_path (if column exists)
    console.log('📦 [Migration] Checking for existing file paths to migrate...');
    try {
      await queryInterface.sequelize.query(`
        UPDATE files
        SET full_path = file_path
        WHERE file_path IS NOT NULL
        AND full_path IS NULL
      `);
      console.log('✅ Migrated existing file paths to full_path column');
    } catch (err) {
      console.log('⚠️  No file_path column found, skipping migration...');
    }

    console.log('🎉 [Migration] Image variants columns added successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run ImageProcessingService to generate blur_preview and thumbnail_path for existing images');
    console.log('2. Update FileService to use ImageProcessingService for new uploads');
    console.log('3. Update frontend ImageThumbnail component to use progressive loading');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⏪ [Migration] Rolling back image variant columns...');

    await queryInterface.removeColumn('files', 'blur_preview');
    console.log('✅ Removed column: blur_preview');

    await queryInterface.removeColumn('files', 'thumbnail_path');
    console.log('✅ Removed column: thumbnail_path');

    await queryInterface.removeColumn('files', 'full_path');
    console.log('✅ Removed column: full_path');

    console.log('🎉 [Migration] Rollback completed!');
  }
};

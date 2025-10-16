/**
 * Image Processing Service
 * Generates multiple quality variants for images using Sharp library
 *
 * Features:
 * - Blur preview (10KB, 20x20px, base64 inline) - 0ms load time
 * - Thumbnail (50-100KB, 400px width) - fast loading
 * - Full resolution (original file) - on-demand only
 *
 * Part of Progressive Image Loading System v0.7.30
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const minioClient = require('../config/minio.config');

class ImageProcessingService {
  /**
   * Generate image variants for progressive loading
   * @param {string} originalFilePath - Full path to the original image file
   * @param {string} fileId - UUID of the file in database
   * @param {string} originalFileName - Original filename
   * @returns {Promise<Object>} - Object containing blur preview (base64), thumbnail path, and full path
   */
  async generateImageVariants(originalFilePath, fileId, originalFileName) {
    try {
      console.log(`📸 [ImageProcessingService] Generating variants for: ${originalFileName}`);

      const variants = {
        blurPreview: null,      // Base64 data URL (inline, no HTTP request)
        thumbnailPath: null,    // MinIO path to thumbnail
        fullPath: null          // MinIO path to original
      };

      // Step 1: Generate blur preview (20x20px, base64 inline)
      // This provides instant visual feedback without any HTTP request
      const blurBuffer = await sharp(originalFilePath)
        .resize(20, 20, {
          fit: 'cover',           // Cover the entire 20x20 area
          position: 'center'      // Center the image
        })
        .blur(2)                  // Slight blur for smooth appearance
        .jpeg({
          quality: 60,            // Low quality for small size
          progressive: false      // Not needed for such small images
        })
        .toBuffer();

      // Convert to base64 data URL for inline embedding
      variants.blurPreview = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`;
      console.log(`✅ [ImageProcessingService] Blur preview generated: ${Math.round(blurBuffer.length / 1024)}KB`);

      // Step 2: Generate thumbnail (400px width, progressive JPEG)
      // This loads quickly for thumbnail grid display
      const fileExt = path.extname(originalFileName);
      const thumbnailFileName = `thumbnail_${fileId}${fileExt}`;
      const thumbnailTempPath = path.join(path.dirname(originalFilePath), thumbnailFileName);

      const metadata = await sharp(originalFilePath).metadata();
      console.log(`📐 [ImageProcessingService] Original dimensions: ${metadata.width}x${metadata.height}`);

      await sharp(originalFilePath)
        .resize(400, null, {
          fit: 'inside',          // Maintain aspect ratio, fit within 400px width
          withoutEnlargement: true // Don't upscale if image is smaller
        })
        .jpeg({
          quality: 80,            // Good balance between quality and size
          progressive: true,      // Progressive JPEG for better UX
          mozjpeg: true          // Use mozjpeg for better compression
        })
        .toFile(thumbnailTempPath);

      const thumbnailStats = await fs.stat(thumbnailTempPath);
      console.log(`✅ [ImageProcessingService] Thumbnail generated: ${Math.round(thumbnailStats.size / 1024)}KB`);

      // Step 3: Upload thumbnail to MinIO
      const bucketName = process.env.MINIO_BUCKET || 'qcollector';
      const thumbnailObjectName = `thumbnails/${fileId}${fileExt}`;

      await minioClient.fPutObject(
        bucketName,
        thumbnailObjectName,
        thumbnailTempPath,
        {
          'Content-Type': this.getContentType(fileExt)
        }
      );

      variants.thumbnailPath = thumbnailObjectName;
      console.log(`✅ [ImageProcessingService] Thumbnail uploaded to MinIO: ${thumbnailObjectName}`);

      // Clean up temporary thumbnail file
      await fs.unlink(thumbnailTempPath);

      // Step 4: Set full path (this should already be in MinIO from original upload)
      // Extract the object name from the original file path if it's from MinIO
      // Otherwise, use the fileId to construct the path
      const originalObjectName = originalFilePath.includes('uploads/')
        ? path.basename(originalFilePath)
        : `uploads/${fileId}${fileExt}`;

      variants.fullPath = originalObjectName;

      console.log(`🎉 [ImageProcessingService] All variants generated successfully`);
      console.log(`   - Blur preview: ${Math.round(Buffer.from(variants.blurPreview.split(',')[1], 'base64').length / 1024)}KB (inline)`);
      console.log(`   - Thumbnail: ${variants.thumbnailPath}`);
      console.log(`   - Full: ${variants.fullPath}`);

      return variants;

    } catch (error) {
      console.error(`❌ [ImageProcessingService] Error generating variants:`, error);
      throw error;
    }
  }

  /**
   * Check if a file is an image based on extension
   * @param {string} filename - Filename to check
   * @returns {boolean} - True if image file
   */
  isImage(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
    const ext = path.extname(filename).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Get MIME content type for file extension
   * @param {string} ext - File extension (with or without dot)
   * @returns {string} - MIME type
   */
  getContentType(ext) {
    const extension = ext.startsWith('.') ? ext : `.${ext}`;
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff'
    };
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Regenerate variants for existing images (migration utility)
   * @param {string} fileId - File ID
   * @param {string} minioPath - Path to file in MinIO
   * @param {string} originalFileName - Original filename
   * @returns {Promise<Object>} - Variants object
   */
  async regenerateVariants(fileId, minioPath, originalFileName) {
    try {
      console.log(`🔄 [ImageProcessingService] Regenerating variants for existing file: ${fileId}`);

      // Download file from MinIO to temp location
      const bucketName = process.env.MINIO_BUCKET || 'qcollector';
      const tempFilePath = path.join(__dirname, '../temp', `temp_${fileId}${path.extname(originalFileName)}`);

      // Ensure temp directory exists
      const tempDir = path.dirname(tempFilePath);
      await fs.mkdir(tempDir, { recursive: true });

      // Download from MinIO
      await minioClient.fGetObject(bucketName, minioPath, tempFilePath);
      console.log(`⬇️ [ImageProcessingService] Downloaded from MinIO: ${minioPath}`);

      // Generate variants
      const variants = await this.generateImageVariants(tempFilePath, fileId, originalFileName);

      // Clean up temp file
      await fs.unlink(tempFilePath);

      return variants;

    } catch (error) {
      console.error(`❌ [ImageProcessingService] Error regenerating variants:`, error);
      throw error;
    }
  }
}

module.exports = new ImageProcessingService();

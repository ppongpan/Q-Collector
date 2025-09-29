/**
 * MinIO Configuration
 * S3-compatible object storage setup
 */

const Minio = require('minio');
const logger = require('../utils/logger.util');

// Get MinIO configuration from environment variables
const config = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'your_minio_password_here',
  region: process.env.MINIO_REGION || 'us-east-1',
  bucket: process.env.MINIO_BUCKET || 'qcollector',
};

// Create MinIO client
const minioClient = new Minio.Client({
  endPoint: config.endPoint,
  port: config.port,
  useSSL: config.useSSL,
  accessKey: config.accessKey,
  secretKey: config.secretKey,
  region: config.region,
});

/**
 * Test MinIO connection
 */
async function testMinIOConnection() {
  try {
    // List buckets to test connection
    const buckets = await minioClient.listBuckets();
    logger.info(`MinIO connection successful. Found ${buckets.length} bucket(s)`);
    return true;
  } catch (error) {
    logger.error('MinIO connection test failed:', error.message);
    throw error;
  }
}

/**
 * Initialize MinIO (create default bucket if not exists)
 */
async function initializeMinIO() {
  try {
    // Test connection
    await testMinIOConnection();

    // Check if default bucket exists
    const bucketExists = await minioClient.bucketExists(config.bucket);

    if (!bucketExists) {
      // Create default bucket
      await minioClient.makeBucket(config.bucket, config.region);
      logger.info(`Created MinIO bucket: ${config.bucket}`);

      // Set bucket policy to allow uploads (adjust as needed)
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${config.bucket}/public/*`],
          },
        ],
      };

      await minioClient.setBucketPolicy(config.bucket, JSON.stringify(policy));
      logger.info(`Set policy for bucket: ${config.bucket}`);
    } else {
      logger.info(`MinIO bucket already exists: ${config.bucket}`);
    }

    return true;
  } catch (error) {
    logger.error('MinIO initialization failed:', error);
    throw error;
  }
}

/**
 * Upload file to MinIO
 */
async function uploadFile(buffer, fileName, mimeType, metadata = {}) {
  try {
    const metaData = {
      'Content-Type': mimeType,
      ...metadata,
    };

    await minioClient.putObject(config.bucket, fileName, buffer, buffer.length, metaData);

    logger.info(`File uploaded successfully: ${fileName}`);

    return {
      bucket: config.bucket,
      fileName: fileName,
      size: buffer.length,
      mimeType: mimeType,
      url: getFileUrl(fileName),
    };
  } catch (error) {
    logger.error(`File upload failed for ${fileName}:`, error);
    throw error;
  }
}

/**
 * Download file from MinIO
 */
async function downloadFile(fileName) {
  try {
    const dataStream = await minioClient.getObject(config.bucket, fileName);
    return dataStream;
  } catch (error) {
    logger.error(`File download failed for ${fileName}:`, error);
    throw error;
  }
}

/**
 * Get file as buffer
 */
async function getFileBuffer(fileName) {
  try {
    const dataStream = await downloadFile(fileName);
    const chunks = [];

    return new Promise((resolve, reject) => {
      dataStream.on('data', (chunk) => chunks.push(chunk));
      dataStream.on('end', () => resolve(Buffer.concat(chunks)));
      dataStream.on('error', reject);
    });
  } catch (error) {
    logger.error(`Get file buffer failed for ${fileName}:`, error);
    throw error;
  }
}

/**
 * Delete file from MinIO
 */
async function deleteFile(fileName) {
  try {
    await minioClient.removeObject(config.bucket, fileName);
    logger.info(`File deleted successfully: ${fileName}`);
    return true;
  } catch (error) {
    logger.error(`File deletion failed for ${fileName}:`, error);
    throw error;
  }
}

/**
 * Delete multiple files from MinIO
 */
async function deleteFiles(fileNames) {
  try {
    const objectsList = fileNames.map((name) => name);
    await minioClient.removeObjects(config.bucket, objectsList);
    logger.info(`Deleted ${fileNames.length} files successfully`);
    return true;
  } catch (error) {
    logger.error('Bulk file deletion failed:', error);
    throw error;
  }
}

/**
 * Check if file exists
 */
async function fileExists(fileName) {
  try {
    await minioClient.statObject(config.bucket, fileName);
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    logger.error(`File exists check failed for ${fileName}:`, error);
    throw error;
  }
}

/**
 * Get file metadata
 */
async function getFileMetadata(fileName) {
  try {
    const stat = await minioClient.statObject(config.bucket, fileName);
    return {
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      metaData: stat.metaData,
    };
  } catch (error) {
    logger.error(`Get file metadata failed for ${fileName}:`, error);
    throw error;
  }
}

/**
 * Generate presigned URL for file download
 */
async function getPresignedUrl(fileName, expirySeconds = 3600) {
  try {
    const url = await minioClient.presignedGetObject(config.bucket, fileName, expirySeconds);
    return url;
  } catch (error) {
    logger.error(`Generate presigned URL failed for ${fileName}:`, error);
    throw error;
  }
}

/**
 * Generate presigned URL for file upload
 */
async function getPresignedUploadUrl(fileName, expirySeconds = 3600) {
  try {
    const url = await minioClient.presignedPutObject(config.bucket, fileName, expirySeconds);
    return url;
  } catch (error) {
    logger.error(`Generate presigned upload URL failed for ${fileName}:`, error);
    throw error;
  }
}

/**
 * List files in bucket with prefix
 */
async function listFiles(prefix = '', recursive = false) {
  try {
    const objectsList = [];
    const stream = minioClient.listObjectsV2(config.bucket, prefix, recursive);

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => objectsList.push(obj));
      stream.on('end', () => resolve(objectsList));
      stream.on('error', reject);
    });
  } catch (error) {
    logger.error('List files failed:', error);
    throw error;
  }
}

/**
 * Get file URL (for public access)
 */
function getFileUrl(fileName) {
  const protocol = config.useSSL ? 'https' : 'http';
  return `${protocol}://${config.endPoint}:${config.port}/${config.bucket}/${fileName}`;
}

/**
 * Copy file within bucket
 */
async function copyFile(sourceFileName, destFileName) {
  try {
    await minioClient.copyObject(
      config.bucket,
      destFileName,
      `/${config.bucket}/${sourceFileName}`
    );
    logger.info(`File copied from ${sourceFileName} to ${destFileName}`);
    return true;
  } catch (error) {
    logger.error(`File copy failed from ${sourceFileName} to ${destFileName}:`, error);
    throw error;
  }
}

// Export MinIO client and utility functions
module.exports = {
  minioClient,
  testMinIOConnection,
  initializeMinIO,
  uploadFile,
  downloadFile,
  getFileBuffer,
  deleteFile,
  deleteFiles,
  fileExists,
  getFileMetadata,
  getPresignedUrl,
  getPresignedUploadUrl,
  listFiles,
  getFileUrl,
  copyFile,
  config,
};
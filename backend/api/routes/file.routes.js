/**
 * File Routes
 * Endpoints for file upload and management
 */

const express = require('express');
const multer = require('multer');
const { body, query, param, validationResult } = require('express-validator');
const FileService = require('../../services/FileService');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger.util');

const router = express.Router();

/**
 * Validation middleware helper
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
  }
  next();
}

/**
 * Multer configuration for file uploads
 */
const storage = multer.memoryStorage(); // Store in memory for immediate upload to MinIO

const fileFilter = (req, file, cb) => {
  // Allow most common file types
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type ${file.mimetype} is not allowed`, 'INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 5, // Max 5 files per upload
  },
  fileFilter: fileFilter,
});

/**
 * POST /api/v1/files/upload
 * Upload file(s)
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'), // Single file upload
  [
    body('submissionId')
      .optional()
      .isUUID()
      .withMessage('Invalid submission ID'),
    body('fieldId')
      .optional()
      .isUUID()
      .withMessage('Invalid field ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded', 'FILE_REQUIRED');
    }

    const metadata = {
      submissionId: req.body.submissionId,
      fieldId: req.body.fieldId,
    };

    const file = await FileService.uploadFile(req.file, req.userId, metadata);

    logger.info(`File uploaded: ${file.filename} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: { file },
    });
  })
);

/**
 * POST /api/v1/files/upload-multiple
 * Upload multiple files
 */
router.post(
  '/upload-multiple',
  authenticate,
  upload.array('files', 5), // Multiple file upload (max 5)
  [
    body('submissionId')
      .optional()
      .isUUID()
      .withMessage('Invalid submission ID'),
    body('fieldId')
      .optional()
      .isUUID()
      .withMessage('Invalid field ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'No files uploaded', 'FILES_REQUIRED');
    }

    const metadata = {
      submissionId: req.body.submissionId,
      fieldId: req.body.fieldId,
    };

    const uploadedFiles = [];

    for (const file of req.files) {
      const uploadedFile = await FileService.uploadFile(file, req.userId, metadata);
      uploadedFiles.push(uploadedFile);
    }

    logger.info(`${uploadedFiles.length} files uploaded by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: { files: uploadedFiles },
    });
  })
);

/**
 * GET /api/v1/files/:id
 * Get file metadata and presigned URL
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid file ID'),
    query('expiry')
      .optional()
      .isInt({ min: 60, max: 86400 })
      .withMessage('Expiry must be between 60 and 86400 seconds'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const expirySeconds = parseInt(req.query.expiry) || 3600;

    const file = await FileService.getFile(req.params.id, req.userId, expirySeconds);

    res.status(200).json({
      success: true,
      data: { file },
    });
  })
);

/**
 * GET /api/v1/files/:id/download
 * Download file directly
 */
router.get(
  '/:id/download',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid file ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { stream, filename, mimeType } = await FileService.downloadFile(
      req.params.id,
      req.userId
    );

    // Set response headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe stream to response
    stream.pipe(res);

    logger.info(`File downloaded: ${req.params.id} by ${req.user.username}`);
  })
);

/**
 * DELETE /api/v1/files/:id
 * Delete file
 */
router.delete(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid file ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    await FileService.deleteFile(req.params.id, req.userId);

    logger.info(`File deleted: ${req.params.id} by ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  })
);

/**
 * GET /api/v1/files
 * List files
 */
router.get(
  '/',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('mimeType')
      .optional()
      .trim(),
    query('submissionId')
      .optional()
      .isUUID()
      .withMessage('Invalid submission ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      mimeType: req.query.mimeType,
      submissionId: req.query.submissionId,
    };

    const result = await FileService.listFiles(req.userId, filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/files/statistics
 * Get file statistics
 */
router.get(
  '/stats/summary',
  authenticate,
  asyncHandler(async (req, res) => {
    const statistics = await FileService.getFileStatistics(req.userId);

    res.status(200).json({
      success: true,
      data: { statistics },
    });
  })
);

/**
 * Error handler for multer errors
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'File size exceeds maximum allowed size',
          code: 'FILE_TOO_LARGE',
          maxSize: '10MB',
        },
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Too many files uploaded',
          code: 'TOO_MANY_FILES',
          maxFiles: 5,
        },
      });
    }
  }
  next(error);
});

module.exports = router;
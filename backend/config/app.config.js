/**
 * Application Configuration
 * General application settings and constants
 */

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Application configuration object
const appConfig = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT || '5000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  apiVersion: process.env.API_VERSION || 'v1',

  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here_minimum_32_characters',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    issuer: process.env.JWT_ISSUER || 'qcollector',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your_32_byte_hex_encryption_key_here',
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  session: {
    secret: process.env.SESSION_SECRET || 'your_session_secret_here',
    ttl: parseInt(process.env.REDIS_SESSION_TTL || '604800', 10), // 7 days
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    login: {
      windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '900000', 10),
      maxAttempts: parseInt(process.env.RATE_LIMIT_LOGIN_MAX_ATTEMPTS || '5', 10),
    },
  },

  // File upload
  fileUpload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(',')
      : ['image/jpeg', 'image/png', 'application/pdf'],
    maxFilesPerUpload: parseInt(process.env.MAX_FILES_PER_UPLOAD || '10', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    errorFile: process.env.LOG_ERROR_FILE || 'logs/error.log',
    maxSize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10),
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10', 10),
    console: process.env.LOG_CONSOLE !== 'false',
  },

  // Email (optional)
  email: {
    enabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@qcollector.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Q-Collector',
  },

  // Telegram (optional)
  telegram: {
    enabled: process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  // Feature flags
  features: {
    auditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
    requestLog: process.env.ENABLE_REQUEST_LOG !== 'false',
    fileUpload: process.env.ENABLE_FILE_UPLOAD !== 'false',
    emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    telegramNotifications: process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true',
  },

  // Debug
  debug: {
    enabled: process.env.DEBUG === 'true',
    sql: process.env.DEBUG_SQL === 'true',
    verboseErrors: process.env.VERBOSE_ERRORS === 'true',
  },

  // External APIs
  apis: {
    googleMaps: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Constants
  constants: {
    // User roles
    roles: {
      ADMIN: 'admin',
      MANAGER: 'manager',
      USER: 'user',
      VIEWER: 'viewer',
    },

    // Submission statuses
    submissionStatus: {
      DRAFT: 'draft',
      SUBMITTED: 'submitted',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      ARCHIVED: 'archived',
    },

    // Field types
    fieldTypes: [
      'short_answer',
      'paragraph',
      'email',
      'phone',
      'number',
      'url',
      'file_upload',
      'image_upload',
      'date',
      'time',
      'datetime',
      'multiple_choice',
      'rating',
      'slider',
      'lat_long',
      'province',
      'factory',
    ],

    // Audit actions
    auditActions: {
      CREATE: 'create',
      READ: 'read',
      UPDATE: 'update',
      DELETE: 'delete',
      LOGIN: 'login',
      LOGOUT: 'logout',
    },

    // Thai provinces (for province field type)
    thaiProvinces: [
      'กรุงเทพมหานคร',
      'กระบี่',
      'กาญจนบุรี',
      'กาฬสินธุ์',
      'กำแพงเพชร',
      'ขอนแก่น',
      'จันทบุรี',
      'ฉะเชิงเทรา',
      'ชลบุรี',
      'ชัยนาท',
      'ชัยภูมิ',
      'ชุมพร',
      'เชียงราย',
      'เชียงใหม่',
      'ตรัง',
      'ตราด',
      'ตาก',
      'นครนายก',
      'นครปฐม',
      'นครพนม',
      'นครราชสีมา',
      'นครศรีธรรมราช',
      'นครสวรรค์',
      'นนทบุรี',
      'นราธิวาส',
      'น่าน',
      'บึงกาฬ',
      'บุรีรัมย์',
      'ปทุมธานี',
      'ประจวบคีรีขันธ์',
      'ปราจีนบุรี',
      'ปัตตานี',
      'พระนครศรีอยุธยา',
      'พะเยา',
      'พังงา',
      'พัทลุง',
      'พิจิตร',
      'พิษณุโลก',
      'เพชรบุรี',
      'เพชรบูรณ์',
      'แพร่',
      'ภูเก็ต',
      'มหาสารคาม',
      'มุกดาหาร',
      'แม่ฮ่องสอน',
      'ยโสธร',
      'ยะลา',
      'ร้อยเอ็ด',
      'ระนอง',
      'ระยอง',
      'ราชบุรี',
      'ลพบุรี',
      'ลำปาง',
      'ลำพูน',
      'เลย',
      'ศรีสะเกษ',
      'สกลนคร',
      'สงขลา',
      'สตูล',
      'สมุทรปราการ',
      'สมุทรสงคราม',
      'สมุทรสาคร',
      'สระแก้ว',
      'สระบุรี',
      'สิงห์บุรี',
      'สุโขทัย',
      'สุพรรณบุรี',
      'สุราษฎร์ธานี',
      'สุรินทร์',
      'หนองคาย',
      'หนองบัวลำภู',
      'อ่างทอง',
      'อำนาจเจริญ',
      'อุดรธานี',
      'อุตรดิตถ์',
      'อุทัยธานี',
      'อุบลราชธานี',
    ],
  },
};

// Validate required configuration
function validateConfig() {
  const errors = [];

  // Check required environment variables
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_key_here_minimum_32_characters') {
    errors.push('JWT_SECRET must be set to a secure random value');
  }

  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === 'your_32_byte_hex_encryption_key_here') {
    errors.push('ENCRYPTION_KEY must be set to a 32-byte hex string');
  }

  if (appConfig.isProduction) {
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL must be set in production');
    }

    if (!process.env.REDIS_URL) {
      errors.push('REDIS_URL must be set in production');
    }

    if (appConfig.debug.verboseErrors) {
      errors.push('VERBOSE_ERRORS should be disabled in production');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:');
    errors.forEach((error) => console.error(`  - ${error}`));

    if (appConfig.isProduction) {
      throw new Error('Invalid configuration for production environment');
    }
  }

  return errors.length === 0;
}

// Export configuration
module.exports = {
  ...appConfig,
  validateConfig,
};
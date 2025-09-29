# Q-Collector Backend Development Plan

**Enterprise-Grade Backend Architecture for Q-Collector v0.4**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Design](#database-design)
5. [Security Architecture](#security-architecture)
6. [API Design](#api-design)
7. [File Storage Strategy](#file-storage-strategy)
8. [Docker Infrastructure](#docker-infrastructure)
9. [Development Phases](#development-phases)
10. [Specialized Agents](#specialized-agents)

---

## Executive Summary

### Project Goals

Build a production-ready, enterprise-grade backend system for Q-Collector that provides:

- **Secure Data Storage**: PostgreSQL with encryption for sensitive data
- **File Management**: MinIO for scalable file storage
- **RESTful API**: Clean, versioned API endpoints
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Data Encryption**: Field-level encryption for personal data (PII)
- **Audit Logging**: Complete audit trail for all operations
- **Performance**: Optimized queries, caching with Redis
- **Scalability**: Docker-based microservices architecture
- **Reliability**: Error handling, transaction management, backup systems

### Success Criteria

- ✅ Database schema with proper normalization
- ✅ Encrypted storage for PII fields
- ✅ RESTful API with comprehensive documentation
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ File upload/download with MinIO
- ✅ Audit logging for all operations
- ✅ Docker Compose setup for easy deployment
- ✅ API integration tests
- ✅ Performance benchmarks (< 200ms response time)

---

## Technology Stack

### Core Backend

```yaml
Runtime: Node.js 20 LTS
Framework: Express.js 4.18+
Language: JavaScript (ES2022)
Package Manager: npm

Database:
  Primary: PostgreSQL 16
  ORM: Sequelize 6.35+
  Migration: Sequelize CLI

File Storage:
  Object Storage: MinIO (S3-compatible)
  Client: minio npm package

Caching:
  Cache Layer: Redis 7
  Client: redis npm package

Authentication:
  Strategy: JWT (JSON Web Tokens)
  Library: jsonwebtoken
  Password Hashing: bcryptjs

Security:
  Encryption: crypto (Node.js built-in)
  Environment: dotenv
  Helmet: Security headers
  CORS: cors middleware
  Rate Limiting: express-rate-limit
```

### DevOps & Infrastructure

```yaml
Containerization: Docker 24+
Orchestration: Docker Compose
Reverse Proxy: Nginx
Process Manager: PM2
Logging: Winston + Morgan
Monitoring: Prometheus + Grafana (future)
```

### Development Tools

```yaml
Testing:
  - Jest (unit/integration tests)
  - Supertest (API testing)
  - faker-js (test data generation)

Linting:
  - ESLint
  - Prettier

Documentation:
  - Swagger/OpenAPI 3.0
  - JSDoc

Version Control:
  - Git
  - GitHub

CI/CD:
  - GitHub Actions (future)
```

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│              (React Frontend - port 3000)                   │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     Nginx Reverse Proxy                     │
│                        (port 80/443)                        │
└─────────────┬─────────────────────────────────┬─────────────┘
              │                                 │
              ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│    API Gateway/Router    │      │    Static File Server    │
│      (Express.js)        │      │       (Nginx)            │
│       (port 5000)        │      │                          │
└─────────┬────────────────┘      └──────────────────────────┘
          │
          ├─────────────────────────────────┐
          │                                 │
          ▼                                 ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│  Authentication      │      │   Business Logic Layer       │
│  Middleware          │      │   - Form Service             │
│  (JWT Verify)        │      │   - Submission Service       │
└──────────────────────┘      │   - File Service             │
                              │   - User Service             │
                              │   - Telegram Service         │
                              └────┬─────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   PostgreSQL     │   │      MinIO       │   │      Redis       │
│  (port 5432)     │   │   (port 9000)    │   │   (port 6379)    │
│                  │   │                  │   │                  │
│  - Users         │   │  - Files         │   │  - Sessions      │
│  - Forms         │   │  - Images        │   │  - Cache         │
│  - Submissions   │   │  - Documents     │   │  - Rate Limits   │
│  - Audit Logs    │   │                  │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

### Microservices Architecture

```
backend/
├── api/                      # API Gateway
│   ├── server.js            # Express server
│   ├── app.js               # Express app configuration
│   └── routes/              # API routes
│       ├── index.js
│       ├── auth.routes.js
│       ├── forms.routes.js
│       ├── submissions.routes.js
│       ├── files.routes.js
│       └── users.routes.js
│
├── services/                 # Business Logic Layer
│   ├── AuthService.js
│   ├── FormService.js
│   ├── SubmissionService.js
│   ├── FileService.js
│   ├── UserService.js
│   ├── TelegramService.js
│   ├── EncryptionService.js
│   └── AuditService.js
│
├── models/                   # Database Models (Sequelize)
│   ├── index.js             # Sequelize initialization
│   ├── User.js
│   ├── Form.js
│   ├── Field.js
│   ├── SubForm.js
│   ├── Submission.js
│   ├── SubmissionData.js
│   ├── File.js
│   ├── AuditLog.js
│   └── Session.js
│
├── middleware/               # Express Middleware
│   ├── auth.middleware.js   # JWT verification
│   ├── rbac.middleware.js   # Role-based access control
│   ├── validation.middleware.js
│   ├── error.middleware.js
│   ├── logging.middleware.js
│   └── rateLimit.middleware.js
│
├── utils/                    # Utility Functions
│   ├── encryption.util.js   # Data encryption
│   ├── jwt.util.js          # JWT operations
│   ├── validation.util.js   # Input validation
│   ├── logger.util.js       # Winston logger
│   └── helpers.util.js      # General helpers
│
├── config/                   # Configuration
│   ├── database.config.js
│   ├── minio.config.js
│   ├── redis.config.js
│   └── app.config.js
│
├── migrations/               # Database Migrations
│   └── YYYYMMDDHHMMSS-*.js
│
├── seeders/                  # Database Seeders
│   └── YYYYMMDDHHMMSS-*.js
│
├── tests/                    # Test Suite
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docker/                   # Docker Configuration
│   ├── postgres/
│   │   └── init.sql
│   ├── minio/
│   │   └── init.sh
│   └── nginx/
│       └── nginx.conf
│
├── .env.example
├── .env.development
├── .env.production
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json
└── README.md
```

---

## Database Design

### Entity-Relationship Diagram

```
┌─────────────────┐
│     Users       │
├─────────────────┤
│ id (PK)         │
│ username        │
│ email           │◄────────┐
│ password_hash   │         │
│ full_name_enc   │         │ created_by (FK)
│ role            │         │
│ phone_enc       │         │
│ created_at      │         │
│ updated_at      │         │
└────────┬────────┘         │
         │                  │
         │ owns             │
         │                  │
         ▼                  │
┌─────────────────┐         │
│     Forms       │         │
├─────────────────┤         │
│ id (PK)         │         │
│ title           │         │
│ description     │         │
│ roles_allowed   │         │
│ settings        │◄────────┤
│ created_by (FK) ├─────────┘
│ is_active       │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │ has many
         │
         ▼
┌─────────────────┐
│     Fields      │
├─────────────────┤
│ id (PK)         │
│ form_id (FK)    │
│ sub_form_id (FK)│
│ type            │
│ title           │
│ placeholder     │
│ required        │
│ order           │
│ options         │
│ show_condition  │
│ telegram_config │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│    SubForms     │
├─────────────────┤
│ id (PK)         │
│ form_id (FK)    │
│ title           │
│ description     │
│ order           │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  Submissions    │         │ SubmissionData  │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │◄────────┤ id (PK)         │
│ form_id (FK)    │  1:N    │ submission_id   │
│ submitted_by    │         │ field_id (FK)   │
│ status          │         │ value_text      │
│ ip_address      │         │ value_encrypted │
│ user_agent      │         │ value_type      │
│ submitted_at    │         │ created_at      │
│ created_at      │         │ updated_at      │
│ updated_at      │         └─────────────────┘
└─────────────────┘

┌─────────────────┐
│      Files      │
├─────────────────┤
│ id (PK)         │
│ submission_id   │
│ field_id (FK)   │
│ filename        │
│ original_name   │
│ mime_type       │
│ size            │
│ minio_path      │
│ minio_bucket    │
│ checksum        │
│ uploaded_by     │
│ uploaded_at     │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│   AuditLogs     │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ action          │
│ entity_type     │
│ entity_id       │
│ old_value       │
│ new_value       │
│ ip_address      │
│ user_agent      │
│ timestamp       │
└─────────────────┘

┌─────────────────┐
│    Sessions     │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ token           │
│ refresh_token   │
│ expires_at      │
│ ip_address      │
│ user_agent      │
│ created_at      │
│ last_used_at    │
└─────────────────┘
```

### Table Definitions

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name_enc TEXT,               -- Encrypted
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  phone_enc TEXT,                   -- Encrypted
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'user', 'viewer'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

#### Forms Table

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  roles_allowed JSONB DEFAULT '["user"]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forms_created_by ON forms(created_by);
CREATE INDEX idx_forms_is_active ON forms(is_active);
CREATE INDEX idx_forms_created_at ON forms(created_at);
```

#### Fields Table

```sql
CREATE TABLE fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  sub_form_id UUID REFERENCES sub_forms(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  placeholder VARCHAR(255),
  required BOOLEAN DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  options JSONB DEFAULT '{}'::jsonb,
  show_condition JSONB DEFAULT '{"enabled": true}'::jsonb,
  telegram_config JSONB DEFAULT '{"enabled": false}'::jsonb,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_field_type CHECK (
    type IN ('short_answer', 'paragraph', 'email', 'phone', 'number', 'url',
             'file_upload', 'image_upload', 'date', 'time', 'datetime',
             'multiple_choice', 'rating', 'slider', 'lat_long', 'province', 'factory')
  )
);

CREATE INDEX idx_fields_form_id ON fields(form_id);
CREATE INDEX idx_fields_sub_form_id ON fields(sub_form_id);
CREATE INDEX idx_fields_order ON fields("order");
```

#### SubForms Table

```sql
CREATE TABLE sub_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sub_forms_form_id ON sub_forms(form_id);
CREATE INDEX idx_sub_forms_order ON sub_forms("order");
```

#### Submissions Table

```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'submitted',
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'submitted', 'approved', 'rejected', 'archived')
  )
);

CREATE INDEX idx_submissions_form_id ON submissions(form_id);
CREATE INDEX idx_submissions_submitted_by ON submissions(submitted_by);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
```

#### SubmissionData Table

```sql
CREATE TABLE submission_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_encrypted TEXT,           -- Encrypted sensitive data
  value_type VARCHAR(50) NOT NULL,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_value_type CHECK (
    value_type IN ('string', 'number', 'boolean', 'date', 'json', 'file')
  )
);

CREATE INDEX idx_submission_data_submission_id ON submission_data(submission_id);
CREATE INDEX idx_submission_data_field_id ON submission_data(field_id);
```

#### Files Table

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  minio_path TEXT NOT NULL,
  minio_bucket VARCHAR(100) NOT NULL DEFAULT 'qcollector',
  checksum VARCHAR(64),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_submission_id ON files(submission_id);
CREATE INDEX idx_files_field_id ON files(field_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
```

#### AuditLogs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_action CHECK (
    action IN ('create', 'read', 'update', 'delete', 'login', 'logout')
  )
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

#### Sessions Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

---

## Security Architecture

### Data Encryption Strategy

#### Field-Level Encryption

**Sensitive Fields** (PII - Personally Identifiable Information):
- User full names
- Phone numbers
- Email addresses (stored both encrypted and plain for lookup)
- Submission data marked as sensitive
- File metadata (if contains personal info)

**Encryption Method**:
```javascript
// AES-256-GCM encryption
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedObj) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(encryptedObj.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));

  let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Authentication & Authorization

#### JWT-Based Authentication

**Access Token** (Short-lived):
- Expires: 15 minutes
- Contains: user_id, role, permissions
- Stored: Client localStorage/cookie

**Refresh Token** (Long-lived):
- Expires: 7 days
- Contains: user_id, session_id
- Stored: Database + HTTP-only cookie

**Token Structure**:
```javascript
{
  // Access Token Payload
  "user_id": "uuid",
  "username": "string",
  "role": "admin|manager|user|viewer",
  "permissions": ["read:forms", "write:submissions"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

#### Role-Based Access Control (RBAC)

**Roles**:
```javascript
const ROLES = {
  ADMIN: {
    name: 'admin',
    permissions: ['*'] // All permissions
  },
  MANAGER: {
    name: 'manager',
    permissions: [
      'read:forms', 'write:forms', 'delete:forms',
      'read:submissions', 'write:submissions', 'export:submissions',
      'read:users', 'write:users'
    ]
  },
  USER: {
    name: 'user',
    permissions: [
      'read:forms', 'write:submissions', 'read:own-submissions'
    ]
  },
  VIEWER: {
    name: 'viewer',
    permissions: [
      'read:forms', 'read:submissions'
    ]
  }
};
```

**Permission Middleware**:
```javascript
const requirePermission = (permission) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const rolePermissions = ROLES[userRole.toUpperCase()].permissions;

    if (rolePermissions.includes('*') || rolePermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Usage
router.post('/forms', requirePermission('write:forms'), createForm);
```

### Security Best Practices

1. **Password Security**:
   - bcrypt with 12 rounds
   - Minimum 8 characters, mix of upper/lower/numbers/symbols
   - No password reuse (store hash history)

2. **Input Validation**:
   - Joi schema validation
   - SQL injection prevention (parameterized queries)
   - XSS prevention (sanitize inputs)
   - CSRF protection

3. **Rate Limiting**:
   - Login: 5 attempts per 15 minutes
   - API: 100 requests per 15 minutes per IP
   - File upload: 10 per hour per user

4. **HTTPS Enforcement**:
   - SSL/TLS certificate
   - Redirect HTTP to HTTPS
   - HSTS headers

5. **Security Headers** (Helmet.js):
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - Content-Security-Policy
   - X-XSS-Protection

---

## API Design

### RESTful API Endpoints

#### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://api.qcollector.com/v1
```

#### Authentication Endpoints

```http
POST   /auth/register          # Register new user
POST   /auth/login             # Login
POST   /auth/refresh           # Refresh access token
POST   /auth/logout            # Logout
POST   /auth/forgot-password   # Request password reset
POST   /auth/reset-password    # Reset password with token
GET    /auth/me                # Get current user info
```

#### User Endpoints

```http
GET    /users                  # List all users (admin/manager)
GET    /users/:id              # Get user by ID
POST   /users                  # Create user (admin)
PUT    /users/:id              # Update user
DELETE /users/:id              # Delete user (admin)
PATCH  /users/:id/role         # Update user role (admin)
```

#### Form Endpoints

```http
GET    /forms                  # List all forms
GET    /forms/:id              # Get form by ID
POST   /forms                  # Create new form
PUT    /forms/:id              # Update form
DELETE /forms/:id              # Delete form
PATCH  /forms/:id/publish      # Publish form
POST   /forms/:id/duplicate    # Duplicate form

GET    /forms/:id/fields       # Get form fields
POST   /forms/:id/fields       # Add field to form
PUT    /forms/:id/fields/:fieldId  # Update field
DELETE /forms/:id/fields/:fieldId  # Delete field

GET    /forms/:id/subforms     # Get sub-forms
POST   /forms/:id/subforms     # Create sub-form
PUT    /forms/:id/subforms/:subFormId  # Update sub-form
DELETE /forms/:id/subforms/:subFormId  # Delete sub-form
```

#### Submission Endpoints

```http
GET    /submissions            # List all submissions (with filters)
GET    /submissions/:id        # Get submission by ID
POST   /submissions            # Create submission
PUT    /submissions/:id        # Update submission
DELETE /submissions/:id        # Delete submission
PATCH  /submissions/:id/status # Update submission status

GET    /forms/:formId/submissions       # Get submissions for form
POST   /forms/:formId/submissions       # Submit form data
GET    /submissions/:id/export          # Export submission (PDF/Excel)
GET    /forms/:formId/submissions/export # Export all submissions
```

#### File Endpoints

```http
POST   /files/upload           # Upload file
GET    /files/:id              # Get file metadata
GET    /files/:id/download     # Download file
DELETE /files/:id              # Delete file
GET    /submissions/:id/files  # Get files for submission
```

#### Audit Endpoints

```http
GET    /audit                  # Get audit logs (admin)
GET    /audit/user/:userId     # Get user audit trail
GET    /audit/entity/:type/:id # Get entity audit trail
```

### API Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful",
  "timestamp": "2025-09-30T10:30:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details
    }
  },
  "timestamp": "2025-09-30T10:30:00Z"
}
```

#### Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

---

## File Storage Strategy

### MinIO Configuration

#### Bucket Structure
```
qcollector/
├── uploads/
│   ├── forms/
│   │   └── {formId}/
│   │       └── {submissionId}/
│   │           ├── {fieldId}/
│   │           │   └── {filename}
│   │           └── ...
│   └── temp/                    # Temporary uploads
│       └── {userId}/
│           └── {timestamp}-{filename}
│
└── exports/                     # Generated exports
    ├── pdf/
    └── excel/
```

#### File Upload Process

1. **Client Upload Request**:
```javascript
POST /files/upload
Content-Type: multipart/form-data

{
  formData: {
    file: File,
    submissionId: "uuid",
    fieldId: "uuid"
  }
}
```

2. **Server Processing**:
```javascript
// 1. Validate file (size, type, virus scan)
// 2. Generate unique filename
// 3. Upload to MinIO
// 4. Create database record
// 5. Return file metadata
```

3. **MinIO Storage**:
```javascript
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

async function uploadFile(file, path) {
  const metaData = {
    'Content-Type': file.mimetype,
    'X-Uploaded-By': file.userId
  };

  await minioClient.putObject(
    'qcollector',
    path,
    file.buffer,
    file.size,
    metaData
  );

  return {
    bucket: 'qcollector',
    path: path,
    size: file.size,
    mimeType: file.mimetype
  };
}
```

---

## Docker Infrastructure

### docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: qcollector_postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - qcollector_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO Object Storage
  minio:
    image: minio/minio:latest
    container_name: qcollector_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    networks:
      - qcollector_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: qcollector_redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - qcollector_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # API Backend
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: qcollector_api
    environment:
      NODE_ENV: ${NODE_ENV}
      PORT: ${API_PORT}
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "5000:5000"
    networks:
      - qcollector_network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: qcollector_nginx
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/build:/usr/share/nginx/html:ro
    ports:
      - "80:80"
      - "443:443"
    networks:
      - qcollector_network
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  minio_data:
  redis_data:

networks:
  qcollector_network:
    driver: bridge
```

### Environment Variables (.env)

```bash
# Node Environment
NODE_ENV=development

# API Configuration
API_PORT=5000
API_URL=http://localhost:5000

# PostgreSQL
POSTGRES_USER=qcollector
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=qcollector_db
DATABASE_URL=postgresql://qcollector:your_secure_password_here@localhost:5432/qcollector_db

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password_here
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET=qcollector

# Redis
REDIS_PASSWORD=your_redis_password_here
REDIS_URL=redis://:your_redis_password_here@localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

---

## Development Phases

### Phase 1: Foundation Setup (Week 1-2)

**Goal**: Set up development environment and core infrastructure

**Tasks**:
1. ✅ Initialize Node.js project with Express
2. ✅ Configure Docker Compose with PostgreSQL, MinIO, Redis
3. ✅ Set up Sequelize ORM with initial models
4. ✅ Create database migrations and seeders
5. ✅ Implement basic authentication (JWT)
6. ✅ Set up logging with Winston
7. ✅ Configure environment variables
8. ✅ Create basic API structure

**Deliverables**:
- Working Docker environment
- Database schema implemented
- Basic API endpoints (health check, auth)
- Initial documentation

---

### Phase 2: Core Services (Week 3-4)

**Goal**: Implement business logic services

**Tasks**:
1. ✅ User Service (CRUD, authentication)
2. ✅ Form Service (create, read, update, delete forms)
3. ✅ Field Service (manage form fields)
4. ✅ SubForm Service (nested form management)
5. ✅ Encryption Service (PII encryption/decryption)
6. ✅ Validation Service (input validation)
7. ✅ RBAC Middleware (role-based access control)

**Deliverables**:
- Complete service layer
- Unit tests for services
- API documentation (Swagger)

---

### Phase 3: Submission & File Handling (Week 5-6)

**Goal**: Implement submission and file management

**Tasks**:
1. ✅ Submission Service (create, update, list submissions)
2. ✅ File Service (upload, download, delete)
3. ✅ MinIO integration
4. ✅ File validation and virus scanning
5. ✅ Submission data encryption
6. ✅ Export functionality (PDF, Excel)

**Deliverables**:
- Submission management system
- File upload/download working
- Export feature implemented

---

### Phase 4: Advanced Features (Week 7-8)

**Goal**: Implement advanced features and integrations

**Tasks**:
1. ✅ Audit logging system
2. ✅ Redis caching layer
3. ✅ Rate limiting
4. ✅ Telegram notification service
5. ✅ Search and filtering
6. ✅ Data analytics endpoints

**Deliverables**:
- Complete audit trail
- Caching working
- Telegram notifications functional

---

### Phase 5: Testing & Security (Week 9-10)

**Goal**: Comprehensive testing and security hardening

**Tasks**:
1. ✅ Unit tests (80%+ coverage)
2. ✅ Integration tests
3. ✅ Security audit
4. ✅ Performance testing
5. ✅ Load testing
6. ✅ Security headers implementation
7. ✅ Penetration testing

**Deliverables**:
- Test suite passing
- Security audit report
- Performance benchmarks

---

### Phase 6: Documentation & Deployment (Week 11-12)

**Goal**: Production deployment and documentation

**Tasks**:
1. ✅ API documentation (Swagger/OpenAPI)
2. ✅ Deployment guide
3. ✅ User manual
4. ✅ Production environment setup
5. ✅ CI/CD pipeline (GitHub Actions)
6. ✅ Monitoring setup (Prometheus/Grafana)
7. ✅ Backup strategy

**Deliverables**:
- Complete documentation
- Production deployment
- Monitoring dashboards
- Backup system working

---

## Specialized Agents

### Agent Architecture

Create specialized agents to assist in backend development:

#### 1. **database-architect** Agent
**Purpose**: Design and implement database schemas

**Tools**: Read, Write, Edit, Bash
**Responsibilities**:
- Create Sequelize models
- Write database migrations
- Design table relationships
- Optimize queries and indexes

#### 2. **api-builder** Agent
**Purpose**: Build RESTful API endpoints

**Tools**: Read, Write, Edit, Bash
**Responsibilities**:
- Create Express routes
- Implement controllers
- Add input validation
- Write API documentation

#### 3. **security-engineer** Agent
**Purpose**: Implement security features

**Tools**: Read, Write, Edit, Bash
**Responsibilities**:
- Encryption implementation
- Authentication/authorization
- Security middleware
- Vulnerability scanning

#### 4. **service-developer** Agent
**Purpose**: Build business logic services

**Tools**: Read, Write, Edit, Bash
**Responsibilities**:
- Create service classes
- Implement business logic
- Add error handling
- Write unit tests

#### 5. **docker-engineer** Agent
**Purpose**: Configure Docker and deployment

**Tools**: Read, Write, Edit, Bash
**Responsibilities**:
- Docker Compose setup
- Container optimization
- Nginx configuration
- Deployment scripts

#### 6. **test-engineer** Agent
**Purpose**: Write comprehensive tests

**Tools**: Read, Write, Edit, Bash
**Responsibilities**:
- Unit test implementation
- Integration tests
- API testing
- Test coverage reports

---

## Success Metrics

### Performance Targets

- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 50ms (average)
- **File Upload Speed**: > 5MB/s
- **Concurrent Users**: 1000+ simultaneous
- **Uptime**: 99.9%

### Quality Targets

- **Test Coverage**: > 80%
- **Code Quality**: A grade (ESLint/SonarQube)
- **Security Score**: A+ (OWASP)
- **API Documentation**: 100% coverage

### Development Targets

- **Development Time**: 12 weeks
- **Bug Rate**: < 1 critical bug per week
- **Code Review**: All PRs reviewed within 24h
- **Documentation**: Real-time updates

---

## Risk Management

### Technical Risks

1. **Data Loss**: Mitigated by automated backups (daily)
2. **Security Breach**: Mitigated by encryption, audit logs, security testing
3. **Performance Degradation**: Mitigated by caching, query optimization
4. **Service Downtime**: Mitigated by Docker, load balancing, monitoring

### Mitigation Strategies

1. **Automated Backups**: PostgreSQL daily backups to S3
2. **Monitoring**: Real-time alerts for errors/performance
3. **Disaster Recovery**: Documented recovery procedures
4. **Scalability**: Horizontal scaling with Docker Swarm/Kubernetes

---

## Next Steps

1. ✅ Review and approve this plan
2. ✅ Set up development environment
3. ✅ Create specialized agents
4. ✅ Start Phase 1 implementation
5. ✅ Weekly progress reviews
6. ✅ Continuous testing and documentation

---

**Document Version**: 1.0
**Created**: 2025-09-30
**Status**: Ready for Implementation
**Estimated Timeline**: 12 weeks
**Team Size**: 1 developer + AI agents
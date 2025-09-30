# Q-Collector: Complete Application Documentation

**Version**: 0.5.0
**Release Date**: 2025-09-30
**Application Type**: Enterprise Form Builder & Data Collection System
**Target Market**: Thai Business & Industrial Organizations

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Frontend Application](#frontend-application)
5. [Backend Application](#backend-application)
6. [Database Schema](#database-schema)
7. [User Workflows](#user-workflows)
8. [Key Features](#key-features)
9. [Integration Systems](#integration-systems)
10. [Security](#security)
11. [Deployment](#deployment)
12. [Development Guide](#development-guide)

---

## Overview

### Application Purpose

Q-Collector is a comprehensive form builder and data collection system designed for Thai businesses. It enables users to:

- **Create custom forms** with 17 different field types
- **Collect data** through web-based forms
- **Manage submissions** with powerful filtering and search
- **Send notifications** via Telegram integration
- **Manage users** with role-based access control (RBAC)
- **Track activities** with audit logs and analytics

### Core Philosophy

- **Mobile-First Design**: Optimized for both desktop and mobile devices
- **Thai Localization**: Full Thai language support with locale-specific features
- **Real-Time Updates**: WebSocket-based live notifications
- **Scalable Architecture**: Microservice-ready with Redis caching
- **Modern UI/UX**: Glass morphism, animations, and intuitive interfaces

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │   Mobile     │  │   Tablet     │     │
│  │   (React)    │  │   (React)    │  │   (React)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   REST API    │
                    │   (Express)   │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼───────┐
│   PostgreSQL   │  │     Redis      │  │    MinIO     │
│   (Database)   │  │    (Cache)     │  │  (Storage)   │
└────────────────┘  └────────────────┘  └──────────────┘
```

### Application Layers

#### 1. **Presentation Layer** (Frontend - React)
- User Interface Components (ShadCN UI)
- State Management (React Context)
- Local Storage Service
- API Client Integration

#### 2. **API Layer** (Backend - Express.js)
- RESTful API Endpoints
- WebSocket Server (Socket.IO)
- Authentication Middleware
- Request Validation
- Rate Limiting

#### 3. **Business Logic Layer** (Services)
- Form Management
- Submission Processing
- User Management
- File Handling
- Notification Services
- Analytics Processing

#### 4. **Data Layer**
- PostgreSQL (Primary Database)
- Redis (Caching & Sessions)
- MinIO (File Storage)
- LocalStorage (Frontend Cache)

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI Framework |
| React Router DOM | 7.9.3 | Navigation & Routing |
| ShadCN UI | Latest | Component Library |
| Tailwind CSS | 3.3.0 | Styling Framework |
| Framer Motion | 12.23.21 | Animation Library |
| @dnd-kit | 6.3.1 | Drag & Drop |
| Axios | 1.12.2 | HTTP Client |
| Lucide React | 0.544.0 | Icon Library |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥20.0.0 | Runtime Environment |
| Express.js | 4.21.1 | Web Framework |
| PostgreSQL | Latest | Primary Database |
| Sequelize | 6.37.5 | ORM |
| Redis | 4.7.0 | Caching & Sessions |
| MinIO | 8.0.2 | Object Storage |
| Socket.IO | 4.7.5 | WebSocket Server |
| Bull | 4.16.5 | Queue Management |
| JWT | 9.0.2 | Authentication |
| Bcrypt | 2.4.3 | Password Hashing |
| Winston | 3.17.0 | Logging |

### Development Tools

- **Version Control**: Git
- **Package Manager**: NPM
- **Code Quality**: ESLint
- **Testing**: Jest, Supertest, Playwright
- **Documentation**: Swagger/OpenAPI

---

## Frontend Application

### Directory Structure

```
src/
├── components/          # React Components
│   ├── MainFormApp.jsx              # Main app container & routing
│   ├── EnhancedFormBuilder.jsx      # Form creation interface
│   ├── FormView.jsx                 # Form data entry
│   ├── FormListApp.jsx              # Form list management
│   ├── FormSubmissionList.jsx       # Submission list view
│   ├── SubmissionDetail.jsx         # Single submission view
│   ├── SubFormView.jsx              # Sub-form data entry
│   ├── SubFormDetail.jsx            # Sub-form submission detail
│   ├── UserManagement.jsx           # User administration
│   ├── AppRouter.jsx                # Application routing
│   ├── auth/                        # Authentication components
│   └── ui/                          # Reusable UI components
│       ├── glass-input.jsx          # Glass morphism input
│       ├── unified-field-row.jsx    # Field editor row
│       ├── telegram-notification-settings.jsx
│       ├── field-preview-card.jsx
│       ├── image-thumbnail.jsx
│       ├── user-menu.jsx
│       └── custom-select.jsx
├── services/           # Business Logic Services
│   ├── DataService.js               # LocalStorage management
│   ├── FormService.js               # Form operations
│   ├── SubmissionService.js         # Submission handling
│   ├── FileService.js               # File upload/download
│   ├── TelegramService.js           # Telegram integration
│   ├── AuthService.js               # Authentication
│   └── ApiClient.js                 # API communication
├── contexts/           # React Context Providers
│   ├── AuthContext.jsx              # Authentication state
│   └── StorageContext.jsx           # Storage management
├── hooks/              # Custom React Hooks
│   └── useAdvancedFormFeatures.js   # Form feature hooks
├── utils/              # Utility Functions
│   ├── advancedFormulaEngine.js     # Conditional logic engine
│   ├── progressiveFormDisclosure.js # Dynamic form display
│   ├── tokenManager.js              # JWT token handling
│   └── apiHelpers.js                # API utility functions
├── config/             # Configuration
│   └── api.config.js                # API endpoints
├── App.js              # Root component
├── index.js            # Application entry point
└── index.css           # Global styles
```

### Core Components

#### 1. **MainFormApp.jsx** - Application Container

**Responsibilities:**
- Central navigation and routing management
- State management for current view, form, submission
- Callback handlers for all navigation events
- View rendering based on current state

**Key State Variables:**
```javascript
const [currentView, setCurrentView] = useState('list'); // 'list', 'builder', 'form-view', 'submission-list', 'submission-detail'
const [currentFormId, setCurrentFormId] = useState(null);
const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
const [isEditMode, setIsEditMode] = useState(false);
const [currentSubFormId, setCurrentSubFormId] = useState(null);
```

**Navigation Flow:**
```
Form List → Form Builder (Create/Edit) → Form View (Data Entry)
                                      ↓
                          Submission List → Submission Detail
                                           ↓
                                    Sub-Form View → Sub-Form Detail
```

#### 2. **EnhancedFormBuilder.jsx** - Form Creation Interface

**Features:**
- **Drag-and-Drop Field Management**: Using @dnd-kit library
- **17 Field Types**: text, number, email, phone, date, file, etc.
- **Field Configuration**: Label, description, required, validation
- **Conditional Visibility**: Formula-based field show/hide
- **Telegram Notifications**: Field ordering and message prefix
- **Sub-Form Management**: Nested forms with relationships
- **Settings Management**: Form-wide configuration

**Main Sections:**
1. **Fields Tab**: Field creation and management
2. **Sub-Forms Tab**: Sub-form definition and management
3. **Settings Tab**: Telegram, notifications, advanced settings

**Field Types Available:**
```javascript
const FIELD_TYPES = [
  'short_answer',      // Single-line text
  'paragraph',         // Multi-line text
  'email',            // Email validation
  'phone',            // Thai phone format
  'number',           // Numeric input
  'url',              // URL validation
  'date',             // Date picker
  'time',             // Time picker
  'datetime',         // Date + time picker
  'multiple_choice',  // Radio buttons / Dropdown
  'rating',           // Star rating (1-5)
  'slider',           // Range slider
  'file_upload',      // Single file
  'image_upload',     // Image with preview
  'lat_long',         // Geolocation
  'province',         // Thai provinces
  'factory'           // Factory selector
];
```

**Auto-Scroll Feature:**
- Auto-scrolls to newly added fields
- Aligns expanded field settings with top menu
- Smooth animation using `scrollIntoView`

#### 3. **FormView.jsx** - Data Entry Interface

**Features:**
- Dynamic form rendering based on field configuration
- Real-time validation with Thai language error messages
- Conditional field visibility based on formula engine
- File upload with progress tracking
- Geolocation capture for lat_long fields
- Thai province selector with search
- Auto-save draft functionality
- Sub-form relationship management

**Validation Engine:**
```javascript
const validateField = (field, value) => {
  if (field.required && !value) {
    return `กรุณากรอก ${field.label}`;
  }

  // Type-specific validation
  if (field.type === 'email' && !isValidEmail(value)) {
    return 'รูปแบบอีเมลไม่ถูกต้อง';
  }

  if (field.type === 'phone' && !isValidThaiPhone(value)) {
    return 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (0812345678)';
  }

  return null;
};
```

#### 4. **FormSubmissionList.jsx** - Submission Management

**Features:**
- Tabular data display with responsive design
- Search and filter functionality
- Sort by multiple columns
- Bulk actions (delete, export)
- Export to CSV/Excel
- Pagination with configurable page size
- Quick actions (view, edit, delete)

**Data Table Structure:**
```javascript
{
  submissionId: 'uuid',
  documentNumber: 'DOC-2025-001',
  submittedAt: '2025-09-30T10:30:00Z',
  submittedBy: 'user@example.com',
  status: 'approved',
  fields: { /* dynamic field values */ },
  subFormCount: 3
}
```

#### 5. **SubmissionDetail.jsx** - Detail View

**Features:**
- Read-only view of submission data
- Field-by-field display with labels
- Image thumbnails with lightbox
- File download links
- Sub-form list with counts
- Quick actions (edit, delete, add new)
- Navigation breadcrumbs
- Floating add button for new submission

**Layout Sections:**
1. **Header**: Document number, timestamp, actions
2. **Main Content**: Field values in card layout
3. **Sub-Forms**: List of related sub-form submissions
4. **Footer**: Navigation and action buttons

#### 6. **Telegram Notification Settings** - Advanced Integration

**Features:**
- **Message Prefix Editor**: Custom notification header with placeholders
- **Field Ordering**: Drag-and-drop interface for field selection
- **Dual-Panel Design**:
  - Left: Available fields
  - Right: Selected fields (ordered)
- **Test Connection**: Real Telegram API test with formatted message
- **Placeholder Support**: [FormName], [DateTime]

**Message Building Logic:**
```javascript
const buildTelegramMessage = (form, submission, settings) => {
  // 1. Build header with prefix
  let header = settings.messagePrefix
    .replace(/\[FormName\]/g, form.title)
    .replace(/\[DateTime\]/g, timestamp);

  // 2. Add ordered fields
  let body = '';
  settings.selectedFields.forEach(field => {
    const value = submission.data[field.id];
    body += `*${field.title}:* ${formatValue(value)}\n`;
  });

  // 3. Add footer
  let footer = `\n⏰ ${timestamp}`;

  return header + '\n\n' + body + footer;
};
```

### Service Layer

#### DataService.js - LocalStorage Management

**Core Functions:**
```javascript
class DataService {
  // Form Operations
  getAllForms()              // Get all forms
  getFormById(id)            // Get single form
  saveForm(form)             // Create/update form
  deleteForm(id)             // Delete form

  // Submission Operations
  getAllSubmissions()        // Get all submissions
  getSubmissionsByFormId(formId)  // Get form submissions
  getSubmissionById(id)      // Get single submission
  saveSubmission(submission) // Create/update submission
  deleteSubmission(id)       // Delete submission

  // Sub-Form Operations
  getSubFormSubmissions(formId, submissionId, subFormId)
  saveSubFormSubmission(formId, submissionId, subFormSubmission)

  // Utility
  exportData()               // Export all data as JSON
  importData(data)           // Import data from JSON
  clearAllData()             // Reset system
}
```

#### SubmissionService.js - Submission Processing

**Responsibilities:**
- Form submission validation
- Data persistence (localStorage or API)
- File upload coordination
- Telegram notification triggering
- Sub-form relationship management

**Key Functions:**
```javascript
async submitForm(formId, data) {
  // 1. Validate data
  const validation = this.validateSubmission(form, data);
  if (!validation.valid) throw new Error(validation.errors);

  // 2. Upload files
  const uploadedFiles = await this.uploadFiles(data.files);

  // 3. Create submission record
  const submission = await this.createSubmission(formId, {
    ...data,
    files: uploadedFiles,
    submittedAt: new Date(),
    submittedBy: currentUser
  });

  // 4. Send Telegram notification
  await this.sendTelegramNotification(form, submission);

  // 5. Return result
  return { success: true, submissionId: submission.id };
}
```

#### TelegramService.js - Telegram Integration

**Features:**
- Bot API integration
- Message formatting with Markdown
- Field ordering and selection
- Placeholder replacement
- Error handling and retry logic

**Configuration:**
```javascript
{
  enabled: true,
  botToken: '7794493324:AAHlxtpYenok1kwyo88ns5R4rivWWXcqmE0',
  groupId: '-4847325737',
  messagePrefix: '🔔 แบบฟอร์ม: [FormName]\n📅 เวลา: [DateTime]',
  selectedFields: [
    { id: 'field1', order: 0 },
    { id: 'field2', order: 1 }
  ]
}
```

**API Integration:**
```javascript
async sendMessage(botToken, chatId, message) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await axios.post(url, {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown'
  });
  return response.data;
}
```

### UI Components Library

#### Glass Morphism Components

**GlassInput.jsx**:
```jsx
<GlassInput
  label="Field Label"
  value={value}
  onChange={handleChange}
  placeholder="Enter value..."
  required={true}
  error={errorMessage}
/>
```

**Features:**
- Backdrop blur effect
- Gradient borders
- Smooth focus transitions
- Error state styling
- Icon support

#### Animated Components

**AnimatedAddButton**:
```jsx
<AnimatedAddButton
  onClick={handleAdd}
  tooltip="Add New Field"
  size="default"  // small, default, large
/>
```

**Effects:**
- Circular design with pulsing glow
- Rotating outer ring animation
- Sparkle particles on hover
- Ripple effect on click
- Smooth scale transitions

#### Enhanced Toast System

**Portal-Based Rendering**:
```jsx
const toast = useEnhancedToast();

// Success toast
toast.success('Form saved!', {
  title: 'Success',
  duration: 5000
});

// Error with action
toast.error('Failed to save', {
  title: 'Error',
  action: {
    label: 'Retry',
    onClick: () => retry()
  }
});

// Warning
toast.warning('Please review', {
  title: 'Warning'
});
```

**Features:**
- Portal rendering (escapes container constraints)
- Auto-dismiss with timer
- Action buttons
- Multiple toast stacking
- Smooth entrance/exit animations

---

## Backend Application

### Directory Structure

```
backend/
├── api/                # API Layer
│   ├── routes/         # Route definitions
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── form.routes.js
│   │   ├── submission.routes.js
│   │   ├── file.routes.js
│   │   ├── telegram.routes.js
│   │   ├── analytics.routes.js
│   │   ├── cache.routes.js
│   │   ├── queue.routes.js
│   │   ├── email.routes.js
│   │   └── websocket.routes.js
│   ├── app.js          # Express app configuration
│   └── server.js       # Server entry point
├── config/             # Configuration
│   ├── database.config.js
│   ├── cache.config.js
│   ├── swagger.config.js
│   └── swagger.js
├── middleware/         # Express Middleware
│   ├── auth.middleware.js
│   ├── cache.middleware.js
│   └── websocket.middleware.js
├── models/             # Database Models (Sequelize)
│   ├── User.js
│   ├── Form.js
│   ├── Submission.js
│   ├── File.js
│   ├── AuditLog.js
│   └── Session.js
├── services/           # Business Logic
│   ├── AuthService.js
│   ├── UserService.js
│   ├── FormService.js
│   ├── SubmissionService.js
│   ├── FileService.js
│   ├── TelegramService.js
│   ├── EmailService.js
│   ├── CacheService.js
│   ├── QueueService.js
│   ├── ProcessorService.js
│   ├── AnalyticsService.js
│   ├── WebSocketService.js
│   ├── NotificationService.js
│   └── TwoFactorService.js
├── processors/         # Background Job Processors
│   ├── email.processor.js
│   ├── notification.processor.js
│   └── analytics.processor.js
├── migrations/         # Database Migrations
│   ├── 007-add-two-factor-auth.sql
│   ├── 20250930-add-user-fields.sql
│   └── update-user-roles.sql
├── scripts/            # Utility Scripts
│   ├── create-super-admin.js
│   ├── add-user-fields.js
│   └── run-migration.js
├── tests/              # Test Files
│   └── websocket.test.js
├── utils/              # Utility Functions
│   ├── encryption.util.js
│   └── websocket-integration.util.js
├── .env                # Environment variables
└── package.json        # Dependencies
```

### API Routes

#### Authentication Routes (`auth.routes.js`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| POST | `/api/v1/auth/logout` | Logout user | Yes |
| POST | `/api/v1/auth/refresh` | Refresh access token | Yes |
| GET | `/api/v1/auth/me` | Get current user | Yes |
| POST | `/api/v1/auth/change-password` | Change password | Yes |
| POST | `/api/v1/auth/forgot-password` | Request password reset | No |
| POST | `/api/v1/auth/reset-password` | Reset password | No |

**Login Flow:**
```javascript
POST /api/v1/auth/login
Body: {
  "identifier": "pongpanp",  // username or email
  "password": "Gfvtmiu613"
}

Response: {
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "pongpanp",
      "email": "pongpanp@qcon.co.th",
      "role": "super_admin",
      "department": "Technic"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

#### User Routes (`user.routes.js`)

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users` | List all users | Admin+ |
| GET | `/api/v1/users/:id` | Get user by ID | Admin+ |
| POST | `/api/v1/users` | Create user | Super Admin |
| PUT | `/api/v1/users/:id` | Update user | Admin+ |
| DELETE | `/api/v1/users/:id` | Delete user | Super Admin |
| GET | `/api/v1/users/:id/forms` | Get user's forms | Self/Admin+ |
| GET | `/api/v1/users/:id/submissions` | Get user's submissions | Self/Admin+ |

**User Roles Hierarchy:**
```
super_admin (Full system access)
  ↓
admin (User & form management)
  ↓
moderator (Content moderation)
  ↓
customer_service, sales, marketing, technic (Department roles)
  ↓
general_user (Basic access)
```

#### Form Routes (`form.routes.js`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/forms` | List all forms | Yes |
| GET | `/api/v1/forms/:id` | Get form by ID | Yes |
| POST | `/api/v1/forms` | Create form | Yes |
| PUT | `/api/v1/forms/:id` | Update form | Yes (Owner/Admin) |
| DELETE | `/api/v1/forms/:id` | Delete form | Yes (Owner/Admin) |
| POST | `/api/v1/forms/:id/duplicate` | Duplicate form | Yes |
| GET | `/api/v1/forms/:id/submissions` | Get form submissions | Yes |
| GET | `/api/v1/forms/:id/analytics` | Get form analytics | Yes |

**Form Data Structure:**
```javascript
{
  "id": "uuid",
  "title": "Customer Registration Form",
  "description": "Register new customers",
  "fields": [
    {
      "id": "field_1",
      "type": "short_answer",
      "label": "Full Name",
      "required": true,
      "order": 0,
      "conditionalVisibility": {
        "enabled": true,
        "formula": "[customer_type] = 'individual'"
      },
      "sendTelegram": true,
      "telegramOrder": 0
    }
  ],
  "subForms": [
    {
      "id": "subform_1",
      "title": "Contact Information",
      "fields": [...]
    }
  ],
  "telegramSettings": {
    "enabled": true,
    "botToken": "...",
    "groupId": "...",
    "messagePrefix": "🔔 [FormName]",
    "selectedFields": [...]
  },
  "createdBy": "user_id",
  "createdAt": "2025-09-30T10:00:00Z",
  "updatedAt": "2025-09-30T10:00:00Z"
}
```

#### Submission Routes (`submission.routes.js`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/submissions` | List submissions | Yes |
| GET | `/api/v1/submissions/:id` | Get submission | Yes |
| POST | `/api/v1/submissions` | Create submission | Yes |
| PUT | `/api/v1/submissions/:id` | Update submission | Yes (Owner/Admin) |
| DELETE | `/api/v1/submissions/:id` | Delete submission | Yes (Owner/Admin) |
| POST | `/api/v1/submissions/:id/approve` | Approve submission | Yes (Moderator+) |
| POST | `/api/v1/submissions/:id/reject` | Reject submission | Yes (Moderator+) |
| GET | `/api/v1/submissions/export` | Export to CSV/Excel | Yes |

**Submission Data Structure:**
```javascript
{
  "id": "uuid",
  "formId": "form_uuid",
  "documentNumber": "DOC-2025-001",
  "data": {
    "field_1": "John Doe",
    "field_2": "john@example.com",
    "field_file": {
      "fileId": "file_uuid",
      "filename": "document.pdf",
      "url": "/api/v1/files/file_uuid"
    }
  },
  "subFormSubmissions": [
    {
      "subFormId": "subform_1",
      "submissions": [...]
    }
  ],
  "status": "pending",  // pending, approved, rejected
  "submittedBy": "user_id",
  "submittedAt": "2025-09-30T10:30:00Z",
  "approvedBy": null,
  "approvedAt": null
}
```

#### File Routes (`file.routes.js`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/files/upload` | Upload file | Yes |
| GET | `/api/v1/files/:id` | Get file metadata | Yes |
| GET | `/api/v1/files/:id/download` | Download file | Yes |
| DELETE | `/api/v1/files/:id` | Delete file | Yes (Owner/Admin) |
| POST | `/api/v1/files/upload-multiple` | Upload multiple files | Yes |

**File Upload Process:**
```javascript
// 1. Client uploads file
POST /api/v1/files/upload
Headers: {
  "Authorization": "Bearer jwt_token",
  "Content-Type": "multipart/form-data"
}
Body: FormData with file

// 2. Server processes
- Validate file type and size
- Generate unique filename
- Upload to MinIO storage
- Create database record
- Return file metadata

// 3. Response
{
  "success": true,
  "data": {
    "fileId": "uuid",
    "filename": "document.pdf",
    "originalName": "my-document.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "url": "/api/v1/files/uuid/download"
  }
}
```

### Service Layer

#### AuthService.js - Authentication & Authorization

**Core Functions:**
```javascript
class AuthService {
  // User authentication
  async register(userData) {}
  async login(identifier, password) {}
  async logout(userId, sessionId) {}
  async refreshToken(refreshToken) {}

  // Password management
  async changePassword(userId, oldPassword, newPassword) {}
  async forgotPassword(email) {}
  async resetPassword(token, newPassword) {}

  // Token management
  generateAccessToken(user) {}
  generateRefreshToken(user) {}
  verifyToken(token) {}

  // Session management
  async createSession(userId, ipAddress, userAgent) {}
  async revokeSession(sessionId) {}
  async getActiveSessions(userId) {}
}
```

**JWT Token Structure:**
```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "user_uuid",
    "username": "pongpanp",
    "email": "pongpanp@qcon.co.th",
    "role": "super_admin",
    "iat": 1727697600,
    "exp": 1727701200
  },
  "signature": "..."
}
```

#### UserService.js - User Management

**Functions:**
```javascript
class UserService {
  async getAllUsers(filters) {}
  async getUserById(id) {}
  async createUser(userData) {}
  async updateUser(id, updateData) {}
  async deleteUser(id) {}
  async getUsersByRole(role) {}
  async activateUser(id) {}
  async deactivateUser(id) {}
  async getUserForms(userId) {}
  async getUserSubmissions(userId) {}
}
```

**User Creation with Encryption:**
```javascript
async createUser(userData) {
  // 1. Validate input
  const validation = validateUserData(userData);
  if (!validation.valid) throw new Error(validation.errors);

  // 2. Hash password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(userData.password, salt);

  // 3. Encrypt sensitive data
  const fullNameEnc = encrypt(userData.fullName);
  const phoneEnc = encrypt(userData.phone);

  // 4. Create user record
  const user = await User.create({
    username: userData.username,
    email: userData.email,
    password_hash: passwordHash,
    full_name_enc: JSON.stringify(fullNameEnc),
    phone_enc: JSON.stringify(phoneEnc),
    role: userData.role || 'general_user',
    department: userData.department
  });

  // 5. Log audit trail
  await AuditLog.create({
    action: 'user_created',
    userId: user.id,
    metadata: { createdBy: currentUser.id }
  });

  return user;
}
```

#### FormService.js - Form Management

**Functions:**
```javascript
class FormService {
  async getAllForms(userId, filters) {}
  async getFormById(id) {}
  async createForm(formData, userId) {}
  async updateForm(id, formData, userId) {}
  async deleteForm(id, userId) {}
  async duplicateForm(id, userId) {}
  async getFormSubmissions(formId, filters) {}
  async getFormAnalytics(formId) {}
  async validateForm(formData) {}
}
```

**Form Validation:**
```javascript
validateForm(formData) {
  const errors = [];

  // Basic validation
  if (!formData.title) errors.push('Title is required');
  if (!formData.fields || formData.fields.length === 0) {
    errors.push('At least one field is required');
  }

  // Field validation
  formData.fields.forEach((field, index) => {
    if (!field.type) errors.push(`Field ${index}: Type is required`);
    if (!field.label) errors.push(`Field ${index}: Label is required`);

    // Validate conditional visibility formula
    if (field.conditionalVisibility?.enabled) {
      const formulaValidation = this.validateFormula(
        field.conditionalVisibility.formula
      );
      if (!formulaValidation.valid) {
        errors.push(`Field ${index}: Invalid formula`);
      }
    }
  });

  // Sub-form validation
  if (formData.subForms) {
    formData.subForms.forEach((subForm, index) => {
      if (!subForm.title) errors.push(`Sub-form ${index}: Title required`);
      if (!subForm.fields) errors.push(`Sub-form ${index}: Fields required`);
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

#### SubmissionService.js - Submission Processing

**Functions:**
```javascript
class SubmissionService {
  async createSubmission(formId, data, userId) {}
  async updateSubmission(id, data, userId) {}
  async deleteSubmission(id, userId) {}
  async getSubmissionById(id) {}
  async getSubmissionsByForm(formId, filters) {}
  async approveSubmission(id, userId) {}
  async rejectSubmission(id, userId, reason) {}
  async exportSubmissions(formId, format) {}
}
```

**Complete Submission Flow:**
```javascript
async createSubmission(formId, data, userId) {
  // 1. Get form definition
  const form = await FormService.getFormById(formId);
  if (!form) throw new Error('Form not found');

  // 2. Validate submission data
  const validation = this.validateSubmission(form, data);
  if (!validation.valid) throw new Error(validation.errors);

  // 3. Process file uploads
  const processedData = { ...data };
  for (const field of form.fields) {
    if (field.type === 'file_upload' || field.type === 'image_upload') {
      if (data[field.id]) {
        const file = await FileService.uploadFile(data[field.id], userId);
        processedData[field.id] = {
          fileId: file.id,
          filename: file.filename,
          url: file.url
        };
      }
    }
  }

  // 4. Generate document number
  const documentNumber = await this.generateDocumentNumber(formId);

  // 5. Create submission record
  const submission = await Submission.create({
    id: uuidv4(),
    formId,
    documentNumber,
    data: processedData,
    status: 'pending',
    submittedBy: userId,
    submittedAt: new Date()
  });

  // 6. Send Telegram notification
  if (form.telegramSettings?.enabled) {
    await TelegramService.sendFormSubmissionNotification(
      form,
      submission,
      form.telegramSettings
    );
  }

  // 7. Send email notifications
  await NotificationService.sendSubmissionNotifications(form, submission);

  // 8. Queue background tasks
  await QueueService.addJob('process-submission', {
    submissionId: submission.id,
    formId,
    userId
  });

  // 9. Emit WebSocket event
  await WebSocketService.emitSubmissionCreated(submission);

  // 10. Log audit trail
  await AuditLog.create({
    action: 'submission_created',
    userId,
    entityType: 'submission',
    entityId: submission.id,
    metadata: { formId, documentNumber }
  });

  return submission;
}
```

#### TelegramService.js - Telegram Bot Integration

**Configuration:**
```javascript
const TELEGRAM_CONFIG = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  GROUP_ID: process.env.TELEGRAM_GROUP_ID,
  API_BASE_URL: 'https://api.telegram.org'
};
```

**Core Functions:**
```javascript
class TelegramService {
  async sendFormSubmissionNotification(form, submission, settings) {
    // 1. Build message
    const message = this.buildTelegramMessage(form, submission, settings);

    // 2. Send to Telegram
    const result = await this.sendMessage(
      settings.botToken,
      settings.groupId,
      message
    );

    return result;
  }

  buildTelegramMessage(form, submission, settings) {
    // Get ordered fields
    const telegramFields = this.getTelegramEnabledFields(form, settings);

    // Build header with prefix
    const messagePrefix = settings.messagePrefix || '';
    const formTitle = form.title || 'ฟอร์มใหม่';
    const timestamp = new Date(submission.submittedAt)
      .toLocaleString('th-TH');

    let header = '';
    if (messagePrefix && messagePrefix.trim()) {
      header = messagePrefix
        .replace(/\[FormName\]/g, formTitle)
        .replace(/\[DateTime\]/g, timestamp);
      header += '\n\n';
    } else {
      header = `📋 *${formTitle}*\n`;
      if (submission.data.documentNumber) {
        header += `📄 เลขที่เอกสาร: ${submission.data.documentNumber}\n`;
      }
      header += `\n`;
    }

    // Build field content
    let message = '';
    telegramFields.forEach((field) => {
      const value = submission.data[field.id];
      if (this.isEmptyValue(value)) return;

      const fieldName = field.title || field.label || 'ข้อมูล';
      const formattedValue = this.formatValueForTelegram(value, field.type);
      message += `*${fieldName}:* ${formattedValue}\n`;
    });

    // Build footer
    let footer = '';
    if (!messagePrefix || !messagePrefix.includes('[DateTime]')) {
      footer = `\n⏰ ${timestamp}`;
    }

    return header + message + footer;
  }

  getTelegramEnabledFields(form, settings) {
    // Use selectedFields from settings if available
    if (settings && settings.selectedFields &&
        settings.selectedFields.length > 0) {
      const orderedFields = [];
      settings.selectedFields.forEach(selectedField => {
        const field = form.fields.find(f => f.id === selectedField.id);
        if (field) orderedFields.push(field);
      });
      return orderedFields;
    }

    // Fallback to old format
    return form.fields
      .filter(field => field.sendTelegram === true)
      .sort((a, b) => (a.telegramOrder || 0) - (b.telegramOrder || 0));
  }

  formatValueForTelegram(value, fieldType) {
    if (this.isEmptyValue(value)) return '-';

    switch (fieldType) {
      case 'date':
        return new Date(value).toLocaleDateString('th-TH');
      case 'datetime':
        return new Date(value).toLocaleString('th-TH');
      case 'file_upload':
      case 'image_upload':
        return value.filename || 'ไฟล์แนบ';
      case 'rating':
        return '⭐'.repeat(parseInt(value));
      default:
        return String(value);
    }
  }

  async sendMessage(botToken, chatId, message) {
    const url = `${TELEGRAM_CONFIG.API_BASE_URL}/bot${botToken}/sendMessage`;

    try {
      const response = await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      });

      return {
        success: true,
        messageId: response.data.result.message_id
      };
    } catch (error) {
      console.error('Telegram send error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.description || error.message
      };
    }
  }

  async testTelegramConfiguration(settings, form) {
    const testSubmission = {
      data: {
        documentNumber: 'TEST-2025-001',
        test_field: 'This is a test message'
      },
      submittedAt: new Date()
    };

    const testForm = form || {
      title: 'Test Form',
      fields: [
        { id: 'test_field', label: 'Test Field', type: 'short_answer' }
      ]
    };

    return await this.sendFormSubmissionNotification(
      testForm,
      testSubmission,
      settings
    );
  }
}
```

#### WebSocketService.js - Real-Time Communication

**Server Setup:**
```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// Redis adapter for horizontal scaling
const { createAdapter } = require('@socket.io/redis-adapter');
const pubClient = redis.createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Join user room
  socket.join(`user:${socket.userId}`);

  // Join form rooms if specified
  socket.on('subscribe:form', (formId) => {
    socket.join(`form:${formId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});
```

**Event Types:**
```javascript
// Submission events
io.to(`form:${formId}`).emit('submission:created', submission);
io.to(`form:${formId}`).emit('submission:updated', submission);
io.to(`form:${formId}`).emit('submission:deleted', submissionId);

// Form events
io.to(`form:${formId}`).emit('form:updated', form);
io.emit('form:created', form);

// User events
io.to(`user:${userId}`).emit('notification', notification);

// System events
io.emit('system:maintenance', { message: 'Scheduled maintenance' });
```

### Database Models

#### User Model

```javascript
User {
  id: UUID (PK)
  username: STRING(50) UNIQUE
  email: STRING(255) UNIQUE
  password_hash: STRING(255)
  full_name_enc: TEXT (encrypted)
  role: ENUM('super_admin', 'admin', 'moderator', 'customer_service',
             'sales', 'marketing', 'technic', 'general_user')
  phone_enc: TEXT (encrypted)
  is_active: BOOLEAN
  last_login_at: DATE

  // Two-Factor Authentication
  twoFactorSecret: TEXT (encrypted)
  twoFactorEnabled: BOOLEAN
  twoFactorBackupCodes: TEXT (JSON array)
  twoFactorEnabledAt: DATE

  // Telegram Integration
  telegramUserId: STRING(50)
  telegramUsername: STRING(50)

  // Enhanced Fields
  firstName: STRING(100)
  lastName: STRING(100)
  department: STRING(100)
  notificationPreferences: TEXT (JSON)

  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP

  // Relations
  forms: Form[] (hasMany)
  submissions: Submission[] (hasMany)
  files: File[] (hasMany)
  auditLogs: AuditLog[] (hasMany)
  sessions: Session[] (hasMany)
}
```

#### Form Model

```javascript
Form {
  id: UUID (PK)
  title: STRING(255)
  description: TEXT
  fields: JSON  // Array of field definitions
  subForms: JSON  // Array of sub-form definitions

  // Settings
  telegramSettings: JSON {
    enabled: BOOLEAN
    botToken: STRING
    groupId: STRING
    messagePrefix: STRING
    selectedFields: ARRAY
  }

  settings: JSON  // Additional form settings

  // Metadata
  created_by: UUID (FK -> User)
  is_active: BOOLEAN
  is_template: BOOLEAN
  template_category: STRING

  // Analytics
  submission_count: INTEGER
  last_submission_at: TIMESTAMP

  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP

  // Relations
  creator: User (belongsTo)
  submissions: Submission[] (hasMany)
}
```

#### Submission Model

```javascript
Submission {
  id: UUID (PK)
  formId: UUID (FK -> Form)
  documentNumber: STRING(50) UNIQUE

  data: JSON  // Form field values
  subFormSubmissions: JSON  // Array of sub-form submissions

  // Status
  status: ENUM('draft', 'pending', 'approved', 'rejected')

  // Submission Info
  submitted_by: UUID (FK -> User)
  submitted_at: TIMESTAMP

  // Approval Info
  approved_by: UUID (FK -> User)
  approved_at: TIMESTAMP
  rejection_reason: TEXT

  // Metadata
  ip_address: STRING
  user_agent: STRING

  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP

  // Relations
  form: Form (belongsTo)
  submitter: User (belongsTo)
  approver: User (belongsTo)
  files: File[] (hasMany)
}
```

#### File Model

```javascript
File {
  id: UUID (PK)
  filename: STRING(255)  // Unique storage filename
  original_name: STRING(255)  // Original upload filename
  mime_type: STRING(100)
  size: BIGINT  // Size in bytes

  // MinIO Storage
  bucket_name: STRING(100)
  object_key: STRING(255)

  // Relations
  formId: UUID (FK -> Form)
  submissionId: UUID (FK -> Submission)
  uploaded_by: UUID (FK -> User)

  // Metadata
  metadata: JSON  // Additional file metadata

  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP

  // Relations
  form: Form (belongsTo)
  submission: Submission (belongsTo)
  uploader: User (belongsTo)
}
```

#### AuditLog Model

```javascript
AuditLog {
  id: UUID (PK)

  // Action Info
  action: STRING(100)  // 'user_created', 'form_updated', etc.
  entity_type: STRING(50)  // 'user', 'form', 'submission'
  entity_id: UUID

  // User Info
  user_id: UUID (FK -> User)
  ip_address: STRING(45)
  user_agent: TEXT

  // Change Details
  old_values: JSON
  new_values: JSON
  metadata: JSON

  createdAt: TIMESTAMP

  // Relations
  user: User (belongsTo)
}
```

#### Session Model

```javascript
Session {
  id: UUID (PK)
  user_id: UUID (FK -> User)

  // Token Info
  refresh_token: STRING(500)
  access_token: STRING(500)

  // Session Info
  ip_address: STRING(45)
  user_agent: TEXT
  expires_at: TIMESTAMP

  // Status
  is_active: BOOLEAN
  revoked_at: TIMESTAMP
  revoked_reason: STRING

  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP

  // Relations
  user: User (belongsTo)
}
```

### Database Relationships

```
User (1) ──< (M) Form
User (1) ──< (M) Submission
User (1) ──< (M) File
User (1) ──< (M) AuditLog
User (1) ──< (M) Session

Form (1) ──< (M) Submission
Form (1) ──< (M) File

Submission (1) ──< (M) File
```

---

## User Workflows

### 1. User Registration & Login

```
┌────────────────────────────────────────────────────────┐
│                    Registration Flow                    │
└────────────────────────────────────────────────────────┘

User fills registration form
          ↓
Frontend validates input
          ↓
POST /api/v1/auth/register
          ↓
Backend validates data
          ↓
Hash password (bcrypt, salt rounds: 12)
          ↓
Encrypt sensitive data (full_name, phone)
          ↓
Create user record in database
          ↓
Send welcome email
          ↓
Log audit trail
          ↓
Return success response


┌────────────────────────────────────────────────────────┐
│                      Login Flow                         │
└────────────────────────────────────────────────────────┘

User enters credentials (username/email + password)
          ↓
Frontend validates input
          ↓
POST /api/v1/auth/login
          ↓
Backend finds user by identifier
          ↓
Verify password with bcrypt.compare()
          ↓
Generate JWT access token (expires: 1h)
          ↓
Generate JWT refresh token (expires: 7d)
          ↓
Create session record
          ↓
Update last_login_at
          ↓
Log audit trail
          ↓
Return tokens + user data
          ↓
Frontend stores tokens in localStorage
          ↓
Redirect to dashboard
```

### 2. Form Creation Workflow

```
┌────────────────────────────────────────────────────────┐
│                 Form Creation Process                   │
└────────────────────────────────────────────────────────┘

Click "Create Form" button
          ↓
Navigate to Form Builder (EnhancedFormBuilder.jsx)
          ↓
────────────── FIELDS TAB ──────────────
│
├─ Enter form title and description
│
├─ Add fields via drag-and-drop or click
│     ↓
│   Select field type (17 types available)
│     ↓
│   Configure field properties:
│     - Label (required)
│     - Description
│     - Required toggle
│     - Default value
│     - Validation rules
│     - Conditional visibility formula
│     - Telegram notification toggle
│
├─ Reorder fields via drag-and-drop
│
├─ Delete unwanted fields
│
├─ Auto-scroll to new fields (v0.4.1+)
│
────────────── SUB-FORMS TAB ──────────────
│
├─ View default empty sub-form template
│
├─ Add fields to default sub-form
│     ↓
│   Converts to real sub-form
│
├─ Add more sub-forms if needed
│
├─ Configure sub-form relationships
│
────────────── SETTINGS TAB ──────────────
│
├─ Configure Telegram Notifications:
│   ├─ Enable/disable toggle
│   ├─ Enter Bot Token
│   ├─ Enter Group ID
│   ├─ Set message prefix with placeholders
│   ├─ Order fields via drag-and-drop
│   └─ Test connection
│
├─ Configure Email Notifications
│
├─ Set form permissions
│
├─ Configure workflow automation
│
────────────── SAVE FORM ──────────────
│
Click "Save Form" button
          ↓
Frontend validates form structure
          ↓
POST /api/v1/forms (or save to localStorage)
          ↓
Backend validates form data
          ↓
Generate form UUID
          ↓
Save to database / localStorage
          ↓
Log audit trail
          ↓
Show success toast
          ↓
Redirect to form list
```

### 3. Form Submission Workflow

```
┌────────────────────────────────────────────────────────┐
│               Form Submission Process                   │
└────────────────────────────────────────────────────────┘

User selects form from list
          ↓
Navigate to Form View (FormView.jsx)
          ↓
Load form definition
          ↓
Render form fields dynamically
          ↓
────────────── DATA ENTRY ──────────────
│
User fills in form fields:
│
├─ Text fields: Type directly
├─ Number fields: Numeric keyboard on mobile
├─ Date/Time: Native date/time pickers
├─ Multiple Choice: Radio buttons or dropdown
├─ Rating: Star rating component (1-5)
├─ Slider: Range slider with value display
├─ File Upload: Click or drag-and-drop
│     ↓
│   File validation (type, size)
│     ↓
│   Upload to server / store in localStorage
│     ↓
│   Show upload progress
│     ↓
│   Display thumbnail/filename
│
├─ Image Upload: Camera or gallery on mobile
├─ Location: Get GPS coordinates
├─ Province: Searchable Thai province list
│
────────────── VALIDATION ──────────────
│
Real-time validation as user types:
│
├─ Required field check
├─ Type validation (email, phone, URL)
├─ Custom validation rules
├─ Conditional visibility evaluation
│
Display error messages in Thai
│
────────────── SUBMIT ──────────────
│
Click "Submit" button
          ↓
Frontend validates all fields
          ↓
Confirm submission (optional)
          ↓
POST /api/v1/submissions
          ↓
Backend receives submission
          ↓
────────────── SERVER PROCESSING ──────────────
│
Validate submission data
          ↓
Process file uploads to MinIO
          ↓
Generate document number
          ↓
Save to database
          ↓
────────────── TELEGRAM NOTIFICATION ──────────────
│
Check if Telegram enabled
          ↓
Get Telegram settings (bot token, group ID)
          ↓
Build message:
  ├─ Replace [FormName] with form title
  ├─ Replace [DateTime] with timestamp
  ├─ Add ordered fields from selectedFields
  └─ Format values based on field type
          ↓
Send to Telegram Bot API
          ↓
Log notification result
│
────────────── EMAIL NOTIFICATION ──────────────
│
Send email to form owner
          ↓
Send email to submission notifications list
│
────────────── WEBSOCKET EVENT ──────────────
│
Emit 'submission:created' event
          ↓
Notify connected clients
│
────────────── QUEUE BACKGROUND TASKS ──────────────
│
Add 'process-submission' job to queue
  ├─ Analytics processing
  ├─ Data enrichment
  └─ Third-party integrations
│
────────────── AUDIT LOG ──────────────
│
Log submission created event
│
────────────── RESPONSE ──────────────
│
Return success response
          ↓
Frontend shows success toast
          ↓
Clear form or redirect to submission list
```

### 4. Submission Management Workflow

```
┌────────────────────────────────────────────────────────┐
│            Submission Management Process                │
└────────────────────────────────────────────────────────┘

Navigate to "Submissions" tab
          ↓
FormSubmissionList.jsx loads
          ↓
GET /api/v1/submissions?formId=xxx
          ↓
────────────── LIST VIEW ──────────────
│
Display submissions in table:
│
Columns:
  ├─ Document Number
  ├─ Submitted Date
  ├─ Submitted By
  ├─ Status (pending/approved/rejected)
  ├─ Field values (configurable)
  └─ Actions (view/edit/delete)
│
Features:
  ├─ Search by document number or fields
  ├─ Filter by date range
  ├─ Filter by status
  ├─ Sort by any column
  ├─ Pagination (10/25/50/100 per page)
  └─ Export to CSV/Excel
│
────────────── VIEW DETAIL ──────────────
│
Click submission row or "View" button
          ↓
Navigate to SubmissionDetail.jsx
          ↓
GET /api/v1/submissions/:id
          ↓
Display submission details:
│
  ├─ Header: Document number, timestamp
  ├─ All field values with labels
  ├─ File downloads / image previews
  ├─ Sub-form submission list
  └─ Action buttons
│
Actions:
  ├─ Edit: Navigate to FormView in edit mode
  ├─ Delete: Confirm and delete
  ├─ Approve: Update status to approved
  ├─ Reject: Update status with reason
  └─ Add New: Floating + button
│
────────────── EDIT SUBMISSION ──────────────
│
Click "Edit" button
          ↓
Navigate to FormView.jsx with submissionId
          ↓
Load existing submission data
          ↓
Pre-fill form fields
          ↓
User makes changes
          ↓
Click "Update" button
          ↓
PUT /api/v1/submissions/:id
          ↓
Validate changes
          ↓
Update database
          ↓
Log audit trail (old values → new values)
          ↓
Show success toast
          ↓
Redirect back to detail view
│
────────────── DELETE SUBMISSION ──────────────
│
Click "Delete" button
          ↓
Show confirmation dialog
          ↓
Confirm deletion
          ↓
DELETE /api/v1/submissions/:id
          ↓
Soft delete or hard delete (configurable)
          ↓
Delete associated files from MinIO
          ↓
Log audit trail
          ↓
Show success toast
          ↓
Redirect to submission list
│
────────────── EXPORT DATA ──────────────
│
Click "Export" button
          ↓
Choose format (CSV / Excel)
          ↓
GET /api/v1/submissions/export?formId=xxx&format=csv
          ↓
Backend generates export file:
  ├─ Include all field values
  ├─ Format dates properly
  ├─ Include sub-form data (nested or flat)
  └─ Apply filters if specified
          ↓
Return file download
          ↓
Browser downloads file
```

### 5. Sub-Form Workflow

```
┌────────────────────────────────────────────────────────┐
│                 Sub-Form Management                     │
└────────────────────────────────────────────────────────┘

User viewing submission detail
          ↓
See "Sub-Forms" section
          ↓
Click "Add [Sub-Form Name]" button
          ↓
Navigate to SubFormView.jsx
          ↓
Load sub-form definition from main form
          ↓
Render sub-form fields
          ↓
User fills in sub-form data
          ↓
Click "Submit" button
          ↓
Validate sub-form data
          ↓
POST /api/v1/submissions/:submissionId/subforms
          ↓
Save sub-form submission:
  {
    parentSubmissionId: 'uuid',
    subFormId: 'subform_1',
    data: { /* field values */ },
    submittedAt: '2025-09-30T10:30:00Z',
    submittedBy: 'user_id'
  }
          ↓
Update parent submission:
  - Increment sub-form count
  - Add to subFormSubmissions array
          ↓
Log audit trail
          ↓
Show success toast
          ↓
Redirect back to parent submission detail
          ↓
────────────── VIEW SUB-FORM LIST ──────────────
│
Submission detail shows sub-form count
          ↓
Click to expand sub-form list
          ↓
Display table of sub-form submissions:
  ├─ Submission number
  ├─ Date
  ├─ Key field values
  └─ Actions (view/edit/delete)
│
────────────── VIEW SUB-FORM DETAIL ──────────────
│
Click sub-form submission row
          ↓
Navigate to SubFormDetail.jsx
          ↓
Display sub-form submission data
          ↓
Similar to main submission detail
          ↓
Can edit or delete
```

### 6. User Management Workflow

```
┌────────────────────────────────────────────────────────┐
│              User Management Process                    │
└────────────────────────────────────────────────────────┘

Admin/Super Admin navigates to User Management
          ↓
UserManagement.jsx loads
          ↓
GET /api/v1/users
          ↓
────────────── USER LIST ──────────────
│
Display users in table:
│
Columns:
  ├─ Username
  ├─ Email
  ├─ Full Name
  ├─ Role
  ├─ Department
  ├─ Status (active/inactive)
  └─ Actions
│
Features:
  ├─ Search by username/email
  ├─ Filter by role
  ├─ Filter by department
  ├─ Sort by any column
  └─ Bulk actions (activate/deactivate)
│
────────────── CREATE USER ──────────────
│
Click "Add User" button
          ↓
Open user creation form
          ↓
Enter user details:
  ├─ Username (required, unique)
  ├─ Email (required, unique)
  ├─ Password (required, min 8 chars)
  ├─ Full Name
  ├─ Phone Number
  ├─ Role (dropdown)
  └─ Department (dropdown)
          ↓
Frontend validation
          ↓
POST /api/v1/users
          ↓
Backend validation
          ↓
Hash password (bcrypt, 12 rounds)
          ↓
Encrypt sensitive data
          ↓
Create user record
          ↓
Send welcome email
          ↓
Log audit trail
          ↓
Show success toast
          ↓
Refresh user list
│
────────────── EDIT USER ──────────────
│
Click "Edit" button
          ↓
Load user data
          ↓
Pre-fill form
          ↓
User makes changes
          ↓
Click "Update" button
          ↓
PUT /api/v1/users/:id
          ↓
Validate changes
          ↓
Re-hash password if changed
          ↓
Re-encrypt sensitive data if changed
          ↓
Update database
          ↓
Log audit trail
          ↓
Show success toast
          ↓
Refresh user list
│
────────────── DELETE USER ──────────────
│
Click "Delete" button
          ↓
Show confirmation dialog
          ↓
Confirm deletion
          ↓
DELETE /api/v1/users/:id
          ↓
Soft delete (set is_active = false)
          ↓
Revoke all user sessions
          ↓
Log audit trail
          ↓
Show success toast
          ↓
Refresh user list
│
────────────── ACTIVATE/DEACTIVATE ──────────────
│
Click "Activate" or "Deactivate" button
          ↓
PATCH /api/v1/users/:id/status
          ↓
Update is_active field
          ↓
If deactivating: Revoke all sessions
          ↓
Log audit trail
          ↓
Show success toast
          ↓
Refresh user list
```

---

## Key Features

### 1. Conditional Field Visibility

**Formula Engine:**

Uses AppSheet-compatible formula syntax for conditional visibility:

```javascript
// Simple comparison
[customer_type] = "individual"

// Multiple conditions with AND
AND([age] >= 18, [country] = "Thailand")

// Multiple conditions with OR
OR([payment_method] = "cash", [payment_method] = "credit")

// Nested conditions
AND([has_license] = true, OR([vehicle_type] = "car", [vehicle_type] = "truck"))

// Numeric comparisons
[order_total] > 1000

// String contains
CONTAINS([email], "@company.com")
```

**Implementation:**

```javascript
// src/utils/advancedFormulaEngine.js

class FormulaEngine {
  evaluate(formula, data) {
    // 1. Parse formula into tokens
    const tokens = this.tokenize(formula);

    // 2. Replace field references with values
    const substituted = this.substituteValues(tokens, data);

    // 3. Evaluate logical operators
    const result = this.evaluateExpression(substituted);

    return result;
  }

  tokenize(formula) {
    // Extract field references: [field_name]
    // Extract operators: AND, OR, =, >, <, >=, <=, !=
    // Extract functions: CONTAINS, STARTS_WITH, ENDS_WITH
    // Extract literals: "string", 123, true, false
  }

  substituteValues(tokens, data) {
    return tokens.map(token => {
      if (token.type === 'field_reference') {
        return data[token.fieldId] || null;
      }
      return token;
    });
  }

  evaluateExpression(tokens) {
    // Recursive evaluation of logical expressions
    // Handle operator precedence
    // Return boolean result
  }
}
```

**Usage in FormView:**

```javascript
const FormView = ({ form, submissionData }) => {
  const [visibleFields, setVisibleFields] = useState([]);

  useEffect(() => {
    const newVisibleFields = form.fields.filter(field => {
      // Always show fields without conditional visibility
      if (!field.conditionalVisibility?.enabled) return true;

      // Evaluate formula
      const formula = field.conditionalVisibility.formula;
      const result = FormulaEngine.evaluate(formula, submissionData);

      return result === true;
    });

    setVisibleFields(newVisibleFields);
  }, [form.fields, submissionData]);

  return (
    <div>
      {visibleFields.map(field => (
        <FieldRenderer key={field.id} field={field} />
      ))}
    </div>
  );
};
```

### 2. Advanced Telegram Integration

**Dual-Panel Field Ordering:**

```jsx
<div className="telegram-field-ordering">
  <div className="available-fields-panel">
    <h3>Available Fields</h3>
    <DndContext>
      <SortableContext items={availableFields}>
        {availableFields.map(field => (
          <Draggable key={field.id} id={field.id}>
            <FieldCard field={field} />
          </Draggable>
        ))}
      </SortableContext>
    </DndContext>
  </div>

  <div className="selected-fields-panel">
    <h3>Selected Fields (in order)</h3>
    <DndContext onDragEnd={handleReorder}>
      <SortableContext items={selectedFields}>
        {selectedFields.map((field, index) => (
          <Draggable key={field.id} id={field.id}>
            <FieldCard field={field} order={index + 1} />
          </Draggable>
        ))}
      </SortableContext>
    </DndContext>
  </div>
</div>
```

**Message Prefix with Placeholders:**

```javascript
const messagePrefix = `
🔔 แบบฟอร์ม: [FormName]
📅 วันที่: [DateTime]
━━━━━━━━━━━━━━━━━━
`;

// Processed as:
const processedMessage = messagePrefix
  .replace(/\[FormName\]/g, form.title)
  .replace(/\[DateTime\]/g, new Date().toLocaleString('th-TH'));

// Result:
// 🔔 แบบฟอร์ม: Customer Registration
// 📅 วันที่: 30/9/2568, 10:30:00
// ━━━━━━━━━━━━━━━━━━
```

**Test Connection:**

```javascript
const handleTestConnection = async () => {
  try {
    const result = await TelegramService.testTelegramConfiguration(
      telegramSettings,
      form
    );

    if (result.success) {
      toast.success('Connected and test message sent!');
    } else {
      toast.error(`Failed: ${result.error}`);
    }
  } catch (error) {
    toast.error(error.message);
  }
};
```

### 3. File Upload System

**Frontend (FileService.js):**

```javascript
class FileService {
  async uploadFile(file, onProgress) {
    // 1. Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) throw new Error(validation.error);

    // 2. Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // 3. Upload with progress tracking
    const response = await axios.post('/api/v1/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    });

    return response.data.data;
  }

  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large (max 10MB)' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true };
  }

  async downloadFile(fileId) {
    const response = await axios.get(
      `/api/v1/files/${fileId}/download`,
      { responseType: 'blob' }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', response.headers['x-filename']);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
```

**Backend (FileService.js):**

```javascript
const multer = require('multer');
const { MinioClient } = require('../config/minio.config');
const { v4: uuidv4 } = require('uuid');

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

class FileService {
  async uploadFile(file, userId) {
    // 1. Generate unique filename
    const fileId = uuidv4();
    const ext = file.originalname.split('.').pop();
    const filename = `${fileId}.${ext}`;

    // 2. Upload to MinIO
    const bucketName = 'qcollector-files';
    await MinioClient.putObject(
      bucketName,
      filename,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
        'X-Original-Name': file.originalname,
        'X-Uploaded-By': userId
      }
    );

    // 3. Create database record
    const fileRecord = await File.create({
      id: fileId,
      filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      bucket_name: bucketName,
      object_key: filename,
      uploaded_by: userId
    });

    // 4. Generate signed URL (valid for 7 days)
    const url = await MinioClient.presignedGetObject(
      bucketName,
      filename,
      7 * 24 * 60 * 60
    );

    return {
      ...fileRecord.toJSON(),
      url
    };
  }

  async getFile(fileId) {
    const file = await File.findByPk(fileId);
    if (!file) throw new Error('File not found');

    // Generate fresh signed URL
    const url = await MinioClient.presignedGetObject(
      file.bucket_name,
      file.object_key,
      7 * 24 * 60 * 60
    );

    return {
      ...file.toJSON(),
      url
    };
  }

  async downloadFile(fileId) {
    const file = await File.findByPk(fileId);
    if (!file) throw new Error('File not found');

    // Get file from MinIO
    const stream = await MinioClient.getObject(
      file.bucket_name,
      file.object_key
    );

    return {
      stream,
      filename: file.original_name,
      mimeType: file.mime_type
    };
  }

  async deleteFile(fileId, userId) {
    const file = await File.findByPk(fileId);
    if (!file) throw new Error('File not found');

    // Check permission
    if (file.uploaded_by !== userId && !isAdmin(userId)) {
      throw new Error('Permission denied');
    }

    // Delete from MinIO
    await MinioClient.removeObject(file.bucket_name, file.object_key);

    // Delete database record
    await file.destroy();

    // Log audit trail
    await AuditLog.create({
      action: 'file_deleted',
      userId,
      entityType: 'file',
      entityId: fileId,
      metadata: { filename: file.original_name }
    });
  }
}
```

### 4. Real-Time Updates with WebSocket

**Client Setup:**

```javascript
// src/services/WebSocketService.js

import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    this.socket = io(process.env.REACT_APP_API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToForm(formId) {
    if (this.socket) {
      this.socket.emit('subscribe:form', formId);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      this.listeners.set(event, callback);
    }
  }

  off(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
      this.listeners.delete(event);
    }
  }
}

export default new WebSocketService();
```

**Usage in Components:**

```javascript
const FormSubmissionList = ({ formId }) => {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    // Connect WebSocket
    WebSocketService.connect(authToken);
    WebSocketService.subscribeToForm(formId);

    // Listen for new submissions
    WebSocketService.on('submission:created', (submission) => {
      if (submission.formId === formId) {
        setSubmissions(prev => [submission, ...prev]);
        toast.success('New submission received!');
      }
    });

    // Listen for updated submissions
    WebSocketService.on('submission:updated', (submission) => {
      setSubmissions(prev =>
        prev.map(s => s.id === submission.id ? submission : s)
      );
      toast.info('Submission updated');
    });

    // Listen for deleted submissions
    WebSocketService.on('submission:deleted', (submissionId) => {
      setSubmissions(prev =>
        prev.filter(s => s.id !== submissionId)
      );
      toast.warning('Submission deleted');
    });

    // Cleanup
    return () => {
      WebSocketService.off('submission:created');
      WebSocketService.off('submission:updated');
      WebSocketService.off('submission:deleted');
      WebSocketService.disconnect();
    };
  }, [formId, authToken]);

  // ...rest of component
};
```

### 5. Caching with Redis

**Backend Cache Service:**

```javascript
// backend/services/CacheService.js

const redis = require('redis');

class CacheService {
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.connect();
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await this.client.setEx(
        key,
        ttl,
        JSON.stringify(value)
      );
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return false;
    }
  }

  // Form caching
  async getForm(formId) {
    return await this.get(`form:${formId}`);
  }

  async setForm(formId, form) {
    return await this.set(`form:${formId}`, form, 3600);
  }

  async invalidateForm(formId) {
    await this.delete(`form:${formId}`);
    await this.invalidatePattern(`form:${formId}:*`);
  }

  // Submission caching
  async getSubmissions(formId, filters) {
    const cacheKey = `submissions:${formId}:${JSON.stringify(filters)}`;
    return await this.get(cacheKey);
  }

  async setSubmissions(formId, filters, submissions) {
    const cacheKey = `submissions:${formId}:${JSON.stringify(filters)}`;
    return await this.set(cacheKey, submissions, 600); // 10 minutes
  }

  async invalidateSubmissions(formId) {
    await this.invalidatePattern(`submissions:${formId}:*`);
  }

  // User session caching
  async setSession(sessionId, sessionData) {
    return await this.set(
      `session:${sessionId}`,
      sessionData,
      7 * 24 * 3600 // 7 days
    );
  }

  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId) {
    return await this.delete(`session:${sessionId}`);
  }
}

module.exports = new CacheService();
```

**Cache Middleware:**

```javascript
// backend/middleware/cache.middleware.js

const CacheService = require('../services/CacheService');

const cacheMiddleware = (ttl = 3600) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = `api:${req.originalUrl}`;

    // Try to get from cache
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit: ${cacheKey}`);
      return res.json(cachedData);
    }

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to cache response
    res.json = (data) => {
      CacheService.set(cacheKey, data, ttl);
      return originalJson(data);
    };

    next();
  };
};

// Usage
router.get('/api/v1/forms', cacheMiddleware(3600), FormController.getAllForms);
```

### 6. Background Job Queue

**Queue Service with Bull:**

```javascript
// backend/services/QueueService.js

const Queue = require('bull');

class QueueService {
  constructor() {
    this.queues = {};

    // Initialize queues
    this.createQueue('email', require('../processors/email.processor'));
    this.createQueue('notification', require('../processors/notification.processor'));
    this.createQueue('analytics', require('../processors/analytics.processor'));
  }

  createQueue(name, processor) {
    const queue = new Queue(name, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });

    // Add processor
    queue.process(processor);

    // Event handlers
    queue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed:`, result);
    });

    queue.on('failed', (job, error) => {
      console.error(`Job ${job.id} failed:`, error);
    });

    this.queues[name] = queue;
  }

  async addJob(queueName, data, options = {}) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.add(data, {
      attempts: options.attempts || 3,
      backoff: options.backoff || {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: options.removeOnComplete !== false,
      removeOnFail: false
    });
  }

  async getQueue(name) {
    return this.queues[name];
  }

  async getJobCounts(queueName) {
    const queue = this.queues[queueName];
    if (!queue) return null;

    return await queue.getJobCounts();
  }

  async cleanQueue(queueName, status = 'completed') {
    const queue = this.queues[queueName];
    if (!queue) return;

    await queue.clean(5000, status);
  }
}

module.exports = new QueueService();
```

**Email Processor:**

```javascript
// backend/processors/email.processor.js

const EmailService = require('../services/EmailService');

module.exports = async (job) => {
  const { to, subject, body, template, data } = job.data;

  try {
    // Send email
    const result = await EmailService.sendEmail({
      to,
      subject,
      body,
      template,
      data
    });

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Email processor error:', error);
    throw error; // Will trigger retry
  }
};
```

**Usage:**

```javascript
// Queue email notification
await QueueService.addJob('email', {
  to: 'user@example.com',
  subject: 'New Form Submission',
  template: 'submission-notification',
  data: {
    formTitle: form.title,
    documentNumber: submission.documentNumber,
    submittedAt: submission.submittedAt
  }
});

// Queue analytics processing
await QueueService.addJob('analytics', {
  type: 'submission_created',
  formId: form.id,
  submissionId: submission.id,
  timestamp: new Date()
});
```

---

## Security

### 1. Authentication & Authorization

**JWT Token Security:**

```javascript
// Generate access token (short-lived)
const accessToken = jwt.sign(
  {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Generate refresh token (long-lived)
const refreshToken = jwt.sign(
  {
    id: user.id,
    type: 'refresh'
  },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

**Auth Middleware:**

```javascript
// backend/middleware/auth.middleware.js

const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists and is active
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
```

**Usage:**

```javascript
// Require authentication
router.get('/api/v1/forms', authenticate, FormController.getAllForms);

// Require specific role
router.post('/api/v1/users', authenticate, authorize('super_admin'), UserController.createUser);

// Multiple roles
router.delete('/api/v1/forms/:id', authenticate, authorize('admin', 'super_admin'), FormController.deleteForm);
```

### 2. Data Encryption

**Encryption Utility:**

```javascript
// backend/utils/encryption.util.js

const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted.toString('hex')
  };
}

function decrypt(encrypted) {
  const iv = Buffer.from(encrypted.iv, 'hex');
  const encryptedText = Buffer.from(encrypted.encryptedData, 'hex');

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

module.exports = { encrypt, decrypt };
```

**Usage in Models:**

```javascript
// Encrypt sensitive data before saving
beforeCreate: async (user) => {
  if (user.full_name) {
    user.full_name_enc = JSON.stringify(encrypt(user.full_name));
  }
  if (user.phone) {
    user.phone_enc = JSON.stringify(encrypt(user.phone));
  }
}

// Decrypt when retrieving
User.prototype.getFullName = function() {
  if (!this.full_name_enc) return null;
  try {
    const encryptedData = JSON.parse(this.full_name_enc);
    return decrypt(encryptedData);
  } catch (error) {
    console.error('Error decrypting full name:', error);
    return null;
  }
};
```

### 3. Input Validation

**Express Validator:**

```javascript
// backend/api/routes/user.routes.js

const { body, param, validationResult } = require('express-validator');

// Validation rules
const userValidationRules = () => {
  return [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters')
      .isAlphanumeric()
      .withMessage('Username must be alphanumeric'),
    body('email')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('role')
      .isIn(['super_admin', 'admin', 'moderator', 'customer_service',
             'sales', 'marketing', 'technic', 'general_user'])
      .withMessage('Invalid role')
  ];
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Apply to routes
router.post('/api/v1/users',
  authenticate,
  authorize('super_admin'),
  userValidationRules(),
  validate,
  UserController.createUser
);
```

### 4. Rate Limiting

**Express Rate Limit:**

```javascript
// backend/api/app.js

const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true,
});

// Apply to all API routes
app.use('/api/', apiLimiter);

// Apply stricter limit to auth routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
```

### 5. CORS Configuration

```javascript
// backend/api/app.js

const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://qcollector.qcon.co.th'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### 6. Security Headers

```javascript
// backend/api/app.js

const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## Deployment

### Environment Variables

**Frontend (.env):**

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_MINIO_URL=http://localhost:9000
REACT_APP_ENV=development
```

**Backend (.env):**

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qcollector_dev_2025
DB_USER=qcollector_dev_2025
DB_PASSWORD=qcollector_dev_2025

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Telegram
TELEGRAM_BOT_TOKEN=7794493324:AAHlxtpYenok1kwyo88ns5R4rivWWXcqmE0
TELEGRAM_GROUP_ID=-4847325737

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=Q-Collector <noreply@qcollector.com>

# Logging
LOG_LEVEL=info
```

### Database Setup

**1. Install PostgreSQL:**

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
# Download installer from postgresql.org
```

**2. Create Database:**

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE qcollector_dev_2025;

-- Create user
CREATE USER qcollector_dev_2025 WITH PASSWORD 'qcollector_dev_2025';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE qcollector_dev_2025 TO qcollector_dev_2025;

-- Exit
\q
```

**3. Run Migrations:**

```bash
cd backend
npm run db:migrate
```

**4. Create Super Admin:**

```bash
node scripts/create-super-admin.js
```

### Redis Setup

**Install Redis:**

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Windows
# Download from https://github.com/microsoftarchive/redis/releases
```

**Start Redis:**

```bash
# Linux/macOS
redis-server

# Windows
redis-server.exe
```

**Test Connection:**

```bash
redis-cli ping
# Should return: PONG
```

### MinIO Setup

**Install MinIO:**

```bash
# Linux
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# macOS
brew install minio/stable/minio

# Windows
# Download from https://min.io/download
```

**Start MinIO:**

```bash
# Create data directory
mkdir -p ~/minio/data

# Start server
minio server ~/minio/data --console-address :9001

# Access console at http://localhost:9001
# Default credentials: minioadmin / minioadmin
```

**Create Bucket:**

```javascript
// backend/config/minio.config.js

const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

// Create bucket if not exists
const bucketName = 'qcollector-files';
minioClient.bucketExists(bucketName, (err, exists) => {
  if (err) {
    console.error('Error checking bucket:', err);
    return;
  }

  if (!exists) {
    minioClient.makeBucket(bucketName, 'us-east-1', (err) => {
      if (err) {
        console.error('Error creating bucket:', err);
      } else {
        console.log(`Bucket ${bucketName} created successfully`);
      }
    });
  }
});

module.exports = minioClient;
```

### Production Deployment

**1. Build Frontend:**

```bash
cd q-collector
npm run build
# Creates optimized production build in build/ directory
```

**2. Setup Nginx:**

```nginx
# /etc/nginx/sites-available/qcollector

server {
    listen 80;
    server_name qcollector.qcon.co.th;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qcollector.qcon.co.th;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/qcollector.qcon.co.th/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qcollector.qcon.co.th/privkey.pem;

    # Frontend (React build)
    location / {
        root /var/www/qcollector/build;
        try_files $uri /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**3. Setup PM2 for Backend:**

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd backend
pm2 start api/server.js --name qcollector-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**4. Setup SSL with Let's Encrypt:**

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d qcollector.qcon.co.th

# Auto-renewal (cron job)
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet
```

---

## Development Guide

### Local Development Setup

**1. Clone Repository:**

```bash
git clone https://github.com/your-org/q-collector.git
cd q-collector
```

**2. Install Dependencies:**

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

**3. Setup Environment:**

```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit .env files with your configuration
```

**4. Start Services:**

```bash
# Terminal 1: PostgreSQL
# (should already be running as service)

# Terminal 2: Redis
redis-server

# Terminal 3: MinIO
minio server ~/minio/data --console-address :9001

# Terminal 4: Backend
cd backend
npm start
# Server runs on http://localhost:5000

# Terminal 5: Frontend
npm start
# App runs on http://localhost:3000
```

### Adding New Field Types

**1. Define Field Type:**

```javascript
// src/config/fieldTypes.js

export const FIELD_TYPES = {
  // ... existing types

  custom_signature: {
    id: 'custom_signature',
    label: 'Digital Signature',
    icon: 'pen-tool',
    category: 'advanced',
    defaultConfig: {
      type: 'custom_signature',
      label: 'Signature',
      required: false,
      description: 'Please sign below',
      options: {
        penColor: '#000000',
        backgroundColor: '#ffffff',
        width: 400,
        height: 200
      }
    }
  }
};
```

**2. Create Field Component:**

```jsx
// src/components/fields/SignatureField.jsx

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignatureField = ({ field, value, onChange, error }) => {
  const sigCanvas = useRef(null);

  const handleClear = () => {
    sigCanvas.current.clear();
    onChange(field.id, null);
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      const dataURL = sigCanvas.current.toDataURL();
      onChange(field.id, dataURL);
    }
  };

  return (
    <div className="signature-field">
      <label>
        {field.label}
        {field.required && <span className="required">*</span>}
      </label>

      {field.description && (
        <p className="field-description">{field.description}</p>
      )}

      <div className="signature-canvas-container">
        <SignatureCanvas
          ref={sigCanvas}
          penColor={field.options?.penColor || '#000000'}
          backgroundColor={field.options?.backgroundColor || '#ffffff'}
          canvasProps={{
            width: field.options?.width || 400,
            height: field.options?.height || 200,
            className: 'signature-canvas'
          }}
          onEnd={handleEnd}
        />
      </div>

      <button type="button" onClick={handleClear}>
        Clear Signature
      </button>

      {error && <p className="field-error">{error}</p>}
    </div>
  );
};

export default SignatureField;
```

**3. Register in Field Renderer:**

```javascript
// src/components/FieldRenderer.jsx

import SignatureField from './fields/SignatureField';

const FieldRenderer = ({ field, value, onChange, error }) => {
  switch (field.type) {
    case 'short_answer':
      return <ShortAnswerField ... />;

    // ... other cases

    case 'custom_signature':
      return <SignatureField
        field={field}
        value={value}
        onChange={onChange}
        error={error}
      />;

    default:
      return <div>Unknown field type: {field.type}</div>;
  }
};
```

**4. Add to EnhancedFormBuilder:**

```javascript
// src/components/EnhancedFormBuilder.jsx

const availableFields = [
  // ... existing fields

  {
    type: 'custom_signature',
    icon: '✍️',
    label: 'Digital Signature'
  }
];
```

### Adding New API Endpoints

**1. Create Route:**

```javascript
// backend/api/routes/custom.routes.js

const express = require('express');
const router = express.Router();
const CustomController = require('../../controllers/custom.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { cacheMiddleware } = require('../../middleware/cache.middleware');

// GET /api/v1/custom
router.get('/',
  authenticate,
  cacheMiddleware(600),
  CustomController.getAll
);

// GET /api/v1/custom/:id
router.get('/:id',
  authenticate,
  CustomController.getById
);

// POST /api/v1/custom
router.post('/',
  authenticate,
  CustomController.create
);

// PUT /api/v1/custom/:id
router.put('/:id',
  authenticate,
  CustomController.update
);

// DELETE /api/v1/custom/:id
router.delete('/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  CustomController.delete
);

module.exports = router;
```

**2. Create Controller:**

```javascript
// backend/controllers/custom.controller.js

const CustomService = require('../services/CustomService');

class CustomController {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

      const result = await CustomService.getAll({
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error) {
      console.error('CustomController.getAll error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getById(req, res) {
    try {
      const item = await CustomService.getById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('CustomController.getById error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async create(req, res) {
    try {
      const item = await CustomService.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('CustomController.create error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async update(req, res) {
    try {
      const item = await CustomService.update(req.params.id, req.body, req.user.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('CustomController.update error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async delete(req, res) {
    try {
      await CustomService.delete(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Item deleted successfully'
      });
    } catch (error) {
      console.error('CustomController.delete error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new CustomController();
```

**3. Create Service:**

```javascript
// backend/services/CustomService.js

const { Custom, User, AuditLog } = require('../models');

class CustomService {
  async getAll(options) {
    const { page, limit, sort, order, userId } = options;

    const offset = (page - 1) * limit;

    const { count, rows } = await Custom.findAndCountAll({
      where: { userId },
      limit,
      offset,
      order: [[sort, order]],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    return {
      items: rows,
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    };
  }

  async getById(id) {
    return await Custom.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
  }

  async create(data, userId) {
    // Validate data
    this.validateData(data);

    // Create item
    const item = await Custom.create({
      ...data,
      userId
    });

    // Log audit trail
    await AuditLog.create({
      action: 'custom_created',
      userId,
      entityType: 'custom',
      entityId: item.id,
      newValues: item.toJSON()
    });

    return item;
  }

  async update(id, data, userId) {
    const item = await Custom.findByPk(id);
    if (!item) return null;

    // Check permission
    if (item.userId !== userId) {
      throw new Error('Permission denied');
    }

    // Store old values for audit
    const oldValues = item.toJSON();

    // Update item
    await item.update(data);

    // Log audit trail
    await AuditLog.create({
      action: 'custom_updated',
      userId,
      entityType: 'custom',
      entityId: item.id,
      oldValues,
      newValues: item.toJSON()
    });

    return item;
  }

  async delete(id, userId) {
    const item = await Custom.findByPk(id);
    if (!item) throw new Error('Item not found');

    // Check permission
    if (item.userId !== userId) {
      throw new Error('Permission denied');
    }

    // Store values for audit
    const oldValues = item.toJSON();

    // Delete item
    await item.destroy();

    // Log audit trail
    await AuditLog.create({
      action: 'custom_deleted',
      userId,
      entityType: 'custom',
      entityId: id,
      oldValues
    });
  }

  validateData(data) {
    // Add validation logic
    if (!data.name) {
      throw new Error('Name is required');
    }
    // ... more validation
  }
}

module.exports = new CustomService();
```

**4. Register Route:**

```javascript
// backend/api/routes/index.js

const customRoutes = require('./custom.routes');

app.use('/api/v1/custom', customRoutes);
```

---

## Summary

Q-Collector is a comprehensive, enterprise-grade form builder and data collection system with the following highlights:

**✅ Complete Full-Stack Application**
- Modern React frontend with ShadCN UI
- Node.js/Express backend with PostgreSQL
- Redis caching and MinIO file storage
- Real-time WebSocket communication

**✅ Advanced Features**
- 17 field types with conditional visibility
- Drag-and-drop form builder
- Sub-form management
- Telegram notification integration
- Role-based access control
- Two-factor authentication
- Background job processing
- Analytics and reporting

**✅ Production-Ready**
- JWT authentication with refresh tokens
- Data encryption for sensitive information
- Rate limiting and security headers
- Comprehensive error handling
- Audit trail logging
- Scalable architecture

**✅ Developer-Friendly**
- Well-organized codebase
- Service-oriented architecture
- Extensive documentation
- Reusable components
- Easy to extend and customize

**🎯 Perfect For**
- Thai business organizations
- Data collection projects
- Form-based applications
- Customer service systems
- Industrial data management

---

**Version**: 0.5.0
**Last Updated**: 2025-09-30
**Documentation**: Complete and Ready for Production

---

For more information or support, contact the development team at pongpanp@qcon.co.th.

/**
 * Swagger Schema Definitions
 * Data models and schemas for Q-Collector API documentation
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # ====================================
 *     # User Schemas
 *     # ====================================
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique user identifier
 *         username:
 *           type: string
 *           description: User's unique username
 *           example: "pongpanp"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "admin@example.com"
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: "Pongpan"
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: "Peerawanichkul"
 *         department:
 *           type: string
 *           description: User's department
 *           example: "Technic"
 *         role:
 *           type: string
 *           enum: [Super Admin, Admin, User]
 *           description: User's role in the system
 *           example: "Super Admin"
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *           example: true
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       required:
 *         - id
 *         - username
 *         - email
 *         - firstName
 *         - lastName
 *         - department
 *         - role
 *
 *     UserCreate:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           pattern: "^[a-zA-Z0-9_]+$"
 *           description: Unique username (alphanumeric and underscore only)
 *           example: "pongpanp"
 *         email:
 *           type: string
 *           format: email
 *           description: Valid email address
 *           example: "admin@example.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Password (minimum 8 characters)
 *           example: "SecurePassword123"
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User's first name
 *           example: "Pongpan"
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User's last name
 *           example: "Peerawanichkul"
 *         department:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User's department
 *           example: "Technic"
 *         role:
 *           type: string
 *           enum: [Super Admin, Admin, User]
 *           description: User's role in the system
 *           example: "User"
 *       required:
 *         - username
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - department
 *         - role
 *
 *     UserUpdate:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Valid email address
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User's first name
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User's last name
 *         department:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User's department
 *         role:
 *           type: string
 *           enum: [Super Admin, Admin, User]
 *           description: User's role in the system
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *
 *     # ====================================
 *     # Authentication Schemas
 *     # ====================================
 *     LoginRequest:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           description: Username or email
 *           example: "pongpanp"
 *         password:
 *           type: string
 *           description: User password
 *           example: "SecurePassword123"
 *       required:
 *         - username
 *         - password
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *               description: JWT access token
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken:
 *               type: string
 *               description: JWT refresh token
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             expiresIn:
 *               type: integer
 *               description: Token expiration time in seconds
 *               example: 3600
 *             user:
 *               $ref: '#/components/schemas/User'
 *
 *     RefreshTokenRequest:
 *       type: object
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Valid refresh token
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       required:
 *         - refreshToken
 *
 *     ChangePasswordRequest:
 *       type: object
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Current password
 *           example: "OldPassword123"
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (minimum 8 characters)
 *           example: "NewSecurePassword123"
 *       required:
 *         - currentPassword
 *         - newPassword
 *
 *     # ====================================
 *     # Form Schemas
 *     # ====================================
 *     Form:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique form identifier
 *         title:
 *           type: string
 *           description: Form title
 *           example: "Employee Feedback Survey"
 *         description:
 *           type: string
 *           description: Form description
 *           example: "Annual employee satisfaction survey"
 *         fields:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FormField'
 *           description: Form fields configuration
 *         subForms:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SubForm'
 *           description: Sub-forms configuration
 *         isActive:
 *           type: boolean
 *           description: Whether the form is active
 *           example: true
 *         settings:
 *           $ref: '#/components/schemas/FormSettings'
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: User ID who created the form
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Form creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       required:
 *         - id
 *         - title
 *         - fields
 *         - isActive
 *         - createdBy
 *
 *     FormField:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique field identifier
 *         type:
 *           type: string
 *           enum:
 *             - short_answer
 *             - paragraph
 *             - multiple_choice
 *             - email
 *             - phone
 *             - number
 *             - url
 *             - date
 *             - time
 *             - datetime
 *             - file_upload
 *             - image_upload
 *             - rating
 *             - slider
 *             - lat_long
 *             - province
 *             - factory
 *           description: Field type
 *           example: "short_answer"
 *         label:
 *           type: string
 *           description: Field label
 *           example: "Full Name"
 *         placeholder:
 *           type: string
 *           description: Field placeholder text
 *           example: "Enter your full name"
 *         required:
 *           type: boolean
 *           description: Whether the field is required
 *           example: true
 *         options:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               value:
 *                 type: string
 *               label:
 *                 type: string
 *           description: Options for choice fields
 *         validation:
 *           type: object
 *           description: Field validation rules
 *         conditionalLogic:
 *           type: object
 *           description: Conditional visibility rules
 *         order:
 *           type: integer
 *           description: Field display order
 *       required:
 *         - id
 *         - type
 *         - label
 *         - required
 *         - order
 *
 *     SubForm:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique sub-form identifier
 *         name:
 *           type: string
 *           description: Sub-form name
 *           example: "Contact Information"
 *         fields:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FormField'
 *           description: Sub-form fields
 *         order:
 *           type: integer
 *           description: Sub-form display order
 *       required:
 *         - id
 *         - name
 *         - fields
 *         - order
 *
 *     FormSettings:
 *       type: object
 *       properties:
 *         allowMultipleSubmissions:
 *           type: boolean
 *           description: Allow multiple submissions from same user
 *           example: false
 *         requireAuthentication:
 *           type: boolean
 *           description: Require user authentication
 *           example: true
 *         notificationSettings:
 *           type: object
 *           description: Notification configuration
 *         telegramNotification:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             fields:
 *               type: array
 *               items:
 *                 type: string
 *           description: Telegram notification settings
 *
 *     FormCreate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Form title
 *           example: "Employee Feedback Survey"
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Form description
 *           example: "Annual employee satisfaction survey"
 *         fields:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FormField'
 *           minItems: 1
 *           description: Form fields (at least one required)
 *         subForms:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SubForm'
 *           description: Sub-forms configuration
 *         settings:
 *           $ref: '#/components/schemas/FormSettings'
 *       required:
 *         - title
 *         - fields
 *
 *     # ====================================
 *     # Submission Schemas
 *     # ====================================
 *     Submission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique submission identifier
 *         formId:
 *           type: string
 *           format: uuid
 *           description: Associated form ID
 *         submittedBy:
 *           type: string
 *           format: uuid
 *           description: User ID who submitted the form
 *         data:
 *           type: object
 *           description: Submitted form data
 *         status:
 *           type: string
 *           enum: [draft, submitted, approved, rejected]
 *           description: Submission status
 *           example: "submitted"
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: Submission timestamp
 *         reviewedBy:
 *           type: string
 *           format: uuid
 *           description: User ID who reviewed the submission
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *           description: Review timestamp
 *         reviewNotes:
 *           type: string
 *           description: Review notes or comments
 *       required:
 *         - id
 *         - formId
 *         - data
 *         - status
 *
 *     SubmissionCreate:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           description: Form field data
 *           example:
 *             fullName: "John Doe"
 *             email: "john.doe@example.com"
 *             rating: 5
 *         status:
 *           type: string
 *           enum: [draft, submitted]
 *           description: Submission status
 *           example: "submitted"
 *       required:
 *         - data
 *
 *     SubmissionUpdate:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           description: Updated form field data
 *         status:
 *           type: string
 *           enum: [draft, submitted, approved, rejected]
 *           description: Updated submission status
 *         reviewNotes:
 *           type: string
 *           description: Review notes or comments
 *
 *     # ====================================
 *     # File Schemas
 *     # ====================================
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique file identifier
 *         filename:
 *           type: string
 *           description: Original filename
 *           example: "document.pdf"
 *         originalName:
 *           type: string
 *           description: Original filename from upload
 *           example: "Employee_Handbook.pdf"
 *         mimeType:
 *           type: string
 *           description: File MIME type
 *           example: "application/pdf"
 *         size:
 *           type: integer
 *           description: File size in bytes
 *           example: 1048576
 *         path:
 *           type: string
 *           description: File storage path
 *         url:
 *           type: string
 *           description: File access URL
 *           example: "/api/v1/files/123e4567-e89b-12d3-a456-426614174000/download"
 *         uploadedBy:
 *           type: string
 *           format: uuid
 *           description: User ID who uploaded the file
 *         formId:
 *           type: string
 *           format: uuid
 *           description: Associated form ID (if applicable)
 *         submissionId:
 *           type: string
 *           format: uuid
 *           description: Associated submission ID (if applicable)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Upload timestamp
 *       required:
 *         - id
 *         - filename
 *         - originalName
 *         - mimeType
 *         - size
 *         - uploadedBy
 *
 *     FileUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             file:
 *               $ref: '#/components/schemas/File'
 *             uploadId:
 *               type: string
 *               description: Unique upload identifier
 *
 *     FileUploadMultipleResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             files:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 *             uploadId:
 *               type: string
 *               description: Unique upload identifier
 *             totalFiles:
 *               type: integer
 *               description: Total number of files uploaded
 *             totalSize:
 *               type: integer
 *               description: Total size of uploaded files in bytes
 *
 *     # ====================================
 *     # WebSocket Schemas
 *     # ====================================
 *     WebSocketStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [online, offline]
 *           description: WebSocket server status
 *         connectedUsers:
 *           type: integer
 *           description: Number of connected users
 *         totalRooms:
 *           type: integer
 *           description: Number of active rooms
 *         uptime:
 *           type: integer
 *           description: Server uptime in seconds
 *
 *     ConnectedUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         username:
 *           type: string
 *           description: Username
 *         connectedAt:
 *           type: string
 *           format: date-time
 *           description: Connection timestamp
 *         rooms:
 *           type: array
 *           items:
 *             type: string
 *           description: Joined room IDs
 *
 *     BroadcastMessage:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Message content
 *           example: "System maintenance scheduled for tonight"
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           description: Message type
 *           example: "info"
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           description: Message priority
 *           example: "normal"
 *       required:
 *         - message
 *
 *     NotificationMessage:
 *       type: object
 *       properties:
 *         userIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: Target user IDs
 *         message:
 *           type: string
 *           description: Notification message
 *           example: "Your form submission has been approved"
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           description: Notification type
 *           example: "success"
 *         data:
 *           type: object
 *           description: Additional notification data
 *       required:
 *         - userIds
 *         - message
 *
 *     # ====================================
 *     # Cache Schemas
 *     # ====================================
 *     CacheStats:
 *       type: object
 *       properties:
 *         totalKeys:
 *           type: integer
 *           description: Total number of cache keys
 *         hitRate:
 *           type: number
 *           format: float
 *           description: Cache hit rate percentage
 *         missRate:
 *           type: number
 *           format: float
 *           description: Cache miss rate percentage
 *         memoryUsage:
 *           type: object
 *           properties:
 *             used:
 *               type: integer
 *               description: Used memory in bytes
 *             total:
 *               type: integer
 *               description: Total available memory in bytes
 *         connections:
 *           type: integer
 *           description: Number of active connections
 *         uptime:
 *           type: integer
 *           description: Cache server uptime in seconds
 *
 *     CacheKey:
 *       type: object
 *       properties:
 *         key:
 *           type: string
 *           description: Cache key
 *         type:
 *           type: string
 *           description: Data type
 *         ttl:
 *           type: integer
 *           description: Time to live in seconds
 *         size:
 *           type: integer
 *           description: Value size in bytes
 *         lastAccessed:
 *           type: string
 *           format: date-time
 *           description: Last access timestamp
 *
 *     # ====================================
 *     # Health Check Schemas
 *     # ====================================
 *     HealthCheck:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [ok, degraded, error]
 *           description: Overall system status
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Health check timestamp
 *         uptime:
 *           type: number
 *           description: System uptime in seconds
 *         environment:
 *           type: string
 *           description: Environment name
 *         version:
 *           type: string
 *           description: API version
 *         services:
 *           type: object
 *           properties:
 *             api:
 *               type: string
 *               enum: [operational, degraded, unavailable, error]
 *             redis:
 *               type: string
 *               enum: [operational, degraded, unavailable, error]
 *             cache:
 *               type: string
 *               enum: [operational, degraded, unavailable, error]
 *           description: Individual service statuses
 */

module.exports = {};
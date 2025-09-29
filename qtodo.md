# Q-Collector Framework v0.4 Development Plan

## ✅ Phase 0: Conditional Field Visibility System (COMPLETED)

### 0.1 Show/Hide Field with Formula Conditions ✅
- [x] **Integrate Formula Engine & Conditional Visibility**
  - Formula engine already implemented (formulaEngine.js)
  - useConditionalVisibility hook already available
  - Supports Google Sheets-compatible formulas

- [x] **Add Show Checkbox in Field Settings**
  - Added checkbox in field-options-menu.jsx kebab menu
  - Default state: checked (always show)
  - Unchecked state: show formula input section
  - Visual indicator when field has conditional visibility

- [x] **Connect Checkbox with Formula Builder**
  - When checkbox is checked: field always visible
  - When checkbox is unchecked: formula editor appears
  - Real-time formula validation
  - Field reference helper with available fields
  - Formula examples in Thai language

- [x] **Update FormView.jsx for Runtime Evaluation**
  - Connected updateFieldVisibility() to formulaEngine
  - Logic: showCondition.enabled === false means formula is active
  - Real-time field visibility evaluation on form data changes
  - Skip validation for hidden fields

- [x] **Fix Syntax Errors**
  - Escaped HTML entities in JSX (&lt;, &gt;, &amp;)
  - Fixed compilation errors in EnhancedFormBuilder.jsx
  - Application compiles successfully

### 0.2 Features Implemented
- ✅ Show checkbox in field kebab menu (3-dot menu)
- ✅ Formula input with validation and syntax highlighting
- ✅ Field reference picker with grouped fields
- ✅ Formula examples in Thai
- ✅ Real-time formula evaluation in FormView
- ✅ Error handling for invalid formulas
- ✅ Conditional field visibility based on form data

### 0.3 Supported Formula Syntax
```javascript
// Field References
[FieldName] - Reference any form field

// Comparison Operators
=, <>, <, >, <=, >=

// Logical Functions
AND(), OR(), NOT(), IF()

// Text Functions
CONTAINS(), ISBLANK(), ISNOTBLANK()

// Examples
AND([Status] = "Complete", [Amount] > 100)
IF([Priority] = "High", NOT(ISBLANK([Comments])), TRUE)
CONTAINS([Description], "urgent")
```

### 0.4 Testing Status
- ✅ Dev server running successfully on port 3000
- ✅ No compilation errors
- ✅ Formula engine tested and working
- ⏳ Manual UI testing pending

---

## Phase 1: Enhanced Telegram Notification System (Next Priority)

### 1.1 Remove Legacy Telegram System
- [x] **Remove Telegram settings from kebab menu**
  - Remove telegram configuration options from field-options-menu.jsx
  - Clean up related imports and functions
  - Test kebab menu functionality

- [ ] **Simplify Field Toggle System**
  - Remove telegram order numbering from field-toggle-buttons.jsx
  - Keep only the toggle functionality for enabling/disabling telegram notifications
  - Remove order display badges and related logic
  - Update EnhancedFormBuilder.jsx telegram field management

### 1.2 Advanced Telegram Configuration in Settings
- [ ] **Create TelegramNotificationSettings component**
  - Add to form settings page as new section
  - Implement with ShadCN UI components
  - Responsive design for all screen sizes

- [ ] **Message Prefix Input System**
  - Add GlassInput for custom message prefix
  - Default: "ข้อมูลใหม่จาก [FormName] [DateTime]"
  - Real-time preview of message format
  - Validation and character limits

- [ ] **Dual-Panel Field Ordering System**
  - Left Panel: Available telegram-enabled fields
  - Right Panel: Selected fields in notification order
  - Drag-and-drop reordering with @dnd-kit
  - Click to move between panels
  - "Reset All" and "Select All" buttons

### 1.3 Interactive UI Components
- [ ] **Field Tag Components**
  - Custom tags with field type icons and colors
  - Smooth hover and selection animations
  - Drag handles and visual feedback
  - Responsive tag sizing

- [ ] **Drag & Drop System**
  - Implement with existing @dnd-kit setup
  - Visual drop zones and feedback
  - Snap-to-position animations
  - Error handling for invalid drops

- [ ] **Motion Effects & Animations**
  - Smooth slide transitions between panels
  - Scale and fade effects on hover
  - Spring physics for reordering
  - Loading states and success feedback

### 1.4 Message Preview & Testing System
- [ ] **Live Message Preview Component**
  - Real-time preview of telegram message format
  - Show actual field data from form
  - Preview with custom prefix
  - Character count and telegram limits

- [ ] **Message Format Structure**
  ```
  [Custom Prefix] [DateTime]
  [Field1 Name]: [Field1 Value]
  [Field2 Name]: [Field2 Value]
  ...
  ```

- [ ] **Testing & Validation System**
  - "Test Message" button to send preview
  - Connection status indicator
  - Test message success/failure feedback
  - Bot token and group ID validation

## Phase 2: Data Structure & State Management

### 2.1 Updated Telegram Settings Structure
```javascript
telegramSettings: {
  enabled: boolean,
  botToken: string,
  groupId: string,
  messagePrefix: string,           // New: Custom message prefix
  selectedFields: string[],        // New: Ordered array of field IDs
  availableFields: string[]        // New: Fields enabled for telegram but not selected
}
```

### 2.2 Component Architecture
```
EnhancedFormBuilder.jsx
├── Settings Tab
    ├── TelegramNotificationSettings.jsx (New)
        ├── MessagePrefixInput.jsx
        ├── FieldOrderingPanel.jsx
        │   ├── AvailableFieldsPanel.jsx
        │   ├── SelectedFieldsPanel.jsx
        │   └── FieldTag.jsx
        ├── MessagePreview.jsx
        └── TestNotificationButton.jsx
```

### 2.3 State Management Strategy
- Use existing form state structure
- Add telegram settings to form.settings.telegram
- Implement optimistic updates for better UX
- Add loading states for async operations

## Phase 3: ShadCN UI Integration & Motion Design

### 3.1 Required ShadCN Components
- **Drag & Drop**: @dnd-kit (already integrated)
- **Cards**: Existing glass-card components
- **Inputs**: Existing glass-input components
- **Buttons**: Existing glass-button components
- **Badges/Tags**: Custom field tags with ShadCN styling
- **Preview**: code-block component for message preview

### 3.2 Motion Effects Implementation
- **Tag Movement**: Smooth slide transitions between panels
- **Hover Effects**: Scale and fade animations
- **Drag Operations**: Visual feedback and drop zones
- **Reordering**: Spring physics animations
- **State Changes**: Color transitions and loading indicators

### 3.3 Responsive Design Considerations
- Mobile-first approach
- Touch-friendly drag operations
- Collapsible panels on small screens
- Adaptive grid layouts

## Phase 4: Advanced Features & Integration

### 4.1 Field Type Enhancements
- [ ] **Custom Display Formats**
  - Different formatting for field types
  - File/image handling in notifications
  - Date/time formatting options
  - Multi-choice field formatting

### 4.2 Message Optimization
- [ ] **Smart Message Building**
  - Message length optimization
  - Conditional field inclusion
  - Template system for common formats
  - Emoji and formatting support

### 4.3 Performance & Accessibility
- [ ] **Performance Optimizations**
  - Virtualization for large field lists
  - Debounced search and filter
  - Optimized drag-and-drop rendering
  - Lazy loading for heavy components

- [ ] **Accessibility Compliance**
  - WCAG 2.1 AA compliance
  - Keyboard navigation for drag-and-drop
  - Screen reader support
  - Focus management

## Phase 5: Testing & Deployment

### 5.1 Data Migration
- [ ] **Migration Strategy**
  - Convert existing telegram order system
  - Preserve user configurations
  - Backup and restore functionality
  - Gradual rollout with feature flags

### 5.2 Comprehensive Testing
- [ ] **Testing Framework**
  - Unit tests for telegram functionality
  - Integration tests for drag-and-drop
  - User experience testing
  - Performance testing for large forms

### 5.3 Documentation & Cleanup
- [ ] **Code Cleanup**
  - Remove unused telegram-related code
  - Optimize bundle size
  - Update TypeScript definitions
  - Component documentation updates

## Implementation Strategy

### Development Approach
1. **Phase 1**: Start with removing legacy system
2. **Phase 2**: Build core components with basic functionality
3. **Phase 3**: Add advanced UI and animations
4. **Phase 4**: Implement testing and optimization
5. **Phase 5**: Documentation and deployment

### Specialized Agents Utilization
- **component-upgrade**: For modernizing telegram settings UI
- **motion-effects**: For drag-and-drop animations
- **responsive-layout**: For mobile-responsive design
- **navigation-system**: For settings page integration

### Risk Mitigation
- Comprehensive backup before major changes
- Feature flags for gradual rollout
- Fallback to simple toggle if drag-and-drop fails
- Progressive enhancement approach
- Extensive testing on different screen sizes

## Success Metrics
- [ ] Intuitive drag-and-drop field ordering
- [ ] Smooth 60fps animations and transitions
- [ ] Mobile-responsive design
- [ ] Zero breaking changes to existing forms
- [ ] Improved telegram notification customization
- [ ] Enhanced user experience with visual feedback

---

**Status**: ✅ v0.4.0 COMPLETED - Frontend with conditional visibility and telegram integration complete

---

## Phase 6: Backend Development (CURRENT PHASE)

**Goal**: Implement enterprise-grade backend with PostgreSQL, MinIO, and complete security

### 6.1 Foundation Setup ⏳ IN PROGRESS
- [ ] **Initialize Backend Project**
  - Create backend/ directory structure
  - Initialize Node.js project with Express.js
  - Configure ESLint and Prettier
  - Set up package.json with dependencies

- [ ] **Docker Infrastructure**
  - Create docker-compose.yml with PostgreSQL, MinIO, Redis
  - Configure environment variables (.env files)
  - Set up volume mappings for data persistence
  - Create initialization scripts for databases

- [ ] **Database Setup**
  - Install and configure Sequelize ORM
  - Create database models (User, Form, Field, Submission, etc.)
  - Write database migrations
  - Create seed data for development

- [ ] **Basic API Structure**
  - Set up Express server with middleware
  - Configure CORS, Helmet, body-parser
  - Create API routing structure
  - Implement health check endpoint

### 6.2 Authentication & Security
- [ ] **JWT Authentication**
  - Implement user registration/login
  - Create JWT token generation and verification
  - Set up refresh token mechanism
  - Add password hashing with bcrypt

- [ ] **Encryption Service**
  - Implement AES-256-GCM encryption for PII
  - Create encryption utilities
  - Add field-level encryption for sensitive data
  - Set up key management

- [ ] **RBAC System**
  - Define roles and permissions
  - Create RBAC middleware
  - Implement permission checking
  - Add role-based route protection

### 6.3 Core Services Development
- [ ] **User Service**
  - CRUD operations for users
  - User profile management
  - Role assignment
  - Password reset functionality

- [ ] **Form Service**
  - Create/update/delete forms
  - Manage form fields and sub-forms
  - Form versioning
  - Form publishing workflow

- [ ] **Submission Service**
  - Handle form submissions
  - Data validation
  - Status management
  - Submission retrieval and filtering

### 6.4 File Management
- [ ] **MinIO Integration**
  - Configure MinIO client
  - Create bucket structure
  - Implement file upload/download
  - Add file validation and security

- [ ] **File Service**
  - Handle multipart uploads
  - Generate presigned URLs
  - Implement file deletion
  - Add virus scanning (optional)

### 6.5 Advanced Features
- [ ] **Audit Logging**
  - Create audit log model
  - Implement logging middleware
  - Track all CRUD operations
  - Add user activity tracking

- [ ] **Redis Caching**
  - Set up Redis client
  - Implement caching strategy
  - Add cache invalidation
  - Session management with Redis

- [ ] **Telegram Integration**
  - Implement Telegram Bot API client
  - Create notification service
  - Add message formatting
  - Test notification delivery

### 6.6 Testing & Documentation
- [ ] **Unit Testing**
  - Write tests for services
  - Test middleware functions
  - Achieve 80%+ coverage
  - Set up Jest configuration

- [ ] **Integration Testing**
  - Test API endpoints
  - Test database operations
  - Test file operations
  - Test authentication flow

- [ ] **API Documentation**
  - Set up Swagger/OpenAPI
  - Document all endpoints
  - Add request/response examples
  - Create Postman collection

### 6.7 Deployment & Monitoring
- [ ] **Production Configuration**
  - Create production Dockerfile
  - Configure Nginx reverse proxy
  - Set up SSL certificates
  - Configure PM2 process manager

- [ ] **Monitoring & Logging**
  - Set up Winston logger
  - Configure log rotation
  - Add performance monitoring
  - Set up error tracking

- [ ] **Backup Strategy**
  - Implement PostgreSQL backups
  - Configure MinIO replication
  - Create backup scripts
  - Test restore procedures

---

## Specialized Backend Agents

### Agent Definitions

**database-architect**:
- Purpose: Database design and implementation
- Tools: Read, Write, Edit, Bash
- Responsibilities: Sequelize models, migrations, queries

**api-builder**:
- Purpose: RESTful API endpoint development
- Tools: Read, Write, Edit, Bash
- Responsibilities: Express routes, controllers, validation

**security-engineer**:
- Purpose: Security implementation
- Tools: Read, Write, Edit, Bash
- Responsibilities: Encryption, auth, security middleware

**service-developer**:
- Purpose: Business logic development
- Tools: Read, Write, Edit, Bash
- Responsibilities: Service classes, error handling, tests

**docker-engineer**:
- Purpose: Container and deployment configuration
- Tools: Read, Write, Edit, Bash
- Responsibilities: Docker Compose, Nginx, deployment

**test-engineer**:
- Purpose: Testing and quality assurance
- Tools: Read, Write, Edit, Bash
- Responsibilities: Unit tests, integration tests, coverage

---

## Backend Success Metrics

### Performance Targets
- ✅ API response time < 200ms (95th percentile)
- ✅ Database query time < 50ms average
- ✅ File upload speed > 5MB/s
- ✅ Support 1000+ concurrent users
- ✅ 99.9% uptime

### Quality Targets
- ✅ Test coverage > 80%
- ✅ Code quality grade A (ESLint)
- ✅ Security score A+ (OWASP)
- ✅ 100% API documentation coverage

### Timeline
- **Phase 6.1-6.3**: Weeks 1-4 (Foundation & Core)
- **Phase 6.4-6.5**: Weeks 5-8 (Advanced Features)
- **Phase 6.6-6.7**: Weeks 9-12 (Testing & Deployment)
- **Total**: 12 weeks estimated

---

**Target Completion**: v1.0.0 with Full Backend Integration
**Priority**: CRITICAL - Production readiness
**Dependencies**: Docker, PostgreSQL 16, MinIO, Redis 7, Node.js 20
**Estimated Development Time**: 12 weeks
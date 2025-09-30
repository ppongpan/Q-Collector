# RBAC System Alignment - Frontend-Backend Integration

## Issue Identified (2025-09-30)

**Problem**: Frontend and Backend have incompatible role systems

### Frontend RBAC (8 Roles)
- `super_admin` - Full system control
- `admin` - View all, create/edit all forms
- `moderator` - Create forms, delete own forms, view/edit all data
- `customer_service` - View/edit forms tagged "Customer Service"
- `sales` - View/edit forms tagged "Sales"
- `marketing` - View/edit forms tagged "Marketing"
- `technic` - View/edit forms tagged "Technic"
- `general_user` - General user access

**Registration Roles** (5 roles available at registration):
- customer_service, sales, marketing, technic, general_user

**Admin Roles** (assigned only by Super Admin):
- super_admin, admin, moderator

### Backend RBAC (4 Roles)
- `admin` - Administrator
- `manager` - Manager
- `user` - Regular user (default)
- `viewer` - Read-only user

**Registration Roles**: Only `user` or `manager`

## Resolution Strategy

### Option 1: Update Backend to Match Frontend (RECOMMENDED)
Expand backend User model to support all 8 frontend roles.

**Changes Required**:
1. Update `backend/models/User.js` - Expand role ENUM
2. Update `backend/api/routes/auth.routes.js` - Update validation
3. Add role-based middleware for tag access control
4. Update database schema with migration

### Option 2: Update Frontend to Match Backend
Simplify frontend to 4 roles (NOT RECOMMENDED - loses user requirements)

## Implementation Plan

### Step 1: Update Backend User Model
```javascript
role: {
  type: DataTypes.ENUM(
    'super_admin',
    'admin',
    'moderator',
    'customer_service',
    'sales',
    'marketing',
    'technic',
    'general_user'
  ),
  allowNull: false,
  defaultValue: 'general_user',
}
```

### Step 2: Update Auth Routes Validation
```javascript
body('role')
  .optional()
  .isIn(['customer_service', 'sales', 'marketing', 'technic', 'general_user'])
  .withMessage('Invalid role for registration')
```

### Step 3: Create Database Migration
```sql
ALTER TYPE "enum_users_role" ADD VALUE 'super_admin';
ALTER TYPE "enum_users_role" ADD VALUE 'moderator';
ALTER TYPE "enum_users_role" ADD VALUE 'customer_service';
ALTER TYPE "enum_users_role" ADD VALUE 'sales';
ALTER TYPE "enum_users_role" ADD VALUE 'marketing';
ALTER TYPE "enum_users_role" ADD VALUE 'technic';
ALTER TYPE "enum_users_role" ADD VALUE 'general_user';
```

### Step 4: Update Frontend RegisterPage
Match backend field names:
- `name` → `full_name`
- Add `username` field (required)

## Status

- [x] Frontend RBAC implemented (roles.config.js)
- [x] Frontend Auth UI (LoginPage, RegisterPage)
- [x] API endpoints configured with /api/v1/ prefix
- [x] Backend User model updated (8 roles)
- [x] Backend auth validation updated
- [x] Database migration created and executed
- [x] Frontend RegisterPage field names updated (username, full_name)
- [x] End-to-end auth flow tested

## Next Actions

1. Update backend User model with 8 roles
2. Update auth routes validation
3. Create and run database migration
4. Update frontend RegisterPage component
5. Test complete authentication flow
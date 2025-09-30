# User Management System

## Overview
Complete user management system for Super Admin to manage users, roles, permissions, and special form access.

**Date**: 2025-09-30
**Version**: 0.5.0

## Features Implemented

### 1. User Management Page (`src/components/UserManagement.jsx`)

#### **Core Features**
- ✅ View all users in searchable, filterable table
- ✅ Search users by username, email, or full name
- ✅ Filter users by role (8 roles supported)
- ✅ Edit user information (username, email, full_name, role)
- ✅ Change user active status (activate/deactivate accounts)
- ✅ Reset user password
- ✅ **Special Form Access** - Grant users access to specific forms outside their role

#### **Access Control**
- Only **Super Admin** can access User Management page
- Other roles see "ไม่มีสิทธิ์เข้าถึง" message

### 2. Top Menu Integration

#### **User Management Icon**
- Location: Top menu bar, between "New Form" button and User Menu
- Icon: `faUsers` (group of users)
- Visibility: Only shown on 'form-list' page
- Animation: Scale + glow effect on hover
- Route: Navigate to 'user-management' page

### 3. Special Form Access Permission System

#### **How It Works**
Users can access forms in two ways:
1. **Role-based**: Forms tagged with their role (automatic)
2. **Special Access**: Additional forms granted by Super Admin (manual)

#### **UI/UX Design**
```
┌─────────────────────────────────────────────────┐
│ สิทธิ์พิเศษเข้าถึงฟอร์ม                          │
├─────────────────────────────────────────────────┤
│ [Technic Request], [บันทึกการเข้าไซต์งาน]       │
│                                                 │
│ 💡 ใส่ชื่อฟอร์มในวงเล็บ [] คั่นด้วย ,          │
│ 💡 ผู้ใช้จะสามารถเข้าถึงฟอร์มที่ระบุได้        │
│    นอกเหนือจากฟอร์มที่ tag Role ของตนเองไว้    │
└─────────────────────────────────────────────────┘
```

#### **Example Use Cases**

**Scenario 1: Sales user needs access to Technic form**
- User: `salesuser` (Role: Sales)
- Normal Access: Only forms tagged "Sales"
- Special Access: Add `[Technic Request]`
- Result: Can now view both Sales forms AND "Technic Request" form

**Scenario 2: Multiple special forms**
- User: `pongpanp` (Role: Super Admin already has access to all)
- Special Access: `[Form A], [Form B], [Form C]`
- Result: Explicit special access (though Super Admin already has full access)

**Scenario 3: Others department with specific access**
- User: `generaluser` (Role: General User)
- Normal Access: No forms (general_user has no tag access)
- Special Access: `[Daily Report], [Attendance Form]`
- Result: Can view only these two specific forms

### 4. User Table Display

#### **Columns**
1. **ชื่อผู้ใช้** (Username) - With user icon
2. **อีเมล** (Email)
3. **ชื่อ-นามสกุล** (Full Name)
4. **บทบาท** (Role) - Color-coded badge:
   - Super Admin: Red
   - Admin: Orange
   - Moderator: Yellow
   - Customer Service: Blue
   - Sales: Green
   - Marketing: Purple
   - Technic: Cyan
   - General User: Gray
5. **สถานะ** (Status) - Active/Inactive with icon
6. **สิทธิ์พิเศษ** (Special Access) - Shows count of special forms
7. **จัดการ** (Actions) - Edit button

#### **Features**
- Real-time search filtering
- Role-based filtering
- Hover effects on table rows
- Smooth animations (staggered fade-in)
- Responsive design

### 5. Edit User Modal

#### **Sections**

**A. Basic Information**
- Username (editable)
- Email (editable)
- Full Name (editable)
- Role (dropdown - all 8 roles)
- Active Status (checkbox)

**B. Special Form Access**
- Textarea for comma-separated form names
- Format: `[Form Name], [Another Form]`
- Helper text with examples
- Info message about functionality

**C. Password Reset (Collapsible)**
- Toggle button to show/hide
- New Password field
- Confirm Password field
- Reset button with validation
- Minimum 8 characters required

**D. Action Buttons**
- Save (primary button)
- Cancel (secondary button)

### 6. Data Structure

```javascript
// User Object
{
  id: 'uuid',
  username: 'string',
  email: 'string',
  full_name: 'string',
  role: 'super_admin|admin|moderator|customer_service|sales|marketing|technic|general_user',
  is_active: boolean,
  special_forms: ['[Form Name 1]', '[Form Name 2]'], // Array of form names with brackets
  createdAt: 'ISO date',
  updatedAt: 'ISO date'
}
```

### 7. Permission Logic

#### **View User Management**
```javascript
isSuperAdmin = currentUser.role === 'super_admin'
```

#### **Edit User Information**
- Only Super Admin can edit users
- All fields editable
- Role changes immediately affect permissions

#### **Reset Password**
- Super Admin can reset any user's password
- No need for old password (admin override)
- New password must be 8+ characters

#### **Manage Special Access**
- Parse comma-separated form names
- Store as array in user object
- Forms must be specified with brackets: `[Form Name]`
- Check special_forms array when determining form access

### 8. Form Access Control (RBAC Implementation)

#### **Create/Edit Form Permissions**
```javascript
const canCreateOrEditForms = () => {
  if (!user || !user.role) return false;
  return ['super_admin', 'admin', 'moderator'].includes(user.role);
};
```

#### **Restricted Roles (View & Submit Only)**
- **Customer Service**: Can view forms and submit data only
- **Sales**: Can view forms and submit data only
- **Marketing**: Can view forms and submit data only
- **Technic**: Can view forms and submit data only
- **General User**: Can view forms and submit data only

#### **Privileged Roles (Full Access)**
- **Super Admin**: Full form creation, editing, deletion, and management
- **Admin**: Full form creation, editing, deletion, and management
- **Moderator**: Full form creation, editing, deletion, and management

#### **UI Implementation**
- **New Form Button**: Hidden for restricted roles using conditional rendering `{canCreateOrEditForms() && <NewFormButton />}`
- **Edit Form Button**: Hidden for restricted roles using conditional rendering `{canCreateOrEditForms() && <EditButton />}`
- **Error Messages**: Thai language feedback when unauthorized users attempt restricted actions
- **Navigation Protection**: Authorization checks in `handleNewForm()` and `handleEditForm()` functions

#### **Security Features**
- Frontend UI controls prevent unauthorized access attempts
- Function-level authorization checks provide additional security layer
- Toast notifications inform users of insufficient permissions
- Graceful degradation maintains application usability for restricted users

## UI/UX Design Principles

### **Visual Hierarchy**
1. **Page Header** - Title + Search/Filter controls
2. **User Table** - Organized, scannable data
3. **Edit Modal** - Focused, step-by-step editing
4. **Toast Notifications** - Feedback for all actions

### **Color System**
- **Primary (Orange)**: Action buttons, edit icons
- **Role Badges**: Distinct colors for each role
- **Status Indicators**: Green (active), Gray (inactive)
- **Backgrounds**: Glass morphism with blur effects

### **Animations**
- **Page Load**: Fade in + slide up (0.5s)
- **Table Rows**: Staggered fade in (0.05s delay each)
- **Modal**: Scale + fade (0.3s)
- **Hover**: Scale + glow effect
- **Password Section**: Expand/collapse animation

### **Responsive Design**
- Desktop: Full table layout
- Tablet: Adjusted column widths
- Mobile: Horizontal scroll, sticky headers

## Integration Points

### **MainFormApp.jsx Changes**
```javascript
// 1. Added import
import UserManagement from './UserManagement';
import { faUsers } from '@fortawesome/free-solid-svg-icons';

// 2. Added state
const [currentPage, setCurrentPage] = useState('form-list');
// New: 'user-management'

// 3. Added page title
case 'user-management': return 'จัดการผู้ใช้งาน';

// 4. Added icon in header
{currentPage === 'form-list' && (
  <div onClick={() => handleNavigate('user-management')}>
    <FontAwesomeIcon icon={faUsers} />
  </div>
)}

// 5. Added route
case 'user-management':
  return <UserManagement />;
```

### **Config Files Used**
- `src/config/roles.config.js` - ALL_ROLES, getRoleLabel()
- `src/contexts/AuthContext.jsx` - useAuth() hook
- `src/components/ui/enhanced-toast.jsx` - useEnhancedToast()

## Backend API Requirements (To Be Implemented)

### **GET /api/v1/users**
List all users (Super Admin only)
```javascript
Response: {
  success: true,
  data: {
    users: [...],
    total: number
  }
}
```

### **GET /api/v1/users/:id**
Get single user details
```javascript
Response: {
  success: true,
  data: { user: {...} }
}
```

### **PUT /api/v1/users/:id**
Update user information
```javascript
Request: {
  username, email, full_name, role, is_active, special_forms
}
Response: {
  success: true,
  data: { user: {...} }
}
```

### **POST /api/v1/users/:id/reset-password**
Reset user password (Super Admin only)
```javascript
Request: {
  newPassword: string
}
Response: {
  success: true,
  message: 'Password reset successfully'
}
```

### **Permission Check Middleware**
```javascript
// Check if user can access form
function canAccessForm(user, form) {
  // 1. Check role-based access
  if (form.tags.includes(user.role)) return true;

  // 2. Check special form access
  if (user.special_forms.includes(`[${form.name}]`)) return true;

  // 3. Super Admin/Admin/Moderator have full access
  if (['super_admin', 'admin', 'moderator'].includes(user.role)) return true;

  return false;
}
```

## Testing Checklist

### **Access Control**
- [ ] Super Admin can access User Management page
- [ ] Non-Super Admin users see "ไม่มีสิทธิ์เข้าถึง" message
- [ ] User Management icon only visible to Super Admin

### **User List**
- [ ] All users displayed in table
- [ ] Search works for username, email, full_name
- [ ] Role filter works correctly
- [ ] Role badges show correct colors
- [ ] Active status displays correctly

### **Edit User**
- [ ] Modal opens when clicking edit button
- [ ] All fields populate with current data
- [ ] Username, email, full_name can be edited
- [ ] Role dropdown shows all 8 roles
- [ ] Active checkbox works
- [ ] Special forms textarea accepts input
- [ ] Save button updates user
- [ ] Cancel button closes modal

### **Password Reset**
- [ ] Password section toggles correctly
- [ ] New password requires 8+ characters
- [ ] Confirm password must match
- [ ] Reset button calls API
- [ ] Success message shows

### **Special Form Access**
- [ ] Comma-separated form names parsed correctly
- [ ] Brackets required: `[Form Name]`
- [ ] Multiple forms: `[Form A], [Form B]`
- [ ] Empty string removes all special access
- [ ] User can access forms specified in special_forms

## Next Steps

1. **Backend Implementation**
   - Create user management API endpoints
   - Add permission middleware
   - Implement special form access logic

2. **Form Access Integration**
   - Update FormListApp to check special_forms
   - Filter forms based on role + special access
   - Show "Special Access" badge on forms

3. **Audit Logging**
   - Log all user edits
   - Log role changes
   - Log password resets
   - Track special access changes

4. **Enhancements**
   - Bulk user actions (activate/deactivate multiple)
   - Export user list to CSV
   - User activity dashboard
   - Form access autocomplete (suggest existing form names)

## Files Created/Modified

### **Created**
- `src/components/UserManagement.jsx` - Main component (578 lines)
- `USER-MANAGEMENT-SYSTEM.md` - This documentation

### **Modified**
- `src/components/MainFormApp.jsx` - Added user management integration
  - Import UserManagement component
  - Import faUsers icon
  - Add 'user-management' to currentPage state
  - Add page title
  - Add icon in header
  - Add route case

## Summary

✅ User Management page created with complete UI/UX
✅ Super Admin access control implemented
✅ Search and filter functionality
✅ Edit user modal with all fields
✅ Password reset functionality
✅ **Special Form Access system** with intuitive textarea input
✅ Role-based color coding
✅ Smooth animations and transitions
✅ Glass morphism design consistency
✅ Mobile-responsive layout
✅ Integration with MainFormApp

**Status**: Frontend Complete ✅
**Next**: Backend API Implementation

The system provides a complete, professional user management interface with special form access permissions that extend beyond role-based access control.
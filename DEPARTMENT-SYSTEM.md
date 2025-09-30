# Department-Based Registration System

## Overview
Updated registration system to use Department selection instead of direct Role selection for better user experience and clearer organization structure.

**Date**: 2025-09-30
**Version**: 0.5.0

## Changes Made

### 1. Super Admin Account Created
- **Username**: pongpanp
- **Email**: pongpanp@qcon.co.th
- **Full Name**: Pongpan Peerawanichkul
- **Role**: super_admin
- **Password**: Admin@1234 (⚠️ Change after first login!)

### 2. Department Configuration (`src/config/roles.config.js`)
Added `DEPARTMENTS` array with automatic role mapping:

```javascript
export const DEPARTMENTS = [
  { value: 'customer_service', label: 'Customer Service', role: 'customer_service' },
  { value: 'technic', label: 'Technic', role: 'technic' },
  { value: 'sales', label: 'Sales', role: 'sales' },
  { value: 'marketing', label: 'Marketing', role: 'marketing' },
  { value: 'others', label: 'Others', role: 'general_user' }
];
```

**Department-to-Role Mapping**:
- Customer Service → customer_service
- Technic → technic
- Sales → sales
- Marketing → marketing
- Others → general_user

### 3. RegisterPage Updates (`src/components/auth/RegisterPage.jsx`)

**Removed**:
- Role selection dropdown
- `role` from form state

**Added**:
- Department selection dropdown
- `department` in form state (default: 'others')
- `mapDepartmentToRole()` function call before registration
- Updated icon from `faUserTag` to `faBriefcase`

**User Flow**:
1. User selects their department from dropdown
2. Frontend automatically maps department to appropriate role
3. Registration sent to backend with the mapped role
4. User registered with correct role-based permissions

### 4. Backend Integration
No backend changes required because:
- Backend still accepts `role` field
- Frontend handles department-to-role mapping
- All existing role validation remains the same

### 5. Permission System
Role permissions remain unchanged:
- **Super Admin**: Full system access, user management, role changes
- **Admin**: Full form access, cannot manage users/roles
- **Moderator**: Create forms, delete own forms, view/edit all data
- **Customer Service**: Tag-based access (Customer Service tag)
- **Sales**: Tag-based access (Sales tag)
- **Marketing**: Tag-based access (Marketing tag)
- **Technic**: Tag-based access (Technic tag)
- **General User**: No special permissions

## Role Management Rules

### Self-Service Restrictions
- Regular users CANNOT change their own role
- Department selected at registration determines role
- Only Super Admin can change user roles

### Super Admin Privileges
- Can change any user's role to any of the 8 roles
- Can manage all users in the system
- Can assign admin-level roles (super_admin, admin, moderator)

## Testing Results

### ✅ Super Admin Login
```json
{
  "username": "pongpanp",
  "role": "super_admin",
  "email": "pongpanp@qcon.co.th"
}
```

### ✅ Department-Based Registration
1. **Technic Department** → `technic` role ✓
2. **Others Department** → `general_user` role ✓
3. **Customer Service** → `customer_service` role ✓
4. **Sales** → `sales` role ✓
5. **Marketing** → `marketing` role ✓

## User Experience Improvements

### Before
- Users confused about which role to select
- Role names technical (customer_service, general_user)
- Direct role selection allowed wrong choices

### After
- Clear department selection (Customer Service, Technic, Sales, Marketing, Others)
- Automatic role assignment based on organizational structure
- Simplified registration flow
- "Others" option for users not in main departments

## Security Features

### Registration Constraints
- Only 5 departments available at registration
- Admin roles (super_admin, admin, moderator) can ONLY be assigned by Super Admin
- No self-service role elevation

### Role Change Restrictions
- Only Super Admin has `canChangeRoles: true`
- All other roles have `canChangeRoles: false`
- Role changes require Super Admin authorization

## API Endpoints

### Registration
```bash
POST /api/v1/auth/register
{
  "username": "username",
  "email": "email@example.com",
  "password": "Password123",
  "full_name": "Full Name",
  "role": "technic"  // Mapped from department by frontend
}
```

### Login
```bash
POST /api/v1/auth/login
{
  "identifier": "username or email",
  "password": "Password123"
}
```

## Next Steps

1. **User Management UI** - Create Super Admin interface to:
   - View all users
   - Change user roles
   - Activate/deactivate users
   - View user sessions

2. **Department Field in User Profile** - Add optional department display field separate from role

3. **Audit Logging** - Track all role changes with timestamp, admin ID, old role, new role

## Files Modified

### Frontend
- `src/config/roles.config.js` - Added DEPARTMENTS, mapDepartmentToRole()
- `src/components/auth/RegisterPage.jsx` - Replaced role with department

### Backend
- `backend/scripts/create-super-admin.js` - New script to create Super Admin account

### Documentation
- `DEPARTMENT-SYSTEM.md` - This file
- `RBAC-ALIGNMENT.md` - Updated status to completed

## Summary

✅ Super Admin account created successfully
✅ Department-based registration implemented
✅ Automatic role mapping working correctly
✅ All 5 departments tested and verified
✅ Permission system remains intact
✅ Security constraints properly enforced

The system now provides a clearer, more user-friendly registration experience while maintaining strict role-based access control and security.
/**
 * Role Configuration for Q-Collector RBAC System
 *
 * This file defines:
 * - All user roles in the system
 * - Registration-available roles
 * - Permission matrix for each role
 * - Tag-based access control
 */

// Define all user roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  CUSTOMER_SERVICE: 'customer_service',
  SALES: 'sales',
  MARKETING: 'marketing',
  TECHNIC: 'technic',
  GENERAL_USER: 'general_user'
};

// Department options for registration
export const DEPARTMENTS = [
  {
    value: 'customer_service',
    label: 'Customer Service',
    role: USER_ROLES.CUSTOMER_SERVICE
  },
  {
    value: 'technic',
    label: 'Technic',
    role: USER_ROLES.TECHNIC
  },
  {
    value: 'sales',
    label: 'Sales',
    role: USER_ROLES.SALES
  },
  {
    value: 'marketing',
    label: 'Marketing',
    role: USER_ROLES.MARKETING
  },
  {
    value: 'others',
    label: 'Others',
    role: USER_ROLES.GENERAL_USER
  }
];

// Roles available during registration (excluding Super Admin, Admin, Moderator)
export const REGISTRATION_ROLES = [
  {
    value: USER_ROLES.CUSTOMER_SERVICE,
    label: 'Customer Service',
    description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Customer Service'
  },
  {
    value: USER_ROLES.TECHNIC,
    label: 'Technic',
    description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Technic'
  },
  {
    value: USER_ROLES.SALES,
    label: 'Sales',
    description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Sales'
  },
  {
    value: USER_ROLES.MARKETING,
    label: 'Marketing',
    description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Marketing'
  },
  {
    value: USER_ROLES.GENERAL_USER,
    label: 'General User',
    description: 'ผู้ใช้งานทั่วไป'
  }
];

// All roles for user management (Super Admin can assign these)
export const ALL_ROLES = [
  { value: USER_ROLES.SUPER_ADMIN, label: 'Super Admin', description: 'สิทธิ์สูงสุด จัดการระบบและผู้ใช้ทั้งหมด' },
  { value: USER_ROLES.ADMIN, label: 'Admin', description: 'ดูและแก้ไขได้ทุกหน้า สร้างและแก้ไขฟอร์มทั้งหมด' },
  { value: USER_ROLES.MODERATOR, label: 'Moderator', description: 'สร้างฟอร์ม ลบฟอร์มตัวเอง ดูและแก้ไขข้อมูลทุกฟอร์ม' },
  ...REGISTRATION_ROLES
];

// Permission matrix for each role
export const ROLE_PERMISSIONS = {
  // Super Admin: Full system access + user management
  [USER_ROLES.SUPER_ADMIN]: {
    canViewAll: true,
    canEditAll: true,
    canDeleteAll: true,
    canCreateForms: true,
    canManageUsers: true,
    canChangeRoles: true,
    canAccessAllTags: true,
    tagAccess: [] // Empty = access all
  },

  // Admin: Full access to forms and data, but cannot manage users
  [USER_ROLES.ADMIN]: {
    canViewAll: true,
    canEditAll: true,
    canDeleteAll: true,
    canCreateForms: true,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: true,
    tagAccess: [] // Empty = access all
  },

  // Moderator: Create forms, delete own forms, view/edit all data
  [USER_ROLES.MODERATOR]: {
    canViewAll: true,
    canEditAll: true,
    canDeleteAll: false,
    canDeleteOwn: true, // Can only delete own forms
    canCreateForms: true,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: true,
    tagAccess: [] // Empty = access all
  },

  // Customer Service: Tag-based access
  [USER_ROLES.CUSTOMER_SERVICE]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Customer Service']
  },

  // Sales: Tag-based access
  [USER_ROLES.SALES]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Sales']
  },

  // Marketing: Tag-based access
  [USER_ROLES.MARKETING]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Marketing']
  },

  // Technic: Tag-based access
  [USER_ROLES.TECHNIC]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Technic']
  },

  // General User: No special permissions
  [USER_ROLES.GENERAL_USER]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: []
  }
};

/**
 * Check if user has permission
 * @param {string} userRole - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(userRole, permission) {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) return false;
  return ROLE_PERMISSIONS[userRole][permission] === true;
}

/**
 * Check if user can access a form based on tags
 * @param {string} userRole - User's role
 * @param {Array<string>} formTags - Form's tags
 * @param {string} formOwnerId - Form creator's ID (for moderator delete check)
 * @param {string} userId - Current user's ID
 * @returns {boolean}
 */
export function canAccessForm(userRole, formTags = [], formOwnerId = null, userId = null) {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) return false;

  const permissions = ROLE_PERMISSIONS[userRole];

  // Super Admin and Admin can access all forms
  if (permissions.canAccessAllTags) return true;

  // Check tag-based access
  if (permissions.tagAccess && permissions.tagAccess.length > 0) {
    // User must have at least one matching tag
    return formTags.some(tag => permissions.tagAccess.includes(tag));
  }

  return false;
}

/**
 * Check if user can delete a form
 * @param {string} userRole - User's role
 * @param {string} formOwnerId - Form creator's ID
 * @param {string} userId - Current user's ID
 * @returns {boolean}
 */
export function canDeleteForm(userRole, formOwnerId, userId) {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) return false;

  const permissions = ROLE_PERMISSIONS[userRole];

  // Super Admin and Admin can delete all
  if (permissions.canDeleteAll) return true;

  // Moderator can only delete own forms
  if (permissions.canDeleteOwn && formOwnerId === userId) return true;

  return false;
}

/**
 * Get role display name
 * @param {string} roleValue - Role value
 * @returns {string}
 */
export function getRoleLabel(roleValue) {
  const role = ALL_ROLES.find(r => r.value === roleValue);
  return role ? role.label : roleValue;
}

/**
 * Check if role is an administrative role
 * @param {string} userRole - User's role
 * @returns {boolean}
 */
export function isAdminRole(userRole) {
  return [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.MODERATOR
  ].includes(userRole);
}

/**
 * Map department to role
 * @param {string} department - Department value
 * @returns {string} Role value
 */
export function mapDepartmentToRole(department) {
  const dept = DEPARTMENTS.find(d => d.value === department);
  return dept ? dept.role : USER_ROLES.GENERAL_USER;
}

export default {
  USER_ROLES,
  DEPARTMENTS,
  REGISTRATION_ROLES,
  ALL_ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
  canAccessForm,
  canDeleteForm,
  getRoleLabel,
  isAdminRole,
  mapDepartmentToRole
};
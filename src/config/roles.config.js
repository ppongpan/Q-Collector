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

/**
 * Get role text color (for badges, labels, etc.)
 * Matches colors from Form Settings (EnhancedFormBuilder.jsx)
 * @param {string} role - User role
 * @returns {string} Tailwind CSS class for text color
 */
export function getRoleTextColor(role) {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return 'text-red-500'; // Form Settings: RED
    case USER_ROLES.ADMIN:
      return 'text-pink-500'; // Form Settings: PINK
    case USER_ROLES.MODERATOR:
      return 'text-purple-500'; // Form Settings: PURPLE
    case USER_ROLES.CUSTOMER_SERVICE:
      return 'text-blue-500'; // Form Settings: BLUE
    case USER_ROLES.SALES:
      return 'text-green-500'; // Form Settings: GREEN (note: "sale" in form settings)
    case USER_ROLES.MARKETING:
      return 'text-orange-500'; // Form Settings: ORANGE
    case USER_ROLES.TECHNIC:
      return 'text-cyan-500'; // Form Settings: CYAN
    case USER_ROLES.GENERAL_USER:
      return 'text-gray-500'; // Form Settings: GRAY
    default:
      return 'text-gray-500';
  }
}

/**
 * Get role badge color (background + text + border)
 * Matches colors from Form Settings (EnhancedFormBuilder.jsx)
 * @param {string} role - User role
 * @returns {string} Tailwind CSS classes for badge styling
 */
export function getRoleBadgeColor(role) {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return 'bg-red-500/20 text-red-500 border-red-500/30'; // Form Settings: RED
    case USER_ROLES.ADMIN:
      return 'bg-pink-500/20 text-pink-500 border-pink-500/30'; // Form Settings: PINK
    case USER_ROLES.MODERATOR:
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30'; // Form Settings: PURPLE
    case USER_ROLES.CUSTOMER_SERVICE:
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30'; // Form Settings: BLUE
    case USER_ROLES.SALES:
      return 'bg-green-500/20 text-green-500 border-green-500/30'; // Form Settings: GREEN
    case USER_ROLES.MARKETING:
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30'; // Form Settings: ORANGE
    case USER_ROLES.TECHNIC:
      return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30'; // Form Settings: CYAN
    case USER_ROLES.GENERAL_USER:
      return 'bg-gray-500/20 text-gray-500 border-gray-500/30'; // Form Settings: GRAY
    default:
      return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
  }
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
  mapDepartmentToRole,
  getRoleTextColor,
  getRoleBadgeColor
};
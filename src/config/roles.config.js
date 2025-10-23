/**
 * Role Configuration for Q-Collector RBAC System
 *
 * This file defines:
 * - All user roles in the system
 * - Registration-available roles
 * - Permission matrix for each role
 * - Tag-based access control
 */

// Define all user roles (18 roles sorted alphabetically by label)
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ACCOUNTING: 'accounting',          // NEW v0.8.1
  BD: 'bd',                           // NEW v0.8.1 (Business Development)
  CUSTOMER_SERVICE: 'customer_service',
  HR: 'hr',                           // NEW v0.8.1 (Human Resources)
  IT: 'it',                           // NEW v0.8.1 (Information Technology)
  MAINTENANCE: 'maintenance',         // NEW v0.8.1
  MARKETING: 'marketing',
  OPERATION: 'operation',             // NEW v0.8.1
  PRODUCTION: 'production',           // NEW v0.8.1
  PURCHASING: 'purchasing',           // NEW v0.8.1
  QC: 'qc',                           // NEW v0.8.1 (Quality Control)
  RND: 'rnd',                         // NEW v0.8.1 (R&D)
  SALES: 'sales',
  TECHNIC: 'technic',
  WAREHOUSE: 'warehouse',             // NEW v0.8.1
  GENERAL_USER: 'general_user'
};

// Department options for registration
// NOTE: All registrations create GENERAL_USER role (not department role)
// Department is saved to user profile for Admin reference
export const DEPARTMENTS = [
  { value: 'accounting', label: 'Accounting', role: USER_ROLES.GENERAL_USER },
  { value: 'bd', label: 'BD', role: USER_ROLES.GENERAL_USER },
  { value: 'customer_service', label: 'Customer Service', role: USER_ROLES.GENERAL_USER },
  { value: 'hr', label: 'HR', role: USER_ROLES.GENERAL_USER },
  { value: 'it', label: 'IT', role: USER_ROLES.GENERAL_USER },
  { value: 'maintenance', label: 'Maintenance', role: USER_ROLES.GENERAL_USER },
  { value: 'marketing', label: 'Marketing', role: USER_ROLES.GENERAL_USER },
  { value: 'operation', label: 'Operation', role: USER_ROLES.GENERAL_USER },
  { value: 'production', label: 'Production', role: USER_ROLES.GENERAL_USER },
  { value: 'purchasing', label: 'Purchasing', role: USER_ROLES.GENERAL_USER },
  { value: 'qc', label: 'QC', role: USER_ROLES.GENERAL_USER },
  { value: 'rnd', label: 'R&D', role: USER_ROLES.GENERAL_USER },
  { value: 'sales', label: 'Sales', role: USER_ROLES.GENERAL_USER },
  { value: 'technic', label: 'Technic', role: USER_ROLES.GENERAL_USER },
  { value: 'warehouse', label: 'Warehouse', role: USER_ROLES.GENERAL_USER },
  { value: 'others', label: 'Others', role: USER_ROLES.GENERAL_USER }
];

// Roles available during registration (excluding Super Admin and Admin)
// Sorted alphabetically by label
export const REGISTRATION_ROLES = [
  { value: USER_ROLES.ACCOUNTING, label: 'Accounting', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Accounting' },
  { value: USER_ROLES.BD, label: 'BD', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag BD' },
  { value: USER_ROLES.CUSTOMER_SERVICE, label: 'Customer Service', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Customer Service' },
  { value: USER_ROLES.GENERAL_USER, label: 'General User', description: 'ผู้ใช้งานทั่วไป' },
  { value: USER_ROLES.HR, label: 'HR', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag HR' },
  { value: USER_ROLES.IT, label: 'IT', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag IT' },
  { value: USER_ROLES.MAINTENANCE, label: 'Maintenance', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Maintenance' },
  { value: USER_ROLES.MARKETING, label: 'Marketing', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Marketing' },
  { value: USER_ROLES.OPERATION, label: 'Operation', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Operation' },
  { value: USER_ROLES.PRODUCTION, label: 'Production', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Production' },
  { value: USER_ROLES.PURCHASING, label: 'Purchasing', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Purchasing' },
  { value: USER_ROLES.QC, label: 'QC', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag QC' },
  { value: USER_ROLES.RND, label: 'R&D', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag R&D' },
  { value: USER_ROLES.SALES, label: 'Sales', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Sales' },
  { value: USER_ROLES.TECHNIC, label: 'Technic', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Technic' },
  { value: USER_ROLES.WAREHOUSE, label: 'Warehouse', description: 'ดูและแก้ไขข้อมูลในฟอร์มที่มี tag Warehouse' }
];

// All roles for user management (Super Admin can assign these)
// Sorted: Admin tier → Tag-based roles (alphabetically) → Limited access
export const ALL_ROLES = [
  { value: USER_ROLES.SUPER_ADMIN, label: 'Super Admin', description: 'สิทธิ์สูงสุด จัดการระบบและผู้ใช้ทั้งหมด' },
  { value: USER_ROLES.ADMIN, label: 'Admin', description: 'ดูและแก้ไขได้ทุกหน้า สร้างและแก้ไขฟอร์มทั้งหมด' },
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

  // === NEW ROLES v0.8.1 (Tag-based access) ===

  // Accounting: Tag-based access
  [USER_ROLES.ACCOUNTING]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Accounting']
  },

  // BD (Business Development): Tag-based access
  [USER_ROLES.BD]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['BD']
  },

  // HR (Human Resources): Tag-based access
  [USER_ROLES.HR]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['HR']
  },

  // IT (Information Technology): Tag-based access
  [USER_ROLES.IT]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['IT']
  },

  // Maintenance: Tag-based access
  [USER_ROLES.MAINTENANCE]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Maintenance']
  },

  // Operation: Tag-based access
  [USER_ROLES.OPERATION]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Operation']
  },

  // Production: Tag-based access
  [USER_ROLES.PRODUCTION]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Production']
  },

  // Purchasing: Tag-based access
  [USER_ROLES.PURCHASING]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Purchasing']
  },

  // QC (Quality Control): Tag-based access
  [USER_ROLES.QC]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['QC']
  },

  // R&D (Research & Development): Tag-based access
  [USER_ROLES.RND]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['R&D']
  },

  // Warehouse: Tag-based access
  [USER_ROLES.WAREHOUSE]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Warehouse']
  },

  // === END NEW ROLES ===

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
 * @param {string} formOwnerId - Form creator's ID (for admin delete check)
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
    USER_ROLES.ADMIN
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
    // Admin Tier
    case USER_ROLES.SUPER_ADMIN:
      return 'text-red-500';
    case USER_ROLES.ADMIN:
      return 'text-pink-500';
    case USER_ROLES.ADMIN:
      return 'text-purple-500';

    // Tag-based Roles (Existing)
    case USER_ROLES.CUSTOMER_SERVICE:
      return 'text-blue-500';
    case USER_ROLES.MARKETING:
      return 'text-orange-500';
    case USER_ROLES.SALES:
      return 'text-green-500';
    case USER_ROLES.TECHNIC:
      return 'text-cyan-500';

    // Tag-based Roles (NEW v0.8.1)
    case USER_ROLES.ACCOUNTING:
      return 'text-indigo-500';
    case USER_ROLES.BD:
      return 'text-teal-500';
    case USER_ROLES.HR:
      return 'text-rose-500';
    case USER_ROLES.IT:
      return 'text-violet-500';
    case USER_ROLES.MAINTENANCE:
      return 'text-amber-500';
    case USER_ROLES.OPERATION:
      return 'text-lime-500';
    case USER_ROLES.PRODUCTION:
      return 'text-emerald-500';
    case USER_ROLES.PURCHASING:
      return 'text-sky-500';
    case USER_ROLES.QC:
      return 'text-fuchsia-500';
    case USER_ROLES.RND:
      return 'text-yellow-500';
    case USER_ROLES.WAREHOUSE:
      return 'text-slate-500';

    // Limited Access
    case USER_ROLES.GENERAL_USER:
      return 'text-gray-500';

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
    // Admin Tier
    case USER_ROLES.SUPER_ADMIN:
      return 'bg-red-500/20 text-red-500 border-red-500/30'; // Form Settings: RED
    case USER_ROLES.ADMIN:
      return 'bg-pink-500/20 text-pink-500 border-pink-500/30'; // Form Settings: PINK
    case USER_ROLES.ADMIN:
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30'; // Form Settings: PURPLE

    // Tag-based Roles (Existing)
    case USER_ROLES.CUSTOMER_SERVICE:
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30'; // Form Settings: BLUE
    case USER_ROLES.SALES:
      return 'bg-green-500/20 text-green-500 border-green-500/30'; // Form Settings: GREEN
    case USER_ROLES.MARKETING:
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30'; // Form Settings: ORANGE
    case USER_ROLES.TECHNIC:
      return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30'; // Form Settings: CYAN

    // Tag-based Roles (NEW v0.8.1)
    case USER_ROLES.ACCOUNTING:
      return 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30'; // Form Settings: INDIGO
    case USER_ROLES.BD:
      return 'bg-teal-500/20 text-teal-500 border-teal-500/30'; // Form Settings: TEAL
    case USER_ROLES.HR:
      return 'bg-rose-500/20 text-rose-500 border-rose-500/30'; // Form Settings: ROSE
    case USER_ROLES.IT:
      return 'bg-violet-500/20 text-violet-500 border-violet-500/30'; // Form Settings: VIOLET
    case USER_ROLES.MAINTENANCE:
      return 'bg-amber-500/20 text-amber-500 border-amber-500/30'; // Form Settings: AMBER
    case USER_ROLES.OPERATION:
      return 'bg-lime-500/20 text-lime-500 border-lime-500/30'; // Form Settings: LIME
    case USER_ROLES.PRODUCTION:
      return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'; // Form Settings: EMERALD
    case USER_ROLES.PURCHASING:
      return 'bg-sky-500/20 text-sky-500 border-sky-500/30'; // Form Settings: SKY
    case USER_ROLES.QC:
      return 'bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500/30'; // Form Settings: FUCHSIA
    case USER_ROLES.RND:
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'; // Form Settings: YELLOW
    case USER_ROLES.WAREHOUSE:
      return 'bg-slate-500/20 text-slate-500 border-slate-500/30'; // Form Settings: SLATE

    // Limited Access
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
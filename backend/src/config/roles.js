const PERMISSIONS = {
  CREATE_CHEMICAL: 'create_chemical',
  EDIT_CHEMICAL: 'edit_chemical',
  DELETE_CHEMICAL: 'delete_chemical',
  APPROVE_REQUEST: 'approve_request',
  VIEW_REPORTS: 'view_reports',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  ASSIGN_ROLES: 'assign_roles',
  VIEW_CHEMICALS: 'view_chemicals',
  SUBMIT_REQUEST: 'submit_request',
  UPDATE_STOCK: 'update_stock',
  VIEW_SAFETY_INFO: 'view_safety_info',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_LOCATIONS: 'manage_locations',
  MANAGE_USERS: 'manage_users',
  MANAGE_WASTE: 'manage_waste',
  APPROVE_DISPOSAL: 'approve_disposal',
  PERFORM_BACKUP: 'perform_backup',
  PERFORM_RESTORE: 'perform_restore',
  MANAGE_SECURITY: 'manage_security',
  VIEW_FINANCIALS: 'view_financials',
  APPROVE_CROSS_LAB_TRANSFER: 'approve_cross_lab_transfer',
  MANAGE_SUPPORT: 'manage_support',
  MANAGE_LABS: 'MANAGE_LABS'
};

const ROLES = {
  ADMIN: 'Admin',
  LAB_MANAGER: 'Lab Manager',
  SAFETY_OFFICER: 'Safety Officer',
  LAB_STAFF: 'Lab Technician',
  AUDITOR: 'Viewer / Auditor'
};

const ROLE_PERMISSIONS = {
  // Platform admin: users, settings, security, labs — not day-to-day lab ops
  [ROLES.ADMIN]: Object.values(PERMISSIONS).filter(
    (p) =>
      ![
        PERMISSIONS.MANAGE_LOCATIONS,
        PERMISSIONS.CREATE_CHEMICAL,
        PERMISSIONS.EDIT_CHEMICAL,
        PERMISSIONS.DELETE_CHEMICAL,
        PERMISSIONS.APPROVE_REQUEST,
        PERMISSIONS.UPDATE_STOCK,
        PERMISSIONS.SUBMIT_REQUEST,
      ].includes(p)
  ),

  [ROLES.LAB_MANAGER]: [
    PERMISSIONS.CREATE_CHEMICAL,
    PERMISSIONS.EDIT_CHEMICAL,
    PERMISSIONS.DELETE_CHEMICAL,
    PERMISSIONS.APPROVE_REQUEST,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_CHEMICALS,
    PERMISSIONS.SUBMIT_REQUEST,
    PERMISSIONS.UPDATE_STOCK,
    PERMISSIONS.VIEW_SAFETY_INFO,
    PERMISSIONS.MANAGE_WASTE,
    PERMISSIONS.APPROVE_DISPOSAL,
    PERMISSIONS.APPROVE_CROSS_LAB_TRANSFER,
    PERMISSIONS.MANAGE_LABS,
    PERMISSIONS.MANAGE_LOCATIONS,
    PERMISSIONS.VIEW_FINANCIALS
  ],

  [ROLES.SAFETY_OFFICER]: [
    PERMISSIONS.VIEW_CHEMICALS,
    PERMISSIONS.VIEW_SAFETY_INFO,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_WASTE,
    PERMISSIONS.APPROVE_DISPOSAL,
    PERMISSIONS.EDIT_CHEMICAL,
    PERMISSIONS.SUBMIT_REQUEST
  ],

  [ROLES.LAB_STAFF]: [
    PERMISSIONS.VIEW_CHEMICALS,
    PERMISSIONS.UPDATE_STOCK,
    PERMISSIONS.SUBMIT_REQUEST,
    PERMISSIONS.VIEW_SAFETY_INFO
  ],

  // Read-focused role — no stock mutations
  [ROLES.AUDITOR]: [
    PERMISSIONS.VIEW_CHEMICALS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_SAFETY_INFO
  ]
};

/** True if role string maps to a known role and holds the permission. */
function roleHasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

module.exports = { PERMISSIONS, ROLES, ROLE_PERMISSIONS, roleHasPermission };

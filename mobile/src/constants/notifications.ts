/** Mirrors frontend Notifications.jsx TYPE_CONFIG + ROLE_TYPES */

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  LOW_STOCK: 'Low Stock',
  EXPIRY: 'Expiry Warning',
  UNAUTHORIZED_ACCESS: 'Security Alert',
  SYSTEM: 'System',
  COMPLIANCE: 'Compliance',
  HAZARD: 'Hazard Warning',
  DISPOSAL: 'Disposal Alert',
  INCOMPATIBILITY: 'Incompatibility',
  SPILL_INCIDENT: 'Spill Incident',
  STORAGE_CONDITION: 'Unsafe Storage',
  MISSING_DOCUMENT: 'Missing SDS',
  EMERGENCY: 'Emergency',
  ENVIRONMENTAL_RISK: 'Environmental Risk',
  REQUEST_UPDATE: 'Request Update',
  INFO: 'Info',
};

export const ROLE_NOTIFICATION_TYPES: Record<string, string[]> = {
  Admin: ['UNAUTHORIZED_ACCESS', 'SYSTEM'],
  'Lab Manager': ['LOW_STOCK', 'EXPIRY', 'COMPLIANCE', 'SYSTEM'],
  'Safety Officer': [
    'COMPLIANCE',
    'HAZARD',
    'SYSTEM',
    'DISPOSAL',
    'INCOMPATIBILITY',
    'SPILL_INCIDENT',
    'STORAGE_CONDITION',
    'MISSING_DOCUMENT',
    'EMERGENCY',
    'ENVIRONMENTAL_RISK',
  ],
  'Lab Technician': ['LOW_STOCK', 'EXPIRY', 'REQUEST_UPDATE', 'SYSTEM'],
  Technician: ['LOW_STOCK', 'EXPIRY', 'REQUEST_UPDATE', 'SYSTEM'],
};

export function roleNotificationTypes(role?: string | null): string[] {
  if (!role) return Object.keys(NOTIFICATION_TYPE_LABELS);
  return ROLE_NOTIFICATION_TYPES[role] || Object.keys(NOTIFICATION_TYPE_LABELS);
}

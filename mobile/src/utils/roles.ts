/** Same role visibility rules as frontend Sidebar.jsx */

export type AppRole =
  | 'Admin'
  | 'Lab Manager'
  | 'Safety Officer'
  | 'Lab Technician'
  | 'Viewer / Auditor';

const ROLE_ALIASES: Record<string, AppRole> = {
  admin: 'Admin',
  administrator: 'Admin',
  'lab manager': 'Lab Manager',
  manager: 'Lab Manager',
  'safety officer': 'Safety Officer',
  safety: 'Safety Officer',
  'lab technician': 'Lab Technician',
  technician: 'Lab Technician',
  'lab staff': 'Lab Technician',
  'viewer / auditor': 'Viewer / Auditor',
  viewer: 'Viewer / Auditor',
  auditor: 'Viewer / Auditor',
};

/** Normalize backend / JWT role strings to canonical AppRole labels */
export function normalizeRole(userRole?: string | null): AppRole | string {
  if (!userRole) return '';
  const key = userRole.trim().toLowerCase();
  return ROLE_ALIASES[key] || userRole.trim();
}

export function roleMatches(userRole: string | undefined, allowed?: string[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!userRole) return false;
  const canonical = normalizeRole(userRole);
  const u = String(canonical).toLowerCase();
  return allowed.some((r) => r.toLowerCase() === u || normalizeRole(r).toString().toLowerCase() === u);
}

export function isAdmin(role?: string) {
  return roleMatches(role, ['Admin']);
}

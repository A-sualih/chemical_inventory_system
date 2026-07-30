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
  'laboratory staff': 'Lab Technician',
  'laboratory technician': 'Lab Technician',
  'viewer / auditor': 'Viewer / Auditor',
  viewer: 'Viewer / Auditor',
  auditor: 'Viewer / Auditor',
  user: 'Viewer / Auditor',
};

/**
 * Fast Check-In/Out + Adaptive Scanner role flags — matches web
 * TransactionSystem.jsx / ScanQR.jsx.
 *
 * - Lab Manager: full check-in/out + enroll
 * - Lab Technician: scan → usage request (no stock mutation on Fast Track)
 * - Safety Officer / Viewer: read-only safety profile after scan
 */
export function getTransactionRoleFlags(userRole?: string | null) {
  const role = normalizeRole(userRole);
  const r = userRole ?? undefined;
  const isSafetyOrViewer = roleMatches(r, ['Safety Officer', 'Viewer / Auditor']);
  const isLabStaff = roleMatches(r, ['Lab Technician']);
  const isLabManager = roleMatches(r, ['Lab Manager']);
  return {
    role,
    isSafetyOrViewer,
    isLabStaff,
    isLabManager,
    /** Same as web `isViewer` (Safety Officer OR Viewer / Auditor) */
    isViewer: isSafetyOrViewer,
    /** Full Fast Track quantity + PPE confirm (Lab Manager only on website) */
    canFastTrackTransact: isLabManager,
    /** Adaptive Scanner ±1 quick-scan (Lab Manager; Tech has update_stock but out → request) */
    canQuickStock: isLabManager || isLabStaff,
  };
}

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

/** Normalize common API list payloads from the shared CIMS backend. */
export function asList<T = any>(data: unknown, keys: string[] = []): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return [];
}

export function toneForStatus(status?: string): 'muted' | 'ok' | 'warn' | 'danger' {
  const s = String(status || '').toLowerCase();
  if (['approved', 'completed', 'active', 'ok', 'available', 'success'].some((x) => s.includes(x))) {
    return 'ok';
  }
  if (['reject', 'fail', 'empty', 'expired', 'critical', 'denied'].some((x) => s.includes(x))) {
    return 'danger';
  }
  if (['pending', 'low', 'warn', 'review', 'expir'].some((x) => s.includes(x))) {
    return 'warn';
  }
  return 'muted';
}

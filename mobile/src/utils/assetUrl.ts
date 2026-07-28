import { API_BASE_URL } from '../api/config';

/** Resolve uploaded asset paths (`/uploads/...`) to full backend URLs. */
export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

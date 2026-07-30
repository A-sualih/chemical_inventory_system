/**
 * Resolve backend asset paths for local + Vercel.
 * Uses VITE_API_ORIGIN in production so SDS/uploads hit Render.
 */
export function resolveAssetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const origin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  if (origin) return `${origin}${path}`;
  return path;
}

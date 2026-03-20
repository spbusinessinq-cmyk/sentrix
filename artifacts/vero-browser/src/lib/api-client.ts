/**
 * Sentrix API client
 *
 * In development (no VITE_API_BASE_URL set), uses relative paths so the
 * Replit dev proxy routes /api/* to the API server automatically.
 *
 * In production, set VITE_API_BASE_URL to the deployed API server origin
 * (e.g. https://api.sentrix.app) so search requests route correctly across
 * origins.  No hardcoded localhost anywhere.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.replace(/\/$/, '') ?? '';

/**
 * Resolve a server-side path against the configured API base.
 * apiUrl('/api/search') → '/api/search'   (dev, no base set)
 * apiUrl('/api/search') → 'https://…/api/search'  (production)
 */
export function apiUrl(path: string): string {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalised}`;
}

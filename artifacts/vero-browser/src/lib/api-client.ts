/**
 * Sentrix API client
 *
 * In development (no VITE_API_BASE_URL set), uses relative paths so the
 * Replit dev proxy routes /api/* to the API server automatically.
 *
 * In production, VITE_API_BASE_URL can be set to the deployed API origin
 * (e.g. https://your-replit-app.replit.app) so requests cross origins
 * correctly.  If unset, relative /api/* paths are used, which works when
 * the frontend and API are served from the same domain.
 *
 * Mixed-content guard: if VITE_API_BASE_URL starts with http:// but the
 * current page is https://, it is automatically upgraded to https:// to
 * prevent browser-blocked mixed-content requests.
 */

const RAW = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

function resolvedBase(): string {
  if (!RAW) return '';

  // Mixed-content guard — upgrade http → https when page is secure
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    RAW.startsWith('http://')
  ) {
    const upgraded = RAW.replace(/^http:\/\//, 'https://');
    console.warn(
      `[Sentrix] VITE_API_BASE_URL was http:// on an https:// page — ` +
      `automatically upgraded to ${upgraded}. ` +
      `Set VITE_API_BASE_URL to an https:// URL to suppress this warning.`
    );
    return upgraded;
  }

  return RAW;
}

/**
 * Resolve a server-side path against the configured API base.
 *
 * apiUrl('/api/search') → '/api/search'                      (no base set — relative)
 * apiUrl('/api/search') → 'https://api.sentrix.app/api/search' (base set)
 */
export function apiUrl(path: string): string {
  const base = resolvedBase();
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalised}`;
}

/**
 * Log the API base resolution on startup so production issues are immediately
 * visible in the browser console and deployment logs.
 */
if (typeof window !== 'undefined') {
  const base = resolvedBase();
  const mode = import.meta.env.MODE ?? 'unknown';
  console.info(
    `[Sentrix] API client ready — mode: ${mode} | base: "${base || '(relative)'}" | ` +
    `VITE_API_BASE_URL: "${RAW || '(not set)'}"`
  );
}

/**
 * Axios base URL must be the API origin only — never include `/api`.
 * Paths in the app already start with `/api/...`.
 */
export const normalizeApiBaseUrl = (raw) => {
  let base = String(raw ?? '').trim()
  if (!base) return ''
  base = base.replace(/\/+$/, '')
  if (base.endsWith('/api')) {
    base = base.slice(0, -4).replace(/\/+$/, '')
  }
  return base
}

/** Public marketing/admin hostnames served by Vercel + Cloudflare. */
export const PUBLIC_SITE_HOSTS = new Set(['hdncar.com', 'www.hdncar.com'])

/**
 * Browser calls on the public site must be same-origin (`/api/...` on hdncar.com).
 * Vercel rewrites those paths to the Render API so Chrome never talks to
 * api.hdncar.com (which local SSL inspection can intercept).
 *
 * Dev: empty base + Vite `/api` proxy.
 * Server-side / SEO scripts still use VITE_BASE_URL (api.hdncar.com).
 */
export const resolveApiBaseUrl = ({
  hostname = typeof window !== 'undefined' ? window.location?.hostname : '',
  origin = typeof window !== 'undefined' ? window.location?.origin : '',
  envUrl = import.meta.env.VITE_BASE_URL,
  isDev = import.meta.env.DEV,
} = {}) => {
  if (hostname && PUBLIC_SITE_HOSTS.has(hostname) && origin) {
    return String(origin).replace(/\/+$/, '')
  }
  if (isDev && !envUrl) return ''
  if (envUrl) return normalizeApiBaseUrl(envUrl)
  if (origin) return String(origin).replace(/\/+$/, '')
  return 'http://localhost:3000'
}

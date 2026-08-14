/**
 * Desk (walk-in) reservations may have no email address. Bookings created before
 * the server stopped storing one keep an internal placeholder in `customerEmail`,
 * so treat those as "no email" everywhere the admin shows customer contact details.
 */
const PLACEHOLDER_DOMAIN = '@local.americonfort'
const PLACEHOLDER_PREFIX = 'walkin+'

export const isPlaceholderEmail = (email) => {
  const value = String(email || '').trim().toLowerCase()
  if (!value) return false
  return value.endsWith(PLACEHOLDER_DOMAIN) || value.startsWith(PLACEHOLDER_PREFIX)
}

/** The address to show/edit for a customer — empty when there is none. */
export const customerEmail = (source) => {
  const value = String(source?.customerEmail ?? source?.email ?? source ?? '').trim()
  if (!value || isPlaceholderEmail(value)) return ''
  return value
}

export default customerEmail

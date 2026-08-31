import { CUSTOMER_CARE_TEMPLATE_IDS } from '@shared/customerCareWhatsApp.js'

export const CRM_TABS = [
  'overview',
  'rentals',
  'care',
  'communication',
  'documents',
  'reviews',
  'loyalty',
  'activity',
]

export const SMART_TONES = {
  active: 'success',
  returning: 'info',
  vip: 'warn',
  needs_followup: 'warn',
  issue: 'danger',
  inactive: 'neutral',
}

export const SMART_DOT = {
  active: '🟢',
  returning: '🔵',
  vip: '⭐',
  needs_followup: '🟡',
  issue: '🔴',
  inactive: '⚪',
}

export const LOYALTY_TONES = {
  new: 'info',
  regular: 'neutral',
  gold: 'warn',
  vip: 'warn',
}

export const LIST_FILTERS = [
  '',
  'new',
  'returning',
  'vip',
  'active_rental',
  'needs_followup',
  'inactive',
  'complaints',
  'upcoming',
]

export const WA_TEMPLATES = CUSTOMER_CARE_TEMPLATE_IDS

export const FOLLOW_UP_TO_TEMPLATE = {
  signed_contract: 'signed_contract',
  during_rental: 'during_rental',
  return_reminder: 'return_reminder',
  thank_you: 'thank_you',
  review: 'review_request',
  winback: 'winback',
}

export const formatShortDate = (value, language = 'en') => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'
  return d.toLocaleString(locale, {
    timeZone: 'Africa/Casablanca',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const formatDay = (value, language = 'en') => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'
  return d.toLocaleDateString(locale, { timeZone: 'Africa/Casablanca' })
}

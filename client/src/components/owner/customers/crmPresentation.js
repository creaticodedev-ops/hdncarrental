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

export const JOURNEY_VISIBLE = [
  'reservation',
  'pickup',
  'active',
  'return',
  'review',
  'loyalty',
  'repeat',
]

export const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'HD'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export const hoursUntil = (value, now = new Date()) => {
  const t = new Date(value).getTime()
  if (!Number.isFinite(t)) return Infinity
  return (t - now.getTime()) / (60 * 60 * 1000)
}

export const daysSince = (value, now = new Date()) => {
  if (!value) return Infinity
  const t = new Date(value).getTime()
  if (!Number.isFinite(t)) return Infinity
  return (now.getTime() - t) / (24 * 60 * 60 * 1000)
}

const localeFor = (language) => (language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB')

export const formatShortDate = (value, language = 'en') => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(localeFor(language), {
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
  return d.toLocaleDateString(localeFor(language), { timeZone: 'Africa/Casablanca' })
}

export const formatClock = (value, language = 'en') => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(localeFor(language), {
    timeZone: 'Africa/Casablanca',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const groupByDay = (events, language = 'en') => {
  const groups = []
  const map = new Map()
  for (const ev of events || []) {
    const key = formatDay(ev.at, language)
    if (!map.has(key)) {
      const g = { key, items: [] }
      map.set(key, g)
      groups.push(g)
    }
    map.get(key).items.push(ev)
  }
  return groups
}

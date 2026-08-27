import { customerEmail } from '../../../utils/customerEmail'

const LOCALE = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' }

export { customerEmail }

export const EXTENDABLE_STATUSES = ['confirmed', 'ready_for_pickup', 'active']

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'ready_for_pickup',
  'active',
  'completed',
  'cancelled',
]

export const reservationRef = (booking) => {
  if (!booking) return '—'
  if (booking.reservationId) return booking.reservationId
  const id = booking._id ? String(booking._id) : ''
  return id ? `RES-${id.slice(-8).toUpperCase()}` : '—'
}

export const vehicleLabel = (car) => {
  if (!car) return '—'
  return `${car.brand || ''} ${car.model || ''}`.trim() || '—'
}

export const vehicleMeta = (car) => {
  if (!car) return ''
  return [car.transmission, car.fuel_type || car.fuelType, car.licensePlate].filter(Boolean).join(' · ')
}

export const customerInitials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const a = parts[0]?.[0] || ''
  const b = parts[1]?.[0] || ''
  return `${a}${b}`.toUpperCase() || '?'
}

export const dateLocale = (language) => LOCALE[language] || 'en-GB'

export const formatDateTime = (value, language = 'en') => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(dateLocale(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatCompactDate = (value, language = 'en') => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(dateLocale(language), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatDay = (value, language = 'en') => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(dateLocale(language), { day: 'numeric', month: 'short' })
}

export const formatTime = (value, language = 'en') => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(dateLocale(language), { hour: '2-digit', minute: '2-digit' })
}

export const dateRangeLabel = (pickup, ret, language = 'en') => {
  const a = formatDay(pickup, language)
  const b = formatDay(ret, language)
  if (a === '—' && b === '—') return '—'
  return `${a} → ${b}`
}

/** Inclusive calendar span used for ops display (matches rental day count UX). */
export const rentalDayCount = (pickup, ret) => {
  const a = new Date(pickup)
  const b = new Date(ret)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.max(1, Math.round((end - start) / 86400000) || 1)
}

export const extraCalendarDays = (from, to) => {
  const a = new Date(from)
  const b = new Date(to)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000))
}

export const AGENCY_TIMEZONE = 'Africa/Casablanca'

/** Format an instant as a datetime-local value in Africa/Casablanca. */
export const toAgencyDateTimeLocal = (value) => {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const parts = {}
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: AGENCY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }
  if (!parts.year) return ''
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export const addHoursAgencyLocal = (value, hours) => {
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  d.setTime(d.getTime() + Number(hours) * 3600000)
  return toAgencyDateTimeLocal(d)
}

export const getSignatureStatus = (booking) => {
  if (booking?.completion?.signatureComplete) return 'signed'
  const status = booking?.completion?.requestStatus
  if (status && status !== 'none') return status
  return 'none'
}

/**
 * Contract fields the reservation must carry before a customer can just sign.
 * Mirrors the server's required list — the server stays the authority on whether a
 * link is signature-only, this is only so the owner can see it before sending.
 * Values are `admin.contracts.*` translation keys.
 */
const CONTRACT_FIELDS = [
  ['customerName', 'customerName'],
  ['customerPhone', 'phone'],
  ['customerAddress', 'address'],
  ['dateOfBirth', 'dateOfBirth'],
  ['nationality', 'nationality'],
  ['placeOfBirth', 'placeOfBirth'],
  ['identityDocumentNumber', 'identityNumber'],
  ['identityIssuedOn', 'identityIssued'],
  ['driverLicenseNumber', 'driverLicense'],
  ['driverLicenseExpiry', 'licenseExpiry'],
  ['driverLicenseIssuedOn', 'licenseIssued'],
]

const SECOND_DRIVER_FIELDS = [
  ['fullName', 'secondDriverName'],
  ['dateOfBirth', 'secondDriverDob'],
  ['driverLicenseNumber', 'driverLicense'],
]

const isBlank = (value) => value === undefined || value === null || String(value).trim() === ''

/** Translation keys for the contract fields still empty on this reservation. */
export const getMissingContractFields = (booking) => {
  if (!booking) return []
  const missing = CONTRACT_FIELDS.filter(([field]) => isBlank(booking[field])).map(([, key]) => key)
  const sd = booking.secondDriver
  if (sd?.enabled) {
    for (const [field, key] of SECOND_DRIVER_FIELDS) {
      if (isBlank(sd[field])) missing.push(key)
    }
  }
  return missing
}

/** Channels where staff own the reservation data (mirrors DESK_CHANNELS server-side). */
export const DESK_CHANNELS = ['walk_in']

/**
 * What the customer will see when they open the signature link.
 * Walk-in is always signature-only. Online / WhatsApp always keep the full
 * completion wizard. Completeness of fields must not change the mode.
 * The server is the authority — this exists so the drawer can preview the link.
 */
export const getCompletionMode = (booking) => {
  const channel = String(booking?.channel || 'online').trim().toLowerCase()
  if (DESK_CHANNELS.includes(channel) || channel === 'walk-in' || channel === 'walkin') {
    return 'signature_only'
  }
  return 'full'
}

export const getPaymentDisplay = (booking) => {
  const ps = booking?.paymentStatus || 'pending'
  if (ps === 'paid') return 'paid'
  if (ps === 'failed') return 'failed'
  if (ps === 'refunded') return 'refunded'
  const paid = Number(booking?.completion?.amountPaid || 0)
  const due = Number(booking?.completion?.amountDue || booking?.price || 0)
  if (paid > 0 && due > paid) return 'partial'
  return 'unpaid'
}

export const getContractStatus = (booking) => {
  if (booking?.completion?.contractPdfUrl) return 'ready'
  if (booking?.completion?.documentsComplete) return 'in_progress'
  return 'none'
}

export const bookingStatusTone = (status) => {
  if (status === 'confirmed' || status === 'ready_for_pickup') return 'success'
  if (status === 'active') return 'info'
  if (status === 'completed') return 'neutral'
  if (status === 'cancelled') return 'danger'
  return 'warn'
}

export const signatureTone = (status) => {
  if (status === 'signed') return 'success'
  if (status === 'pending') return 'warn'
  if (status === 'expired' || status === 'cancelled') return 'danger'
  return 'neutral'
}

export const paymentTone = (status) => {
  if (status === 'paid') return 'success'
  if (status === 'partial') return 'warn'
  if (status === 'failed' || status === 'refunded' || status === 'unpaid') return 'danger'
  return 'neutral'
}

export const contractTone = (status) => {
  if (status === 'ready') return 'success'
  if (status === 'in_progress') return 'info'
  return 'neutral'
}

export const canRequestSignature = (booking) => {
  if (!booking || booking.status === 'cancelled' || booking.status === 'completed') return false
  const sig = getSignatureStatus(booking)
  return sig !== 'signed'
}

export const canExtend = (booking) => EXTENDABLE_STATUSES.includes(booking?.status)

export const entityName = (value) => {
  if (!value) return ''
  if (typeof value === 'object') {
    return value.fullName || value.companyName || value.name || ''
  }
  return ''
}

export const money = (currency, amount) => `${currency}${Number(amount || 0)}`

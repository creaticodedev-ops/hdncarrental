/** wa.me deep links — no Meta API. Agency: +212 665 330 116 */

import { BRAND_NAME } from '../constants/brand'
import { customerEmail } from './customerEmail'
import { buildSignedContractWhatsAppMessage } from '../../../shared/signedContractWhatsApp.js'
import {
  buildSignatureLinkWhatsAppMessage,
  secondDriverShareName,
} from '../../../shared/signatureLinkWhatsApp.js'

export const DEFAULT_AGENCY_WHATSAPP = '212665330116'

export const normalizeWhatsAppDial = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0') && digits.length === 10) return `212${digits.slice(1)}`
  return digits
}

export const getAgencyWhatsAppDial = () => {
  const raw =
    import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER ||
    import.meta.env.VITE_WHATSAPP_NUMBER ||
    DEFAULT_AGENCY_WHATSAPP
  return normalizeWhatsAppDial(raw) || DEFAULT_AGENCY_WHATSAPP
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

const formatShareDateTime = (value, language = 'en') => {
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

export const buildWaMeUrl = (text, dial = getAgencyWhatsAppDial(), { allowEmptyDial = false } = {}) => {
  const to = normalizeWhatsAppDial(dial)
  if (!to) {
    if (allowEmptyDial) {
      return text?.trim() ? `https://wa.me/?text=${encodeURIComponent(text)}` : 'https://wa.me/'
    }
    return text?.trim()
      ? `https://wa.me/${DEFAULT_AGENCY_WHATSAPP}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${DEFAULT_AGENCY_WHATSAPP}`
  }
  if (!text?.trim()) return `https://wa.me/${to}`
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`
}

/** Digits after wa.me/ — the conversation recipient, not numbers mentioned in the message. */
export const whatsappRecipientDial = (url) => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (host === 'wa.me' || host.endsWith('.wa.me')) {
      const pathDial = parsed.pathname.replace(/^\//, '').split('/')[0]
      return /^\d+$/.test(pathDial) ? pathDial : ''
    }
    if (host.includes('whatsapp.com')) {
      return normalizeWhatsAppDial(parsed.searchParams.get('phone') || '')
    }
    return ''
  } catch {
    return ''
  }
}

/** Prefer a server URL only when it already opens a chat with this customer. */
export const preferCustomerWhatsAppUrl = (serverUrl, built) => {
  if (!built?.customerDial || !built?.whatsappUrl) return ''
  if (serverUrl && whatsappRecipientDial(serverUrl) === built.customerDial) return serverUrl
  return built.whatsappUrl
}

/**
 * Open WhatsApp (or any external URL) in a new tab without navigating the current page.
 *
 * Important: do NOT pass `noopener` to window.open() when you need the WindowProxy —
 * with noopener, browsers return null and callers often fall back to location.href,
 * which destroys the reservation form.
 *
 * Call `prepare()` synchronously inside the user gesture, then `navigate(url)` after async work.
 */
export const createExternalTabOpener = () => {
  // about:blank keeps a usable WindowProxy; omit noopener so the handle is returned.
  let tab = null
  try {
    tab = window.open('about:blank', '_blank')
  } catch {
    tab = null
  }

  return {
    prepared: Boolean(tab && !tab.closed),
    navigate(url) {
      if (!url) return false
      if (tab && !tab.closed) {
        try {
          tab.location.href = url
          try {
            tab.opener = null
          } catch {
            /* ignore */
          }
          return true
        } catch {
          /* fall through */
        }
      }
      // Last resort: temporary anchor — still targets a new tab, never the current page.
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.target = '_blank'
        anchor.rel = 'noopener noreferrer'
        anchor.style.display = 'none'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        return true
      } catch {
        return false
      }
    },
    close() {
      if (tab && !tab.closed) {
        try {
          tab.close()
        } catch {
          /* ignore */
        }
      }
      tab = null
    },
  }
}

/** Guest reservation after form submit */
export const buildGuestReservationWaUrl = (reservation, { currency = 'MAD', dial } = {}) => {
  const lines = [
    `Hello, I would like to confirm my ${BRAND_NAME} car rental reservation.`,
    '',
    `Reservation: ${reservation.reservationId || '—'}`,
    `Name: ${reservation.customerName || '—'}`,
    `Phone: ${reservation.phone || reservation.customerPhone || '—'}`,
    `Email: ${customerEmail(reservation.email || reservation.customerEmail) || '—'}`,
    `Vehicle: ${reservation.carName || reservation.vehicle || '—'}`,
    `Pickup: ${formatDateTime(reservation.pickupDate)} — ${reservation.pickupLocation || '—'}`,
    `Return: ${formatDateTime(reservation.returnDate)} — ${reservation.returnLocation || '—'}`,
    `Total: ${currency}${reservation.price ?? '—'}`,
  ]
  if (reservation.notes?.trim()) lines.push(`Notes: ${reservation.notes.trim()}`)
  return buildWaMeUrl(lines.join('\n'), dial || reservation.whatsappDial || getAgencyWhatsAppDial())
}

const isDeskChannel = (booking) => {
  const channel = String(booking?.channel || '').trim().toLowerCase()
  return channel === 'walk_in' || channel === 'walk-in' || channel === 'walkin'
}

const vehicleFromBooking = (booking) => {
  if (booking?.car) {
    const name = `${booking.car.brand || ''} ${booking.car.model || ''}`.trim()
    const plate = booking.car.licensePlate ? ` (${booking.car.licensePlate})` : ''
    return `${name}${plate}` || booking.carName || '—'
  }
  return booking?.carName || booking?.vehicle || '—'
}

/** Owner dashboard — open WhatsApp to the customer with the signature / completion link. */
export const buildSignatureLinkToCustomerWaUrl = (
  booking,
  completionUrl,
  { language = 'en', signatureOnly } = {},
) => {
  const phone = booking?.customerPhone || booking?.phone
  const dial = normalizeWhatsAppDial(phone)
  const signOnly = signatureOnly ?? isDeskChannel(booking)
  const message = buildSignatureLinkWhatsAppMessage({
    language,
    brand: BRAND_NAME,
    name: booking?.customerName,
    reservationId: booking?.reservationId || (booking?._id ? `RES-${String(booking._id).slice(-8).toUpperCase()}` : ''),
    vehicle: vehicleFromBooking(booking),
    pickup: formatShareDateTime(booking?.pickupDate, language),
    returnDate: formatShareDateTime(booking?.returnDate, language),
    link: completionUrl,
    signatureOnly: signOnly,
    secondDriver: booking?.secondDriver,
    secondDriverName: secondDriverShareName(booking?.secondDriver),
  })
  if (!dial) {
    return { ok: false, code: 'NO_PHONE', message, whatsappUrl: '' }
  }
  return {
    ok: true,
    code: null,
    message,
    customerDial: dial,
    whatsappUrl: buildWaMeUrl(message, dial),
  }
}

/** @deprecated use buildSignatureLinkToCustomerWaUrl — always targets the customer phone. */
export const buildOwnerCompletionWaUrl = (booking, completionUrl, opts = {}) =>
  buildSignatureLinkToCustomerWaUrl(booking, completionUrl, opts).whatsappUrl

/** @deprecated use buildOwnerCompletionWaUrl */
export const buildCompletionWhatsAppUrl = buildOwnerCompletionWaUrl

/** Customer (or owner-to-customer) — signed contract copy. */
export const buildSignedContractWaUrl = (
  booking,
  signedContractUrl,
  { language = 'en', brand = BRAND_NAME, allowEmptyDial = false } = {},
) => {
  const message = buildSignedContractWhatsAppMessage({
    language,
    brand,
    name: booking?.customerName,
    reservationId: booking?.reservationId || (booking?._id ? `RES-${String(booking._id).slice(-8).toUpperCase()}` : ''),
    vehicle: vehicleFromBooking(booking),
    pickup: formatShareDateTime(booking?.pickupDate, language),
    returnDate: formatShareDateTime(booking?.returnDate, language),
    link: signedContractUrl,
  })
  return buildWaMeUrl(message, booking?.customerPhone, { allowEmptyDial })
}

export async function openOwnerSignedContractWhatsApp(axios, booking, { language, opener } = {}) {
  const { data } = await axios.post('/api/booking-completion/owner/share-signed-contract', {
    bookingId: booking._id,
    lang: language,
  })
  if (!data?.success || !data.whatsappUrl) {
    const error = new Error(data?.message || 'Could not prepare WhatsApp')
    error.code = data?.code
    throw error
  }
  const opened = opener
    ? opener.navigate(data.whatsappUrl)
    : Boolean(window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer'))
  return { ...data, opened }
}

export const buildGuestToAgencyWhatsAppUrlFromDial = (dial, reservation, opts) => {
  if (dial) return buildGuestReservationWaUrl(reservation, opts)
  return buildGuestReservationWaUrl(reservation, opts)
}

export default {
  buildGuestReservationWaUrl,
  buildOwnerCompletionWaUrl,
  buildSignatureLinkToCustomerWaUrl,
  buildSignedContractWaUrl,
  buildWaMeUrl,
  getAgencyWhatsAppDial,
  createExternalTabOpener,
}

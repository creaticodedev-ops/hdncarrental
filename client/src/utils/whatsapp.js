/** wa.me deep links — no Meta API. Agency: +212 665 330 116 */

import { BRAND_NAME } from '../constants/brand'
import { customerEmail } from './customerEmail'

export const DEFAULT_AGENCY_WHATSAPP = '212665330116'

export const getAgencyWhatsAppDial = () => {
  const raw =
    import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER ||
    import.meta.env.VITE_WHATSAPP_NUMBER ||
    DEFAULT_AGENCY_WHATSAPP
  return String(raw).replace(/\D/g, '') || DEFAULT_AGENCY_WHATSAPP
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

export const buildWaMeUrl = (text, dial = getAgencyWhatsAppDial()) => {
  const to = String(dial || '').replace(/\D/g, '') || DEFAULT_AGENCY_WHATSAPP
  if (!text?.trim()) return `https://wa.me/${to}`
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`
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

/** Owner dashboard — open WhatsApp to agency with message to forward to customer */
export const buildOwnerCompletionWaUrl = (booking, completionUrl, { currency = 'MAD', dial, signatureOnly } = {}) => {
  const reservationId = booking.reservationId || `RES-${booking._id?.toString().slice(-8).toUpperCase()}`
  const vehicle = booking.car
    ? `${booking.car.brand} ${booking.car.model}${booking.car.licensePlate ? ` (${booking.car.licensePlate})` : ''}`
    : booking.carName || '—'
  const signOnly = signatureOnly
    ?? ['walk_in', 'walk-in', 'walkin'].includes(String(booking.channel || '').toLowerCase())
  const cta = signOnly
    ? 'Please review and sign your rental contract here:'
    : 'Complete your booking securely here:'

  const lines = [
    `${BRAND_NAME} — booking confirmation (message for customer):`,
    '',
    `Hello ${booking.customerName || 'Customer'},`,
    '',
    'Your reservation is confirmed.',
    `Reservation: ${reservationId}`,
    `Vehicle: ${vehicle}`,
    `Pickup: ${formatDateTime(booking.pickupDate)} — ${booking.pickupLocation || '—'}`,
    `Return: ${formatDateTime(booking.returnDate)} — ${booking.returnLocation || '—'}`,
    `Total: ${currency}${booking.price ?? '—'}`,
    '',
    cta,
    completionUrl,
    '',
    `(Customer: ${booking.customerPhone || '—'})`,
  ]
  return buildWaMeUrl(lines.join('\n'), dial || getAgencyWhatsAppDial())
}

/** @deprecated use buildOwnerCompletionWaUrl */
export const buildCompletionWhatsAppUrl = buildOwnerCompletionWaUrl

export const buildGuestToAgencyWhatsAppUrlFromDial = (dial, reservation, opts) => {
  if (dial) return buildGuestReservationWaUrl(reservation, opts)
  return buildGuestReservationWaUrl(reservation, opts)
}

export default {
  buildGuestReservationWaUrl,
  buildOwnerCompletionWaUrl,
  buildWaMeUrl,
  getAgencyWhatsAppDial,
  createExternalTabOpener,
}

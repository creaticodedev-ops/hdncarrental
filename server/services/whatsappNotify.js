/**
 * WhatsApp — wa.me deep links only (no Meta/Twilio API).
 * Dial numbers are resolved from AgencySettings (DB) with env fallback.
 */
import { BRAND_NAME } from '../utils/brand.js';
import { buildSignedContractWhatsAppMessage } from '../../shared/signedContractWhatsApp.js';
import {
  buildSignatureLinkWhatsAppMessage,
  secondDriverShareName,
} from '../../shared/signatureLinkWhatsApp.js';

export const DEFAULT_AGENCY_WHATSAPP = '212665330116';

export const normalizeWhatsAppDial = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) return `212${digits.slice(1)}`;
  return digits;
};

/** Sync fallback for callers that do not have an owner context yet. */
export const getAgencyWhatsAppDial = () => {
  const raw =
    process.env.WHATSAPP_BUSINESS_NUMBER ||
    process.env.WHATSAPP_TO ||
    process.env.AGENCY_PHONE ||
    DEFAULT_AGENCY_WHATSAPP;
  return normalizeWhatsAppDial(raw) || DEFAULT_AGENCY_WHATSAPP;
};

export const buildWaMeUrl = (text, dial = getAgencyWhatsAppDial()) => {
  const to = normalizeWhatsAppDial(dial) || DEFAULT_AGENCY_WHATSAPP;
  if (!text?.trim()) return `https://wa.me/${to}`;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-GB', { hour12: false });
};

export const buildReservationWhatsAppMessage = ({
  reservationId,
  customerName,
  customerPhone,
  customerEmail,
  vehicle,
  pickupLocation,
  returnLocation,
  pickupDate,
  returnDate,
  price,
  priceBreakdown,
  currency = 'MAD',
  notes = '',
}) => {
  const lines = [
    `Hello, I would like to confirm my ${BRAND_NAME} car rental reservation.`,
    '',
    `Reservation: ${reservationId || '—'}`,
    `Customer: ${customerName || '—'}`,
    `Phone: ${customerPhone || '—'}`,
    `Email: ${customerEmail || '—'}`,
    `Vehicle: ${vehicle || '—'}`,
    `Pickup: ${formatDateTime(pickupDate)} — ${pickupLocation || '—'}`,
    `Return: ${formatDateTime(returnDate)} — ${returnLocation || '—'}`,
  ];

  if (priceBreakdown && typeof priceBreakdown === 'object') {
    lines.push(
      `Rental: ${currency}${priceBreakdown.rentalPrice ?? '—'}`,
      `Total: ${currency}${priceBreakdown.total ?? price ?? '—'}`,
    );
  } else {
    lines.push(`Total: ${currency}${price ?? '—'}`);
  }

  if (notes?.trim()) lines.push(`Notes: ${notes.trim()}`);
  return lines.join('\n');
};

/** Guest reservation → chat with agency on wa.me */
export const buildGuestToAgencyWhatsAppUrl = (reservation = {}, dial) => {
  const currency = process.env.WHATSAPP_CURRENCY || process.env.CURRENCY || 'MAD';
  const body = buildReservationWhatsAppMessage({ ...reservation, currency });
  return buildWaMeUrl(body, dial || getAgencyWhatsAppDial());
};

/**
 * Legacy: guest completion confirmation → agency WhatsApp (not owner-to-customer share).
 * Owner signature-link share must use buildSignatureLinkToCustomerWhatsAppUrl.
 */
export const buildCompletionToAgencyWhatsAppUrl = ({
  reservationId,
  customerName,
  customerPhone,
  vehicle,
  pickupLocation,
  returnLocation,
  pickupDate,
  returnDate,
  price,
  currency = 'MAD',
  completionUrl,
  dial,
}) => {
  const lines = [
    `${BRAND_NAME} — booking confirmation (please send to customer):`,
    '',
    `Hello ${customerName || 'Customer'},`,
    '',
    'Your reservation is confirmed.',
    `Reservation: ${reservationId || '—'}`,
    `Vehicle: ${vehicle || '—'}`,
    `Pickup: ${formatDateTime(pickupDate)} — ${pickupLocation || '—'}`,
    `Return: ${formatDateTime(returnDate)} — ${returnLocation || '—'}`,
    `Total: ${currency}${price ?? '—'}`,
    '',
    'Complete your booking (documents & signature):',
    completionUrl || '—',
    '',
    `Customer phone: ${customerPhone || '—'}`,
  ];
  return buildWaMeUrl(lines.join('\n'), dial || getAgencyWhatsAppDial());
};

/** Owner → customer: signature / completion link (wa.me to the customer phone). */
export const buildSignatureLinkToCustomerWhatsAppUrl = ({
  language = 'en',
  brand = BRAND_NAME,
  customerName,
  customerPhone,
  reservationId,
  vehicle,
  car,
  pickupDate,
  returnDate,
  completionUrl,
  signatureOnly = false,
  secondDriver,
  secondDriverName = '',
} = {}) => {
  const dial = normalizeWhatsAppDial(customerPhone);
  const message = buildSignatureLinkWhatsAppMessage({
    language,
    brand,
    name: customerName,
    reservationId,
    vehicle: vehicle || vehicleLabel(car),
    pickup: formatShareDateTime(pickupDate, language),
    returnDate: formatShareDateTime(returnDate, language),
    link: completionUrl,
    signatureOnly,
    secondDriverName: secondDriverName || secondDriverShareName(secondDriver),
    secondDriver,
  });
  if (!dial) {
    return { ok: false, code: 'NO_PHONE', message, whatsappUrl: '' };
  }
  return {
    ok: true,
    code: null,
    message,
    customerDial: dial,
    whatsappUrl: buildWaMeUrl(message, dial),
  };
};

const AGENCY_TZ = 'Africa/Casablanca';

const formatShareDateTime = (value, language = 'en') => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB';
  return d.toLocaleString(locale, {
    timeZone: AGENCY_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const vehicleLabel = (car, fallback = '') => {
  if (!car) return fallback || '—';
  const name = `${car.brand || ''} ${car.model || ''}`.trim();
  const plate = car.licensePlate ? ` (${car.licensePlate})` : '';
  return `${name}${plate}`.trim() || fallback || '—';
};

/** Owner → customer: signed contract copy (wa.me to the customer phone). */
export const buildSignedContractToCustomerWhatsAppUrl = ({
  language = 'en',
  brand = BRAND_NAME,
  customerName,
  customerPhone,
  reservationId,
  vehicle,
  car,
  pickupDate,
  returnDate,
  signedContractUrl,
} = {}) => {
  const dial = normalizeWhatsAppDial(customerPhone);
  const message = buildSignedContractWhatsAppMessage({
    language,
    brand,
    name: customerName,
    reservationId,
    vehicle: vehicle || vehicleLabel(car),
    pickup: formatShareDateTime(pickupDate, language),
    returnDate: formatShareDateTime(returnDate, language),
    link: signedContractUrl,
  });
  if (!dial) {
    return { ok: false, code: 'NO_PHONE', message, whatsappUrl: '' };
  }
  return {
    ok: true,
    code: null,
    message,
    customerDial: dial,
    whatsappUrl: buildWaMeUrl(message, dial),
  };
};

/** Legacy no-op — API disabled */
export const notifyNewReservationWhatsApp = async () => ({
  success: false,
  skipped: true,
  reason: 'WhatsApp API disabled — use wa.me links only',
});

export const sendWhatsAppText = async () => {
  throw new Error('Server-side WhatsApp API is disabled. Use wa.me links only.');
};

export default buildGuestToAgencyWhatsAppUrl;

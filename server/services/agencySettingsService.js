import AgencySettings from '../models/AgencySettings.js';
import { DEFAULT_AGENCY_WHATSAPP, normalizeWhatsAppDial } from './whatsappNotify.js';
import {
  normalizeBookingSettings,
  DEFAULT_BOOKING_SETTINGS,
} from './bookingSettingsService.js';

const envFallbackDial = () =>
  normalizeWhatsAppDial(
    process.env.WHATSAPP_BUSINESS_NUMBER ||
      process.env.WHATSAPP_TO ||
      process.env.AGENCY_PHONE ||
      DEFAULT_AGENCY_WHATSAPP,
  ) || DEFAULT_AGENCY_WHATSAPP;

export const getOrCreateAgencySettings = async (ownerId) => {
  if (!ownerId) return null;
  let doc = await AgencySettings.findOne({ owner: ownerId });
  if (!doc) {
    doc = await AgencySettings.create({
      owner: ownerId,
      bookingSettings: DEFAULT_BOOKING_SETTINGS,
    });
  }
  return doc;
};

export const resolveWhatsAppDials = async (ownerId) => {
  const fallback = envFallbackDial();
  let reservation = '';
  let confirmation = '';

  if (ownerId) {
    const settings = await AgencySettings.findOne({ owner: ownerId }).lean();
    reservation = normalizeWhatsAppDial(settings?.whatsappReservationNumber);
    confirmation = normalizeWhatsAppDial(settings?.whatsappConfirmationNumber);
  }

  const reservationDial = reservation || fallback;
  const confirmationDial = confirmation || reservation || fallback;

  return {
    reservationDial,
    confirmationDial,
    fallbackDial: fallback,
    fromDatabase: {
      reservation: Boolean(reservation),
      confirmation: Boolean(confirmation),
    },
  };
};

export const updateWhatsAppSettings = async (ownerId, body = {}) => {
  const doc = await getOrCreateAgencySettings(ownerId);
  if (!doc) throw new Error('Owner required');

  if (body.whatsappReservationNumber !== undefined) {
    doc.whatsappReservationNumber = String(body.whatsappReservationNumber || '').trim();
  }
  if (body.whatsappConfirmationNumber !== undefined) {
    doc.whatsappConfirmationNumber = String(body.whatsappConfirmationNumber || '').trim();
  }

  await doc.save();
  return doc;
};

export const serializeAgencySettings = async (ownerId, doc) => {
  const dials = await resolveWhatsAppDials(ownerId);
  // Prefer a lean re-read of bookingSettings so nested values are plain objects.
  // Falling back to doc.bookingSettings still goes through normalize which
  // plain-ifies Mongoose subdocuments (object-spread alone drops field values).
  let bookingRaw = doc?.bookingSettings;
  try {
    const AgencySettings = (await import('../models/AgencySettings.js')).default;
    if (ownerId) {
      const lean = await AgencySettings.findOne({ owner: ownerId }).select('bookingSettings').lean();
      if (lean?.bookingSettings) bookingRaw = lean.bookingSettings;
    }
  } catch {
    /* use doc snapshot */
  }
  return {
    whatsappReservationNumber: doc?.whatsappReservationNumber || '',
    whatsappConfirmationNumber: doc?.whatsappConfirmationNumber || '',
    bookingSettings: normalizeBookingSettings(bookingRaw || {}),
    effective: {
      reservationDial: dials.reservationDial,
      confirmationDial: dials.confirmationDial,
    },
    updatedAt: doc?.updatedAt || null,
  };
};

export default {
  getOrCreateAgencySettings,
  resolveWhatsAppDials,
  updateWhatsAppSettings,
  serializeAgencySettings,
};

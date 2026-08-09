import AgencySettings from '../models/AgencySettings.js';
import { DEFAULT_AGENCY_WHATSAPP, normalizeWhatsAppDial } from './whatsappNotify.js';

const envFallbackDial = () =>
  normalizeWhatsAppDial(
    process.env.WHATSAPP_BUSINESS_NUMBER ||
      process.env.WHATSAPP_TO ||
      process.env.AGENCY_PHONE ||
      DEFAULT_AGENCY_WHATSAPP,
  ) || DEFAULT_AGENCY_WHATSAPP;

/**
 * Load agency settings for an owner (creates empty doc on first access).
 */
export const getOrCreateAgencySettings = async (ownerId) => {
  if (!ownerId) return null;
  let doc = await AgencySettings.findOne({ owner: ownerId });
  if (!doc) {
    doc = await AgencySettings.create({ owner: ownerId });
  }
  return doc;
};

/**
 * Resolve WhatsApp dial digits for reservation vs confirmation flows.
 * DB values win; empty fields fall back to env / default (and confirmation
 * also falls back to the reservation number when set).
 */
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

export default {
  getOrCreateAgencySettings,
  resolveWhatsAppDials,
  updateWhatsAppSettings,
};

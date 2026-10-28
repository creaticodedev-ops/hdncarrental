import AgencySettings from '../models/AgencySettings.js';
import { DEFAULT_AGENCY_WHATSAPP, normalizeWhatsAppDial } from './whatsappNotify.js';
import {
  normalizeBookingSettings,
  DEFAULT_BOOKING_SETTINGS,
} from './bookingSettingsService.js';
import {
  OFFICIAL_COMPANY_PROFILE,
  normalizeCompanyProfile,
  applyCompanyProfilePatch,
  companyProfileToAgency,
} from './companyBrandingService.js';

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
      companyProfile: { ...OFFICIAL_COMPANY_PROFILE },
    });
    return doc;
  }
  // Seed official legal defaults once without overwriting customized branding assets.
  if (!doc.companyProfile || typeof doc.companyProfile !== 'object') {
    doc.companyProfile = { ...OFFICIAL_COMPANY_PROFILE };
    await doc.save();
  } else {
    const current = doc.companyProfile.toObject?.() || doc.companyProfile;
    const needsSeed = !String(current.ice || '').trim()
      || !String(current.if || '').trim()
      || !String(current.rc || '').trim()
      || !String(current.address || current.addressLine1 || '').trim();
    if (needsSeed) {
      doc.companyProfile = applyCompanyProfilePatch(OFFICIAL_COMPANY_PROFILE, {
        ...current,
        ice: current.ice || OFFICIAL_COMPANY_PROFILE.ice,
        if: current.if || OFFICIAL_COMPANY_PROFILE.if,
        rc: current.rc || OFFICIAL_COMPANY_PROFILE.rc,
        addressLine1: current.addressLine1 || OFFICIAL_COMPANY_PROFILE.addressLine1,
        addressLine2: current.addressLine2 || OFFICIAL_COMPANY_PROFILE.addressLine2,
        address: current.address || OFFICIAL_COMPANY_PROFILE.address,
        phone: current.phone || OFFICIAL_COMPANY_PROFILE.phone,
        email: current.email || OFFICIAL_COMPANY_PROFILE.email,
        name: current.name || OFFICIAL_COMPANY_PROFILE.name,
      });
      await doc.save();
    }
  }
  return doc;
};

export const resolveCompanyBranding = async (ownerId) => {
  if (!ownerId) return companyProfileToAgency(OFFICIAL_COMPANY_PROFILE);
  const doc = await getOrCreateAgencySettings(ownerId);
  const profile = normalizeCompanyProfile(doc?.companyProfile?.toObject?.() || doc?.companyProfile || {});
  return companyProfileToAgency(profile);
};

export const updateCompanyProfile = async (ownerId, patch = {}) => {
  const doc = await getOrCreateAgencySettings(ownerId);
  if (!doc) throw new Error('Owner required');
  const current = doc.companyProfile?.toObject?.() || doc.companyProfile || {};
  doc.companyProfile = applyCompanyProfilePatch(current, patch);
  await doc.save();
  return normalizeCompanyProfile(doc.companyProfile.toObject?.() || doc.companyProfile);
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
  const companyProfile = normalizeCompanyProfile(
    doc?.companyProfile?.toObject?.() || doc?.companyProfile || {},
  );

  return {
    whatsappReservationNumber: doc?.whatsappReservationNumber || '',
    whatsappConfirmationNumber: doc?.whatsappConfirmationNumber || '',
    bookingSettings: normalizeBookingSettings(bookingRaw || {}),
    companyProfile,
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
  updateCompanyProfile,
  resolveCompanyBranding,
  serializeAgencySettings,
};

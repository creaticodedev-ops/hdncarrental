import { isPlaceholderEmail } from './customerIdentity.js';

/**
 * Persist customer / desk contract fields onto a Booking document.
 * Shared by online completion, walk-in create, and admin booking updates
 * so template sourceData stays consistent across channels.
 *
 * @param {'customer'|'desk'} [options.scope='desk']
 *   customer — public completion token (no operational/financial desk fields)
 *   desk     — walk-in / admin updates (full field set)
 */
export const applyCompletionDetailsToBooking = (booking, body = {}, options = {}) => {
  const scope = options.scope === 'customer' ? 'customer' : 'desk';
  const {
    customerName,
    customerEmail,
    customerPhone,
    dateOfBirth,
    nationality,
    customerAddress,
    placeOfBirth,
    identityDocumentNumber,
    identityIssuedOn,
    driverLicenseNumber,
    driverLicenseExpiry,
    driverLicenseIssuedOn,
    passportNumber,
    secondDriver,
    deliveredBy,
    receivedBy,
    fuelLevelStart,
    kmDepart,
    kmRetour,
    franchiseAmount,
  } = body;

  if (customerName !== undefined) booking.customerName = String(customerName).trim();
  if (customerEmail !== undefined) booking.customerEmail = String(customerEmail).trim().toLowerCase();
  if (customerPhone !== undefined) booking.customerPhone = String(customerPhone).trim();
  if (dateOfBirth !== undefined) booking.dateOfBirth = String(dateOfBirth).trim();
  if (nationality !== undefined) booking.nationality = String(nationality).trim();
  if (customerAddress !== undefined) booking.customerAddress = String(customerAddress).trim();
  if (placeOfBirth !== undefined) booking.placeOfBirth = String(placeOfBirth).trim();
  if (identityDocumentNumber !== undefined) booking.identityDocumentNumber = String(identityDocumentNumber).trim();
  if (identityIssuedOn !== undefined) booking.identityIssuedOn = String(identityIssuedOn).trim();
  if (driverLicenseNumber !== undefined) booking.driverLicenseNumber = String(driverLicenseNumber).trim();
  if (driverLicenseExpiry !== undefined) booking.driverLicenseExpiry = String(driverLicenseExpiry).trim();
  if (driverLicenseIssuedOn !== undefined) booking.driverLicenseIssuedOn = String(driverLicenseIssuedOn).trim();
  if (passportNumber !== undefined) booking.passportNumber = String(passportNumber).trim();

  if (scope === 'desk') {
    if (deliveredBy !== undefined) booking.deliveredBy = String(deliveredBy).trim();
    if (receivedBy !== undefined) booking.receivedBy = String(receivedBy).trim();
    if (fuelLevelStart !== undefined) booking.fuelLevelStart = String(fuelLevelStart).trim();
    if (kmDepart !== undefined) booking.kmDepart = String(kmDepart).trim();
    if (kmRetour !== undefined) booking.kmRetour = String(kmRetour).trim();
    if (franchiseAmount !== undefined && franchiseAmount !== null && franchiseAmount !== '') {
      const n = Number(franchiseAmount);
      booking.franchiseAmount = Number.isFinite(n) ? n : booking.franchiseAmount;
    }
  }

  if (secondDriver !== undefined && typeof secondDriver === 'object') {
    booking.secondDriver = {
      enabled: Boolean(secondDriver.enabled),
      fullName: secondDriver.fullName?.trim() || '',
      dateOfBirth: secondDriver.dateOfBirth?.trim() || '',
      nationality: secondDriver.nationality?.trim() || '',
      driverLicenseNumber: secondDriver.driverLicenseNumber?.trim() || '',
      driverLicenseExpiry: secondDriver.driverLicenseExpiry?.trim() || '',
      passportNumber: secondDriver.passportNumber?.trim() || '',
      phone: secondDriver.phone?.trim() || '',
    };
    if (!booking.secondDriver.enabled) {
      booking.completion = booking.completion || {};
      booking.completion.secondDriverSignatureUrl = '';
      booking.completion.secondDriverSignatureSignedAt = null;
    }
  }

  return booking;
};

/**
 * True for legacy placeholder emails that must not print on contracts.
 * Kept as a re-export so existing importers keep working.
 */
export const isSyntheticWalkInEmail = isPlaceholderEmail;

/**
 * Fields a booking must carry before a contract can be signed.
 * Email is deliberately absent: desk customers are identified by phone and
 * contracts print "—" when there is no address to show.
 */
const REQUIRED_COMPLETION_FIELDS = [
  ['customerName', 'customer name'],
  ['customerPhone', 'customer phone'],
  ['customerAddress', 'address'],
  ['dateOfBirth', 'date of birth'],
  ['nationality', 'nationality'],
  ['placeOfBirth', 'place of birth'],
  ['identityDocumentNumber', 'identity document number'],
  ['identityIssuedOn', 'identity issued date'],
  ['driverLicenseNumber', 'driver license number'],
  ['driverLicenseExpiry', 'driver license expiry'],
  ['driverLicenseIssuedOn', 'driver license issued date'],
];

const SECOND_DRIVER_REQUIRED_FIELDS = [
  ['fullName', 'second driver name'],
  ['dateOfBirth', 'second driver date of birth'],
  ['driverLicenseNumber', 'second driver license'],
];

const blank = (value) => value === undefined || value === null || String(value).trim() === '';

/**
 * Which contract fields are still empty on this booking.
 * Returns `{ field, label }` pairs — `field` is stable and safe to translate
 * client-side, `label` is the English fallback used in API error messages.
 */
export const getMissingCompletionFields = (booking) => {
  if (!booking) return REQUIRED_COMPLETION_FIELDS.map(([field, label]) => ({ field, label }));

  const missing = REQUIRED_COMPLETION_FIELDS
    .filter(([field]) => blank(booking[field]))
    .map(([field, label]) => ({ field, label }));

  const sd = booking.secondDriver;
  if (sd?.enabled) {
    for (const [key, label] of SECOND_DRIVER_REQUIRED_FIELDS) {
      if (blank(sd[key])) missing.push({ field: `secondDriver.${key}`, label });
    }
  }

  return missing;
};

/** Required fields before signature / contract generation */
export const validateCompletionDetails = (booking) => {
  const missing = getMissingCompletionFields(booking);
  if (missing.length) {
    const err = new Error(`Please complete: ${missing.map((m) => m.label).join(', ')}`);
    err.code = 'VALIDATION';
    err.missingFields = missing;
    throw err;
  }
};

export default applyCompletionDetailsToBooking;

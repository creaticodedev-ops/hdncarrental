import mongoose from 'mongoose';
import { OFFICIAL_COMPANY_PROFILE } from '../services/companyBrandingService.js';

const { ObjectId } = mongoose.Schema.Types;

const bookingSettingsSchema = new mongoose.Schema(
  {
    minRentalDays: { type: Number, default: 1, min: 1, max: 365 },
    maxRentalDays: { type: Number, default: 90, min: 1, max: 730 },
    /** How far ahead customers may book (days from now). */
    advanceBookingDays: { type: Number, default: 365, min: 1, max: 1095 },
    cancellationPolicyText: { type: String, default: '', maxlength: 5000 },
    cancellationFeeType: {
      type: String,
      enum: ['none', 'fixed', 'percent'],
      default: 'none',
    },
    cancellationFeeValue: { type: Number, default: 0, min: 0 },
    /** Default security deposit hint (MAD). Per-car securityDeposit still wins on booking. */
    securityDepositDefault: { type: Number, default: 0, min: 0 },
    extraDriverAllowed: { type: Boolean, default: true },
    extraDriverFeePerDay: { type: Number, default: 0, min: 0 },
    mileageMode: {
      type: String,
      enum: ['unlimited', 'limited'],
      default: 'unlimited',
    },
    mileageLimitKmPerDay: { type: Number, default: 250, min: 0 },
    pickupHoursStart: { type: String, default: '08:00' },
    pickupHoursEnd: { type: String, default: '20:00' },
    returnHoursStart: { type: String, default: '08:00' },
    returnHoursEnd: { type: String, default: '20:00' },
    /** Auto-cancel pending reservations after N hours (0 = disabled). */
    pendingReservationExpiryHours: { type: Number, default: 48, min: 0, max: 720 },
  },
  { _id: false },
);

/** Official company identity used on invoices and legal documents. */
const companyProfileSchema = new mongoose.Schema(
  {
    name: { type: String, default: OFFICIAL_COMPANY_PROFILE.name, maxlength: 120 },
    addressLine1: { type: String, default: OFFICIAL_COMPANY_PROFILE.addressLine1, maxlength: 200 },
    addressLine2: { type: String, default: OFFICIAL_COMPANY_PROFILE.addressLine2, maxlength: 200 },
    address: { type: String, default: OFFICIAL_COMPANY_PROFILE.address, maxlength: 400 },
    phone: { type: String, default: OFFICIAL_COMPANY_PROFILE.phone, maxlength: 40 },
    email: { type: String, default: OFFICIAL_COMPANY_PROFILE.email, maxlength: 120 },
    ice: { type: String, default: OFFICIAL_COMPANY_PROFILE.ice, maxlength: 40 },
    if: { type: String, default: OFFICIAL_COMPANY_PROFILE.if, maxlength: 40 },
    rc: { type: String, default: OFFICIAL_COMPANY_PROFILE.rc, maxlength: 40 },
    accentColor: { type: String, default: OFFICIAL_COMPANY_PROFILE.accentColor, maxlength: 20 },
    paymentInstructions: { type: String, default: '', maxlength: 2000 },
    invoiceFooter: { type: String, default: '', maxlength: 1000 },
    logoUrl: { type: String, default: '' },
    stampUrl: { type: String, default: '' },
    signatureUrl: { type: String, default: '' },
    combinedStampSignatureUrl: { type: String, default: '' },
  },
  { _id: false },
);

/**
 * Per-agency runtime settings (owner-scoped).
 */
const agencySettingsSchema = new mongoose.Schema(
  {
    owner: {
      type: ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    whatsappReservationNumber: { type: String, default: '' },
    whatsappConfirmationNumber: { type: String, default: '' },
    bookingSettings: { type: bookingSettingsSchema, default: () => ({}) },
    companyProfile: { type: companyProfileSchema, default: () => ({ ...OFFICIAL_COMPANY_PROFILE }) },
  },
  { timestamps: true },
);

const AgencySettings = mongoose.model('AgencySettings', agencySettingsSchema);
export default AgencySettings;

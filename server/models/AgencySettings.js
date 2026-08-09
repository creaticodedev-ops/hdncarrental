import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Per-agency runtime settings (owner-scoped).
 * WhatsApp numbers are used for wa.me deep links — not Meta Cloud API.
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
    /** Guest reservation messages (customer → agency inbox) */
    whatsappReservationNumber: { type: String, default: '' },
    /** Booking confirmation messages (admin confirmation / completion link) */
    whatsappConfirmationNumber: { type: String, default: '' },
  },
  { timestamps: true },
);

const AgencySettings = mongoose.model('AgencySettings', agencySettingsSchema);
export default AgencySettings;

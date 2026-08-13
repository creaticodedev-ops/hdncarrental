import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * External broker (Samsar) who brings rental leads and earns commission.
 * Owner-scoped. Ready for Booking.samsar + SamsarPayment (Phase B).
 */
const samsarSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    phone: { type: String, default: '', trim: true, maxlength: 40 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 200 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    commissionType: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent',
    },
    /** Percent 0–100 or fixed amount in agency currency. */
    commissionValue: { type: Number, default: 10, min: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    notes: { type: String, default: '', maxlength: 5000 },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

samsarSchema.index({ owner: 1, createdAt: -1 });
samsarSchema.index({ owner: 1, status: 1, fullName: 1 });
samsarSchema.index({ owner: 1, fullName: 'text', phone: 'text', email: 'text' });

const Samsar = mongoose.model('Samsar', samsarSchema);
export default Samsar;

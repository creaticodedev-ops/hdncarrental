import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Agency chauffeur (driver) — owner-scoped.
 * Ready for future Booking.chauffeur assignment.
 */
const chauffeurSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    phone: { type: String, default: '', trim: true, maxlength: 40 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 200 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    licenseNumber: { type: String, default: '', trim: true, maxlength: 100 },
    licenseExpiry: { type: Date, default: null },
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

chauffeurSchema.index({ owner: 1, createdAt: -1 });
chauffeurSchema.index({ owner: 1, status: 1, fullName: 1 });
chauffeurSchema.index({ owner: 1, fullName: 'text', phone: 'text', email: 'text' });

const Chauffeur = mongoose.model('Chauffeur', chauffeurSchema);
export default Chauffeur;

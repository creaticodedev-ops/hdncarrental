import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const internalNoteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: null },
  booking: { type: ObjectId, ref: 'Booking', default: null },
  createdBy: { type: ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const followUpSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: [
      'signed_contract',
      'during_rental',
      'return_reminder',
      'thank_you',
      'review',
      'winback',
    ],
    required: true,
  },
  booking: { type: ObjectId, ref: 'Booking', default: null },
  status: { type: String, enum: ['due', 'done', 'skipped'], default: 'due' },
  dueAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const guestCustomerSchema = new mongoose.Schema({
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  status: {
    type: String,
    enum: ['new', 'regular', 'vip', 'blacklisted'],
    default: 'new',
  },
  /** Computed loyalty tier — independent of manual VIP/blacklist status. */
  loyaltyLevel: {
    type: String,
    enum: ['new', 'regular', 'gold', 'vip'],
    default: 'new',
    index: true,
  },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  ratingCount: { type: Number, default: 0 },
  internalNotes: [internalNoteSchema],
  totalReservations: { type: Number, default: 0 },
  completedReservations: { type: Number, default: 0 },
  cancelledReservations: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastBookingAt: { type: Date, default: null },
  lastContactAt: { type: Date, default: null },
  nextFollowUpAt: { type: Date, default: null },
  blacklistReason: { type: String, default: '' },
  referralCode: { type: String, default: '', uppercase: true, trim: true },
  referredByCode: { type: String, default: '', uppercase: true, trim: true },
  referredByEmail: { type: String, default: '', lowercase: true, trim: true },
  successfulReferrals: { type: Number, default: 0 },
  referralBenefit: { type: String, default: '' },
  care: {
    contacted: { type: Boolean, default: false },
    satisfaction: {
      type: String,
      enum: ['', 'excellent', 'good', 'neutral', 'poor'],
      default: '',
    },
    notes: { type: String, default: '' },
    lastContactAt: { type: Date, default: null },
    nextFollowUpAt: { type: Date, default: null },
  },
  followUps: [followUpSchema],
}, { timestamps: true });

guestCustomerSchema.index({ owner: 1, email: 1 }, { unique: true });
guestCustomerSchema.index({ owner: 1, status: 1 });
guestCustomerSchema.index({ owner: 1, rating: -1 });
guestCustomerSchema.index({ owner: 1, referralCode: 1 }, { sparse: true });

const GuestCustomer = mongoose.model('GuestCustomer', guestCustomerSchema);
export default GuestCustomer;

import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  method: { type: String, default: 'offline' },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  gateway: { type: String, default: 'offline' },
  reference: { type: String, default: '' },
}, { timestamps: true });

paymentSchema.index({ booking: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

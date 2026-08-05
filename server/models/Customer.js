import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  company: { type: String, default: '' },
  loyaltyPoints: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;

import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const customerActivitySchema = new mongoose.Schema({
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  crmKey: { type: String, required: true, lowercase: true, trim: true, index: true },
  type: { type: String, required: true, index: true },
  at: { type: Date, default: Date.now, index: true },
  booking: { type: ObjectId, ref: 'Booking', default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: false });

customerActivitySchema.index({ owner: 1, crmKey: 1, at: -1 });

const CustomerActivity = mongoose.model('CustomerActivity', customerActivitySchema);
export default CustomerActivity;

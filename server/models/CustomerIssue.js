import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const customerIssueSchema = new mongoose.Schema({
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  crmKey: { type: String, required: true, lowercase: true, trim: true, index: true },
  booking: { type: ObjectId, ref: 'Booking', default: null, index: true },
  reportedIssue: { type: String, required: true, maxlength: 4000 },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved'],
    default: 'open',
    index: true,
  },
  notes: { type: String, default: '', maxlength: 4000 },
  source: { type: String, enum: ['care', 'review', 'manual'], default: 'care' },
  createdBy: { type: ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

customerIssueSchema.index({ owner: 1, crmKey: 1, status: 1, createdAt: -1 });

const CustomerIssue = mongoose.model('CustomerIssue', customerIssueSchema);
export default CustomerIssue;

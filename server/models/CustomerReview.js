import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const customerReviewSchema = new mongoose.Schema({
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  crmKey: { type: String, required: true, lowercase: true, trim: true, index: true },
  booking: { type: ObjectId, ref: 'Booking', default: null, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: '', maxlength: 4000 },
  status: {
    type: String,
    enum: ['received', 'private', 'google_prompted'],
    default: 'received',
  },
  internalResponse: { type: String, default: '', maxlength: 4000 },
  complaintFlag: { type: Boolean, default: false, index: true },
  googleDirected: { type: Boolean, default: false },
  createdBy: { type: ObjectId, ref: 'User', default: null },
}, { timestamps: true });

customerReviewSchema.index({ owner: 1, crmKey: 1, createdAt: -1 });

const CustomerReview = mongoose.model('CustomerReview', customerReviewSchema);
export default CustomerReview;

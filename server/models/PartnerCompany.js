import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * B2B partner company — owner-scoped.
 * Ready for future Booking.partnerCompany / financial links.
 */
const partnerCompanySchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    legalName: { type: String, default: '', trim: true, maxlength: 200 },
    contactName: { type: String, default: '', trim: true, maxlength: 200 },
    phone: { type: String, default: '', trim: true, maxlength: 40 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 200 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    taxId: { type: String, default: '', trim: true, maxlength: 100 },
    registrationNumber: { type: String, default: '', trim: true, maxlength: 100 },
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

partnerCompanySchema.index({ owner: 1, createdAt: -1 });
partnerCompanySchema.index({ owner: 1, status: 1, companyName: 1 });
partnerCompanySchema.index({
  owner: 1,
  companyName: 'text',
  legalName: 'text',
  contactName: 'text',
  phone: 'text',
  email: 'text',
});

const PartnerCompany = mongoose.model('PartnerCompany', partnerCompanySchema);
export default PartnerCompany;

import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const AGENCY_EXPENSE_CATEGORIES = [
  'rent',
  'utilities',
  'salaries',
  'marketing',
  'insurance',
  'office',
  'taxes',
  'software',
  'other',
];

/**
 * Agency-level operating expense — owner-scoped accounting ledger.
 */
const agencyExpenseSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      enum: AGENCY_EXPENSE_CATEGORIES,
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'MAD' },
    expenseDate: { type: Date, required: true, index: true },
    description: { type: String, default: '', maxlength: 2000 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'paid',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'card', 'other'],
      default: 'cash',
    },
    notes: { type: String, default: '', maxlength: 5000 },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

agencyExpenseSchema.index({ owner: 1, expenseDate: -1 });
agencyExpenseSchema.index({ owner: 1, category: 1, expenseDate: -1 });

const AgencyExpense = mongoose.model('AgencyExpense', agencyExpenseSchema);
export default AgencyExpense;

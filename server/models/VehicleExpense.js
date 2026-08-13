import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const VEHICLE_EXPENSE_CATEGORIES = [
  'fuel',
  'maintenance',
  'repair',
  'insurance',
  'registration',
  'parking',
  'fine',
  'cleaning',
  'tires',
  'other',
];

/**
 * Vehicle-related expense — owner-scoped accounting ledger.
 * Separate from operational MaintenanceRecord.
 */
const vehicleExpenseSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    car: { type: ObjectId, ref: 'Car', required: true, index: true },
    category: {
      type: String,
      enum: VEHICLE_EXPENSE_CATEGORIES,
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
    odometerKm: { type: Number, default: null, min: 0 },
    notes: { type: String, default: '', maxlength: 5000 },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

vehicleExpenseSchema.index({ owner: 1, expenseDate: -1 });
vehicleExpenseSchema.index({ owner: 1, car: 1, expenseDate: -1 });

const VehicleExpense = mongoose.model('VehicleExpense', vehicleExpenseSchema);
export default VehicleExpense;

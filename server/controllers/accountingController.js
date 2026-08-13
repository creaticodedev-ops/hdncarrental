import AgencyExpense from '../models/AgencyExpense.js';
import VehicleExpense from '../models/VehicleExpense.js';
import SamsarPayment from '../models/SamsarPayment.js';
import Car from '../models/Car.js';
import Samsar from '../models/Samsar.js';
import { logAudit } from '../utils/adminOps.js';
import {
  AGENCY_EXPENSE_CATEGORIES,
  VEHICLE_EXPENSE_CATEGORIES,
  getAccountingKpis,
  listAgencyExpenses,
  listRevenues,
  listSamsarPayments,
  listVehicleExpenses,
  normalizeAgencyExpenseInput,
  normalizeSamsarPaymentInput,
  normalizeVehicleExpenseInput,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  REVENUE_BOOKING_STATUSES,
} from '../services/accountingService.js';

const sendError = (res, error, fallback) => {
  const status = error.status || 500;
  if (status >= 500) console.error('[accounting]', error.message);
  return res.status(status).json({
    success: false,
    message: status < 500 ? error.message : fallback,
  });
};

export const getAccountingMeta = async (_req, res) => {
  res.json({
    success: true,
    meta: {
      agencyExpenseCategories: AGENCY_EXPENSE_CATEGORIES,
      vehicleExpenseCategories: VEHICLE_EXPENSE_CATEGORIES,
      paymentStatuses: PAYMENT_STATUSES,
      paymentMethods: PAYMENT_METHODS,
      revenueBookingStatuses: REVENUE_BOOKING_STATUSES,
    },
  });
};

/** Minimal fleet list for expense/revenue filters (accounting permission only). */
export const listAccountingCars = async (req, res) => {
  try {
    const cars = await Car.find({ owner: req.user._id })
      .select('brand model year licensePlate fleetId')
      .sort({ brand: 1, model: 1 })
      .lean();
    res.json({ success: true, cars });
  } catch (error) {
    sendError(res, error, 'Failed to list vehicles');
  }
};

/** Active Samsars for payment forms (accounting permission only). */
export const listAccountingSamsars = async (req, res) => {
  try {
    const samsars = await Samsar.find({ owner: req.user._id, status: 'active' })
      .select('fullName phone commissionType commissionValue')
      .sort({ fullName: 1 })
      .lean();
    res.json({ success: true, samsars });
  } catch (error) {
    sendError(res, error, 'Failed to list Samsars');
  }
};

export const getAccountingLookups = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const [cars, samsars] = await Promise.all([
      Car.find({ owner: ownerId }).select('brand model licensePlate year').sort({ brand: 1, model: 1 }).lean(),
      Samsar.find({ owner: ownerId, status: 'active' })
        .select('fullName phone commissionType commissionValue')
        .sort({ fullName: 1 })
        .lean(),
    ]);
    res.json({ success: true, cars, samsars });
  } catch (error) {
    sendError(res, error, 'Failed to load accounting lookups');
  }
};

export const getKpis = async (req, res) => {
  try {
    const kpis = await getAccountingKpis(req.user._id, req.query);
    res.json({ success: true, kpis });
  } catch (error) {
    sendError(res, error, 'Failed to load accounting KPIs');
  }
};

export const getRevenues = async (req, res) => {
  try {
    const result = await listRevenues(req.user._id, req.query);
    res.json({
      success: true,
      revenues: result.items,
      pagination: result.pagination,
      totals: result.totals,
    });
  } catch (error) {
    sendError(res, error, 'Failed to load revenues');
  }
};

/* —— Agency expenses —— */
export const listAgencyExpense = async (req, res) => {
  try {
    const result = await listAgencyExpenses(req.user._id, req.query);
    res.json({ success: true, expenses: result.items, pagination: result.pagination });
  } catch (error) {
    sendError(res, error, 'Failed to list agency expenses');
  }
};

export const createAgencyExpense = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const payload = await normalizeAgencyExpenseInput(ownerId, req.body || {});
    const doc = await AgencyExpense.create({
      ...payload,
      owner: ownerId,
      createdBy: ownerId,
      updatedBy: ownerId,
    });
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'agencyExpense.create',
        entityType: 'AgencyExpense',
        entityId: doc._id,
        details: `Agency expense ${doc.category} ${doc.amount}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.status(201).json({ success: true, message: 'Created', expense: doc });
  } catch (error) {
    sendError(res, error, 'Failed to create agency expense');
  }
};

export const updateAgencyExpense = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const doc = await AgencyExpense.findOne({ _id: req.params.id, owner: ownerId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    const payload = await normalizeAgencyExpenseInput(ownerId, {
      ...doc.toObject(),
      ...req.body,
    });
    Object.assign(doc, payload, { updatedBy: ownerId });
    await doc.save();
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'agencyExpense.update',
        entityType: 'AgencyExpense',
        entityId: doc._id,
        details: `Updated agency expense ${doc._id}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.json({ success: true, message: 'Updated', expense: doc });
  } catch (error) {
    sendError(res, error, 'Failed to update agency expense');
  }
};

export const deleteAgencyExpense = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const doc = await AgencyExpense.findOneAndDelete({ _id: req.params.id, owner: ownerId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'agencyExpense.delete',
        entityType: 'AgencyExpense',
        entityId: doc._id,
        details: `Deleted agency expense ${doc._id}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    sendError(res, error, 'Failed to delete agency expense');
  }
};

/* —— Vehicle expenses —— */
export const listVehicleExpense = async (req, res) => {
  try {
    const result = await listVehicleExpenses(req.user._id, req.query);
    res.json({ success: true, expenses: result.items, pagination: result.pagination });
  } catch (error) {
    sendError(res, error, 'Failed to list vehicle expenses');
  }
};

export const createVehicleExpense = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const payload = await normalizeVehicleExpenseInput(ownerId, req.body || {});
    const doc = await VehicleExpense.create({
      ...payload,
      owner: ownerId,
      createdBy: ownerId,
      updatedBy: ownerId,
    });
    const populated = await VehicleExpense.findById(doc._id)
      .populate('car', 'brand model licensePlate year')
      .lean();
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'vehicleExpense.create',
        entityType: 'VehicleExpense',
        entityId: doc._id,
        details: `Vehicle expense ${doc.category} ${doc.amount}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.status(201).json({ success: true, message: 'Created', expense: populated || doc });
  } catch (error) {
    sendError(res, error, 'Failed to create vehicle expense');
  }
};

export const updateVehicleExpense = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const doc = await VehicleExpense.findOne({ _id: req.params.id, owner: ownerId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    const payload = await normalizeVehicleExpenseInput(ownerId, {
      ...doc.toObject(),
      car: req.body.car || req.body.carId || doc.car,
      ...req.body,
    });
    Object.assign(doc, payload, { updatedBy: ownerId });
    await doc.save();
    const populated = await VehicleExpense.findById(doc._id)
      .populate('car', 'brand model licensePlate year')
      .lean();
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'vehicleExpense.update',
        entityType: 'VehicleExpense',
        entityId: doc._id,
        details: `Updated vehicle expense ${doc._id}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.json({ success: true, message: 'Updated', expense: populated || doc });
  } catch (error) {
    sendError(res, error, 'Failed to update vehicle expense');
  }
};

export const deleteVehicleExpense = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const doc = await VehicleExpense.findOneAndDelete({ _id: req.params.id, owner: ownerId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'vehicleExpense.delete',
        entityType: 'VehicleExpense',
        entityId: doc._id,
        details: `Deleted vehicle expense ${doc._id}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    sendError(res, error, 'Failed to delete vehicle expense');
  }
};

/* —— Samsar payments —— */
export const listSamsarPayment = async (req, res) => {
  try {
    const result = await listSamsarPayments(req.user._id, req.query);
    res.json({ success: true, payments: result.items, pagination: result.pagination });
  } catch (error) {
    sendError(res, error, 'Failed to list Samsar payments');
  }
};

export const createSamsarPayment = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const payload = await normalizeSamsarPaymentInput(ownerId, req.body || {});
    const doc = await SamsarPayment.create({
      ...payload,
      owner: ownerId,
      createdBy: ownerId,
      updatedBy: ownerId,
    });
    const populated = await SamsarPayment.findById(doc._id)
      .populate('samsar', 'fullName phone commissionType commissionValue')
      .populate('booking', 'reservationId customerName price pickupDate returnDate paymentStatus')
      .lean();
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'samsarPayment.create',
        entityType: 'SamsarPayment',
        entityId: doc._id,
        details: `Samsar payment ${doc.amount}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.status(201).json({ success: true, message: 'Created', payment: populated || doc });
  } catch (error) {
    sendError(res, error, 'Failed to create Samsar payment');
  }
};

export const updateSamsarPayment = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const doc = await SamsarPayment.findOne({ _id: req.params.id, owner: ownerId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    const payload = await normalizeSamsarPaymentInput(ownerId, {
      ...doc.toObject(),
      samsar: req.body.samsar || req.body.samsarId || doc.samsar,
      booking: req.body.booking !== undefined ? req.body.booking : doc.booking,
      ...req.body,
    });
    Object.assign(doc, payload, { updatedBy: ownerId });
    await doc.save();
    const populated = await SamsarPayment.findById(doc._id)
      .populate('samsar', 'fullName phone commissionType commissionValue')
      .populate('booking', 'reservationId customerName price pickupDate returnDate paymentStatus')
      .lean();
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'samsarPayment.update',
        entityType: 'SamsarPayment',
        entityId: doc._id,
        details: `Updated Samsar payment ${doc._id}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.json({ success: true, message: 'Updated', payment: populated || doc });
  } catch (error) {
    sendError(res, error, 'Failed to update Samsar payment');
  }
};

export const deleteSamsarPayment = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const doc = await SamsarPayment.findOneAndDelete({ _id: req.params.id, owner: ownerId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'samsarPayment.delete',
        entityType: 'SamsarPayment',
        entityId: doc._id,
        details: `Deleted Samsar payment ${doc._id}`,
      });
    } catch (auditError) {
      console.error('[accounting] audit', auditError.message);
    }
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    sendError(res, error, 'Failed to delete Samsar payment');
  }
};

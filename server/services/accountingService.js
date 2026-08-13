/**
 * Accounting helpers — revenues derived from Booking; expenses/payments are ledgers.
 */
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import AgencyExpense, { AGENCY_EXPENSE_CATEGORIES } from '../models/AgencyExpense.js';
import VehicleExpense, { VEHICLE_EXPENSE_CATEGORIES } from '../models/VehicleExpense.js';
import SamsarPayment from '../models/SamsarPayment.js';
import Samsar from '../models/Samsar.js';
import { escapeRegex } from '../utils/helpers.js';

export const REVENUE_BOOKING_STATUSES = ['confirmed', 'ready_for_pickup', 'active', 'completed'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'];
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'check', 'card', 'other'];

const asObjectId = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (!mongoose.isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

const parseDateBound = (value, end = false) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (end) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
};

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

const requireOwnedCar = async (ownerId, carId) => {
  const id = asObjectId(carId);
  if (!id) {
    const err = new Error('Valid vehicle is required');
    err.status = 400;
    throw err;
  }
  const car = await Car.findOne({ _id: id, owner: ownerId }).select('_id').lean();
  if (!car) {
    const err = new Error('Vehicle not found');
    err.status = 404;
    throw err;
  }
  return id;
};

const requireOwnedSamsar = async (ownerId, samsarId) => {
  const id = asObjectId(samsarId);
  if (!id) {
    const err = new Error('Valid Samsar is required');
    err.status = 400;
    throw err;
  }
  const doc = await Samsar.findOne({ _id: id, owner: ownerId }).select('_id').lean();
  if (!doc) {
    const err = new Error('Samsar not found');
    err.status = 404;
    throw err;
  }
  return id;
};

const requireOwnedBooking = async (ownerId, bookingId) => {
  if (!bookingId) return null;
  const id = asObjectId(bookingId);
  if (!id) {
    const err = new Error('Invalid reservation');
    err.status = 400;
    throw err;
  }
  const booking = await Booking.findOne({ _id: id, owner: ownerId }).select('_id').lean();
  if (!booking) {
    const err = new Error('Reservation not found');
    err.status = 404;
    throw err;
  }
  return id;
};

export const normalizeAgencyExpenseInput = async (ownerId, body = {}) => {
  const category = AGENCY_EXPENSE_CATEGORIES.includes(body.category) ? body.category : null;
  if (!category) {
    const err = new Error('Valid expense category is required');
    err.status = 400;
    throw err;
  }
  const amount = money(body.amount);
  if (amount < 0 || !Number.isFinite(Number(body.amount))) {
    const err = new Error('Amount must be a valid non-negative number');
    err.status = 400;
    throw err;
  }
  const expenseDate = parseDateBound(body.expenseDate) || parseDateBound(new Date());
  return {
    category,
    amount,
    currency: String(body.currency || 'MAD').slice(0, 8),
    expenseDate,
    description: String(body.description || '').trim().slice(0, 2000),
    paymentStatus: PAYMENT_STATUSES.includes(body.paymentStatus) ? body.paymentStatus : 'paid',
    paymentMethod: PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'cash',
    notes: String(body.notes || '').slice(0, 5000),
  };
};

export const normalizeVehicleExpenseInput = async (ownerId, body = {}) => {
  const category = VEHICLE_EXPENSE_CATEGORIES.includes(body.category) ? body.category : null;
  if (!category) {
    const err = new Error('Valid expense category is required');
    err.status = 400;
    throw err;
  }
  const car = await requireOwnedCar(ownerId, body.car || body.carId);
  const amount = money(body.amount);
  if (amount < 0 || body.amount === '' || body.amount == null) {
    const err = new Error('Amount is required');
    err.status = 400;
    throw err;
  }
  const expenseDate = parseDateBound(body.expenseDate) || parseDateBound(new Date());
  let odometerKm = null;
  if (body.odometerKm !== undefined && body.odometerKm !== null && body.odometerKm !== '') {
    odometerKm = Math.max(0, Math.round(Number(body.odometerKm) || 0));
  }
  return {
    car,
    category,
    amount,
    currency: String(body.currency || 'MAD').slice(0, 8),
    expenseDate,
    description: String(body.description || '').trim().slice(0, 2000),
    paymentStatus: PAYMENT_STATUSES.includes(body.paymentStatus) ? body.paymentStatus : 'paid',
    paymentMethod: PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'cash',
    odometerKm,
    notes: String(body.notes || '').slice(0, 5000),
  };
};

export const normalizeSamsarPaymentInput = async (ownerId, body = {}) => {
  const samsar = await requireOwnedSamsar(ownerId, body.samsar || body.samsarId);
  const booking = await requireOwnedBooking(ownerId, body.booking || body.bookingId);
  const amount = money(body.amount);
  if (amount < 0 || body.amount === '' || body.amount == null) {
    const err = new Error('Amount is required');
    err.status = 400;
    throw err;
  }
  const paymentDate = parseDateBound(body.paymentDate) || parseDateBound(new Date());
  return {
    samsar,
    booking,
    amount,
    currency: String(body.currency || 'MAD').slice(0, 8),
    paymentDate,
    paymentStatus: PAYMENT_STATUSES.includes(body.paymentStatus) ? body.paymentStatus : 'paid',
    paymentMethod: PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'cash',
    notes: String(body.notes || '').slice(0, 5000),
  };
};

const dateRangeFilter = (field, from, to) => {
  const start = parseDateBound(from, false);
  const end = parseDateBound(to, true);
  if (!start && !end) return {};
  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return { [field]: range };
};

const paginate = async (Model, filter, { page = 1, limit = 20, sort = { expenseDate: -1 }, populate = [] } = {}) => {
  const pageNum = Math.max(1, Number(page) || 1);
  const lim = Math.min(100, Math.max(1, Number(limit) || 20));
  let q = Model.find(filter).sort(sort).skip((pageNum - 1) * lim).limit(lim);
  for (const p of populate) q = q.populate(p);
  const [items, total] = await Promise.all([q.lean(), Model.countDocuments(filter)]);
  return {
    items,
    pagination: {
      total,
      page: pageNum,
      limit: lim,
      totalPages: Math.max(1, Math.ceil(total / lim)),
    },
  };
};

export const listAgencyExpenses = async (ownerId, query = {}) => {
  const filter = {
    owner: ownerId,
    ...dateRangeFilter('expenseDate', query.from, query.to),
  };
  if (AGENCY_EXPENSE_CATEGORIES.includes(query.category)) filter.category = query.category;
  if (PAYMENT_STATUSES.includes(query.paymentStatus)) filter.paymentStatus = query.paymentStatus;
  return paginate(AgencyExpense, filter, {
    page: query.page,
    limit: query.limit,
    sort: { expenseDate: -1, createdAt: -1 },
  });
};

export const listVehicleExpenses = async (ownerId, query = {}) => {
  const filter = {
    owner: ownerId,
    ...dateRangeFilter('expenseDate', query.from, query.to),
  };
  if (VEHICLE_EXPENSE_CATEGORIES.includes(query.category)) filter.category = query.category;
  if (PAYMENT_STATUSES.includes(query.paymentStatus)) filter.paymentStatus = query.paymentStatus;
  const carId = asObjectId(query.car || query.carId);
  if (carId) filter.car = carId;
  return paginate(VehicleExpense, filter, {
    page: query.page,
    limit: query.limit,
    sort: { expenseDate: -1, createdAt: -1 },
    populate: [{ path: 'car', select: 'brand model licensePlate year' }],
  });
};

export const listSamsarPayments = async (ownerId, query = {}) => {
  const filter = {
    owner: ownerId,
    ...dateRangeFilter('paymentDate', query.from, query.to),
  };
  if (PAYMENT_STATUSES.includes(query.paymentStatus)) filter.paymentStatus = query.paymentStatus;
  const samsarId = asObjectId(query.samsar || query.samsarId);
  if (samsarId) filter.samsar = samsarId;
  const bookingId = asObjectId(query.booking || query.bookingId);
  if (bookingId) filter.booking = bookingId;
  return paginate(SamsarPayment, filter, {
    page: query.page,
    limit: query.limit,
    sort: { paymentDate: -1, createdAt: -1 },
    populate: [
      { path: 'samsar', select: 'fullName phone commissionType commissionValue' },
      { path: 'booking', select: 'reservationId customerName price pickupDate returnDate paymentStatus' },
    ],
  });
};

/**
 * Booking-derived revenues (no separate Revenue collection).
 */
export const listRevenues = async (ownerId, query = {}) => {
  const filter = {
    owner: ownerId,
    status: { $in: REVENUE_BOOKING_STATUSES },
    ...dateRangeFilter('pickupDate', query.from, query.to),
  };
  if (['pending', 'paid', 'failed', 'refunded'].includes(query.paymentStatus)) {
    filter.paymentStatus = query.paymentStatus;
  }
  const carId = asObjectId(query.car || query.carId);
  if (carId) filter.car = carId;
  const reservationQ = String(query.reservationId || query.q || '').trim();
  if (reservationQ) {
    filter.$or = [
      { reservationId: new RegExp(escapeRegex(reservationQ), 'i') },
      { customerName: new RegExp(escapeRegex(reservationQ), 'i') },
      { customerEmail: new RegExp(escapeRegex(reservationQ), 'i') },
    ];
  }

  const pageNum = Math.max(1, Number(query.page) || 1);
  const lim = Math.min(100, Math.max(1, Number(query.limit) || 20));

  const ownerOid = asObjectId(ownerId);
  const sumMatch = { ...filter, owner: ownerOid };

  const [items, total, sumAgg, paidAgg] = await Promise.all([
    Booking.find(filter)
      .populate('car', 'brand model licensePlate year')
      .populate('samsar', 'fullName')
      .sort({ pickupDate: -1, createdAt: -1 })
      .skip((pageNum - 1) * lim)
      .limit(lim)
      .lean(),
    Booking.countDocuments(filter),
    Booking.aggregate([
      { $match: sumMatch },
      { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { ...sumMatch, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } },
    ]),
  ]);

  const totalRevenue = money(sumAgg[0]?.total);
  const paidRevenue = money(paidAgg[0]?.total);

  return {
    items,
    pagination: {
      total,
      page: pageNum,
      limit: lim,
      totalPages: Math.max(1, Math.ceil(total / lim)),
    },
    totals: {
      totalRevenue,
      paidRevenue,
      unpaidRevenue: money(totalRevenue - paidRevenue),
      bookingCount: total,
    },
  };
};

export const getAccountingKpis = async (ownerId, query = {}) => {
  const owner = asObjectId(ownerId);
  const bookingDate = dateRangeFilter('pickupDate', query.from, query.to);
  const expenseDate = dateRangeFilter('expenseDate', query.from, query.to);
  const paymentDate = dateRangeFilter('paymentDate', query.from, query.to);

  const revenueMatch = {
    owner,
    status: { $in: REVENUE_BOOKING_STATUSES },
    ...bookingDate,
  };

  const [rev, paidRev, samsar, agency, vehicle] = await Promise.all([
    Booking.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { ...revenueMatch, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } },
    ]),
    SamsarPayment.aggregate([
      {
        $match: {
          owner,
          paymentStatus: { $ne: 'cancelled' },
          ...paymentDate,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    AgencyExpense.aggregate([
      {
        $match: {
          owner,
          paymentStatus: { $ne: 'cancelled' },
          ...expenseDate,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    VehicleExpense.aggregate([
      {
        $match: {
          owner,
          paymentStatus: { $ne: 'cancelled' },
          ...expenseDate,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const totalRevenue = money(rev[0]?.total);
  const paidRevenue = money(paidRev[0]?.total);
  const totalSamsarPayments = money(samsar[0]?.total);
  const totalAgencyExpenses = money(agency[0]?.total);
  const totalVehicleExpenses = money(vehicle[0]?.total);
  const totalExpenses = money(totalSamsarPayments + totalAgencyExpenses + totalVehicleExpenses);
  const netResult = money(totalRevenue - totalExpenses);

  return {
    totalRevenue,
    paidRevenue,
    unpaidRevenue: money(totalRevenue - paidRevenue),
    bookingCount: rev[0]?.count || 0,
    totalSamsarPayments,
    samsarPaymentCount: samsar[0]?.count || 0,
    totalAgencyExpenses,
    agencyExpenseCount: agency[0]?.count || 0,
    totalVehicleExpenses,
    vehicleExpenseCount: vehicle[0]?.count || 0,
    totalExpenses,
    netResult,
  };
};

export {
  AGENCY_EXPENSE_CATEGORIES,
  VEHICLE_EXPENSE_CATEGORIES,
};

export default {
  REVENUE_BOOKING_STATUSES,
  listAgencyExpenses,
  listVehicleExpenses,
  listSamsarPayments,
  listRevenues,
  getAccountingKpis,
  normalizeAgencyExpenseInput,
  normalizeVehicleExpenseInput,
  normalizeSamsarPaymentInput,
};

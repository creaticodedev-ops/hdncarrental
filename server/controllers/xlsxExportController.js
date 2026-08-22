import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import GuestCustomer from '../models/GuestCustomer.js';
import Invoice from '../models/Invoice.js';
import Contract from '../models/Contract.js';
import MaintenanceRecord from '../models/MaintenanceRecord.js';
import AgencyExpense from '../models/AgencyExpense.js';
import VehicleExpense from '../models/VehicleExpense.js';
import SamsarPayment from '../models/SamsarPayment.js';
import { logAudit } from '../utils/adminOps.js';
import { getAccountingKpis } from '../services/accountingService.js';
import {
  EXPORT_ROW_CAP,
  resolveLang,
  sendWorkbook,
} from '../services/xlsxReport/engine.js';
import {
  buildAccountingReport,
  buildAnalyticsReport,
  buildContractsReport,
  buildCustomersReport,
  buildFleetReport,
  buildInvoicesReport,
  buildMaintenanceReport,
  buildReservationsReport,
  buildRevenueReport,
  buildVehicleStatsReport,
} from '../services/xlsxReport/builders.js';

const REVENUE_STATUSES = ['confirmed', 'ready_for_pickup', 'active', 'completed'];

const isOnlineChannel = (channel) => channel !== 'walk_in';

const monthKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

const cap = (docs) => (Array.isArray(docs) ? docs.slice(0, EXPORT_ROW_CAP) : []);

const audit = async (req, details) => {
  try {
    await logAudit({
      owner: req.user._id,
      actor: req.user._id,
      action: 'report.export',
      entityType: 'Report',
      details,
    });
  } catch (error) {
    console.error('[xlsx-export] audit', error.message);
  }
};

const fail = (res, error, fallback = 'Export failed') => {
  console.error('[xlsx-export]', error.message);
  if (res.headersSent) return;
  res.status(500).json({ success: false, message: fallback });
};

const dateBound = (value, end = false) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (end) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
};

const rangeFilter = (field, from, to) => {
  const start = dateBound(from, false);
  const end = dateBound(to, true);
  if (!start && !end) return {};
  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return { [field]: range };
};

const computeAnalytics = (bookings) => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const revenueBookings = bookings.filter((b) => REVENUE_STATUSES.includes(b.status));
  const sumSince = (from) =>
    revenueBookings.filter((b) => new Date(b.createdAt) >= from).reduce((s, b) => s + Number(b.price || 0), 0);

  const monthlyTrend = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
    const amount = revenueBookings
      .filter((b) => monthKey(b.createdAt) === key)
      .reduce((s, b) => s + Number(b.price || 0), 0);
    monthlyTrend.push({ key, label, amount });
  }

  const statusMap = new Map();
  for (const b of bookings) {
    const cur = statusMap.get(b.status) || { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(b.price || 0);
    statusMap.set(b.status, cur);
  }
  const channelMap = new Map();
  for (const b of revenueBookings) {
    const key = isOnlineChannel(b.channel) ? 'online' : 'walk_in';
    const cur = channelMap.get(key) || { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(b.price || 0);
    channelMap.set(key, cur);
  }

  const online = revenueBookings.filter((b) => isOnlineChannel(b.channel));
  const walkIn = revenueBookings.filter((b) => !isOnlineChannel(b.channel));

  return {
    weeklyRevenue: sumSince(weekStart),
    monthlyRevenue: sumSince(monthStart),
    yearlyRevenue: sumSince(yearStart),
    totalRevenue: revenueBookings.reduce((s, b) => s + Number(b.price || 0), 0),
    bookingCount: revenueBookings.length,
    monthlyTrend,
    byStatus: [...statusMap.entries()].map(([_id, v]) => ({ _id, ...v })),
    byChannel: [...channelMap.entries()].map(([_id, v]) => ({ _id, ...v })),
    onlineRevenue: online.reduce((s, b) => s + Number(b.price || 0), 0),
    walkInRevenue: walkIn.reduce((s, b) => s + Number(b.price || 0), 0),
  };
};

export const sendReservationsExport = async (req, res, bookings, filters = {}) => {
  const lang = resolveLang(req);
  const from = filters.pickupDateFrom || filters.createdFrom || filters.returnDateFrom;
  const to = filters.pickupDateTo || filters.createdTo || filters.returnDateTo;
  const report = buildReservationsReport({
    user: req.user,
    lang,
    bookings: cap(bookings),
    filters,
    from,
    to,
  });
  await audit(req, `Exported reservations XLSX (${bookings.length} rows)`);
  await sendWorkbook(res, report.wb, report.filename);
};

export const exportReportXlsx = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const type = String(req.query.type || 'revenue');
    const lang = resolveLang(req);
    const from = req.query.from;
    const to = req.query.to;

    if (type === 'customers') {
      const query = { owner: ownerId };
      const { search, status, city, minRating, minBookings, minSpent } = req.query;
      if (status) query.status = status;
      if (city) query.city = { $regex: String(city), $options: 'i' };
      if (minRating) query.rating = { $gte: Number(minRating) };
      if (minBookings) query.totalReservations = { $gte: Number(minBookings) };
      if (minSpent) query.totalSpent = { $gte: Number(minSpent) };
      if (search) {
        const term = String(search);
        query.$or = [
          { name: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
          { city: { $regex: term, $options: 'i' } },
        ];
      }
      const customers = cap(await GuestCustomer.find(query).sort({ lastBookingAt: -1 }).lean());
      const report = buildCustomersReport({ user: req.user, lang, customers });
      await audit(req, `Exported customers XLSX (${customers.length} rows)`);
      return sendWorkbook(res, report.wb, report.filename);
    }

    if (type === 'fleet') {
      const [cars, bookings] = await Promise.all([
        Car.find({ owner: ownerId }).sort({ brand: 1, model: 1 }).lean(),
        Booking.find({ owner: ownerId }).select('car price status pickupDate createdAt').lean(),
      ]);
      const report = buildFleetReport({ user: req.user, lang, cars: cap(cars), bookings: cap(bookings) });
      await audit(req, `Exported fleet XLSX (${cars.length} vehicles)`);
      return sendWorkbook(res, report.wb, report.filename);
    }

    if (type === 'analytics') {
      const bookings = cap(await Booking.find({ owner: ownerId }).select('price createdAt pickupDate status channel').lean());
      const report = buildAnalyticsReport({ user: req.user, lang, analytics: computeAnalytics(bookings) });
      await audit(req, 'Exported analytics XLSX');
      return sendWorkbook(res, report.wb, report.filename);
    }

    const query = { owner: ownerId };
    Object.assign(query, rangeFilter('pickupDate', from, to));
    const bookings = cap(
      await Booking.find(query).populate('car').sort({ createdAt: -1 }).lean(),
    );
    const report = buildRevenueReport({ user: req.user, lang, bookings, from, to });
    await audit(req, `Exported revenue XLSX (${bookings.length} rows)`);
    return sendWorkbook(res, report.wb, report.filename);
  } catch (error) {
    return fail(res, error);
  }
};

export const exportAccountingXlsx = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const lang = resolveLang(req);
    const { from, to, ledger } = req.query;
    const dateQ = { from, to };
    const [kpis, revenues, agency, vehicles, samsar] = await Promise.all([
      getAccountingKpis(ownerId, dateQ),
      Booking.find({
        owner: ownerId,
        status: { $in: REVENUE_STATUSES },
        ...rangeFilter('pickupDate', from, to),
      })
        .populate('car')
        .sort({ pickupDate: -1 })
        .limit(EXPORT_ROW_CAP)
        .lean(),
      AgencyExpense.find({ owner: ownerId, ...rangeFilter('expenseDate', from, to) })
        .sort({ expenseDate: -1 })
        .limit(EXPORT_ROW_CAP)
        .lean(),
      VehicleExpense.find({ owner: ownerId, ...rangeFilter('expenseDate', from, to) })
        .populate('car', 'brand model licensePlate year')
        .sort({ expenseDate: -1 })
        .limit(EXPORT_ROW_CAP)
        .lean(),
      SamsarPayment.find({ owner: ownerId, ...rangeFilter('paymentDate', from, to) })
        .populate('samsar', 'fullName phone')
        .populate('booking', 'reservationId customerName price')
        .sort({ paymentDate: -1 })
        .limit(EXPORT_ROW_CAP)
        .lean(),
    ]);
    const report = buildAccountingReport({
      user: req.user,
      lang,
      kpis,
      revenues,
      agency,
      vehicles,
      samsar,
      from,
      to,
      ledger,
    });
    await audit(req, `Exported accounting XLSX (${ledger || 'full'})`);
    await sendWorkbook(res, report.wb, report.filename);
  } catch (error) {
    fail(res, error);
  }
};

export const exportInvoicesXlsx = async (req, res) => {
  try {
    const lang = resolveLang(req);
    const query = { owner: req.user._id };
    const { search, customerName, cin, phone } = req.query;
    const filters = [];
    if (search?.trim()) {
      const term = search.trim();
      filters.push(
        { invoiceNumber: { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { customerEmail: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
      );
    }
    if (customerName?.trim()) filters.push({ customerName: { $regex: customerName.trim(), $options: 'i' } });
    if (cin?.trim()) filters.push({ customerTaxId: { $regex: cin.trim(), $options: 'i' } });
    if (phone?.trim()) filters.push({ customerPhone: { $regex: phone.trim(), $options: 'i' } });
    if (filters.length) query.$or = filters;
    const invoices = cap(await Invoice.find(query).sort({ createdAt: -1 }).limit(EXPORT_ROW_CAP).lean());
    const report = buildInvoicesReport({ user: req.user, lang, invoices });
    await audit(req, `Exported invoices XLSX (${invoices.length} rows)`);
    await sendWorkbook(res, report.wb, report.filename);
  } catch (error) {
    fail(res, error);
  }
};

export const exportContractsXlsx = async (req, res) => {
  try {
    const lang = resolveLang(req);
    const contracts = cap(
      await Contract.find({ owner: req.user._id })
        .populate({
          path: 'booking',
          select: 'reservationId customerName customerPhone pickupDate returnDate price status car',
          populate: { path: 'car', select: 'brand model year licensePlate' },
        })
        .sort({ createdAt: -1 })
        .limit(EXPORT_ROW_CAP)
        .lean(),
    );
    const report = buildContractsReport({ user: req.user, lang, contracts });
    await audit(req, `Exported contracts XLSX (${contracts.length} rows)`);
    await sendWorkbook(res, report.wb, report.filename);
  } catch (error) {
    fail(res, error);
  }
};

export const exportMaintenanceXlsx = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const lang = resolveLang(req);
    const [cars, records] = await Promise.all([
      Car.find({ owner: ownerId }).sort({ brand: 1, model: 1 }).lean(),
      MaintenanceRecord.find({ owner: ownerId })
        .populate('car', 'brand model licensePlate fleetId')
        .sort({ scheduledDate: -1 })
        .limit(EXPORT_ROW_CAP)
        .lean(),
    ]);
    const report = buildMaintenanceReport({
      user: req.user,
      lang,
      cars: cap(cars),
      records: cap(records),
    });
    await audit(req, `Exported maintenance XLSX (${records.length} records)`);
    await sendWorkbook(res, report.wb, report.filename);
  } catch (error) {
    fail(res, error);
  }
};

export const exportVehicleStatsXlsx = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const lang = resolveLang(req);
    const car = await Car.findOne({ _id: req.params.id, owner: ownerId }).lean();
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });
    const [bookings, records] = await Promise.all([
      Booking.find({ owner: ownerId, car: car._id }).populate('car').sort({ pickupDate: -1 }).limit(EXPORT_ROW_CAP).lean(),
      MaintenanceRecord.find({ owner: ownerId, car: car._id }).sort({ scheduledDate: -1 }).limit(EXPORT_ROW_CAP).lean(),
    ]);
    const report = buildVehicleStatsReport({ user: req.user, lang, car, bookings, records });
    await audit(req, `Exported vehicle stats XLSX (${car.licensePlate || car.fleetId || car._id})`);
    await sendWorkbook(res, report.wb, report.filename);
  } catch (error) {
    fail(res, error);
  }
};

export const exportCustomersXlsx = async (req, res) => {
  req.query.type = 'customers';
  return exportReportXlsx(req, res);
};

export default {
  sendReservationsExport,
  exportReportXlsx,
  exportAccountingXlsx,
  exportInvoicesXlsx,
  exportContractsXlsx,
  exportMaintenanceXlsx,
  exportVehicleStatsXlsx,
  exportCustomersXlsx,
};

import {
  buildFilename,
  createWorkbook,
  CURRENCY_CODE,
  formatPeriodLabel,
  inferDateRange,
  money,
  rentalDays,
  REVENUE_STATUSES,
  resolveAgencyName,
  vehicleLabel,
  writeSummarySheet,
  writeTableSheet,
} from './engine.js';
import { labelStatus, t } from './i18n.js';

const now = () => new Date();

const reservationIdOf = (b) =>
  b.reservationId || (b._id ? `RES-${String(b._id).slice(-8).toUpperCase()}` : '');

const revenueOf = (bookings) =>
  money(bookings.filter((b) => REVENUE_STATUSES.includes(b.status)).reduce((s, b) => s + Number(b.price || 0), 0));

const baseCtx = (user, lang, reportKey, from, to) => {
  const agencyName = resolveAgencyName(user);
  const title = t(lang, `titles.${reportKey}`);
  const periodLabel = formatPeriodLabel(from, to, lang);
  const filename = buildFilename({ agencyName, reportKey, from, to, lang });
  const wb = createWorkbook({ agencyName, lang, title });
  return { wb, agencyName, title, periodLabel, filename, generatedAt: now() };
};

const statusBreakdownRows = (items, lang, getStatus) => {
  const map = new Map();
  for (const item of items) {
    const status = getStatus(item) || '';
    const cur = map.get(status) || { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(item.price || item.totalAmount || item.amount || item.cost || 0);
    map.set(status, cur);
  }
  return [...map.entries()].map(([status, v]) => [
    labelStatus(lang, status) || status,
    v.count,
    money(v.amount),
  ]);
};

export const reservationColumns = (lang) => [
  { header: t(lang, 'cols.reservationId'), type: 'text', minWidth: 16 },
  { header: t(lang, 'cols.customer'), type: 'text', maxWidth: 32 },
  { header: t(lang, 'cols.phone'), type: 'text', minWidth: 14 },
  { header: t(lang, 'cols.email'), type: 'text', maxWidth: 28 },
  { header: t(lang, 'cols.vehicle'), type: 'text', maxWidth: 28 },
  { header: t(lang, 'cols.category'), type: 'text' },
  { header: t(lang, 'cols.pickupLocation'), type: 'text', maxWidth: 28 },
  { header: t(lang, 'cols.returnLocation'), type: 'text', maxWidth: 28 },
  { header: t(lang, 'cols.pickupDate'), type: 'datetime', minWidth: 18 },
  { header: t(lang, 'cols.returnDate'), type: 'datetime', minWidth: 18 },
  { header: t(lang, 'cols.duration'), type: 'integer' },
  { header: t(lang, 'cols.status'), type: 'status' },
  { header: t(lang, 'cols.paymentStatus'), type: 'status' },
  { header: t(lang, 'cols.channel'), type: 'status' },
  { header: t(lang, 'cols.total'), type: 'currency' },
  { header: t(lang, 'cols.created'), type: 'date' },
];

export const reservationRow = (b, lang) => [
  reservationIdOf(b),
  b.customerName || '',
  b.customerPhone || '',
  b.customerEmail || '',
  vehicleLabel(b.car),
  b.car?.category || '',
  b.pickupLocation || '',
  b.returnLocation || '',
  b.pickupDate,
  b.returnDate,
  rentalDays(b),
  labelStatus(lang, b.status),
  labelStatus(lang, b.paymentStatus),
  labelStatus(lang, b.channel),
  Number(b.price || 0),
  b.createdAt,
];

const customerKey = (b) =>
  String(b.crmKey || b.customerEmail || b.customerPhone || b.customerName || '').trim().toLowerCase();

const customersFromBookings = (bookings) => {
  const map = new Map();
  for (const b of bookings) {
    const key = customerKey(b);
    if (!key) continue;
    const cur = map.get(key) || {
      name: b.customerName || '',
      phone: b.customerPhone || '',
      email: b.customerEmail || '',
      bookings: 0,
      revenue: 0,
      lastBooking: null,
      status: '',
    };
    cur.bookings += 1;
    if (REVENUE_STATUSES.includes(b.status)) cur.revenue += Number(b.price || 0);
    if (b.customerName) cur.name = b.customerName;
    if (b.customerPhone) cur.phone = b.customerPhone;
    if (b.customerEmail) cur.email = b.customerEmail;
    const when = b.pickupDate || b.createdAt;
    if (when && (!cur.lastBooking || new Date(when) > new Date(cur.lastBooking))) cur.lastBooking = when;
    map.set(key, cur);
  }
  return [...map.values()];
};

const vehiclesFromBookings = (bookings, cars = []) => {
  const map = new Map();
  for (const car of cars) {
    map.set(String(car._id), {
      car,
      bookings: 0,
      revenue: 0,
    });
  }
  for (const b of bookings) {
    const id = b.car?._id ? String(b.car._id) : String(b.car || '');
    if (!id) continue;
    const cur = map.get(id) || { car: b.car || {}, bookings: 0, revenue: 0 };
    cur.bookings += 1;
    if (REVENUE_STATUSES.includes(b.status)) cur.revenue += Number(b.price || 0);
    if (b.car && typeof b.car === 'object') cur.car = b.car;
    map.set(id, cur);
  }
  return [...map.values()];
};

const carAvailability = (car, lang) => {
  if (car?.status === 'maintenance') return labelStatus(lang, 'maintenance');
  if (car?.status === 'booked') return labelStatus(lang, 'booked');
  if (car?.isAvaliable === false) return labelStatus(lang, 'unavailable');
  return labelStatus(lang, 'available');
};

export const buildReservationsReport = ({ user, lang, bookings, filters = {}, from, to }) => {
  const range = from || to ? { from, to } : inferDateRange(bookings, ['pickupDate', 'returnDate', 'createdAt']);
  const ctx = baseCtx(user, lang, 'reservations', range.from, range.to);
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
  const revenue = revenueOf(bookings);
  const revenueCount = bookings.filter((b) => REVENUE_STATUSES.includes(b.status)).length;
  const filterBits = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);

  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.reservations'), value: bookings.length, type: 'integer' },
      { label: t(lang, 'kpi.revenue'), value: revenue, type: 'currency' },
      { label: t(lang, 'kpi.completed'), value: completed, type: 'integer', tone: 'positive' },
      { label: t(lang, 'kpi.cancelled'), value: cancelled, type: 'integer', tone: 'danger' },
      { label: t(lang, 'kpi.average'), value: revenueCount ? money(revenue / revenueCount) : 0, type: 'currency' },
    ],
    extraLines: [
      `${t(lang, 'meta.currency')}: ${CURRENCY_CODE}`,
      `${t(lang, 'kpi.confirmed')}: ${confirmed}`,
      filterBits.length ? `${t(lang, 'meta.filters')}: ${filterBits.join(' · ')}` : `${t(lang, 'meta.filters')}: ${t(lang, 'meta.none')}`,
    ],
    breakdown: {
      title: t(lang, 'sheets.byStatus'),
      columns: [
        { header: t(lang, 'cols.status'), type: 'status' },
        { header: t(lang, 'cols.count'), type: 'integer' },
        { header: t(lang, 'cols.amount'), type: 'currency' },
      ],
      rows: statusBreakdownRows(bookings, lang, (b) => b.status),
    },
  });

  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.reservations'),
    columns: reservationColumns(lang),
    rows: bookings.map((b) => reservationRow(b, lang)),
    tableName: 'Reservations',
  });

  const customers = customersFromBookings(bookings);
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.customers'),
    title: t(lang, 'titles.customers'),
    columns: [
      { header: t(lang, 'cols.customer'), type: 'text', maxWidth: 32 },
      { header: t(lang, 'cols.phone'), type: 'text' },
      { header: t(lang, 'cols.email'), type: 'text', maxWidth: 28 },
      { header: t(lang, 'cols.bookings'), type: 'integer' },
      { header: t(lang, 'cols.revenue'), type: 'currency' },
      { header: t(lang, 'cols.lastBooking'), type: 'date' },
    ],
    rows: customers.map((c) => [c.name, c.phone, c.email, c.bookings, money(c.revenue), c.lastBooking]),
    tableName: 'Customers',
  });

  const vehicles = vehiclesFromBookings(bookings);
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.vehicles'),
    title: t(lang, 'titles.fleet'),
    columns: [
      { header: t(lang, 'cols.vehicle'), type: 'text' },
      { header: t(lang, 'cols.brand'), type: 'text' },
      { header: t(lang, 'cols.model'), type: 'text' },
      { header: t(lang, 'cols.registration'), type: 'text' },
      { header: t(lang, 'cols.category'), type: 'text' },
      { header: t(lang, 'cols.bookings'), type: 'integer' },
      { header: t(lang, 'cols.revenue'), type: 'currency' },
    ],
    rows: vehicles.map((v) => [
      vehicleLabel(v.car),
      v.car?.brand || '',
      v.car?.model || '',
      v.car?.licensePlate || '',
      v.car?.category || '',
      v.bookings,
      money(v.revenue),
    ]),
    tableName: 'Vehicles',
  });

  return ctx;
};

export const buildCustomersReport = ({ user, lang, customers }) => {
  const range = inferDateRange(customers, ['lastBookingAt', 'createdAt']);
  const ctx = baseCtx(user, lang, 'customers', range.from, range.to);
  const spent = money(customers.reduce((s, c) => s + Number(c.totalSpent || 0), 0));
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.customers'), value: customers.length, type: 'integer' },
      { label: t(lang, 'kpi.totalSpent'), value: spent, type: 'currency' },
      { label: t(lang, 'kpi.vip'), value: customers.filter((c) => c.status === 'vip').length, type: 'integer', tone: 'positive' },
      { label: t(lang, 'kpi.blacklisted'), value: customers.filter((c) => c.status === 'blacklisted').length, type: 'integer', tone: 'danger' },
      { label: t(lang, 'kpi.bookings'), value: customers.reduce((s, c) => s + Number(c.totalReservations || 0), 0), type: 'integer' },
    ],
    extraLines: [`${t(lang, 'meta.currency')}: ${CURRENCY_CODE}`],
    breakdown: {
      columns: [
        { header: t(lang, 'cols.status'), type: 'status' },
        { header: t(lang, 'cols.count'), type: 'integer' },
        { header: t(lang, 'cols.amount'), type: 'currency' },
      ],
      rows: statusBreakdownRows(customers.map((c) => ({ status: c.status, amount: c.totalSpent })), lang, (c) => c.status),
    },
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.customers'),
    columns: [
      { header: t(lang, 'cols.customer'), type: 'text', maxWidth: 32 },
      { header: t(lang, 'cols.phone'), type: 'text' },
      { header: t(lang, 'cols.email'), type: 'text', maxWidth: 28 },
      { header: t(lang, 'cols.city'), type: 'text' },
      { header: t(lang, 'cols.status'), type: 'status' },
      { header: t(lang, 'cols.rating'), type: 'decimal' },
      { header: t(lang, 'cols.bookings'), type: 'integer' },
      { header: t(lang, 'cols.cancellations'), type: 'integer' },
      { header: t(lang, 'cols.revenue'), type: 'currency' },
      { header: t(lang, 'cols.lastBooking'), type: 'date' },
    ],
    rows: customers.map((c) => [
      c.name || '',
      c.phone || '',
      c.email || '',
      c.city || '',
      labelStatus(lang, c.status),
      Number(c.rating || 0),
      Number(c.totalReservations || 0),
      Number(c.cancelledReservations || 0),
      Number(c.totalSpent || 0),
      c.lastBookingAt,
    ]),
    tableName: 'Customers',
  });
  return ctx;
};

export const buildFleetReport = ({ user, lang, cars, bookings = [] }) => {
  const range = inferDateRange(bookings, ['pickupDate', 'createdAt']);
  const ctx = baseCtx(user, lang, 'fleet', range.from, range.to);
  const byCar = vehiclesFromBookings(bookings, cars);
  const revenue = money(byCar.reduce((s, v) => s + v.revenue, 0));
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.vehicles'), value: cars.length, type: 'integer' },
      { label: t(lang, 'kpi.available'), value: cars.filter((c) => c.status !== 'maintenance' && c.isAvaliable !== false).length, type: 'integer', tone: 'positive' },
      { label: t(lang, 'kpi.maintenance'), value: cars.filter((c) => c.status === 'maintenance').length, type: 'integer', tone: 'warning' },
      { label: t(lang, 'kpi.bookings'), value: bookings.length, type: 'integer' },
      { label: t(lang, 'kpi.revenue'), value: revenue, type: 'currency' },
    ],
    extraLines: [`${t(lang, 'meta.currency')}: ${CURRENCY_CODE}`],
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.vehicles'),
    columns: [
      { header: t(lang, 'cols.vehicle'), type: 'text' },
      { header: t(lang, 'cols.brand'), type: 'text' },
      { header: t(lang, 'cols.model'), type: 'text' },
      { header: t(lang, 'cols.registration'), type: 'text' },
      { header: t(lang, 'cols.fleetId'), type: 'text' },
      { header: t(lang, 'cols.category'), type: 'text' },
      { header: t(lang, 'cols.transmission'), type: 'text' },
      { header: t(lang, 'cols.fuel'), type: 'text' },
      { header: t(lang, 'cols.availability'), type: 'status' },
      { header: t(lang, 'cols.mileage'), type: 'integer' },
      { header: t(lang, 'cols.nextService'), type: 'date' },
      { header: t(lang, 'cols.insuranceExpiry'), type: 'date' },
      { header: t(lang, 'cols.registrationExpiry'), type: 'date' },
      { header: t(lang, 'cols.bookings'), type: 'integer' },
      { header: t(lang, 'cols.revenue'), type: 'currency' },
      { header: t(lang, 'cols.pricePerDay'), type: 'currency' },
    ],
    rows: byCar.map((v) => {
      const c = v.car || {};
      return [
        vehicleLabel(c),
        c.brand || '',
        c.model || '',
        c.licensePlate || '',
        c.fleetId || '',
        c.category || '',
        c.transmission || '',
        c.fuel_type || '',
        carAvailability(c, lang),
        Number(c.mileage || 0),
        c.nextServiceDate,
        c.insuranceExpiry,
        c.registrationExpiry,
        v.bookings,
        money(v.revenue),
        Number(c.pricePerDay || 0),
      ];
    }),
    tableName: 'Fleet',
  });
  return ctx;
};

export const buildRevenueReport = ({ user, lang, bookings, from, to }) => {
  const range = from || to ? { from, to } : inferDateRange(bookings, ['pickupDate', 'createdAt']);
  const ctx = baseCtx(user, lang, 'revenue', range.from, range.to);
  const revenue = revenueOf(bookings);
  const paid = money(bookings.filter((b) => b.paymentStatus === 'paid').reduce((s, b) => s + Number(b.price || 0), 0));
  const revenueCount = bookings.filter((b) => REVENUE_STATUSES.includes(b.status)).length;
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.reservations'), value: bookings.length, type: 'integer' },
      { label: t(lang, 'kpi.revenue'), value: revenue, type: 'currency' },
      { label: t(lang, 'kpi.paid'), value: paid, type: 'currency', tone: 'positive' },
      { label: t(lang, 'kpi.completed'), value: bookings.filter((b) => b.status === 'completed').length, type: 'integer' },
      { label: t(lang, 'kpi.average'), value: revenueCount ? money(revenue / revenueCount) : 0, type: 'currency' },
    ],
    extraLines: [`${t(lang, 'meta.currency')}: ${CURRENCY_CODE}`],
    breakdown: {
      columns: [
        { header: t(lang, 'cols.status'), type: 'status' },
        { header: t(lang, 'cols.count'), type: 'integer' },
        { header: t(lang, 'cols.amount'), type: 'currency' },
      ],
      rows: statusBreakdownRows(bookings, lang, (b) => b.status),
    },
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.reservations'),
    columns: reservationColumns(lang),
    rows: bookings.map((b) => reservationRow(b, lang)),
    tableName: 'RevenueReservations',
  });
  return ctx;
};

export const buildAnalyticsReport = ({ user, lang, analytics }) => {
  const ctx = baseCtx(user, lang, 'analytics', null, null);
  const a = analytics || {};
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.weekly'), value: Number(a.weeklyRevenue || 0), type: 'currency' },
      { label: t(lang, 'kpi.monthly'), value: Number(a.monthlyRevenue || 0), type: 'currency' },
      { label: t(lang, 'kpi.yearly'), value: Number(a.yearlyRevenue || 0), type: 'currency' },
      { label: t(lang, 'kpi.allTime'), value: Number(a.totalRevenue || 0), type: 'currency' },
      { label: t(lang, 'kpi.bookings'), value: Number(a.bookingCount || 0), type: 'integer' },
    ],
    extraLines: [
      `${t(lang, 'kpi.online')}: ${CURRENCY_CODE} ${money(a.onlineRevenue || 0)}`,
      `${t(lang, 'kpi.walkIn')}: ${CURRENCY_CODE} ${money(a.walkInRevenue || 0)}`,
    ],
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.trends'),
    columns: [
      { header: t(lang, 'cols.period'), type: 'text' },
      { header: t(lang, 'cols.amount'), type: 'currency' },
    ],
    rows: (a.monthlyTrend || []).map((row) => [row.label || row.key, Number(row.amount || 0)]),
    tableName: 'MonthlyTrend',
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.byStatus'),
    columns: [
      { header: t(lang, 'cols.status'), type: 'status' },
      { header: t(lang, 'cols.count'), type: 'integer' },
      { header: t(lang, 'cols.revenue'), type: 'currency' },
    ],
    rows: (a.byStatus || []).map((row) => [labelStatus(lang, row._id), Number(row.count || 0), Number(row.revenue || 0)]),
    tableName: 'ByStatus',
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.byChannel'),
    columns: [
      { header: t(lang, 'cols.channel'), type: 'status' },
      { header: t(lang, 'cols.count'), type: 'integer' },
      { header: t(lang, 'cols.revenue'), type: 'currency' },
    ],
    rows: (a.byChannel || []).map((row) => [labelStatus(lang, row._id), Number(row.count || 0), Number(row.revenue || 0)]),
    tableName: 'ByChannel',
  });
  return ctx;
};

export const buildAccountingReport = ({
  user, lang, kpis = {}, revenues = [], agency = [], vehicles = [], samsar = [], from, to, ledger,
}) => {
  const key = ledger === 'agency-expenses'
    ? 'agencyExpenses'
    : ledger === 'vehicle-expenses'
      ? 'vehicleExpenses'
      : ledger === 'samsar-payments'
        ? 'samsarPayments'
        : ledger === 'revenues'
          ? 'revenue'
          : 'accounting';
  const ctx = baseCtx(user, lang, key, from, to);
  const full = !ledger || ledger === 'accounting';
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.revenue'), value: Number(kpis.totalRevenue || 0), type: 'currency' },
      { label: t(lang, 'kpi.paid'), value: Number(kpis.paidRevenue || 0), type: 'currency', tone: 'positive' },
      { label: t(lang, 'kpi.expenses'), value: Number(kpis.totalExpenses || 0), type: 'currency', tone: 'warning' },
      { label: t(lang, 'kpi.net'), value: Number(kpis.netResult || 0), type: 'currency' },
      { label: t(lang, 'kpi.bookings'), value: Number(kpis.bookingCount || 0), type: 'integer' },
    ],
    extraLines: [`${t(lang, 'meta.currency')}: ${CURRENCY_CODE}`],
  });

  if (full || ledger === 'revenues') {
    writeTableSheet(ctx.wb, {
      ...ctx,
      lang,
      sheetName: t(lang, 'sheets.revenues'),
      columns: reservationColumns(lang).filter((c) => c.header !== t(lang, 'cols.notes')),
      rows: revenues.map((b) => reservationRow(b, lang)),
      tableName: 'Revenues',
    });
  }
  if (full || ledger === 'agency-expenses') {
    writeTableSheet(ctx.wb, {
      ...ctx,
      lang,
      sheetName: t(lang, 'sheets.agencyExpenses'),
      columns: [
        { header: t(lang, 'cols.date'), type: 'date' },
        { header: t(lang, 'cols.category'), type: 'text' },
        { header: t(lang, 'cols.amount'), type: 'currency' },
        { header: t(lang, 'cols.paymentStatus'), type: 'status' },
        { header: t(lang, 'cols.paymentMethod'), type: 'status' },
        { header: t(lang, 'cols.description'), type: 'text', maxWidth: 40 },
      ],
      rows: agency.map((e) => [
        e.expenseDate,
        t(lang, `agencyCat.${e.category}`, e.category),
        Number(e.amount || 0),
        labelStatus(lang, e.paymentStatus),
        labelStatus(lang, e.paymentMethod),
        e.description || '',
      ]),
      tableName: 'AgencyExpenses',
    });
  }
  if (full || ledger === 'vehicle-expenses') {
    writeTableSheet(ctx.wb, {
      ...ctx,
      lang,
      sheetName: t(lang, 'sheets.vehicleExpenses'),
      columns: [
        { header: t(lang, 'cols.date'), type: 'date' },
        { header: t(lang, 'cols.vehicle'), type: 'text' },
        { header: t(lang, 'cols.category'), type: 'text' },
        { header: t(lang, 'cols.amount'), type: 'currency' },
        { header: t(lang, 'cols.paymentStatus'), type: 'status' },
        { header: t(lang, 'cols.description'), type: 'text', maxWidth: 40 },
      ],
      rows: vehicles.map((e) => [
        e.expenseDate,
        vehicleLabel(e.car),
        t(lang, `vehicleCat.${e.category}`, e.category),
        Number(e.amount || 0),
        labelStatus(lang, e.paymentStatus),
        e.description || '',
      ]),
      tableName: 'VehicleExpenses',
    });
  }
  if (full || ledger === 'samsar-payments') {
    writeTableSheet(ctx.wb, {
      ...ctx,
      lang,
      sheetName: t(lang, 'sheets.samsarPayments'),
      columns: [
        { header: t(lang, 'cols.date'), type: 'date' },
        { header: t(lang, 'cols.samsar'), type: 'text' },
        { header: t(lang, 'cols.reservationId'), type: 'text' },
        { header: t(lang, 'cols.amount'), type: 'currency' },
        { header: t(lang, 'cols.paymentStatus'), type: 'status' },
        { header: t(lang, 'cols.paymentMethod'), type: 'status' },
        { header: t(lang, 'cols.notes'), type: 'text', maxWidth: 36 },
      ],
      rows: samsar.map((e) => [
        e.paymentDate,
        e.samsar?.fullName || '',
        e.booking?.reservationId || '',
        Number(e.amount || 0),
        labelStatus(lang, e.paymentStatus),
        labelStatus(lang, e.paymentMethod),
        e.notes || '',
      ]),
      tableName: 'SamsarPayments',
    });
  }
  return ctx;
};

export const buildInvoicesReport = ({ user, lang, invoices, from, to }) => {
  const range = from || to ? { from, to } : inferDateRange(invoices, ['invoiceDate', 'createdAt']);
  const ctx = baseCtx(user, lang, 'invoices', range.from, range.to);
  const total = money(invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0));
  const paid = money(invoices.filter((i) => i.paymentStatus === 'paid').reduce((s, i) => s + Number(i.totalAmount || 0), 0));
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.invoices'), value: invoices.length, type: 'integer' },
      { label: t(lang, 'kpi.invoiced'), value: total, type: 'currency' },
      { label: t(lang, 'kpi.paid'), value: paid, type: 'currency', tone: 'positive' },
      { label: t(lang, 'kpi.unpaid'), value: money(total - paid), type: 'currency', tone: 'warning' },
      { label: t(lang, 'kpi.average'), value: invoices.length ? money(total / invoices.length) : 0, type: 'currency' },
    ],
    extraLines: [`${t(lang, 'meta.currency')}: ${CURRENCY_CODE}`],
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.invoices'),
    columns: [
      { header: t(lang, 'cols.invoiceNumber'), type: 'text' },
      { header: t(lang, 'cols.invoiceDate'), type: 'date' },
      { header: t(lang, 'cols.dueDate'), type: 'date' },
      { header: t(lang, 'cols.customer'), type: 'text', maxWidth: 32 },
      { header: t(lang, 'cols.phone'), type: 'text' },
      { header: t(lang, 'cols.vehicle'), type: 'text' },
      { header: t(lang, 'cols.subtotal'), type: 'currency' },
      { header: t(lang, 'cols.tax'), type: 'currency' },
      { header: t(lang, 'cols.discount'), type: 'currency' },
      { header: t(lang, 'cols.total'), type: 'currency' },
      { header: t(lang, 'cols.paymentStatus'), type: 'status' },
      { header: t(lang, 'cols.paymentMethod'), type: 'status' },
      { header: t(lang, 'cols.source'), type: 'status' },
    ],
    rows: invoices.map((inv) => [
      inv.invoiceNumber || '',
      inv.invoiceDate,
      inv.dueDate,
      inv.customerName || '',
      inv.customerPhone || '',
      `${inv.vehicleBrand || ''} ${inv.vehicleModel || ''}`.trim(),
      Number(inv.subtotal || 0),
      Number(inv.taxAmount || 0),
      Number(inv.discountAmount || 0),
      Number(inv.totalAmount || 0),
      labelStatus(lang, inv.paymentStatus),
      labelStatus(lang, inv.paymentMethod),
      labelStatus(lang, inv.source),
    ]),
    tableName: 'Invoices',
  });
  return ctx;
};

export const buildContractsReport = ({ user, lang, contracts, from, to }) => {
  const range = from || to ? { from, to } : inferDateRange(contracts, ['createdAt']);
  const ctx = baseCtx(user, lang, 'contracts', range.from, range.to);
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.contracts'), value: contracts.length, type: 'integer' },
      { label: t(lang, 'kpi.revenue'), value: money(contracts.reduce((s, c) => s + Number(c.booking?.price || 0), 0)), type: 'currency' },
      { label: t(lang, 'kpi.completed'), value: contracts.filter((c) => c.status === 'final').length, type: 'integer', tone: 'positive' },
      { label: t(lang, 'kpi.pending'), value: contracts.filter((c) => c.status === 'draft').length, type: 'integer', tone: 'warning' },
      { label: t(lang, 'kpi.customers'), value: new Set(contracts.map((c) => c.booking?.customerName).filter(Boolean)).size, type: 'integer' },
    ],
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.contracts'),
    columns: [
      { header: t(lang, 'cols.contractNumber'), type: 'text' },
      { header: t(lang, 'cols.reservationId'), type: 'text' },
      { header: t(lang, 'cols.customer'), type: 'text', maxWidth: 32 },
      { header: t(lang, 'cols.phone'), type: 'text' },
      { header: t(lang, 'cols.vehicle'), type: 'text' },
      { header: t(lang, 'cols.pickupDate'), type: 'datetime' },
      { header: t(lang, 'cols.returnDate'), type: 'datetime' },
      { header: t(lang, 'cols.total'), type: 'currency' },
      { header: t(lang, 'cols.status'), type: 'status' },
      { header: t(lang, 'cols.created'), type: 'date' },
    ],
    rows: contracts.map((c) => [
      c.contractNumber || '',
      c.booking?.reservationId || '',
      c.booking?.customerName || '',
      c.booking?.customerPhone || '',
      vehicleLabel(c.booking?.car),
      c.booking?.pickupDate,
      c.booking?.returnDate,
      Number(c.booking?.price || 0),
      labelStatus(lang, c.status),
      c.createdAt,
    ]),
    tableName: 'Contracts',
  });
  return ctx;
};

export const buildMaintenanceReport = ({ user, lang, cars = [], records = [], from, to }) => {
  const range = from || to ? { from, to } : inferDateRange(records, ['scheduledDate', 'completedDate', 'createdAt']);
  const ctx = baseCtx(user, lang, 'maintenance', range.from, range.to);
  const cost = money(records.reduce((s, r) => s + Number(r.cost || 0), 0));
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    kpis: [
      { label: t(lang, 'kpi.vehicles'), value: cars.length, type: 'integer' },
      { label: t(lang, 'kpi.maintenance'), value: cars.filter((c) => c.status === 'maintenance').length, type: 'integer', tone: 'warning' },
      { label: t(lang, 'kpi.records'), value: records.length, type: 'integer' },
      { label: t(lang, 'kpi.cost'), value: cost, type: 'currency' },
      { label: t(lang, 'kpi.completed'), value: records.filter((r) => r.status === 'completed').length, type: 'integer', tone: 'positive' },
    ],
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.vehicles'),
    columns: [
      { header: t(lang, 'cols.vehicle'), type: 'text' },
      { header: t(lang, 'cols.registration'), type: 'text' },
      { header: t(lang, 'cols.availability'), type: 'status' },
      { header: t(lang, 'cols.mileage'), type: 'integer' },
      { header: t(lang, 'cols.nextService'), type: 'date' },
      { header: t(lang, 'cols.insuranceExpiry'), type: 'date' },
      { header: t(lang, 'cols.cost'), type: 'currency' },
    ],
    rows: cars.map((c) => [
      vehicleLabel(c),
      c.licensePlate || '',
      carAvailability(c, lang),
      Number(c.mileage || 0),
      c.nextServiceDate,
      c.insuranceExpiry,
      Number(c.totalMaintenanceCost || 0),
    ]),
    tableName: 'FleetStatus',
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.records'),
    columns: [
      { header: t(lang, 'cols.vehicle'), type: 'text' },
      { header: t(lang, 'cols.type'), type: 'text' },
      { header: t(lang, 'cols.title'), type: 'text', maxWidth: 32 },
      { header: t(lang, 'cols.status'), type: 'status' },
      { header: t(lang, 'cols.scheduled'), type: 'date' },
      { header: t(lang, 'cols.completedDate'), type: 'date' },
      { header: t(lang, 'cols.cost'), type: 'currency' },
      { header: t(lang, 'cols.vendor'), type: 'text' },
      { header: t(lang, 'cols.notes'), type: 'text', maxWidth: 36 },
    ],
    rows: records.map((r) => [
      vehicleLabel(r.car),
      t(lang, `maintType.${r.type}`, r.type),
      r.title || '',
      labelStatus(lang, r.status),
      r.scheduledDate,
      r.completedDate,
      Number(r.cost || 0),
      r.vendor || '',
      r.notes || '',
    ]),
    tableName: 'ServiceHistory',
  });
  return ctx;
};

export const buildVehicleStatsReport = ({ user, lang, car, bookings = [], records = [] }) => {
  const range = inferDateRange(bookings, ['pickupDate', 'returnDate']);
  const ctx = baseCtx(user, lang, 'vehicleStats', range.from, range.to);
  const nonCancelled = bookings.filter((b) => b.status !== 'cancelled');
  const revenue = money(nonCancelled.reduce((s, b) => s + Number(b.price || 0), 0));
  const days = nonCancelled.reduce((s, b) => s + rentalDays(b), 0);
  const maintCost = money(records.reduce((s, r) => s + Number(r.cost || 0), 0) + Number(car?.totalMaintenanceCost || 0));
  writeSummarySheet(ctx.wb, {
    ...ctx,
    lang,
    extraLines: [
      `${vehicleLabel(car)} · ${car?.licensePlate || car?.fleetId || ''}`.trim(),
      `${t(lang, 'meta.currency')}: ${CURRENCY_CODE}`,
    ],
    kpis: [
      { label: t(lang, 'kpi.bookings'), value: bookings.length, type: 'integer' },
      { label: t(lang, 'kpi.revenue'), value: revenue, type: 'currency' },
      { label: t(lang, 'kpi.rentalDays'), value: days, type: 'integer' },
      { label: t(lang, 'kpi.cost'), value: maintCost, type: 'currency', tone: 'warning' },
      { label: t(lang, 'kpi.profit'), value: money(Math.max(0, revenue - maintCost)), type: 'currency', tone: 'positive' },
    ],
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.reservations'),
    columns: reservationColumns(lang),
    rows: bookings.map((b) => reservationRow(b, lang)),
    tableName: 'VehicleReservations',
  });
  writeTableSheet(ctx.wb, {
    ...ctx,
    lang,
    sheetName: t(lang, 'sheets.records'),
    columns: [
      { header: t(lang, 'cols.type'), type: 'text' },
      { header: t(lang, 'cols.title'), type: 'text' },
      { header: t(lang, 'cols.status'), type: 'status' },
      { header: t(lang, 'cols.scheduled'), type: 'date' },
      { header: t(lang, 'cols.completedDate'), type: 'date' },
      { header: t(lang, 'cols.cost'), type: 'currency' },
      { header: t(lang, 'cols.vendor'), type: 'text' },
    ],
    rows: records.map((r) => [
      t(lang, `maintType.${r.type}`, r.type),
      r.title || '',
      labelStatus(lang, r.status),
      r.scheduledDate,
      r.completedDate,
      Number(r.cost || 0),
      r.vendor || '',
    ]),
    tableName: 'VehicleMaintenance',
  });
  return ctx;
};

export default {
  buildReservationsReport,
  buildCustomersReport,
  buildFleetReport,
  buildRevenueReport,
  buildAnalyticsReport,
  buildAccountingReport,
  buildInvoicesReport,
  buildContractsReport,
  buildMaintenanceReport,
  buildVehicleStatsReport,
};

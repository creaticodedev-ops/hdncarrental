import mongoose from 'mongoose';
import GuestCustomer from '../models/GuestCustomer.js';
import Booking from '../models/Booking.js';
import Contract from '../models/Contract.js';
import Invoice from '../models/Invoice.js';
import CustomerReview from '../models/CustomerReview.js';
import CustomerIssue from '../models/CustomerIssue.js';
import CustomerActivity from '../models/CustomerActivity.js';
import { bookingCrmKey, crmIdentityMatch } from '../utils/customerIdentity.js';
import { bookingRentalDays } from '../../shared/rentalDuration.js';
import {
  computeLoyaltyLevel,
  loyaltyBenefitsFor,
  computeSmartStatus,
  computeCustomerJourney,
  suggestFollowUps,
  isUpcomingBooking,
} from '../../shared/customerCrm.js';
import { refreshGuestStats } from './guestCrm.js';

const asObjectId = (id) => {
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

const idStr = (value) => String(value?._id || value || '');

export const ensureReferralCode = async (guest) => {
  if (guest.referralCode) return guest.referralCode;
  const seed = String(guest.phone || guest.email || guest._id || '')
    .replace(/\W/g, '')
    .slice(-6)
    .toUpperCase() || 'GUEST';
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  let code = `HDN-${seed}${rand}`.slice(0, 16);
  const clash = await GuestCustomer.findOne({
    owner: guest.owner,
    referralCode: code,
    _id: { $ne: guest._id },
  }).select('_id').lean();
  if (clash) code = `HDN-${rand}${Date.now().toString(36).slice(-4).toUpperCase()}`;
  guest.referralCode = code;
  return code;
};

export const syncLoyaltyAndFollowUps = async (guest, bookings = [], { hasReview = false, hasOpenIssue = false } = {}) => {
  const now = new Date();
  guest.loyaltyLevel = computeLoyaltyLevel({
    completedRentals: guest.completedReservations,
    totalSpent: guest.totalSpent,
    successfulReferrals: guest.successfulReferrals,
    status: guest.status,
  });
  await ensureReferralCode(guest);

  const existing = (guest.followUps || []).map((f) => ({
    kind: f.kind,
    booking: idStr(f.booking),
    status: f.status,
  }));
  const suggestions = suggestFollowUps({ bookings, existing, hasReview, now });
  for (const item of suggestions) {
    guest.followUps.push({
      kind: item.kind,
      booking: item.bookingId,
      status: 'due',
      dueAt: item.dueAt || now,
      createdAt: now,
    });
  }

  const due = (guest.followUps || []).filter((f) => f.status === 'due');
  const nextDue = due
    .map((f) => f.dueAt)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0] || guest.care?.nextFollowUpAt || null;
  guest.nextFollowUpAt = nextDue || null;

  const hasActiveRental = bookings.some((b) => b.status === 'active');
  const hasUpcoming = bookings.some((b) => isUpcomingBooking(b, now));
  const needsFollowUp = Boolean(
    due.length
    || (guest.care?.nextFollowUpAt && new Date(guest.care.nextFollowUpAt) <= now)
    || (hasActiveRental && !guest.care?.contacted),
  );

  return {
    loyaltyLevel: guest.loyaltyLevel,
    smartStatus: computeSmartStatus({
      hasOpenIssue,
      needsFollowUp,
      hasActiveRental,
      hasUpcoming,
      loyaltyLevel: guest.loyaltyLevel,
      completedRentals: guest.completedReservations,
      lastBookingAt: guest.lastBookingAt,
      now,
    }),
    flags: {
      hasActiveRental,
      hasUpcoming,
      needsFollowUp,
      hasOpenIssue,
      isNew: guest.loyaltyLevel === 'new' || guest.totalReservations <= 1,
      isReturning: guest.completedReservations >= 2,
      isVip: guest.loyaltyLevel === 'vip' || guest.status === 'vip',
      isInactive: !hasActiveRental && !hasUpcoming && computeSmartStatus({
        hasOpenIssue: false,
        needsFollowUp: false,
        hasActiveRental: false,
        hasUpcoming: false,
        loyaltyLevel: guest.loyaltyLevel,
        completedRentals: guest.completedReservations,
        lastBookingAt: guest.lastBookingAt,
        now,
      }) === 'inactive',
    },
  };
};

export const logCustomerActivity = async ({ owner, crmKey, type, booking = null, meta = {}, at = new Date() }) => {
  if (!owner || !crmKey || !type) return null;
  return CustomerActivity.create({
    owner,
    crmKey: String(crmKey).toLowerCase(),
    type,
    booking,
    meta,
    at,
  });
};

const vehicleLabel = (car) => {
  if (!car) return '';
  return `${car.brand || ''} ${car.model || ''}`.trim();
};

const buildKpis = (bookings) => {
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const completed = live.filter((b) => b.status === 'completed');
  const active = live.filter((b) => b.status === 'active');
  const daysList = live.map((b) => bookingRentalDays(b) || 0);
  const totalDays = daysList.reduce((s, d) => s + d, 0);
  const avgDays = completed.length
    ? Math.round((completed.reduce((s, b) => s + (bookingRentalDays(b) || 0), 0) / completed.length) * 10) / 10
    : 0;
  const byCar = new Map();
  for (const b of live) {
    const car = b.car;
    const key = idStr(car) || vehicleLabel(car) || 'unknown';
    const cur = byCar.get(key) || { count: 0, label: vehicleLabel(car) || '—', car };
    cur.count += 1;
    byCar.set(key, cur);
  }
  const favorites = Array.from(byCar.values()).sort((a, b) => b.count - a.count).slice(0, 3);
  const lastRental = [...completed, ...live].sort(
    (a, b) => new Date(b.pickupDate || 0) - new Date(a.pickupDate || 0),
  )[0] || null;
  const revenue = live
    .filter((b) => ['confirmed', 'ready_for_pickup', 'active', 'completed'].includes(b.status))
    .reduce((s, b) => s + (Number(b.price) || 0), 0);

  return {
    totalReservations: bookings.length,
    completedRentals: completed.length,
    activeRentals: active.length,
    cancelledReservations: bookings.filter((b) => b.status === 'cancelled').length,
    totalRevenue: revenue,
    totalRentalDays: totalDays,
    averageRentalDays: avgDays,
    lastRental: lastRental
      ? {
          _id: lastRental._id,
          reservationId: lastRental.reservationId,
          pickupDate: lastRental.pickupDate,
          returnDate: lastRental.returnDate,
          vehicle: vehicleLabel(lastRental.car),
          status: lastRental.status,
          price: lastRental.price,
        }
      : null,
    favoriteVehicles: favorites.map((f) => ({ label: f.label, count: f.count })),
  };
};

const buildPayments = (bookings) => {
  const rows = [];
  for (const b of bookings) {
    const ledger = Array.isArray(b.paymentLedger) ? b.paymentLedger : [];
    if (ledger.length) {
      for (const p of ledger) {
        rows.push({
          bookingId: b._id,
          reservationId: b.reservationId,
          amount: p.amount,
          method: p.method,
          paidAt: p.paidAt,
          note: p.note || '',
          paymentStatus: b.paymentStatus,
        });
      }
    } else if (b.paymentStatus && b.paymentStatus !== 'pending') {
      rows.push({
        bookingId: b._id,
        reservationId: b.reservationId,
        amount: b.price,
        method: b.paymentStatus,
        paidAt: b.updatedAt || b.createdAt,
        note: '',
        paymentStatus: b.paymentStatus,
      });
    }
  }
  rows.sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));
  return rows;
};

const buildTimeline = ({ bookings, contracts, activities, reviews, issues }) => {
  const events = [];
  const push = (type, at, extra = {}) => {
    if (!at) return;
    events.push({ type, at, ...extra });
  };

  for (const b of bookings) {
    push('reservation_created', b.createdAt, { bookingId: b._id, reservationId: b.reservationId });
    if (['confirmed', 'ready_for_pickup', 'active', 'completed'].includes(b.status)) {
      push('reservation_confirmed', b.updatedAt || b.createdAt, {
        bookingId: b._id,
        reservationId: b.reservationId,
      });
    }
    if (['active', 'completed'].includes(b.status) || b.status === 'ready_for_pickup') {
      push('vehicle_picked_up', b.pickupDate, { bookingId: b._id, reservationId: b.reservationId });
    }
    if (b.status === 'completed') {
      push('vehicle_returned', b.returnDate || b.updatedAt, {
        bookingId: b._id,
        reservationId: b.reservationId,
      });
    }
    if (b.paymentStatus === 'paid') {
      push('payment_completed', b.updatedAt, { bookingId: b._id, reservationId: b.reservationId });
    }
    for (const ext of b.extensionHistory || []) {
      push('extension_created', ext.extendedAt, {
        bookingId: b._id,
        reservationId: b.reservationId,
        meta: { deltaDays: ext.deltaDays },
      });
    }
  }

  for (const c of contracts) {
    push('contract_generated', c.createdAt, {
      bookingId: c.booking,
      meta: { contractNumber: c.contractNumber },
    });
    if (c.signedAt || c.signedPdfUrl) {
      push('contract_signed', c.signedAt || c.updatedAt, {
        bookingId: c.booking,
        meta: { contractNumber: c.contractNumber },
      });
    }
  }

  for (const r of reviews) {
    push('review_received', r.createdAt, {
      bookingId: r.booking,
      meta: { rating: r.rating, complaintFlag: r.complaintFlag },
    });
  }

  for (const issue of issues) {
    push('complaint_created', issue.createdAt, {
      bookingId: issue.booking,
      meta: { status: issue.status },
    });
    if (issue.status === 'resolved') {
      push('complaint_resolved', issue.resolvedAt || issue.updatedAt, { bookingId: issue.booking });
    }
  }

  for (const a of activities) {
    events.push({
      type: a.type,
      at: a.at,
      bookingId: a.booking,
      meta: a.meta || {},
    });
  }

  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  return events.slice(0, 80);
};

const presentBookingRow = (b) => ({
  _id: b._id,
  reservationId: b.reservationId,
  status: b.status,
  price: b.price,
  pickupDate: b.pickupDate,
  returnDate: b.returnDate,
  pickupLocation: b.pickupLocation,
  returnLocation: b.returnLocation,
  paymentStatus: b.paymentStatus,
  days: bookingRentalDays(b),
  car: b.car
    ? { _id: b.car._id, brand: b.car.brand, model: b.car.model, image: b.car.image, licensePlate: b.car.licensePlate }
    : null,
  signatureComplete: Boolean(b.completion?.signatureComplete) || b.completion?.requestStatus === 'signed',
  channel: b.channel,
});

export const loadCustomerBookings = async (ownerId, crmKey) => {
  return Booking.find({ owner: asObjectId(ownerId), ...crmIdentityMatch(crmKey) })
    .populate('car', 'brand model image licensePlate')
    .sort({ createdAt: -1 })
    .lean();
};

export const presentCustomerListRow = (guest, extra = {}) => {
  const now = extra.now || new Date();
  const loyaltyLevel = extra.loyaltyLevel || guest.loyaltyLevel || computeLoyaltyLevel({
    completedRentals: guest.completedReservations,
    totalSpent: guest.totalSpent,
    successfulReferrals: guest.successfulReferrals,
    status: guest.status,
  });
  const flags = extra.flags || {};
  const smartStatus = extra.smartStatus || computeSmartStatus({
    hasOpenIssue: Boolean(flags.hasOpenIssue),
    needsFollowUp: Boolean(flags.needsFollowUp),
    hasActiveRental: Boolean(flags.hasActiveRental),
    hasUpcoming: Boolean(flags.hasUpcoming),
    loyaltyLevel,
    completedRentals: guest.completedReservations,
    lastBookingAt: guest.lastBookingAt,
    now,
  });
  return {
    ...guest,
    loyaltyLevel,
    smartStatus,
    flags: {
      hasActiveRental: Boolean(flags.hasActiveRental),
      hasUpcoming: Boolean(flags.hasUpcoming),
      needsFollowUp: Boolean(flags.needsFollowUp),
      hasOpenIssue: Boolean(flags.hasOpenIssue),
      isNew: loyaltyLevel === 'new' || guest.totalReservations <= 1,
      isReturning: guest.completedReservations >= 2,
      isVip: loyaltyLevel === 'vip' || guest.status === 'vip',
      isInactive: smartStatus === 'inactive',
    },
    openIssueCount: extra.openIssueCount || 0,
  };
};

export const decorateCustomerList = async (ownerId, customers) => {
  if (!customers.length) return [];
  const now = new Date();
  const oid = asObjectId(ownerId);
  const keys = customers.map((c) => c.email);

  const [liveBookings, openIssues] = await Promise.all([
    Booking.find({
      owner: oid,
      status: { $in: ['pending', 'confirmed', 'ready_for_pickup', 'active'] },
    })
      .select('crmKey customerEmail status pickupDate returnDate')
      .lean(),
    CustomerIssue.find({ owner: oid, crmKey: { $in: keys }, status: { $ne: 'resolved' } })
      .select('crmKey')
      .lean(),
  ]);

  const byKey = new Map();
  for (const b of liveBookings) {
    const key = bookingCrmKey(b);
    if (!key) continue;
    const cur = byKey.get(key) || { hasActiveRental: false, hasUpcoming: false };
    if (b.status === 'active') cur.hasActiveRental = true;
    if (isUpcomingBooking(b, now)) cur.hasUpcoming = true;
    byKey.set(key, cur);
  }
  const issueCount = new Map();
  for (const issue of openIssues) {
    issueCount.set(issue.crmKey, (issueCount.get(issue.crmKey) || 0) + 1);
  }

  return customers.map((guest) => {
    const live = byKey.get(guest.email) || {};
    const openIssueCount = issueCount.get(guest.email) || 0;
    const dueFollowUps = (guest.followUps || []).filter((f) => f.status === 'due').length;
    const needsFollowUp = Boolean(
      dueFollowUps
      || (guest.nextFollowUpAt && new Date(guest.nextFollowUpAt) <= now)
      || (guest.care?.nextFollowUpAt && new Date(guest.care.nextFollowUpAt) <= now)
      || (live.hasActiveRental && !guest.care?.contacted),
    );
    const loyaltyLevel = computeLoyaltyLevel({
      completedRentals: guest.completedReservations,
      totalSpent: guest.totalSpent,
      successfulReferrals: guest.successfulReferrals,
      status: guest.status,
    });
    return presentCustomerListRow(guest, {
      now,
      loyaltyLevel,
      openIssueCount,
      flags: {
        hasActiveRental: live.hasActiveRental,
        hasUpcoming: live.hasUpcoming,
        needsFollowUp,
        hasOpenIssue: openIssueCount > 0,
      },
    });
  });
};

export const matchesCrmListFilter = (row, filter) => {
  switch (filter) {
    case 'new':
      return row.flags?.isNew;
    case 'returning':
      return row.flags?.isReturning;
    case 'vip':
      return row.flags?.isVip;
    case 'active_rental':
      return row.flags?.hasActiveRental;
    case 'needs_followup':
      return row.flags?.needsFollowUp;
    case 'inactive':
      return row.flags?.isInactive;
    case 'complaints':
      return row.flags?.hasOpenIssue;
    case 'upcoming':
      return row.flags?.hasUpcoming;
    default:
      return true;
  }
};

export const buildCustomer360 = async (ownerId, crmKey) => {
  const normalized = String(crmKey || '').trim().toLowerCase();
  await refreshGuestStats(ownerId, normalized);
  const guest = await GuestCustomer.findOne({ owner: asObjectId(ownerId), email: normalized });
  if (!guest) return null;

  const bookings = await loadCustomerBookings(ownerId, normalized);
  const bookingIds = bookings.map((b) => b._id);

  const [contracts, invoices, reviews, issues, activities, referred] = await Promise.all([
    bookingIds.length
      ? Contract.find({ owner: asObjectId(ownerId), booking: { $in: bookingIds } })
        .select('contractNumber status pdfUrl signedPdfUrl signedAt booking createdAt updatedAt')
        .sort({ createdAt: -1 })
        .lean()
      : [],
    bookingIds.length
      ? Invoice.find({ owner: asObjectId(ownerId), booking: { $in: bookingIds } })
        .select('invoiceNumber totalAmount paymentStatus invoiceDate pdfUrl booking createdAt')
        .sort({ createdAt: -1 })
        .lean()
      : [],
    CustomerReview.find({ owner: asObjectId(ownerId), crmKey: normalized }).sort({ createdAt: -1 }).lean(),
    CustomerIssue.find({ owner: asObjectId(ownerId), crmKey: normalized }).sort({ createdAt: -1 }).lean(),
    CustomerActivity.find({ owner: asObjectId(ownerId), crmKey: normalized }).sort({ at: -1 }).limit(80).lean(),
    GuestCustomer.find({ owner: asObjectId(ownerId), referredByEmail: normalized })
      .select('name email phone successfulReferrals loyaltyLevel createdAt lastBookingAt totalReservations')
      .lean(),
  ]);

  const openIssues = issues.filter((i) => i.status !== 'resolved');
  const meta = await syncLoyaltyAndFollowUps(guest, bookings, {
    hasReview: reviews.length > 0,
    hasOpenIssue: openIssues.length > 0,
  });
  await guest.save();

  const kpis = buildKpis(bookings);
  const journey = computeCustomerJourney({
    bookings,
    hasReview: reviews.length > 0,
    loyaltyLevel: guest.loyaltyLevel,
  });
  const activeRental = bookings.find((b) => b.status === 'active') || null;
  const dueFollowUps = (guest.followUps || []).filter((f) => f.status === 'due');

  let referredBy = null;
  if (guest.referredByEmail) {
    referredBy = await GuestCustomer.findOne({ owner: asObjectId(ownerId), email: guest.referredByEmail })
      .select('name email phone referralCode')
      .lean();
  }

  const customer = guest.toObject();
  return {
    customer: {
      ...customer,
      loyaltyLevel: guest.loyaltyLevel,
      loyaltyBenefits: loyaltyBenefitsFor(guest.loyaltyLevel),
      smartStatus: meta.smartStatus,
      flags: meta.flags,
    },
    kpis,
    journey,
    care: {
      activeRental: activeRental ? presentBookingRow(activeRental) : null,
      contacted: Boolean(guest.care?.contacted),
      satisfaction: guest.care?.satisfaction || '',
      notes: guest.care?.notes || '',
      lastContactAt: guest.care?.lastContactAt || guest.lastContactAt || null,
      nextFollowUpAt: guest.care?.nextFollowUpAt || guest.nextFollowUpAt || null,
      returnStatus: activeRental
        ? (new Date(activeRental.returnDate) < new Date() ? 'overdue' : 'on_rent')
        : (kpis.lastRental?.status === 'completed' ? 'returned' : 'none'),
      reportedIssue: openIssues[0]?.reportedIssue || '',
      issueStatus: openIssues[0]?.status || '',
    },
    followUps: dueFollowUps.map((f) => ({
      _id: f._id,
      kind: f.kind,
      booking: f.booking,
      status: f.status,
      dueAt: f.dueAt,
    })),
    bookings: bookings.map(presentBookingRow),
    contracts,
    invoices,
    payments: buildPayments(bookings),
    reviews,
    issues,
    referrals: {
      code: guest.referralCode,
      referredBy,
      referredByCode: guest.referredByCode || '',
      successfulReferrals: guest.successfulReferrals || referred.length,
      referred,
      benefit: guest.referralBenefit || '',
    },
    timeline: buildTimeline({ bookings, contracts, activities, reviews, issues }),
  };
};

export default {
  buildCustomer360,
  decorateCustomerList,
  matchesCrmListFilter,
  logCustomerActivity,
  ensureReferralCode,
  syncLoyaltyAndFollowUps,
};

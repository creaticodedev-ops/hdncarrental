/**
 * Booking contract extension (Phase D).
 * Extends returnDate, recalculates totals via pricing engine, keeps history.
 */
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import Contract from '../models/Contract.js';
import ExportTemplate from '../models/ExportTemplate.js';
import { calculateBookingPrice } from './pricingEngine.js';
import { isCarAvailableForDates } from './availabilityService.js';
import { assertBookingRules, getBookingSettings } from './bookingSettingsService.js';
import { buildPricingSnapshot } from './promotionService.js';
import { calcRentalDays } from '../utils/helpers.js';
import { logAudit } from '../utils/adminOps.js';
import {
  archiveRevision,
  buildContractSourceData,
  bumpDocumentVersion,
  clearContentLock,
  cloneSectionsFromTemplate,
  isContentLocked,
  persistPdfFromInstance,
} from './documentInstanceService.js';
import { getDefaultContractTemplate } from '../utils/resolveExportTemplate.js';

export const EXTENDABLE_STATUSES = ['confirmed', 'ready_for_pickup', 'active'];

const toMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

const parseReturnDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const loadOwnedBooking = async (ownerId, bookingId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    const err = new Error('Invalid booking ID');
    err.status = 400;
    throw err;
  }
  const booking = await Booking.findById(bookingId).populate('car');
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  if (String(booking.owner) !== String(ownerId)) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
  if (!booking.car) {
    const err = new Error('Associated vehicle no longer exists');
    err.status = 400;
    throw err;
  }
  return booking;
};

const buildExtendedBreakdown = (booking, newReturnDate) => {
  const car = booking.car;
  const pricePerDay = Number(booking.priceBreakdown?.pricePerDay || car.pricePerDay || 0);
  const pickupFee = Number(booking.priceBreakdown?.pickupDeliveryFee || 0);
  const dropoffFee = Number(booking.priceBreakdown?.dropoffDeliveryFee || 0);

  const frozenDiscounts = (booking.priceBreakdown?.discounts || []).map((d) => ({
    code: d.code || '',
    label: d.label || '',
    amount: Number(d.amount) || 0,
    promotionId: d.promotionId || null,
    discountType: d.discountType || '',
    discountValue: d.discountValue ?? null,
  }));

  const perDayExtra = Number(booking.pricingSnapshot?.extras?.extraDriverFeePerDay || 0);
  const newDays = calcRentalDays(booking.pickupDate, newReturnDate);
  let extraDriverFee = Number(
    booking.priceBreakdown?.extraDriverFee ?? booking.pricingSnapshot?.extraDriverFee ?? 0,
  ) || 0;
  if (perDayExtra > 0 && Boolean(booking.secondDriver?.enabled || booking.pricingSnapshot?.extras?.extraDriverEnabled)) {
    extraDriverFee = toMoney(perDayExtra * newDays);
  }

  const priceBreakdown = calculateBookingPrice({
    pricePerDay,
    pickupDate: booking.pickupDate,
    returnDate: newReturnDate,
    pickupDeliveryFee: pickupFee,
    dropoffDeliveryFee: dropoffFee,
    extraDriverFee,
    discounts: frozenDiscounts,
  });

  priceBreakdown.discounts = frozenDiscounts.map((d, i) => ({
    ...(priceBreakdown.discounts[i] || { code: d.code, label: d.label, amount: d.amount }),
    promotionId: d.promotionId,
    discountType: d.discountType,
    discountValue: d.discountValue,
  }));

  return priceBreakdown;
};

/**
 * Preview extension totals + availability (no mutation).
 */
export const previewBookingExtension = async (ownerId, bookingId, newReturnDateInput) => {
  const booking = await loadOwnedBooking(ownerId, bookingId);

  if (!EXTENDABLE_STATUSES.includes(booking.status)) {
    const err = new Error('Only confirmed, ready-for-pickup, or active reservations can be extended');
    err.status = 400;
    throw err;
  }

  const newReturnDate = parseReturnDate(newReturnDateInput);
  if (!newReturnDate) {
    const err = new Error('Valid new return date is required');
    err.status = 400;
    throw err;
  }

  const previousReturn = new Date(booking.returnDate);
  if (newReturnDate.getTime() <= previousReturn.getTime()) {
    const err = new Error('New return date must be after the current return date');
    err.status = 400;
    throw err;
  }

  const settings = await getBookingSettings(booking.owner);
  const rules = assertBookingRules(settings, booking.pickupDate, newReturnDate);
  if (!rules.ok) {
    const err = new Error(rules.message || 'Booking rules not satisfied');
    err.status = 400;
    err.code = rules.code;
    throw err;
  }

  const available = await isCarAvailableForDates(
    booking.car._id,
    booking.pickupDate,
    newReturnDate,
    booking._id,
  );
  if (!available) {
    const err = new Error('Vehicle is not available for the extended dates');
    err.status = 409;
    err.code = 'AVAILABILITY_CONFLICT';
    throw err;
  }

  const previousDays = calcRentalDays(booking.pickupDate, previousReturn);
  const priceBreakdown = buildExtendedBreakdown(booking, newReturnDate);
  const previousPrice = toMoney(booking.price);
  const newPrice = toMoney(priceBreakdown.total);

  return {
    bookingId: booking._id,
    reservationId: booking.reservationId,
    status: booking.status,
    pickupDate: booking.pickupDate,
    previousReturnDate: previousReturn,
    newReturnDate,
    previousDays,
    newDays: priceBreakdown.days,
    deltaDays: priceBreakdown.days - previousDays,
    previousPrice,
    newPrice,
    deltaAmount: toMoney(newPrice - previousPrice),
    priceBreakdown,
    available: true,
    extensionHistory: booking.extensionHistory || [],
  };
};

const regenerateUnlockedContract = async (booking, actor) => {
  const doc = await Contract.findOne({ booking: booking._id, owner: booking.owner }).sort({
    createdAt: -1,
  });
  if (!doc) {
    return { regenerated: false, reason: 'no_contract' };
  }
  if (isContentLocked(doc)) {
    return { regenerated: false, reason: 'content_locked', contractId: doc._id };
  }

  let template = null;
  if (doc.template) {
    template = await ExportTemplate.findById(doc.template).lean();
  }
  if (!template) {
    template = await getDefaultContractTemplate(booking.owner);
  }

  const bookingLean = booking.toObject ? booking.toObject() : booking;
  if (!bookingLean.car || typeof bookingLean.car === 'string') {
    bookingLean.car = await Car.findById(booking.car._id || booking.car).lean();
  }

  doc.sections = cloneSectionsFromTemplate(template || {});
  doc.sourceData = buildContractSourceData({
    booking: bookingLean,
    owner: actor,
    template: template || {},
    contractNumber: doc.contractNumber,
    includeCompanyStamp: doc.includeCompanyStamp !== false,
  });
  doc.template = template?._id || doc.template;
  clearContentLock(doc);

  const pdf = await persistPdfFromInstance({
    sections: doc.sections,
    sourceData: doc.sourceData,
    owner: actor,
    documentTitle: `Contract ${doc.contractNumber}`,
    filePrefix: `contract-${doc.contractNumber}`,
  });

  doc.renderedHtml = pdf.renderedHtml;
  doc.pdfPath = pdf.filePath;
  doc.pdfUrl = pdf.pdfUrl;
  bumpDocumentVersion(doc);
  doc.updatedBy = actor?._id || actor;
  await doc.save();

  await archiveRevision({
    owner: booking.owner,
    documentType: 'contract',
    document: doc,
    user: actor,
    note: 'regenerate',
  });

  return { regenerated: true, contractId: doc._id, version: doc.version };
};

/**
 * Apply extension: history + returnDate + price (+ optional contract regen).
 */
export const applyBookingExtension = async (
  ownerId,
  bookingId,
  {
    newReturnDate: newReturnDateInput,
    notes = '',
    regenerateContract = true,
    actor = null,
  } = {},
) => {
  const preview = await previewBookingExtension(ownerId, bookingId, newReturnDateInput);
  const booking = await loadOwnedBooking(ownerId, bookingId);

  const historyEntry = {
    previousReturnDate: preview.previousReturnDate,
    newReturnDate: preview.newReturnDate,
    previousPrice: preview.previousPrice,
    newPrice: preview.newPrice,
    previousDays: preview.previousDays,
    newDays: preview.newDays,
    deltaDays: preview.deltaDays,
    deltaAmount: preview.deltaAmount,
    notes: String(notes || '').trim().slice(0, 2000),
    contractRegenerated: false,
    contractSkippedReason: '',
    extendedBy: actor?._id || ownerId,
    extendedAt: new Date(),
  };

  booking.extensionHistory = booking.extensionHistory || [];
  booking.extensionHistory.push(historyEntry);
  booking.returnDate = preview.newReturnDate;
  booking.priceBreakdown = preview.priceBreakdown;
  booking.price = preview.newPrice;
  booking.pricingSnapshot = buildPricingSnapshot({
    priceBreakdown: preview.priceBreakdown,
    discounts: preview.priceBreakdown.discounts || [],
    extras: {
      extraDriverEnabled: Boolean(
        booking.secondDriver?.enabled || booking.pricingSnapshot?.extras?.extraDriverEnabled,
      ),
      extraDriverFee: preview.priceBreakdown.extraDriverFee,
      extraDriverFeePerDay: booking.pricingSnapshot?.extras?.extraDriverFeePerDay || 0,
    },
    cancellation: booking.pricingSnapshot?.cancellation || {},
    mileage: booking.pricingSnapshot?.mileage || {},
    timezone: booking.pricingSnapshot?.timezone || 'Africa/Casablanca',
  });

  await booking.save();

  let contractResult = { regenerated: false, reason: 'skipped' };
  if (regenerateContract) {
    try {
      contractResult = await regenerateUnlockedContract(booking, actor || { _id: ownerId });
    } catch (error) {
      console.error('[extension] contract regenerate', error.message);
      contractResult = { regenerated: false, reason: error.message || 'regenerate_failed' };
    }
  } else {
    contractResult = { regenerated: false, reason: 'not_requested' };
  }

  const last = booking.extensionHistory[booking.extensionHistory.length - 1];
  last.contractRegenerated = Boolean(contractResult.regenerated);
  last.contractSkippedReason = contractResult.regenerated ? '' : (contractResult.reason || '');
  booking.markModified('extensionHistory');
  await booking.save();

  try {
    await logAudit({
      owner: ownerId,
      actor: actor?._id || ownerId,
      action: 'booking.extended',
      entityType: 'Booking',
      entityId: booking._id,
      details: `Extended ${booking.reservationId}: +${preview.deltaDays} day(s), delta ${preview.deltaAmount}`,
    });
  } catch {
    /* ignore */
  }

  const populated = await Booking.findById(booking._id)
    .populate('car')
    .lean();

  return {
    booking: populated,
    preview,
    extension: last,
    contract: contractResult,
  };
};

export const listBookingExtensions = async (ownerId, bookingId) => {
  const booking = await loadOwnedBooking(ownerId, bookingId);
  return {
    bookingId: booking._id,
    reservationId: booking.reservationId,
    returnDate: booking.returnDate,
    price: booking.price,
    extensionHistory: booking.extensionHistory || [],
  };
};

export default {
  EXTENDABLE_STATUSES,
  previewBookingExtension,
  applyBookingExtension,
  listBookingExtensions,
};

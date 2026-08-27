/**
 * Booking contract extension (Phase D).
 * Extends returnDate, recalculates totals via pricing engine, keeps history.
 */
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import Contract from '../models/Contract.js';
import ExportTemplate from '../models/ExportTemplate.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import { calculateBookingPrice } from './pricingEngine.js';
import { isCarAvailableForDates } from './availabilityService.js';
import { assertBookingRules, getBookingSettings } from './bookingSettingsService.js';
import { buildPricingSnapshot } from './promotionService.js';
import { calcRentalDays } from '../utils/helpers.js';
import { parseAgencyDateTime } from '../utils/moroccoTime.js';
import { logAudit } from '../utils/adminOps.js';
import {
  archiveRevision,
  buildContractSourceData,
  buildInvoiceSourceData,
  buildTemplateSnapshot,
  bumpDocumentVersion,
  cloneSectionsFromTemplate,
  isContentLocked,
  mergeSignatureFields,
  persistPdfFromInstance,
  versionedAssetUrl,
} from './documentInstanceService.js';
import { getDefaultContractTemplate, getDefaultInvoiceTemplate } from '../utils/resolveExportTemplate.js';
import { generateContractPdf } from './templatePdfExport.js';

export const EXTENDABLE_STATUSES = ['confirmed', 'ready_for_pickup', 'active'];

/** Booking-derived fields that an extension must refresh on the contract. */
export const EXTENSION_CONTRACT_SOURCE_KEYS = [
  'pickup_date',
  'return_date',
  'rental_days',
  'rental_price',
  'total_price',
  'price_per_day',
  'pickup_fee',
  'dropoff_fee',
  'discount_total',
  'payment_status',
  'booking_status',
  'pickupDate',
  'returnDate',
  'rentalDays',
  'rentalPrice',
  'totalPrice',
  'pricePerDay',
  'paymentStatus',
  'bookingStatus',
  'generated_date',
  'generated_datetime',
];

const applyCommercialFields = (existing = {}, fresh = {}) => {
  const next = { ...(existing || {}) };
  for (const key of EXTENSION_CONTRACT_SOURCE_KEYS) {
    if (fresh[key] !== undefined) next[key] = fresh[key];
  }
  next._meta = { ...(existing?._meta || {}), ...(fresh?._meta || {}) };
  return next;
};

/**
 * Rebuild contract variables after an extension.
 * Unlocked docs take a full booking refresh; locked docs keep custom fields
 * and only overlay dates/price/days + signatures.
 */
export const mergeExtensionContractSource = (existing = {}, fresh = {}, { locked = false } = {}) => {
  const base = locked
    ? applyCommercialFields(existing, fresh)
    : { ...fresh, _meta: { ...(existing?._meta || {}), ...(fresh?._meta || {}) } };
  return mergeSignatureFields(mergeSignatureFields(base, existing), fresh);
};

const toMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

const parseReturnDate = (value) => {
  const d = parseAgencyDateTime(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

/**
 * Keep completion + paymentStatus consistent with the new rental total.
 * Extra days that are not yet collected flip a fully-paid booking back to pending.
 */
export const applyExtensionFinancials = (booking, newPrice) => {
  const price = toMoney(newPrice);
  if (!booking.completion) booking.completion = {};
  booking.completion.amountDue = price;
  const paid = toMoney(booking.completion.amountPaid);
  if (paid >= price && price > 0) {
    booking.paymentStatus = 'paid';
    booking.completion.paymentComplete = true;
  } else if (paid < price && booking.paymentStatus === 'paid') {
    booking.paymentStatus = 'pending';
    booking.completion.paymentComplete = false;
  }
  return {
    amountDue: price,
    amountPaid: paid,
    paymentStatus: booking.paymentStatus,
  };
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

export const buildExtendedBreakdown = (booking, newReturnDate) => {
  const car = booking.car;
  const pricePerDay = Number(booking.priceBreakdown?.pricePerDay || car.pricePerDay || 0);
  const pickupFee = Number(booking.priceBreakdown?.pickupDeliveryFee || 0);
  const dropoffFee = Number(booking.priceBreakdown?.dropoffDeliveryFee || 0);

  const previousDays = calcRentalDays(booking.pickupDate, booking.returnDate);
  const newDays = calcRentalDays(booking.pickupDate, newReturnDate);
  const rentalPrice = toMoney(pricePerDay * newDays);

  const frozenDiscounts = (booking.priceBreakdown?.discounts || []).map((d) => {
    const type = String(d.discountType || '').toLowerCase();
    let amount = Number(d.amount) || 0;
    if ((type === 'percentage' || type === 'percent') && d.discountValue != null) {
      amount = toMoney(rentalPrice * (Number(d.discountValue) || 0) / 100);
    }
    return {
      code: d.code || '',
      label: d.label || '',
      amount,
      promotionId: d.promotionId || null,
      discountType: d.discountType || '',
      discountValue: d.discountValue ?? null,
    };
  });

  const perDayExtra = Number(booking.pricingSnapshot?.extras?.extraDriverFeePerDay || 0);
  let extraDriverFee = Number(
    booking.priceBreakdown?.extraDriverFee ?? booking.pricingSnapshot?.extraDriverFee ?? 0,
  ) || 0;
  const extraEnabled = Boolean(
    booking.secondDriver?.enabled || booking.pricingSnapshot?.extras?.extraDriverEnabled,
  );
  if (extraEnabled) {
    if (perDayExtra > 0) {
      extraDriverFee = toMoney(perDayExtra * newDays);
    } else if (extraDriverFee > 0 && previousDays > 0) {
      extraDriverFee = toMoney((extraDriverFee / previousDays) * newDays);
    }
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
  const rules = assertBookingRules(settings, booking.pickupDate, newReturnDate, {
    existingRental: true,
  });
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

const nextContractNumber = async (ownerId) => {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `CTR-${year}-`;
  const last = await Contract.findOne({
    owner: ownerId,
    contractNumber: { $regex: `^${prefix}` },
  })
    .sort({ contractNumber: -1 })
    .select('contractNumber')
    .lean();
  let seq = 1;
  if (last?.contractNumber) {
    const parts = last.contractNumber.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

const withVersionedPdf = (url, version, updatedAt) =>
  versionedAssetUrl(url, version, updatedAt || Date.now());

/**
 * Always refresh the contract after a successful extension.
 * Locked documents keep custom section HTML and non-commercial fields;
 * signatures from the booking/completion flow are preserved.
 */
const regenerateContractAfterExtension = async (booking, actor) => {
  const ownerId = booking.owner;
  let doc = await Contract.findOne({ booking: booking._id, owner: ownerId }).sort({
    createdAt: -1,
  });

  let template = null;
  if (doc?.template) {
    template = await ExportTemplate.findById(doc.template).lean();
  }
  if (!template) {
    template = await getDefaultContractTemplate(ownerId);
  }
  if (!template && !doc) {
    return { regenerated: false, reason: 'no_template' };
  }

  const bookingLean = await bookingLeanWithCar(booking);
  const actorDoc = actor || { _id: ownerId };

  if (!doc) {
    const contractNumber = await nextContractNumber(ownerId);
    const generated = await generateContractPdf({
      template,
      booking: bookingLean,
      contractNumber,
      owner: actorDoc,
      includeCompanyStamp: true,
    });
    doc = await Contract.create({
      owner: ownerId,
      booking: booking._id,
      template: template._id,
      contractNumber,
      renderedHtml: generated.renderedHtml || '',
      pdfUrl: generated.pdfUrl,
      pdfPath: generated.filePath,
      sourceData: {
        ...(generated.variables || {}),
        _meta: {
          contractNumber,
          includeCompanyStamp: true,
          bookingId: String(booking._id),
          reservationId: booking.reservationId || '',
          source: 'extension',
        },
      },
      sections: cloneSectionsFromTemplate(template),
      templateSnapshot: buildTemplateSnapshot(template),
      generatedBy: actorDoc._id || actorDoc,
      createdBy: actorDoc._id || actorDoc,
      updatedBy: actorDoc._id || actorDoc,
      includeCompanyStamp: true,
      contentLocked: false,
      status: 'final',
      version: 1,
    });
    await archiveRevision({
      owner: ownerId,
      documentType: 'contract',
      document: doc,
      user: actorDoc,
      note: 'generate',
    });
    return {
      regenerated: true,
      created: true,
      contractId: doc._id,
      version: doc.version,
      pdfUrl: withVersionedPdf(doc.pdfUrl, doc.version, doc.updatedAt),
    };
  }

  const locked = isContentLocked(doc);
  const fresh = buildContractSourceData({
    booking: bookingLean,
    owner: actorDoc,
    template: template || {},
    contractNumber: doc.contractNumber,
    includeCompanyStamp: doc.includeCompanyStamp !== false,
  });
  doc.sourceData = mergeExtensionContractSource(doc.sourceData || {}, fresh, { locked });
  if (!locked) {
    doc.sections = cloneSectionsFromTemplate(template || doc.sections || {});
    if (template?._id) doc.template = template._id;
  }

  const pdf = await persistPdfFromInstance({
    sections: doc.sections,
    sourceData: doc.sourceData,
    owner: actorDoc,
    documentTitle: `Contract ${doc.contractNumber}`,
    filePrefix: `contract-${doc.contractNumber}`,
  });

  doc.renderedHtml = pdf.renderedHtml;
  doc.pdfPath = pdf.filePath;
  doc.pdfUrl = pdf.pdfUrl;
  bumpDocumentVersion(doc);
  doc.updatedBy = actorDoc._id || actorDoc;
  await doc.save();

  await archiveRevision({
    owner: ownerId,
    documentType: 'contract',
    document: doc,
    user: actorDoc,
    note: 'regenerate',
  });

  return {
    regenerated: true,
    created: false,
    locked,
    contractId: doc._id,
    version: doc.version,
    pdfUrl: withVersionedPdf(doc.pdfUrl, doc.version, doc.updatedAt),
  };
};

const bookingLeanWithCar = async (booking) => {
  const bookingLean = booking.toObject ? booking.toObject() : { ...booking };
  if (!bookingLean.car || typeof bookingLean.car === 'string') {
    bookingLean.car = await Car.findById(booking.car._id || booking.car).lean();
  }
  return bookingLean;
};

const regenerateUnlockedInvoice = async (booking, actor) => {
  const doc = await Invoice.findOne({ booking: booking._id, owner: booking.owner }).sort({
    createdAt: -1,
  });
  if (!doc) {
    return { regenerated: false, reason: 'no_invoice' };
  }
  if (isContentLocked(doc)) {
    return { regenerated: false, reason: 'content_locked', invoiceId: doc._id };
  }

  let template = null;
  if (doc.template) {
    template = await ExportTemplate.findById(doc.template).lean();
  }
  if (!template) {
    template = await getDefaultInvoiceTemplate(booking.owner);
  }

  const bookingLean = await bookingLeanWithCar(booking);
  const invoiceFields = {
    invoiceNumber: doc.invoiceNumber,
    customerName: booking.customerName || doc.customerName,
    customerEmail: booking.customerEmail || doc.customerEmail,
    customerPhone: booking.customerPhone || doc.customerPhone,
    customerAddress: booking.customerAddress || doc.customerAddress,
    invoiceDate: doc.invoiceDate || booking.pickupDate,
    dueDate: booking.returnDate,
    subtotal: booking.price,
    discountAmount: Number(booking.priceBreakdown?.discountTotal || 0),
    taxAmount: 0,
    totalAmount: booking.price,
    paymentStatus: booking.paymentStatus || 'pending',
    notes: booking.notes || doc.notes || '',
    vehicleBrand: bookingLean.car?.brand || doc.vehicleBrand,
    vehicleModel: bookingLean.car?.model || doc.vehicleModel,
    vehicleYear: bookingLean.car?.year || doc.vehicleYear,
    vehiclePlate: bookingLean.car?.licensePlate || doc.vehiclePlate,
    currency: doc.currency || 'MAD',
    items: [{
      description: `Rental — ${bookingLean.car?.brand || ''} ${bookingLean.car?.model || ''}`.trim(),
      quantity: 1,
      unitPrice: booking.price || 0,
      taxRate: 0,
    }],
  };

  doc.dueDate = booking.returnDate;
  doc.subtotal = booking.price;
  doc.totalAmount = booking.price;
  doc.discountAmount = invoiceFields.discountAmount;
  doc.paymentStatus = booking.paymentStatus || 'pending';
  doc.items = invoiceFields.items;
  doc.sections = cloneSectionsFromTemplate(template || doc.sections || {});
  doc.sourceData = buildInvoiceSourceData({
    invoiceFields,
    booking: bookingLean,
    owner: actor,
    template: template || {},
    includeCompanyStamp: doc.includeCompanyStamp !== false,
  });
  if (template?._id) doc.template = template._id;

  const pdf = await persistPdfFromInstance({
    sections: doc.sections,
    sourceData: doc.sourceData,
    owner: actor,
    documentTitle: `Invoice ${doc.invoiceNumber}`,
    filePrefix: `invoice-${doc.invoiceNumber}`,
  });

  doc.renderedHtml = pdf.renderedHtml;
  doc.pdfPath = pdf.filePath;
  doc.pdfUrl = pdf.pdfUrl;
  bumpDocumentVersion(doc);
  doc.updatedBy = actor?._id || actor;
  await doc.save();

  await archiveRevision({
    owner: booking.owner,
    documentType: 'invoice',
    document: doc,
    user: actor,
    note: 'regenerate',
  });

  return { regenerated: true, invoiceId: doc._id, version: doc.version, pdfUrl: doc.pdfUrl };
};

/**
 * Apply extension: history + returnDate + price, then always regenerate the contract.
 */
export const applyBookingExtension = async (
  ownerId,
  bookingId,
  {
    newReturnDate: newReturnDateInput,
    notes = '',
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
  const mileage = { ...(booking.pricingSnapshot?.mileage || {}) };
  if (Number(mileage.limitKmPerDay) > 0) {
    mileage.includedKm = Number(mileage.limitKmPerDay) * preview.newDays;
  }
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
    mileage,
    timezone: booking.pricingSnapshot?.timezone || 'Africa/Casablanca',
  });
  applyExtensionFinancials(booking, preview.newPrice);
  booking.markModified('completion');

  await booking.save();

  try {
    await Payment.findOneAndUpdate(
      { booking: booking._id },
      { amount: preview.newPrice, status: booking.paymentStatus },
    );
  } catch (error) {
    console.error('[extension] payment sync', error.message);
  }

  let contractResult = { regenerated: false, reason: 'skipped' };
  try {
    contractResult = await regenerateContractAfterExtension(booking, actor || { _id: ownerId });
  } catch (error) {
    console.error('[extension] contract regenerate', error.message);
    contractResult = { regenerated: false, reason: error.message || 'regenerate_failed' };
  }

  let invoiceResult = { regenerated: false, reason: 'skipped' };
  try {
    invoiceResult = await regenerateUnlockedInvoice(booking, actor || { _id: ownerId });
  } catch (error) {
    console.error('[extension] invoice regenerate', error.message);
    invoiceResult = { regenerated: false, reason: error.message || 'regenerate_failed' };
  }

  const last = booking.extensionHistory[booking.extensionHistory.length - 1];
  last.contractRegenerated = Boolean(contractResult.regenerated);
  last.contractSkippedReason = contractResult.regenerated ? '' : (contractResult.reason || '');
  booking.markModified('extensionHistory');
  if (contractResult.regenerated && contractResult.pdfUrl) {
    if (!booking.completion) booking.completion = {};
    booking.completion.contractPdfUrl = contractResult.pdfUrl;
    booking.markModified('completion');
  }
  if (invoiceResult.regenerated && invoiceResult.pdfUrl) {
    if (!booking.completion) booking.completion = {};
    booking.completion.invoicePdfUrl = invoiceResult.pdfUrl;
    booking.markModified('completion');
  }
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
    invoice: invoiceResult,
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
  applyExtensionFinancials,
  mergeExtensionContractSource,
};

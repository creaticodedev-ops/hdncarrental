/**
 * Change the physical vehicle on an existing reservation.
 * Availability is authoritative here: overlapping units cannot be selected.
 * Pricing, customer, dates, payment, and signature status stay as they are.
 * Existing contracts/invoices are updated in place (no duplicates).
 */
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import Contract from '../models/Contract.js';
import Invoice from '../models/Invoice.js';
import { ACTIVE_BOOKING_STATUSES, isCarAvailableForDates } from './availabilityService.js';
import { logAudit } from '../utils/adminOps.js';
import {
  archiveRevision,
  bookingLooksSigned,
  buildContractSourceData,
  bumpDocumentVersion,
  captureSignedSnapshotIfNeeded,
  mergeSignatureFields,
  persistPdfFromInstance,
  versionedAssetUrl,
} from './documentInstanceService.js';

export const VEHICLE_SOURCE_KEYS = [
  'car_brand',
  'car_model',
  'car_make',
  'car_year',
  'car_category',
  'car_registration',
  'carBrand',
  'carModel',
  'carMake',
  'carYear',
  'carCategory',
  'carRegistration',
];

const CAR_LIST_FIELDS = 'brand model year licensePlate category image pricePerDay status isAvaliable fleetId vin transmission fuel_type';

const serviceError = (status, message, extra = {}) => {
  const err = new Error(message);
  err.status = status;
  Object.assign(err, extra);
  return err;
};

export const overlayVehicleSourceData = (existing = {}, fresh = {}) => {
  const next = { ...(existing || {}) };
  for (const key of VEHICLE_SOURCE_KEYS) {
    if (fresh[key] !== undefined) next[key] = fresh[key];
  }
  return next;
};

const vehicleSummary = (car) => {
  if (!car) return '—';
  const name = `${car.brand || ''} ${car.model || ''}`.trim() || '—';
  return car.licensePlate ? `${name} (${car.licensePlate})` : name;
};

const withVersionedPdf = (url, version, updatedAt) =>
  versionedAssetUrl(url, version, updatedAt || Date.now());

const loadOwnedBooking = async (ownerId, bookingId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw serviceError(400, 'Invalid booking ID');
  }
  const booking = await Booking.findOne({ _id: bookingId, owner: ownerId }).populate('car');
  if (!booking) {
    throw serviceError(404, 'Booking not found');
  }
  return booking;
};

export const listAvailableVehiclesForBooking = async (ownerId, bookingId) => {
  const booking = await loadOwnedBooking(ownerId, bookingId);
  const currentId = String(booking.car?._id || booking.car || '');

  const cars = await Car.find({
    owner: ownerId,
    status: { $ne: 'maintenance' },
    isAvaliable: { $ne: false },
  })
    .select(CAR_LIST_FIELDS)
    .sort({ brand: 1, model: 1, licensePlate: 1 })
    .lean();

  const overlaps = await Booking.find({
    owner: ownerId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    _id: { $ne: booking._id },
    pickupDate: { $lte: booking.returnDate },
    returnDate: { $gte: booking.pickupDate },
  })
    .select('car')
    .lean();

  const busy = new Set(overlaps.map((row) => String(row.car)));
  const available = cars.filter((car) => {
    const id = String(car._id);
    return id === currentId || !busy.has(id);
  });

  const currentCar = booking.car && typeof booking.car === 'object'
    ? (booking.car.toObject ? booking.car.toObject() : booking.car)
    : null;
  if (currentCar && !available.some((car) => String(car._id) === currentId)) {
    available.unshift(currentCar);
  }

  return {
    bookingId: booking._id,
    currentCarId: currentId,
    pickupDate: booking.pickupDate,
    returnDate: booking.returnDate,
    cars: available,
  };
};

const refreshContractDoc = async (doc, booking, actor) => {
  const bookingLean = booking.toObject ? booking.toObject() : { ...booking };
  const fresh = buildContractSourceData({
    booking: bookingLean,
    owner: actor,
    template: {},
    contractNumber: doc.contractNumber,
    includeCompanyStamp: doc.includeCompanyStamp !== false,
  });

  if (bookingLooksSigned(booking)) {
    await captureSignedSnapshotIfNeeded(doc);
  }

  doc.sourceData = mergeSignatureFields(overlayVehicleSourceData(doc.sourceData || {}, fresh), fresh);

  const pdf = await persistPdfFromInstance({
    sections: doc.sections,
    sourceData: doc.sourceData,
    owner: actor,
    documentTitle: `Contract ${doc.contractNumber}`,
    filePrefix: `contract-${doc.contractNumber}`,
    includeCompanyStamp: doc.includeCompanyStamp !== false,
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
    note: 'vehicle_change',
  });

  return {
    regenerated: true,
    contractId: doc._id,
    version: doc.version,
    pdfUrl: withVersionedPdf(doc.pdfUrl, doc.version, doc.updatedAt),
  };
};

const syncExistingContract = async (booking, actor) => {
  const docs = await Contract.find({ booking: booking._id, owner: booking.owner }).sort({
    updatedAt: -1,
    createdAt: -1,
  });
  if (!docs.length) {
    return { regenerated: false, reason: 'no_contract' };
  }

  let latest = null;
  for (const doc of docs) {
    const result = await refreshContractDoc(doc, booking, actor);
    if (!latest) latest = result;
  }
  return latest;
};

const refreshInvoiceDoc = async (doc, booking, actor) => {
  const car = booking.car || {};
  doc.vehicleBrand = car.brand || doc.vehicleBrand;
  doc.vehicleModel = car.model || doc.vehicleModel;
  doc.vehicleYear = car.year != null ? String(car.year) : doc.vehicleYear;
  doc.vehiclePlate = car.licensePlate || doc.vehiclePlate;

  const bookingLean = booking.toObject ? booking.toObject() : { ...booking };
  const fresh = buildContractSourceData({
    booking: bookingLean,
    owner: actor,
    template: {},
    contractNumber: doc.invoiceNumber,
    includeCompanyStamp: doc.includeCompanyStamp !== false,
  });
  doc.sourceData = overlayVehicleSourceData(doc.sourceData || {}, fresh);

  const pdf = await persistPdfFromInstance({
    sections: doc.sections,
    sourceData: doc.sourceData,
    owner: actor,
    documentTitle: `Invoice ${doc.invoiceNumber}`,
    filePrefix: `invoice-${doc.invoiceNumber}`,
    includeCompanyStamp: doc.includeCompanyStamp !== false,
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
    note: 'vehicle_change',
  });

  return {
    regenerated: true,
    invoiceId: doc._id,
    version: doc.version,
    pdfUrl: withVersionedPdf(doc.pdfUrl, doc.version, doc.updatedAt),
  };
};

const syncExistingInvoice = async (booking, actor) => {
  const docs = await Invoice.find({ booking: booking._id, owner: booking.owner }).sort({
    updatedAt: -1,
    createdAt: -1,
  });
  if (!docs.length) {
    return { regenerated: false, reason: 'no_invoice' };
  }

  let latest = null;
  for (const doc of docs) {
    const result = await refreshInvoiceDoc(doc, booking, actor);
    if (!latest) latest = result;
  }
  return latest;
};

export const changeBookingVehicle = async (ownerId, bookingId, carId, { actor = null } = {}) => {
  if (!mongoose.isValidObjectId(carId)) {
    throw serviceError(400, 'Invalid vehicle ID');
  }

  const booking = await loadOwnedBooking(ownerId, bookingId);
  if (booking.status === 'cancelled') {
    throw serviceError(409, 'Cannot change the vehicle on a cancelled reservation', { code: 'CANCELLED' });
  }

  const currentId = String(booking.car?._id || booking.car || '');
  if (String(carId) === currentId) {
    throw serviceError(400, 'Select a different vehicle', { code: 'SAME_VEHICLE' });
  }

  const newCar = await Car.findOne({ _id: carId, owner: ownerId });
  if (!newCar) {
    throw serviceError(404, 'Vehicle not found');
  }
  if (newCar.status === 'maintenance' || newCar.isAvaliable === false) {
    throw serviceError(409, 'Selected vehicle is unavailable', { code: 'UNAVAILABLE' });
  }

  const free = await isCarAvailableForDates(carId, booking.pickupDate, booking.returnDate, booking._id);
  if (!free) {
    throw serviceError(409, 'Selected vehicle is already booked for these dates', { code: 'OVERLAP' });
  }

  const previousCar = booking.car;
  booking.car = newCar._id;
  booking.markModified('car');
  await booking.save();

  const populated = await Booking.findById(booking._id).populate('car');
  const actorDoc = actor || { _id: ownerId };

  let contract = { regenerated: false, reason: 'skipped' };
  let invoice = { regenerated: false, reason: 'skipped' };
  try {
    contract = await syncExistingContract(populated, actorDoc);
  } catch (error) {
    console.error('[changeBookingVehicle] contract', error.message);
    contract = { regenerated: false, reason: 'error', message: error.message };
  }
  try {
    invoice = await syncExistingInvoice(populated, actorDoc);
  } catch (error) {
    console.error('[changeBookingVehicle] invoice', error.message);
    invoice = { regenerated: false, reason: 'error', message: error.message };
  }

  if (contract.regenerated && contract.pdfUrl) {
    if (!populated.completion) populated.completion = {};
    populated.completion.contractPdfUrl = contract.pdfUrl;
    populated.markModified('completion');
    await populated.save();
  }
  if (invoice.regenerated && invoice.pdfUrl) {
    if (!populated.completion) populated.completion = {};
    populated.completion.invoicePdfUrl = invoice.pdfUrl;
    populated.markModified('completion');
    await populated.save();
  }

  try {
    await logAudit({
      owner: ownerId,
      actor: actorDoc._id || ownerId,
      action: 'booking.vehicle_changed',
      entityType: 'Booking',
      entityId: populated._id,
      details: `${populated.reservationId || populated._id}: ${vehicleSummary(previousCar)} → ${vehicleSummary(populated.car)}`,
    });
  } catch {
    /* ignore */
  }

  const fresh = await Booking.findById(populated._id).populate('car');
  return {
    booking: fresh,
    previousCar,
    car: fresh.car,
    contract,
    invoice,
  };
};

export default {
  listAvailableVehiclesForBooking,
  changeBookingVehicle,
  overlayVehicleSourceData,
  VEHICLE_SOURCE_KEYS,
};

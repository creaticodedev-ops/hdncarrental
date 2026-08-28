/**
 * Desk collections against a booking.
 * Reuses booking.completion.amountPaid / amountDue and the unique Payment row
 * as the settlement record — the ledger is the installment history that feeds them.
 */
import Payment from '../models/Payment.js';
import { PAYMENT_METHODS } from './accountingService.js';
import { parseAgencyDateTime } from '../utils/moroccoTime.js';

export { PAYMENT_METHODS };

const toMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

const PAYMENT_DOC_METHODS = {
  cash: 'cash',
  card: 'card',
  bank_transfer: 'bank_transfer',
  check: 'other',
  other: 'other',
};

export const ledgerPaidTotal = (booking) => {
  const ledger = booking.paymentLedger || [];
  if (ledger.length) {
    return toMoney(ledger.reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
  }
  return toMoney(booking.completion?.amountPaid);
};

export const applyCollectedToBooking = (booking) => {
  const total = toMoney(booking.price);
  const paid = ledgerPaidTotal(booking);
  const remaining = toMoney(Math.max(0, total - paid));
  const overpaid = toMoney(Math.max(0, paid - total));

  if (!booking.completion) booking.completion = {};
  booking.completion.amountDue = total;
  booking.completion.amountPaid = paid;

  if (paid <= 0) {
    if (booking.paymentStatus !== 'failed' && booking.paymentStatus !== 'refunded') {
      booking.paymentStatus = 'pending';
    }
    booking.completion.paymentComplete = false;
    booking.completion.paymentType = '';
    booking.completion.paymentCompletedAt = null;
  } else if (paid < total) {
    booking.paymentStatus = 'pending';
    booking.completion.paymentComplete = false;
    booking.completion.paymentType = 'deposit';
    booking.completion.paymentCompletedAt = null;
  } else {
    booking.paymentStatus = 'paid';
    booking.completion.paymentComplete = true;
    booking.completion.paymentType = 'full';
    if (!booking.completion.paymentCompletedAt) {
      booking.completion.paymentCompletedAt = new Date();
    }
  }

  booking.markModified?.('completion');
  booking.markModified?.('paymentLedger');
  return { total, paid, remaining, overpaid };
};

const syncBookingPaymentRecord = async (booking) => {
  const ledger = booking.paymentLedger || [];
  const last = ledger[ledger.length - 1];
  const method = last ? (PAYMENT_DOC_METHODS[last.method] || 'other') : 'offline';
  const status = booking.paymentStatus === 'paid'
    ? 'paid'
    : (booking.paymentStatus === 'failed' || booking.paymentStatus === 'refunded'
      ? booking.paymentStatus
      : 'pending');

  await Payment.findOneAndUpdate(
    { booking: booking._id },
    {
      $set: {
        booking: booking._id,
        amount: toMoney(booking.price),
        status,
        method,
        gateway: 'offline',
        reference: (last?.note || booking.reservationId || '').slice(0, 200),
      },
    },
    { upsert: true },
  );
};

/** Preserve a prior amountPaid when the first structured installment is recorded. */
export const ensureLegacyLedger = (booking) => {
  if ((booking.paymentLedger || []).length) return;
  const paid = toMoney(booking.completion?.amountPaid);
  const fallback = booking.paymentStatus === 'paid' ? toMoney(booking.price) : 0;
  const amount = paid > 0 ? paid : fallback;
  if (amount <= 0) return;
  if (!booking.paymentLedger) booking.paymentLedger = [];
  booking.paymentLedger.push({
    amount,
    method: 'other',
    paidAt: booking.completion?.paymentCompletedAt || booking.createdAt || new Date(),
    note: '',
    source: 'opening',
  });
};

export const addBookingPayment = async (booking, { amount, method, paidAt, note, recordedBy }) => {
  const value = toMoney(amount);
  if (!Number.isFinite(value) || value <= 0) {
    const err = new Error('Enter an amount greater than zero');
    err.status = 400;
    throw err;
  }
  if (value > 1_000_000) {
    const err = new Error('Amount is too large');
    err.status = 400;
    throw err;
  }

  const resolvedMethod = PAYMENT_METHODS.includes(method) ? method : '';
  if (!resolvedMethod) {
    const err = new Error('Invalid payment method');
    err.status = 400;
    throw err;
  }

  const when = paidAt ? parseAgencyDateTime(paidAt) : new Date();
  if (Number.isNaN(when.getTime())) {
    const err = new Error('Invalid payment date');
    err.status = 400;
    throw err;
  }

  ensureLegacyLedger(booking);
  if (!Array.isArray(booking.paymentLedger)) booking.paymentLedger = [];
  booking.paymentLedger.push({
    amount: value,
    method: resolvedMethod,
    paidAt: when,
    note: String(note || '').trim().slice(0, 300),
    recordedBy: recordedBy || null,
    source: 'desk',
  });

  const figures = applyCollectedToBooking(booking);
  await booking.save();

  try {
    await syncBookingPaymentRecord(booking);
  } catch (error) {
    console.error('[payment ledger] Payment sync', error.message);
  }

  return figures;
};

/** Set the running collected total. Remaining and status are derived from this. */
export const setCollectedAmount = async (booking, { amountPaid, method, recordedBy }) => {
  const target = toMoney(amountPaid);
  if (!Number.isFinite(target) || target < 0) {
    const err = new Error('Enter a valid amount paid');
    err.status = 400;
    throw err;
  }
  if (target > 1_000_000) {
    const err = new Error('Amount is too large');
    err.status = 400;
    throw err;
  }

  const resolvedMethod = PAYMENT_METHODS.includes(method) ? method : 'cash';
  ensureLegacyLedger(booking);
  if (!Array.isArray(booking.paymentLedger)) booking.paymentLedger = [];

  const current = ledgerPaidTotal(booking);
  const delta = toMoney(target - current);

  if (delta === 0 && toMoney(booking.completion?.amountPaid) === target) {
    return applyCollectedToBooking(booking);
  }

  if (booking.paymentLedger.length <= 1) {
    if (target <= 0) {
      booking.paymentLedger = [];
    } else if (booking.paymentLedger.length === 1) {
      booking.paymentLedger[0].amount = target;
      if (!booking.paymentLedger[0].method) booking.paymentLedger[0].method = resolvedMethod;
    } else {
      booking.paymentLedger.push({
        amount: target,
        method: resolvedMethod,
        paidAt: new Date(),
        note: '',
        recordedBy: recordedBy || null,
        source: 'desk',
      });
    }
  } else if (delta > 0) {
    booking.paymentLedger.push({
      amount: delta,
      method: resolvedMethod,
      paidAt: new Date(),
      note: '',
      recordedBy: recordedBy || null,
      source: 'desk',
    });
  } else {
    let need = toMoney(-delta);
    while (need > 0 && booking.paymentLedger.length) {
      const last = booking.paymentLedger[booking.paymentLedger.length - 1];
      const lastAmt = toMoney(last.amount);
      if (lastAmt <= need) {
        need = toMoney(need - lastAmt);
        booking.paymentLedger.pop();
      } else {
        last.amount = toMoney(lastAmt - need);
        need = 0;
      }
    }
  }

  const figures = applyCollectedToBooking(booking);
  await booking.save();

  try {
    await syncBookingPaymentRecord(booking);
  } catch (error) {
    console.error('[payment ledger] Payment sync', error.message);
  }

  return figures;
};

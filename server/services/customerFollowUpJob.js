/**
 * Suggest customer-care follow-ups from the rental lifecycle.
 * Does not send WhatsApp (wa.me only) — notifies the owner and stores due actions.
 */
import Booking from '../models/Booking.js';
import GuestCustomer from '../models/GuestCustomer.js';
import CustomerReview from '../models/CustomerReview.js';
import { bookingCrmKey } from '../utils/customerIdentity.js';
import { suggestFollowUps } from '../../shared/customerCrm.js';
import { createNotification } from '../utils/adminOps.js';
import { loadCustomerBookings } from './customer360.js';

let timer = null;
let running = false;

const KIND_LABEL = {
  signed_contract: 'Send signed contract',
  during_rental: 'During-rental check-in',
  return_reminder: 'Return reminder',
  thank_you: 'Thank-you message',
  review: 'Ask for a review',
  winback: 'Win-back message',
};

export const syncCustomerFollowUpsOnce = async () => {
  if (running) return { scanned: 0, created: 0 };
  running = true;
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'ready_for_pickup', 'active', 'completed'] },
      $or: [
        { status: 'active' },
        { returnDate: { $gte: windowStart, $lte: windowEnd } },
        { pickupDate: { $gte: windowStart, $lte: windowEnd } },
      ],
    })
      .select('owner crmKey customerEmail customerName status pickupDate returnDate reservationId completion')
      .limit(400)
      .lean();

    const byOwnerKey = new Map();
    for (const b of bookings) {
      const key = bookingCrmKey(b);
      if (!key || !b.owner) continue;
      const mapKey = `${b.owner}:${key}`;
      if (!byOwnerKey.has(mapKey)) byOwnerKey.set(mapKey, { owner: b.owner, crmKey: key });
    }

    let created = 0;
    for (const { owner, crmKey } of byOwnerKey.values()) {
      const guest = await GuestCustomer.findOne({ owner, email: crmKey });
      if (!guest) continue;
      const history = await loadCustomerBookings(owner, crmKey);
      const hasReview = await CustomerReview.exists({ owner, crmKey });
      const existing = (guest.followUps || []).map((f) => ({
        kind: f.kind,
        booking: String(f.booking || ''),
        status: f.status,
      }));
      const suggestions = suggestFollowUps({
        bookings: history,
        existing,
        hasReview: Boolean(hasReview),
        now,
      });
      if (!suggestions.length) continue;

      for (const item of suggestions) {
        guest.followUps.push({
          kind: item.kind,
          booking: item.bookingId,
          status: 'due',
          dueAt: item.dueAt || now,
          createdAt: now,
        });
        created += 1;
        try {
          await createNotification({
            owner,
            type: 'system',
            title: KIND_LABEL[item.kind] || 'Customer follow-up',
            message: `${guest.name || 'Customer'} — ${item.reservationId || crmKey}`,
            link: '/owner/customers',
            meta: { crmKey, kind: item.kind, bookingId: item.bookingId },
          });
        } catch {
          /* non-fatal */
        }
      }
      const dueDates = guest.followUps
        .filter((f) => f.status === 'due' && f.dueAt)
        .map((f) => new Date(f.dueAt).getTime())
        .filter(Number.isFinite);
      guest.nextFollowUpAt = dueDates.length ? new Date(Math.min(...dueDates)) : guest.nextFollowUpAt;
      await guest.save();
    }

    return { scanned: byOwnerKey.size, created };
  } finally {
    running = false;
  }
};

export const startCustomerFollowUpJob = (intervalMs = 15 * 60 * 1000) => {
  if (timer) return;
  const tick = async () => {
    try {
      const r = await syncCustomerFollowUpsOnce();
      if (r.created > 0) {
        console.log(`[customerFollowUp] created ${r.created} due action(s)`);
      }
    } catch (error) {
      console.error('[customerFollowUp]', error.message);
    }
  };
  setTimeout(tick, 45_000);
  timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
};

export const stopCustomerFollowUpJob = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

export default {
  syncCustomerFollowUpsOnce,
  startCustomerFollowUpJob,
  stopCustomerFollowUpJob,
};

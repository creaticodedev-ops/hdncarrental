/**
 * Customer 360 — loyalty, smart status, journey, and follow-up rules.
 * Pure helpers shared by the server CRM presenter and verify scripts.
 */

export const LOYALTY_LEVELS = ['new', 'regular', 'gold', 'vip'];

export const SMART_STATUSES = [
  'active',
  'returning',
  'vip',
  'needs_followup',
  'issue',
  'inactive',
];

export const JOURNEY_STAGES = [
  'lead',
  'reservation',
  'pickup',
  'active',
  'return',
  'review',
  'loyalty',
  'repeat',
];

export const FOLLOW_UP_KINDS = [
  'signed_contract',
  'during_rental',
  'return_reminder',
  'thank_you',
  'review',
  'winback',
];

export const INACTIVE_AFTER_DAYS = 60;
export const WINBACK_AFTER_DAYS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;

export const computeLoyaltyLevel = ({
  completedRentals = 0,
  totalSpent = 0,
  successfulReferrals = 0,
  status = '',
} = {}) => {
  if (status === 'vip') return 'vip';
  if (completedRentals >= 5 || totalSpent >= 5000 || successfulReferrals >= 3) return 'vip';
  if (completedRentals >= 3 || totalSpent >= 3000 || successfulReferrals >= 1) return 'gold';
  if (completedRentals >= 1 || totalSpent > 0) return 'regular';
  return 'new';
};

export const loyaltyBenefitsFor = (level) => {
  const rank = LOYALTY_LEVELS.indexOf(level);
  return {
    discount: rank >= 2,
    freeUpgrade: rank >= 3,
    priorityService: rank >= 2,
    freeAdditionalDriver: rank >= 3,
    returningCustomerPerk: rank >= 1,
  };
};

const daysBetween = (from, to) => {
  if (!from) return Infinity;
  const a = from instanceof Date ? from.getTime() : new Date(from).getTime();
  const b = to instanceof Date ? to.getTime() : new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return (b - a) / DAY_MS;
};

export const computeSmartStatus = ({
  hasOpenIssue = false,
  needsFollowUp = false,
  hasActiveRental = false,
  hasUpcoming = false,
  loyaltyLevel = 'new',
  completedRentals = 0,
  lastBookingAt = null,
  now = new Date(),
} = {}) => {
  if (hasOpenIssue) return 'issue';
  if (hasActiveRental) return 'active';
  if (needsFollowUp) return 'needs_followup';
  if (loyaltyLevel === 'vip') return 'vip';
  if (hasUpcoming) return 'active';
  if (daysBetween(lastBookingAt, now) > INACTIVE_AFTER_DAYS) return 'inactive';
  if (completedRentals >= 2) return 'returning';
  if (lastBookingAt) return 'active';
  return 'inactive';
};

const bookingRank = (status) => {
  switch (status) {
    case 'completed':
      return 5;
    case 'active':
      return 4;
    case 'ready_for_pickup':
      return 3;
    case 'confirmed':
      return 2;
    case 'pending':
      return 1;
    default:
      return 0;
  }
};

/**
 * Furthest journey stage reached, plus the stage that should be highlighted now.
 */
export const computeCustomerJourney = ({
  bookings = [],
  hasReview = false,
  loyaltyLevel = 'new',
  now = new Date(),
} = {}) => {
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const reached = new Set();
  if (bookings.length) reached.add('lead');
  if (live.some((b) => bookingRank(b.status) >= 1)) reached.add('reservation');
  if (live.some((b) => bookingRank(b.status) >= 3)) reached.add('pickup');
  if (live.some((b) => bookingRank(b.status) >= 4)) reached.add('active');
  if (live.some((b) => b.status === 'completed')) reached.add('return');
  if (hasReview) reached.add('review');
  if (loyaltyLevel === 'gold' || loyaltyLevel === 'vip' || live.filter((b) => b.status === 'completed').length >= 2) {
    reached.add('loyalty');
  }
  if (live.filter((b) => b.status === 'completed').length >= 2 || live.length >= 2) {
    reached.add('repeat');
  }

  const hasActive = live.some((b) => b.status === 'active');
  const upcomingPickup = live.some((b) => {
    if (!['confirmed', 'ready_for_pickup'].includes(b.status)) return false;
    const t = new Date(b.pickupDate).getTime();
    return Number.isFinite(t) && t >= now.getTime() - DAY_MS;
  });
  const completed = live.filter((b) => b.status === 'completed');
  const latestCompleted = completed[0] || null;

  let current = 'lead';
  if (hasActive) current = 'active';
  else if (live.some((b) => b.status === 'ready_for_pickup') || upcomingPickup) current = 'pickup';
  else if (live.some((b) => b.status === 'confirmed' || b.status === 'pending')) current = 'reservation';
  else if (latestCompleted && !hasReview) current = 'return';
  else if (latestCompleted && hasReview && !reached.has('repeat')) current = loyaltyLevel === 'new' ? 'review' : 'loyalty';
  else if (reached.has('repeat')) current = 'repeat';
  else if (reached.has('loyalty')) current = 'loyalty';
  else if (reached.has('review')) current = 'review';
  else if (reached.has('return')) current = 'return';

  return {
    current,
    stages: JOURNEY_STAGES.map((id) => ({
      id,
      reached: reached.has(id),
      current: id === current,
    })),
  };
};

export const isUpcomingBooking = (booking, now = new Date()) => {
  if (!booking || ['cancelled', 'completed'].includes(booking.status)) return false;
  if (booking.status === 'active') return false;
  const pickup = new Date(booking.pickupDate).getTime();
  return Number.isFinite(pickup) && pickup >= now.getTime() - 6 * 60 * 60 * 1000;
};

export const hoursUntil = (value, now = new Date()) => {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (t - now.getTime()) / (60 * 60 * 1000);
};

export const hoursSince = (value, now = new Date()) => -hoursUntil(value, now);

/**
 * Lifecycle follow-ups that should be suggested for an agent (wa.me, not auto-sent).
 */
export const suggestFollowUps = ({
  bookings = [],
  existing = [],
  hasReview = false,
  now = new Date(),
} = {}) => {
  const done = new Set(
    (existing || [])
      .filter((f) => f.status === 'done' || f.status === 'skipped')
      .map((f) => `${f.kind}:${String(f.booking || '')}`),
  );
  const dueExisting = new Set(
    (existing || [])
      .filter((f) => f.status === 'due')
      .map((f) => `${f.kind}:${String(f.booking || '')}`),
  );
  const suggestions = [];

  const consider = (kind, booking, dueAt) => {
    const id = String(booking._id || booking.id);
    const key = `${kind}:${id}`;
    if (done.has(key) || dueExisting.has(key)) return;
    suggestions.push({ kind, bookingId: id, dueAt, reservationId: booking.reservationId || '' });
  };

  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue;
    const signed = Boolean(booking.completion?.signatureComplete)
      || booking.completion?.requestStatus === 'signed';
    if (signed && ['confirmed', 'ready_for_pickup', 'active', 'completed'].includes(booking.status)) {
      const signedAt = booking.completion?.completedAt || booking.updatedAt || booking.createdAt;
      if (hoursSince(signedAt, now) <= 14 * 24) {
        consider('signed_contract', booking, signedAt);
      }
    }
    if (booking.status === 'active') {
      if (hoursSince(booking.pickupDate, now) >= 8 && hoursUntil(booking.returnDate, now) > 12) {
        consider('during_rental', booking, now);
      }
      const untilReturn = hoursUntil(booking.returnDate, now);
      if (untilReturn <= 36 && untilReturn > -6) {
        consider('return_reminder', booking, booking.returnDate);
      }
    }
    if (booking.status === 'completed') {
      const sinceReturn = hoursSince(booking.returnDate, now);
      if (sinceReturn >= 0 && sinceReturn <= 72) {
        consider('thank_you', booking, booking.returnDate);
      }
      if (!hasReview && sinceReturn >= 12 && sinceReturn <= 14 * 24) {
        consider('review', booking, booking.returnDate);
      }
    }
  }

  const live = bookings.filter((b) => !['cancelled'].includes(b.status));
  const hasFuture = live.some((b) => isUpcomingBooking(b, now) || b.status === 'active');
  const completed = live
    .filter((b) => b.status === 'completed')
    .sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));
  const lastDone = completed[0];
  if (lastDone && !hasFuture && daysBetween(lastDone.returnDate, now) >= WINBACK_AFTER_DAYS) {
    consider('winback', lastDone, lastDone.returnDate);
  }

  return suggestions;
};

export default {
  LOYALTY_LEVELS,
  SMART_STATUSES,
  JOURNEY_STAGES,
  FOLLOW_UP_KINDS,
  computeLoyaltyLevel,
  loyaltyBenefitsFor,
  computeSmartStatus,
  computeCustomerJourney,
  suggestFollowUps,
};

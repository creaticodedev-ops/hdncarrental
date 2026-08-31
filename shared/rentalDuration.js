/**
 * Canonical rental-duration billing.
 *
 * Pickup instant → return instant is the actual duration.
 * Every completed 24 hours = 1 rental day.
 * After the last completed 24-hour mark the customer has a 4-hour grace period.
 * If return is strictly more than 4 hours past that mark, add +1 rental day.
 * Any positive duration bills at least 1 day.
 *
 * Client and server must import this module — do not reimplement the formula.
 */

export const RENTAL_DAY_MS = 24 * 60 * 60 * 1000;
export const RENTAL_GRACE_MS = 4 * 60 * 60 * 1000;

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
};

export const toInstantMs = (value) => {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? NaN : t;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }
  if (value == null || value === '') return NaN;
  const d = new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? NaN : t;
};

export const calcRentalDays = (pickup, returned) => {
  const start = toInstantMs(pickup);
  const end = toInstantMs(returned);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const elapsed = end - start;
  const fullDays = Math.floor(elapsed / RENTAL_DAY_MS);
  const remainder = elapsed - fullDays * RENTAL_DAY_MS;
  const days = remainder > RENTAL_GRACE_MS ? fullDays + 1 : fullDays;
  return Math.max(1, days);
};

export const extraRentalDays = (pickup, previousReturn, nextReturn) => {
  const next = calcRentalDays(pickup, nextReturn);
  if (next <= 0) return 0;
  const prev = calcRentalDays(pickup, previousReturn);
  return Math.max(0, next - Math.max(0, prev));
};

export const bookingRentalDays = (booking) =>
  calcRentalDays(booking?.pickupDate, booking?.returnDate);

export const cloneBookingCommercials = (booking) => {
  if (!booking || typeof booking !== 'object') return booking;
  const pb = booking.priceBreakdown;
  const snap = booking.pricingSnapshot;
  return {
    ...booking,
    priceBreakdown: pb && typeof pb === 'object'
      ? {
          ...pb,
          discounts: Array.isArray(pb.discounts) ? pb.discounts.map((d) => ({ ...d })) : pb.discounts,
          lineItems: Array.isArray(pb.lineItems)
            ? pb.lineItems.map((item) => ({
                ...item,
                meta: item.meta && typeof item.meta === 'object' ? { ...item.meta } : item.meta,
              }))
            : pb.lineItems,
        }
      : pb,
    pricingSnapshot: snap && typeof snap === 'object'
      ? {
          ...snap,
          extras: snap.extras && typeof snap.extras === 'object' ? { ...snap.extras } : snap.extras,
        }
      : snap,
  };
};

/**
 * Align stored days / rental line / total with pickup→return billing.
 * Frozen discount amounts are kept; extra-driver is recomputed when a per-day rate exists.
 */
export const alignBookingCommercials = (booking) => {
  if (!booking || typeof booking !== 'object') return booking;
  const days = bookingRentalDays(booking);
  if (days <= 0) return booking;

  const pb = booking.priceBreakdown && typeof booking.priceBreakdown === 'object'
    ? booking.priceBreakdown
    : {};
  const previousPrice = Number(booking.price);
  const pricePerDay = toMoney(pb.pricePerDay);
  const storedDays = Number(pb.days) || 0;

  if (!(pricePerDay > 0)) {
    if (storedDays !== days) {
      booking.priceBreakdown = { ...pb, days };
    }
    return booking;
  }

  const rentalPrice = toMoney(pricePerDay * days);
  const pickupFee = toMoney(pb.pickupDeliveryFee);
  const dropoffFee = toMoney(pb.dropoffDeliveryFee);
  const extras = booking.pricingSnapshot?.extras || {};
  const extraPerDay = toMoney(extras.extraDriverFeePerDay);
  const extraEnabled = Boolean(extras.extraDriverEnabled) || toMoney(pb.extraDriverFee) > 0;
  const extraDriverFee = extraPerDay > 0 && extraEnabled
    ? toMoney(extraPerDay * days)
    : toMoney(pb.extraDriverFee);
  const discountTotal = toMoney(pb.discountTotal);
  const subtotal = toMoney(rentalPrice + pickupFee + dropoffFee + extraDriverFee);
  const total = toMoney(Math.max(0, subtotal - discountTotal));

  const lineItems = Array.isArray(pb.lineItems)
    ? pb.lineItems.map((item) => {
        if (item?.type === 'rental') {
          return {
            ...item,
            amount: rentalPrice,
            meta: { ...(item.meta || {}), days, pricePerDay },
          };
        }
        if (item?.type === 'extra_driver') {
          return {
            ...item,
            amount: extraDriverFee,
            meta: { ...(item.meta || {}), days },
          };
        }
        return item;
      })
    : pb.lineItems;

  booking.priceBreakdown = {
    ...pb,
    days,
    pricePerDay,
    rentalPrice,
    extraDriverFee,
    subtotal,
    total,
    lineItems,
  };
  booking.price = total;

  if (booking.pricingSnapshot && typeof booking.pricingSnapshot === 'object') {
    booking.pricingSnapshot.finalPrice = total;
    if (booking.pricingSnapshot.extras && extraPerDay > 0 && extraEnabled) {
      booking.pricingSnapshot.extras.extraDriverFee = extraDriverFee;
    }
  }

  if (
    booking.completion
    && typeof booking.completion === 'object'
    && Number.isFinite(previousPrice)
    && Number(booking.completion.amountDue) === previousPrice
  ) {
    booking.completion = { ...booking.completion, amountDue: total };
  }

  return booking;
};

export const presentBooking = (booking) => {
  if (!booking) return booking;
  return alignBookingCommercials(cloneBookingCommercials(booking));
};

export const presentBookings = (bookings) =>
  (Array.isArray(bookings) ? bookings : []).map(presentBooking);

export const bookingCommercialsAreStale = (original, presented) => {
  if (!original || !presented) return false;
  const daysBefore = Number(original.priceBreakdown?.days) || 0;
  const daysAfter = Number(presented.priceBreakdown?.days) || 0;
  const priceBefore = Number(original.price) || 0;
  const priceAfter = Number(presented.price) || 0;
  return daysBefore !== daysAfter || priceBefore !== priceAfter;
};

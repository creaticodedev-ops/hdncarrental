/**
 * Shared client-side pricing preview (mirrors server pricingEngine).
 * Server remains authoritative on create.
 */

export const calcRentalDays = (pickupDate, returnDate) => {
  const picked = new Date(pickupDate);
  const returned = new Date(returnDate);
  if (Number.isNaN(picked.getTime()) || Number.isNaN(returned.getTime())) return 0;
  if (returned <= picked) return 0;
  return Math.max(1, Math.ceil((returned - picked) / (1000 * 60 * 60 * 24)));
};

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
};

export const calculateBookingPricePreview = ({
  pricePerDay = 0,
  pickupDate,
  returnDate,
  pickupDeliveryFee = 0,
  dropoffDeliveryFee = 0,
  discounts = [],
} = {}) => {
  const days = calcRentalDays(pickupDate, returnDate);
  const daily = toMoney(pricePerDay);
  const rentalPrice = days > 0 ? toMoney(daily * days) : 0;
  const pickupFee = toMoney(pickupDeliveryFee);
  const dropoffFee = toMoney(dropoffDeliveryFee);

  const normalizedDiscounts = (Array.isArray(discounts) ? discounts : [])
    .map((d) => ({
      code: d.code || '',
      label: d.label || 'Discount',
      amount: toMoney(d.amount),
    }))
    .filter((d) => d.amount > 0);

  const discountTotal = toMoney(
    normalizedDiscounts.reduce((sum, d) => sum + d.amount, 0)
  );

  const subtotal = toMoney(rentalPrice + pickupFee + dropoffFee);
  const total = toMoney(Math.max(0, subtotal - discountTotal));

  return {
    days,
    pricePerDay: daily,
    rentalPrice,
    pickupDeliveryFee: pickupFee,
    dropoffDeliveryFee: dropoffFee,
    discounts: normalizedDiscounts,
    discountTotal,
    subtotal,
    total,
    ready: days > 0,
  };
};

export default calculateBookingPricePreview;

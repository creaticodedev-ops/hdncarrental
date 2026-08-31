/**
 * Offline checks for 24-hour rental billing + 4-hour grace.
 * Run: node scripts/verify-rental-duration.mjs
 */
import assert from 'node:assert/strict';
import { calculateBookingPrice } from '../services/pricingEngine.js';
import { parseAgencyDateTime } from '../utils/moroccoTime.js';
import {
  RENTAL_DAY_MS,
  RENTAL_GRACE_MS,
  alignBookingCommercials,
  calcRentalDays,
  extraRentalDays,
} from '../utils/helpers.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('verify-rental-duration');

check('constants are 24h day and 4h grace', () => {
  assert.equal(RENTAL_DAY_MS, 24 * 60 * 60 * 1000);
  assert.equal(RENTAL_GRACE_MS, 4 * 60 * 60 * 1000);
});

check('example: 72h + 29min stays 3 days', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const returned = parseAgencyDateTime('2026-09-03T15:00');
  assert.equal(calcRentalDays(pickup, returned), 3);
});

check('example: 72h + 4h29 becomes 4 days', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const returned = parseAgencyDateTime('2026-09-03T19:00');
  assert.equal(calcRentalDays(pickup, returned), 4);
});

check('exact 24h is 1 day', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const returned = parseAgencyDateTime('2026-09-01T14:31');
  assert.equal(calcRentalDays(pickup, returned), 1);
});

check('exact 24h + 4h grace stays 1 day', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const returned = parseAgencyDateTime('2026-09-01T18:31');
  assert.equal(calcRentalDays(pickup, returned), 1);
});

check('24h + 4h + 1min is 2 days', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const returned = parseAgencyDateTime('2026-09-01T18:32');
  assert.equal(calcRentalDays(pickup, returned), 2);
});

check('same-day return still bills 1 day', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const returned = parseAgencyDateTime('2026-08-31T16:00');
  assert.equal(calcRentalDays(pickup, returned), 1);
});

check('invalid or inverted range is 0', () => {
  assert.equal(calcRentalDays('2026-08-31T14:31', '2026-08-31T14:31'), 0);
  assert.equal(calcRentalDays('2026-09-03T15:00', '2026-08-31T14:31'), 0);
  assert.equal(calcRentalDays(null, '2026-08-31T14:31'), 0);
});

check('pricing engine uses the same day count', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const insideGrace = parseAgencyDateTime('2026-09-03T15:00');
  const overGrace = parseAgencyDateTime('2026-09-03T19:00');
  const a = calculateBookingPrice({ pricePerDay: 400, pickupDate: pickup, returnDate: insideGrace });
  const b = calculateBookingPrice({ pricePerDay: 400, pickupDate: pickup, returnDate: overGrace });
  assert.equal(a.days, 3);
  assert.equal(a.rentalPrice, 1200);
  assert.equal(b.days, 4);
  assert.equal(b.rentalPrice, 1600);
});

check('extension extra days follow 24h billing', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const original = parseAgencyDateTime('2026-09-03T15:00');
  const extended = parseAgencyDateTime('2026-09-04T19:00');
  assert.equal(extraRentalDays(pickup, original, extended), 2);
});

check('existing reservation days and total stay consistent', () => {
  const pickup = parseAgencyDateTime('2026-08-31T14:31');
  const returned = parseAgencyDateTime('2026-09-03T15:00');
  const booking = {
    pickupDate: pickup,
    returnDate: returned,
    price: 1600,
    priceBreakdown: {
      days: 4,
      pricePerDay: 400,
      rentalPrice: 1600,
      pickupDeliveryFee: 0,
      dropoffDeliveryFee: 0,
      extraDriverFee: 0,
      discountTotal: 0,
      subtotal: 1600,
      total: 1600,
    },
  };
  alignBookingCommercials(booking);
  assert.equal(booking.priceBreakdown.days, 3);
  assert.equal(booking.priceBreakdown.rentalPrice, 1200);
  assert.equal(booking.price, 1200);
});

console.log(`\n${passed} checks passed`);

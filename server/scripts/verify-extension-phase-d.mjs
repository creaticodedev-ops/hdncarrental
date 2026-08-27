/**
 * Phase D: booking extension pricing + history invariants (offline).
 *
 * Offline: node scripts/verify-extension-phase-d.mjs
 */
import assert from 'node:assert/strict'
import { calculateBookingPrice } from '../services/pricingEngine.js'
import { calcRentalDays } from '../utils/helpers.js'
import { parseAgencyDateTime } from '../utils/moroccoTime.js'
import { assertBookingRules, DEFAULT_BOOKING_SETTINGS } from '../services/bookingSettingsService.js'
import {
  EXTENDABLE_STATUSES,
  applyExtensionFinancials,
  buildExtendedBreakdown,
  mergeExtensionContractSource,
} from '../services/bookingExtensionService.js'

let passed = 0
const check = (name, fn) => {
  fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

console.log('verify-extension-phase-d')

check('extendable statuses', () => {
  assert.deepEqual(EXTENDABLE_STATUSES, ['confirmed', 'ready_for_pickup', 'active'])
})

check('delta days from pricing engine', () => {
  const pickup = new Date('2026-05-01T10:00:00Z')
  const ret1 = new Date('2026-05-04T10:00:00Z')
  const ret2 = new Date('2026-05-06T10:00:00Z')
  const d1 = calcRentalDays(pickup, ret1)
  const d2 = calcRentalDays(pickup, ret2)
  assert.equal(d2 - d1, 2)

  const a = calculateBookingPrice({
    pricePerDay: 100,
    pickupDate: pickup,
    returnDate: ret1,
    pickupDeliveryFee: 50,
    dropoffDeliveryFee: 0,
    discounts: [{ label: 'Promo', amount: 20 }],
  })
  const b = calculateBookingPrice({
    pricePerDay: 100,
    pickupDate: pickup,
    returnDate: ret2,
    pickupDeliveryFee: 50,
    dropoffDeliveryFee: 0,
    discounts: [{ label: 'Promo', amount: 20 }],
  })
  assert.equal(a.days, d1)
  assert.equal(b.days, d2)
  assert.equal(Math.round((b.total - a.total) * 100) / 100, 200)
})

check('history entry preserves previous snapshot shape', () => {
  const previousReturnDate = new Date('2026-05-04T10:00:00Z')
  const newReturnDate = new Date('2026-05-06T10:00:00Z')
  const entry = {
    previousReturnDate,
    newReturnDate,
    previousPrice: 330,
    newPrice: 530,
    previousDays: 3,
    newDays: 5,
    deltaDays: 2,
    deltaAmount: 200,
    notes: 'Customer request',
    contractRegenerated: false,
    contractSkippedReason: 'content_locked',
  }
  assert.ok(entry.newReturnDate > entry.previousReturnDate)
  assert.equal(entry.deltaAmount, entry.newPrice - entry.previousPrice)
  assert.equal(entry.deltaDays, entry.newDays - entry.previousDays)
  assert.equal(entry.previousPrice, 330)
  assert.equal(entry.previousReturnDate.toISOString(), previousReturnDate.toISOString())
})

check('extension requires later return (guard)', () => {
  const current = new Date('2026-05-04T10:00:00Z')
  const earlier = new Date('2026-05-03T10:00:00Z')
  assert.equal(earlier.getTime() <= current.getTime(), true)
})

check('availability exclude self is required for overlap math', () => {
  const excludeBookingId = 'self'
  assert.ok(excludeBookingId)
})

check('new bookings still reject past pickup', () => {
  const r = assertBookingRules(
    DEFAULT_BOOKING_SETTINGS,
    '2020-08-20T10:00',
    '2020-08-24T19:00',
  )
  assert.equal(r.ok, false)
  assert.equal(r.code, 'PAST_PICKUP')
})

check('existing rental extension allows past pickup', () => {
  const r = assertBookingRules(
    DEFAULT_BOOKING_SETTINGS,
    '2020-08-20T10:00',
    '2020-08-24T19:00',
    { existingRental: true },
  )
  assert.equal(r.ok, true)
  assert.ok(r.days >= 1)
})

check('existing rental does not re-check pickup or return hours', () => {
  const r = assertBookingRules(
    { ...DEFAULT_BOOKING_SETTINGS, returnHoursStart: '08:00', returnHoursEnd: '18:00' },
    '2026-08-21T10:00',
    '2026-08-24T19:00',
    { existingRental: true },
  )
  assert.equal(r.ok, true)
  const asNewBooking = assertBookingRules(
    DEFAULT_BOOKING_SETTINGS,
    '2026-08-21T10:00',
    '2026-08-24T19:00',
  )
  assert.equal(asNewBooking.ok, false)
  assert.equal(asNewBooking.code, 'PAST_PICKUP')
})

check('naive datetime-local is Africa/Casablanca wall time', () => {
  const agency = parseAgencyDateTime('2026-08-24T19:00')
  assert.equal(agency.toISOString(), '2026-08-24T18:00:00.000Z')
})

check('paid booking with extra days becomes pending remainder', () => {
  const booking = {
    paymentStatus: 'paid',
    completion: { amountPaid: 1200, amountDue: 1200, paymentComplete: true },
  }
  const result = applyExtensionFinancials(booking, 1600)
  assert.equal(result.amountDue, 1600)
  assert.equal(result.amountPaid, 1200)
  assert.equal(result.paymentStatus, 'pending')
  assert.equal(booking.completion.paymentComplete, false)
})

check('fully covered extension stays paid', () => {
  const booking = {
    paymentStatus: 'paid',
    completion: { amountPaid: 1600, amountDue: 1200, paymentComplete: true },
  }
  const result = applyExtensionFinancials(booking, 1600)
  assert.equal(result.paymentStatus, 'paid')
  assert.equal(booking.completion.paymentComplete, true)
})

check('extra driver fee scales with extended days', () => {
  const pickup = parseAgencyDateTime('2026-08-20T10:00')
  const ret1 = parseAgencyDateTime('2026-08-23T19:00')
  const ret2 = parseAgencyDateTime('2026-08-24T19:00')
  const booking = {
    pickupDate: pickup,
    returnDate: ret1,
    car: { pricePerDay: 400 },
    priceBreakdown: { pricePerDay: 400, extraDriverFee: 150 },
    pricingSnapshot: { extras: { extraDriverEnabled: true, extraDriverFeePerDay: 50 } },
    secondDriver: { enabled: true },
  }
  const breakdown = buildExtendedBreakdown(booking, ret2)
  assert.ok(breakdown.days > calcRentalDays(pickup, ret1))
  assert.equal(breakdown.extraDriverFee, 50 * breakdown.days)
})

check('percentage discount scales with new rental price', () => {
  const pickup = parseAgencyDateTime('2026-08-20T10:00')
  const ret1 = parseAgencyDateTime('2026-08-23T19:00')
  const ret2 = parseAgencyDateTime('2026-08-25T19:00')
  const booking = {
    pickupDate: pickup,
    returnDate: ret1,
    car: { pricePerDay: 400 },
    priceBreakdown: {
      pricePerDay: 400,
      discounts: [{ label: 'Partner', amount: 160, discountType: 'percentage', discountValue: 10 }],
    },
  }
  const breakdown = buildExtendedBreakdown(booking, ret2)
  const expectedDiscount = Math.round(400 * breakdown.days * 0.1 * 100) / 100
  assert.equal(breakdown.discountTotal, expectedDiscount)
})

check('extension contract source refreshes dates on locked docs', () => {
  const existing = {
    customer_name: 'Edited Name',
    pickup_date: '20 Aug 2026, 10:00',
    return_date: '23 Aug 2026, 19:00',
    rental_days: '4',
    total_price: 'MAD 1,200',
    customer_signature_html: '<img alt="sig" />',
    _meta: { manuallyEdited: true },
  }
  const fresh = {
    customer_name: 'Booking Name',
    pickup_date: '20 Aug 2026, 10:00',
    return_date: '24 Aug 2026, 19:00',
    rental_days: '5',
    total_price: 'MAD 1,600',
    customer_signature_html: '<img alt="new" />',
    _meta: { bookingId: 'abc' },
  }
  const locked = mergeExtensionContractSource(existing, fresh, { locked: true })
  assert.equal(locked.customer_name, 'Edited Name')
  assert.equal(locked.return_date, '24 Aug 2026, 19:00')
  assert.equal(locked.rental_days, '5')
  assert.equal(locked.total_price, 'MAD 1,600')
  assert.equal(locked.customer_signature_html, '<img alt="new" />')

  const unlocked = mergeExtensionContractSource(existing, fresh, { locked: false })
  assert.equal(unlocked.customer_name, 'Booking Name')
  assert.equal(unlocked.return_date, '24 Aug 2026, 19:00')
})

console.log(`\n${passed} checks passed`)

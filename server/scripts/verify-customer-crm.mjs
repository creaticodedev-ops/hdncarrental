/**
 * Offline checks for customer CRM helpers.
 * Run: node scripts/verify-customer-crm.mjs
 */
import assert from 'node:assert/strict';
import {
  computeLoyaltyLevel,
  computeSmartStatus,
  computeCustomerJourney,
  suggestFollowUps,
  loyaltyBenefitsFor,
} from '../../shared/customerCrm.js';
import {
  buildCustomerCareWhatsAppMessage,
  CUSTOMER_CARE_TEMPLATE_IDS,
} from '../../shared/customerCareWhatsApp.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('verify-customer-crm');

check('loyalty tiers from rentals and spend', () => {
  assert.equal(computeLoyaltyLevel({ completedRentals: 0, totalSpent: 0 }), 'new');
  assert.equal(computeLoyaltyLevel({ completedRentals: 1, totalSpent: 800 }), 'regular');
  assert.equal(computeLoyaltyLevel({ completedRentals: 3, totalSpent: 0 }), 'gold');
  assert.equal(computeLoyaltyLevel({ completedRentals: 5, totalSpent: 0 }), 'vip');
  assert.equal(computeLoyaltyLevel({ completedRentals: 1, status: 'vip' }), 'vip');
});

check('VIP benefits include priority, not every perk on Regular', () => {
  const regular = loyaltyBenefitsFor('regular');
  const vip = loyaltyBenefitsFor('vip');
  assert.equal(regular.returningCustomerPerk, true);
  assert.equal(regular.freeUpgrade, false);
  assert.equal(vip.freeUpgrade, true);
  assert.equal(vip.priorityService, true);
});

check('smart status prefers issues and active rentals', () => {
  assert.equal(computeSmartStatus({ hasOpenIssue: true, hasActiveRental: true }), 'issue');
  assert.equal(computeSmartStatus({ hasActiveRental: true }), 'active');
  assert.equal(computeSmartStatus({ needsFollowUp: true, completedRentals: 4 }), 'needs_followup');
  assert.equal(computeSmartStatus({ loyaltyLevel: 'vip', completedRentals: 6 }), 'vip');
  assert.equal(computeSmartStatus({
    completedRentals: 0,
    lastBookingAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  }), 'inactive');
});

check('journey reaches pickup then active', () => {
  const now = new Date('2026-08-31T12:00:00Z');
  const journey = computeCustomerJourney({
    bookings: [
      { status: 'active', pickupDate: '2026-08-30T10:00:00Z', returnDate: '2026-09-03T10:00:00Z' },
    ],
    now,
  });
  assert.equal(journey.current, 'active');
  assert.equal(journey.stages.find((s) => s.id === 'reservation').reached, true);
  assert.equal(journey.stages.find((s) => s.id === 'active').current, true);
});

check('return reminder is suggested 24h before return', () => {
  const now = new Date('2026-09-02T12:00:00Z');
  const booking = {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    status: 'active',
    pickupDate: '2026-08-30T10:00:00Z',
    returnDate: '2026-09-03T10:00:00Z',
    reservationId: 'RES-1',
    completion: { signatureComplete: true },
  };
  const suggestions = suggestFollowUps({ bookings: [booking], now });
  assert.ok(suggestions.some((s) => s.kind === 'return_reminder'));
  assert.ok(suggestions.some((s) => s.kind === 'during_rental'));
  assert.ok(suggestions.some((s) => s.kind === 'signed_contract'));
});

check('WhatsApp templates are personal, not generic', () => {
  assert.ok(CUSTOMER_CARE_TEMPLATE_IDS.includes('during_rental'));
  const text = buildCustomerCareWhatsAppMessage({
    templateId: 'during_rental',
    language: 'en',
    brand: 'HDN Car',
    name: 'Amine El Fassi',
    vehicle: 'Dacia Duster',
    returnDate: '3 Sep 2026, 15:00',
  });
  assert.match(text, /Amine El Fassi/);
  assert.match(text, /Dacia Duster/);
  assert.match(text, /\*HDN Car\*/);
  const fr = buildCustomerCareWhatsAppMessage({
    templateId: 'winback',
    language: 'fr',
    name: 'Amine El Fassi',
    reservationId: 'RES-2026-1042',
  });
  assert.match(fr, /Amine El Fassi/);
  assert.match(fr, /RES-2026-1042/);
});

console.log(`\n${passed} checks passed`);

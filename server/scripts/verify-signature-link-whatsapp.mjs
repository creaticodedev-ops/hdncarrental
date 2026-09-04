/**
 * Offline: signature-link WhatsApp must open a chat with the customer, never the agency.
 * Run: node scripts/verify-signature-link-whatsapp.mjs
 */
import assert from 'node:assert/strict';
import {
  buildSignatureLinkWhatsAppMessage,
  normalizeShareLanguage,
} from '../../shared/signatureLinkWhatsApp.js';
import {
  buildSignatureLinkToCustomerWhatsAppUrl,
  buildCompletionToAgencyWhatsAppUrl,
  buildGuestToAgencyWhatsAppUrl,
  normalizeWhatsAppDial,
  DEFAULT_AGENCY_WHATSAPP,
} from '../services/whatsappNotify.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('verify-signature-link-whatsapp');

const sample = {
  brand: 'HDN Car',
  name: 'Amine El Fassi',
  reservationId: 'RES-2026-1042',
  vehicle: 'Dacia Duster (A-1042)',
  pickup: '4 Sep 2026, 10:00',
  returnDate: '7 Sep 2026, 10:00',
  link: 'https://example.test/complete-booking/token-abc',
};

check('language fallback is English', () => {
  assert.equal(normalizeShareLanguage('de'), 'en');
  assert.equal(normalizeShareLanguage('fr-FR'), 'fr');
});

check('signature-only copy asks the customer to sign', () => {
  const text = buildSignatureLinkWhatsAppMessage({ language: 'en', signatureOnly: true, ...sample });
  assert.match(text, /Amine El Fassi/);
  assert.match(text, /review and sign/);
  assert.match(text, /complete-booking\/token-abc/);
  assert.doesNotMatch(text, /please send to customer/i);
  assert.doesNotMatch(text, /Customer phone/);
});

check('full completion copy asks the customer to complete the booking', () => {
  const text = buildSignatureLinkWhatsAppMessage({ language: 'en', signatureOnly: false, ...sample });
  assert.match(text, /complete your booking/i);
});

check('French and Spanish signature-only variants exist', () => {
  const fr = buildSignatureLinkWhatsAppMessage({ language: 'fr', signatureOnly: true, ...sample });
  const es = buildSignatureLinkWhatsAppMessage({ language: 'es', signatureOnly: true, ...sample });
  assert.match(fr, /signer votre contrat/);
  assert.match(es, /firme su contrato/);
});

check('owner signature share targets the customer dial, not the agency fallback', () => {
  const share = buildSignatureLinkToCustomerWhatsAppUrl({
    language: 'fr',
    customerName: 'Amine El Fassi',
    customerPhone: '06 61 23 45 67',
    reservationId: 'RES-2026-1042',
    vehicle: 'Dacia Duster (A-1042)',
    pickupDate: new Date('2026-09-04T09:00:00Z'),
    returnDate: new Date('2026-09-07T09:00:00Z'),
    completionUrl: sample.link,
    signatureOnly: true,
  });
  assert.equal(share.ok, true);
  assert.equal(share.customerDial, '212661234567');
  assert.match(share.whatsappUrl, /^https:\/\/wa\.me\/212661234567\?text=/);
  assert.ok(!share.whatsappUrl.includes(`wa.me/${DEFAULT_AGENCY_WHATSAPP}`));
  assert.ok(share.whatsappUrl.includes(encodeURIComponent(sample.link)));
  assert.ok(share.message.includes('signer votre contrat'));
});

check('missing customer phone does not fall back to the agency number', () => {
  const share = buildSignatureLinkToCustomerWhatsAppUrl({
    customerName: 'No Phone',
    customerPhone: '',
    completionUrl: sample.link,
  });
  assert.equal(share.ok, false);
  assert.equal(share.code, 'NO_PHONE');
  assert.equal(share.whatsappUrl, '');
});

check('guest reservation WhatsApp still targets the agency number', () => {
  const agency = '212611111111';
  const url = buildGuestToAgencyWhatsAppUrl(
    {
      reservationId: 'RES-TEST',
      customerName: 'Test',
      customerPhone: '+212600000000',
    },
    agency,
  );
  assert.ok(url.startsWith(`https://wa.me/${agency}?text=`));
  assert.ok(!url.startsWith('https://wa.me/212600000000'));
});

check('legacy completion-to-agency helper still targets an agency dial', () => {
  const confirmationDial = '212622222222';
  const url = buildCompletionToAgencyWhatsAppUrl({
    reservationId: 'RES-TEST',
    customerName: 'Test',
    customerPhone: '+212600000000',
    completionUrl: sample.link,
    dial: confirmationDial,
  });
  assert.ok(url.startsWith(`https://wa.me/${confirmationDial}?text=`));
});

check('Moroccan 0-prefix phones normalize to 212', () => {
  assert.equal(normalizeWhatsAppDial('06 61 23 45 67'), '212661234567');
  assert.equal(normalizeWhatsAppDial('+212661234567'), '212661234567');
});

console.log(`\n${passed} checks passed`);

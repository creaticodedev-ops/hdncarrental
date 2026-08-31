/**
 * Offline checks for signed-contract WhatsApp copy.
 * Run: node scripts/verify-signed-contract-whatsapp.mjs
 */
import assert from 'node:assert/strict';
import {
  buildSignedContractWhatsAppMessage,
  normalizeShareLanguage,
} from '../../shared/signedContractWhatsApp.js';
import { normalizeWhatsAppDial, buildWaMeUrl } from '../services/whatsappNotify.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('verify-signed-contract-whatsapp');

const sample = {
  brand: 'HDN Car',
  name: 'Amine El Fassi',
  reservationId: 'RES-2026-1042',
  vehicle: 'Dacia Duster (A-1042)',
  pickup: '31 Aug 2026, 14:31',
  returnDate: '3 Sep 2026, 15:00',
  link: 'https://example.test/uploads/contracts/signed.pdf?sig=abc&exp=1',
};

check('language fallback is English', () => {
  assert.equal(normalizeShareLanguage('de'), 'en');
  assert.equal(normalizeShareLanguage('fr-FR'), 'fr');
});

check('English message is personalized', () => {
  const text = buildSignedContractWhatsAppMessage({ language: 'en', ...sample });
  assert.match(text, /Amine El Fassi/);
  assert.match(text, /RES-2026-1042/);
  assert.match(text, /Dacia Duster/);
  assert.match(text, /31 Aug 2026/);
  assert.match(text, /3 Sep 2026/);
  assert.match(text, /signed\.pdf/);
  assert.match(text, /\*HDN Car\*/);
  assert.match(text, /successfully signed and finalized/);
});

check('French and Spanish variants exist', () => {
  const fr = buildSignedContractWhatsAppMessage({ language: 'fr', ...sample });
  const es = buildSignedContractWhatsAppMessage({ language: 'es', ...sample });
  assert.match(fr, /signé et finalisé/);
  assert.match(es, /firmado y finalizado/);
  assert.match(fr, /Amine El Fassi/);
  assert.match(es, /RES-2026-1042/);
});

check('wa.me targets the customer, not the agency fallback', () => {
  const text = buildSignedContractWhatsAppMessage({ language: 'en', ...sample });
  const url = buildWaMeUrl(text, '0661234567');
  assert.match(url, /^https:\/\/wa\.me\/212661234567\?text=/);
  assert.ok(url.includes(encodeURIComponent('Amine El Fassi')));
});

check('Moroccan 0-prefix phones normalize to 212', () => {
  assert.equal(normalizeWhatsAppDial('06 61 23 45 67'), '212661234567');
  assert.equal(normalizeWhatsAppDial('+212661234567'), '212661234567');
});

console.log(`\n${passed} checks passed`);

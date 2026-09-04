/**
 * Offline: AgencySettings resolution + wa.me URL dial selection.
 * Run: node scripts/verify-whatsapp-settings.mjs
 */
import assert from 'assert';
import {
  buildGuestToAgencyWhatsAppUrl,
  buildCompletionToAgencyWhatsAppUrl,
  buildSignatureLinkToCustomerWhatsAppUrl,
  normalizeWhatsAppDial,
  DEFAULT_AGENCY_WHATSAPP,
} from '../services/whatsappNotify.js';

assert.equal(normalizeWhatsAppDial('+212 665-330-116'), '212665330116');
assert.equal(normalizeWhatsAppDial('0665330116'), '212665330116');

const reservationDial = '212611111111';
const confirmationDial = '212622222222';

const reservationUrl = buildGuestToAgencyWhatsAppUrl(
  {
    reservationId: 'RES-TEST',
    customerName: 'Test',
    customerPhone: '+212600000000',
    vehicle: 'Dacia Duster',
    pickupLocation: 'Casa',
    returnLocation: 'Casa',
    pickupDate: new Date('2026-08-10T10:00:00Z'),
    returnDate: new Date('2026-08-12T10:00:00Z'),
    price: 1000,
  },
  reservationDial,
);
assert.ok(reservationUrl.startsWith(`https://wa.me/${reservationDial}?text=`));
assert.ok(!reservationUrl.includes(confirmationDial));

const confirmationUrl = buildCompletionToAgencyWhatsAppUrl({
  reservationId: 'RES-TEST',
  customerName: 'Test',
  customerPhone: '+212600000000',
  vehicle: 'Dacia Duster',
  pickupLocation: 'Casa',
  returnLocation: 'Casa',
  pickupDate: new Date('2026-08-10T10:00:00Z'),
  returnDate: new Date('2026-08-12T10:00:00Z'),
  price: 1000,
  completionUrl: 'https://example.com/complete-booking/token',
  dial: confirmationDial,
});
assert.ok(confirmationUrl.startsWith(`https://wa.me/${confirmationDial}?text=`));
assert.ok(confirmationUrl.includes(encodeURIComponent('https://example.com/complete-booking/token')));

const customerShare = buildSignatureLinkToCustomerWhatsAppUrl({
  customerName: 'Test',
  customerPhone: '+212600000000',
  reservationId: 'RES-TEST',
  completionUrl: 'https://example.com/complete-booking/token',
  signatureOnly: true,
});
assert.equal(customerShare.ok, true);
assert.equal(customerShare.customerDial, '212600000000');
assert.ok(customerShare.whatsappUrl.startsWith('https://wa.me/212600000000?text='));
assert.ok(!customerShare.whatsappUrl.includes(reservationDial));
assert.ok(!customerShare.whatsappUrl.includes(confirmationDial));
assert.ok(!customerShare.whatsappUrl.includes(`wa.me/${DEFAULT_AGENCY_WHATSAPP}`));

const fallbackUrl = buildGuestToAgencyWhatsAppUrl({ reservationId: 'X' });
assert.ok(fallbackUrl.startsWith(`https://wa.me/${DEFAULT_AGENCY_WHATSAPP}?text=`) || fallbackUrl.includes('wa.me/'));

console.log('verify-whatsapp-settings: all assertions passed');

/**
 * Offline visual QA for free + reservation invoice templates (no DB).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_INVOICE_BODY,
  DEFAULT_INVOICE_HEADER,
  DEFAULT_INVOICE_FOOTER,
  DEFAULT_INVOICE_CUSTOM_CSS,
} from '../services/defaultTemplates.js';
import {
  buildInvoiceItemsHtml,
  buildInvoiceDiscountRowHtml,
  buildInvoiceTaxRowHtml,
  buildInvoiceRentalSectionHtml,
  buildInvoiceReservationMetaHtml,
  buildInvoiceAmountInWordsHtml,
  formatInvoiceMoney,
  formatInvoiceDate,
  buildCompanyCachetSignatureHtml,
} from '../services/invoiceTemplateHelpers.js';
import {
  OFFICIAL_COMPANY_PROFILE,
  resolveDefaultCompanyLogoDataUri,
} from '../services/companyBrandingService.js';
import { buildImageHtml } from '../services/templateEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const branding = { ...OFFICIAL_COMPANY_PROFILE };
const logoData = resolveDefaultCompanyLogoDataUri();
const logoHtml = logoData
  ? buildImageHtml(logoData, 'HDN CAR', 'max-height:64px;max-width:168px;').replace('<img ', '<img class="inv-logo" ')
  : '';

const fill = (html, vars) => html.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''));

const renderDoc = (vars) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>${vars.title}</title>
<style>
body{margin:0;background:#ebe4de}
.doc-page{width:210mm;min-height:297mm;margin:16px auto;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.12);padding:12mm}
${DEFAULT_INVOICE_CUSTOM_CSS}
</style></head><body>
<div class="doc-page">
<header class="doc-header">${fill(DEFAULT_INVOICE_HEADER, vars)}</header>
<main>${fill(DEFAULT_INVOICE_BODY, vars)}</main>
<footer class="doc-footer">${fill(DEFAULT_INVOICE_FOOTER, vars)}</footer>
</div></body></html>`;

const base = {
  company_logo_html: logoHtml,
  agency_brand_name_html: logoHtml ? '' : '<div class="inv-brand-name is-fallback">HDN CAR</div>',
  agency_name: branding.name,
  agency_address_line1: branding.addressLine1,
  agency_address_line2: branding.addressLine2,
  agency_address: branding.address,
  agency_phone: branding.phone,
  agency_email: branding.email,
  agency_ice: branding.ice,
  agency_if: branding.if,
  agency_rc: branding.rc,
  invoice_date: formatInvoiceDate(new Date()),
  invoice_payment_status: 'En attente',
  invoice_payment_method: 'Espèces',
  payment_reference_line: '',
  payment_instructions: '',
  notes: '',
  invoice_footer_note: '',
  company_cachet_signature_html: buildCompanyCachetSignatureHtml(branding, { includeCompanyStamp: true }),
};

const freeItems = [
  { description: 'Entretien véhicule — révision 20 000 km', details: 'Huile + filtres', quantity: 1, unitPrice: 850, discountAmount: 0 },
  { description: 'Kit accessoires GPS', quantity: 2, unitPrice: 200, discountAmount: 50 },
];
const freeSub = 850 + 400;
const freeDisc = 50;
const freeTotal = freeSub - freeDisc;

const freeVars = {
  ...base,
  title: 'Facture libre sample',
  invoice_number: 'INV-FREE-001',
  customer_name: 'Cabinet Notarial El Amrani',
  customer_address: 'Avenue Hassan II, Safi',
  customer_phone: '+212 524 000 000',
  customer_email: 'contact@notaire-elamrani.ma',
  customer_tax_id_line: '',
  invoice_reservation_meta_html: '',
  invoice_rental_section_html: '',
  invoice_items_html: buildInvoiceItemsHtml(freeItems, { currency: 'MAD' }),
  invoice_subtotal: formatInvoiceMoney(freeSub, 'MAD'),
  invoice_discount_row_html: buildInvoiceDiscountRowHtml(freeDisc, 'MAD'),
  invoice_total_ht: formatInvoiceMoney(freeTotal, 'MAD'),
  invoice_tax_row_html: '',
  invoice_total_ttc: formatInvoiceMoney(freeTotal, 'MAD'),
  invoice_amount_paid: formatInvoiceMoney(0, 'MAD'),
  invoice_balance_due: formatInvoiceMoney(freeTotal, 'MAD'),
  invoice_amount_in_words_html: buildInvoiceAmountInWordsHtml(freeTotal, 'MAD'),
};

const rentalVars = {
  ...base,
  title: 'Facture réservation sample',
  invoice_number: 'INV-2026-0042',
  invoice_payment_status: 'Partiellement payée',
  invoice_payment_method: 'Virement',
  payment_reference_line: ' · Réf. : VIR-99102',
  customer_name: 'Société Atlas Voyages & Événements SARL',
  customer_address: '12 Boulevard Mohammed V, Marrakech',
  customer_phone: '+212 600 000 000',
  customer_email: 'facturation@atlas-voyages.ma',
  customer_tax_id_line: 'Réf. / IF client : 12345678',
  invoice_reservation_meta_html: buildInvoiceReservationMetaHtml('RES-HDN-88421'),
  invoice_rental_section_html: buildInvoiceRentalSectionHtml({
    show: true,
    carMake: 'Mercedes-Benz Classe C',
    carRegistration: '12345-A-64',
    rentalDays: '3',
    reservationId: 'RES-HDN-88421',
    pickupDate: '28/10/2026 10:00',
    returnDate: '31/10/2026 10:00',
    pickupLocation: 'Aéroport Marrakech Menara',
    returnLocation: 'Agence HDN CAR Safi',
  }),
  invoice_items_html: buildInvoiceItemsHtml([
    { description: 'Location — Mercedes-Benz Classe C', quantity: 3, unitPrice: 850 },
    { description: 'Frais de livraison', quantity: 1, unitPrice: 250 },
  ], { currency: 'MAD' }),
  invoice_subtotal: formatInvoiceMoney(2800, 'MAD'),
  invoice_discount_row_html: buildInvoiceDiscountRowHtml(150, 'MAD'),
  invoice_total_ht: formatInvoiceMoney(2650, 'MAD'),
  invoice_tax_row_html: buildInvoiceTaxRowHtml(0, 'MAD'),
  invoice_total_ttc: formatInvoiceMoney(2650, 'MAD'),
  invoice_amount_paid: formatInvoiceMoney(1000, 'MAD'),
  invoice_balance_due: formatInvoiceMoney(1650, 'MAD'),
  invoice_amount_in_words_html: buildInvoiceAmountInWordsHtml(2650, 'MAD'),
  notes: 'Caution séparée non incluse.',
};

const outDir = path.join(root, 'uploads');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'invoice-preview-free.html'), renderDoc(freeVars), 'utf8');
fs.writeFileSync(path.join(outDir, 'invoice-preview-reservation.html'), renderDoc(rentalVars), 'utf8');
console.log('Wrote free + reservation samples with logo=', Boolean(logoHtml));
console.log(amountSentence(freeTotal));

function amountSentence(n) {
  return buildInvoiceAmountInWordsHtml(n, 'MAD').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

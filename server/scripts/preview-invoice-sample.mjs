/**
 * Offline visual QA sample for the premium invoice template (no DB).
 * Writes HTML to uploads/invoice-preview-sample.html
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
  formatInvoiceMoney,
  formatInvoiceDate,
  buildCompanyCachetSignatureHtml,
} from '../services/invoiceTemplateHelpers.js';
import { OFFICIAL_COMPANY_PROFILE } from '../services/companyBrandingService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const currency = 'MAD';
const items = [
  { description: 'Location — Mercedes-Benz Classe C AMG Line', quantity: 3, unitPrice: 850, taxRate: 0 },
  { description: 'Frais de livraison (Aéroport Marrakech Menara)', quantity: 1, unitPrice: 250, taxRate: 0 },
  { description: 'Conducteur supplémentaire — assurance tous risques', quantity: 1, unitPrice: 120, taxRate: 0 },
  {
    description: 'Service optionnel longue description pour tester le retour à la ligne sur une désignation étendue sans casser le tableau financier',
    quantity: 1,
    unitPrice: 75,
    taxRate: 0,
  },
];
const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
const discount = 150;
const tax = 0;
const total = subtotal - discount + tax;
const paid = 1000;
const due = Math.max(0, total - paid);
const branding = { ...OFFICIAL_COMPANY_PROFILE };

const vars = {
  company_logo_html: '',
  agency_name: branding.name,
  agency_address_line1: branding.addressLine1,
  agency_address_line2: branding.addressLine2,
  agency_address: branding.address,
  agency_phone: branding.phone,
  agency_email: branding.email,
  agency_ice: branding.ice,
  agency_if: branding.if,
  agency_rc: branding.rc,
  invoice_number: 'INV-2026-0042',
  invoice_date: formatInvoiceDate(new Date()),
  reservation_id: 'RES-HDN-88421',
  invoice_payment_status: 'Partiel',
  customer_name: 'Société Atlas Voyages & Événements SARL',
  customer_address: '12 Boulevard Mohammed V, Marrakech',
  customer_phone: '+212 600 000 000',
  customer_email: 'facturation@atlas-voyages.ma',
  customer_tax_id_line: 'Réf. / IF client : 12345678',
  car_make: 'Mercedes-Benz Classe C',
  car_registration: '12345-A-64',
  rental_days: '3',
  pickup_date: '28/10/2026 10:00',
  return_date: '31/10/2026 10:00',
  pickup_location: 'Aéroport Marrakech Menara',
  return_location: 'Agence HDN CAR Safi',
  invoice_items_html: buildInvoiceItemsHtml(items, { currency }),
  notes: 'Paiement sous 7 jours. Caution séparée non incluse dans cette facture.',
  payment_instructions: branding.paymentInstructions || 'Virement bancaire ou espèces à l’agence.',
  invoice_payment_method: 'Virement',
  payment_reference_line: ' · Réf. : VIR-99102',
  invoice_subtotal: formatInvoiceMoney(subtotal, currency),
  invoice_discount_row_html: buildInvoiceDiscountRowHtml(discount, currency),
  invoice_total_ht: formatInvoiceMoney(subtotal - discount, currency),
  invoice_tax_row_html: buildInvoiceTaxRowHtml(tax, currency),
  invoice_total_ttc: formatInvoiceMoney(total, currency),
  invoice_amount_paid: formatInvoiceMoney(paid, currency),
  invoice_balance_due: formatInvoiceMoney(due, currency),
  company_cachet_signature_html: buildCompanyCachetSignatureHtml(branding, { includeCompanyStamp: true }),
  invoice_footer_note: branding.invoiceFooter || '',
};

const fill = (html) => html.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''));

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Facture sample — HDN CAR</title>
<style>
  body { margin: 0; background: #ebe4de; }
  .doc-page {
    width: 210mm;
    min-height: 297mm;
    margin: 16px auto;
    background: #fff;
    box-shadow: 0 12px 40px rgba(0,0,0,.12);
  }
  ${DEFAULT_INVOICE_CUSTOM_CSS}
</style>
</head>
<body>
  <div class="doc-page">
    <header class="doc-header">${fill(DEFAULT_INVOICE_HEADER)}</header>
    <main>${fill(DEFAULT_INVOICE_BODY)}</main>
    <footer class="doc-footer">${fill(DEFAULT_INVOICE_FOOTER)}</footer>
  </div>
</body>
</html>`;

const outDir = path.join(root, 'uploads');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'invoice-preview-sample.html');
fs.writeFileSync(out, html, 'utf8');
console.log('Wrote', out);
console.log('Totals', { subtotal, discount, total, paid, due });

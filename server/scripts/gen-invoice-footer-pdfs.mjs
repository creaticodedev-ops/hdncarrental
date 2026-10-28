/**
 * Fast PDF-only generation for invoice footer QA (no lookalike rasterization).
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
import {
  buildDocumentForPdf,
  buildDocumentHtml,
  buildImageHtml,
} from '../services/templateEngine.js';
import { generatePdfFromTemplate } from '../services/templatePdfExport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'uploads', 'invoice-footer-qa');
fs.mkdirSync(outDir, { recursive: true });

const branding = { ...OFFICIAL_COMPANY_PROFILE };
const logoData = resolveDefaultCompanyLogoDataUri();
const logoHtml = logoData
  ? buildImageHtml(logoData, 'HDN CAR', 'max-height:64px;max-width:168px;').replace('<img ', '<img class="inv-logo" ')
  : '';

const template = {
  name: 'Facture HDN CAR',
  type: 'invoice',
  headerHtml: DEFAULT_INVOICE_HEADER,
  bodyHtml: DEFAULT_INVOICE_BODY,
  footerHtml: DEFAULT_INVOICE_FOOTER,
  customCss: DEFAULT_INVOICE_CUSTOM_CSS,
  pageSize: 'A4',
};

const baseVars = {
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
  invoice_due_date: '—',
  invoice_payment_method: 'Espèces',
  invoice_payment_reference: '—',
  invoice_footer_note: '',
  notes: '',
  payment_instructions: '',
  customer_name: 'ESSADI ISMAIL',
  customer_address: 'Safi, Maroc',
  customer_phone: '+212 600 000 000',
  customer_email: 'client@example.com',
  customer_tax_id_line: '',
  invoice_reservation_meta_html: '',
  invoice_rental_section_html: '',
  company_cachet_signature_html: buildCompanyCachetSignatureHtml(branding, { includeCompanyStamp: true }),
};

const buildVars = (invoiceNumber, items, totals) => ({
  ...baseVars,
  invoice_number: invoiceNumber,
  invoice_items_html: buildInvoiceItemsHtml(items, 'MAD'),
  invoice_subtotal: formatInvoiceMoney(totals.subtotal, 'MAD'),
  invoice_discount_row_html: buildInvoiceDiscountRowHtml(totals.discount, 'MAD'),
  invoice_total_ht: formatInvoiceMoney(totals.totalHt, 'MAD'),
  invoice_tax_row_html: buildInvoiceTaxRowHtml(totals.tax, 'MAD'),
  invoice_total_ttc: formatInvoiceMoney(totals.totalTtc, 'MAD'),
  invoice_amount_paid: formatInvoiceMoney(totals.paid, 'MAD'),
  invoice_balance_due: formatInvoiceMoney(totals.due, 'MAD'),
  invoice_amount_in_words_html: buildInvoiceAmountInWordsHtml(totals.totalTtc, 'MAD'),
});

const singleItems = [{ description: 'LOCATION CLIO 5', quantity: 1, unitPrice: 5625, discountAmount: 0 }];
const singleTotals = { subtotal: 5625, discount: 0, totalHt: 5625, tax: 1125, totalTtc: 6750, paid: 0, due: 6750 };

const multiItems = Array.from({ length: 28 }, (_, i) => ({
  description: `Prestation ${i + 1} — service premium location / entretien`,
  details: i % 3 === 0 ? 'Détail complémentaire de ligne pour forcer la pagination A4' : '',
  quantity: 1 + (i % 3),
  unitPrice: 180 + i * 17,
  discountAmount: i % 5 === 0 ? 20 : 0,
}));
const multiSub = multiItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
const multiDisc = multiItems.reduce((s, it) => s + (it.discountAmount || 0), 0);
const multiHt = multiSub - multiDisc;
const multiTax = Math.round(multiHt * 0.2 * 100) / 100;
const multiTtc = multiHt + multiTax;
const multiTotals = {
  subtotal: multiSub,
  discount: multiDisc,
  totalHt: multiHt,
  tax: multiTax,
  totalTtc: multiTtc,
  paid: 0,
  due: multiTtc,
};

const writeAll = async (name, vars) => {
  const preview = buildDocumentHtml(template, vars);
  fs.writeFileSync(path.join(outDir, `${name}.html`), preview, 'utf8');
  const { html, pdfOptions } = buildDocumentForPdf(template, vars);
  if (/class="doc-footer"/i.test(html)) throw new Error(`${name}: flow footer still in PDF HTML`);
  if (!pdfOptions.displayHeaderFooter) throw new Error(`${name}: missing chrome footer`);
  const file = path.join(outDir, `${name}.pdf`);
  await generatePdfFromTemplate({
    template,
    variables: vars,
    filePath: file,
    title: name,
    html,
    pdfOptions,
  });
  console.log('Wrote', file);
};

const singleVars = buildVars('INV-FOOTER-SINGLE', singleItems, singleTotals);
const multiVars = buildVars('INV-FOOTER-MULTI', multiItems, multiTotals);
multiVars.invoice_reservation_meta_html = buildInvoiceReservationMetaHtml('RSV-2048');
multiVars.invoice_rental_section_html = buildInvoiceRentalSectionHtml({
  show: true,
  carMake: 'Dacia Logan',
  carRegistration: '12345-A-6',
  reservationId: 'RSV-2048',
  pickupDate: '01/11/2026',
  returnDate: '08/11/2026',
  pickupLocation: 'Safi',
  returnLocation: 'Safi',
  rentalDays: 7,
});

await writeAll('invoice-footer-single', singleVars);
await writeAll('invoice-footer-multi', multiVars);
console.log('Done');

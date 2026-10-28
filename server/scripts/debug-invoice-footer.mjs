import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDocumentForPdf,
} from '../services/templateEngine.js';
import {
  DEFAULT_INVOICE_BODY,
  DEFAULT_INVOICE_HEADER,
  DEFAULT_INVOICE_FOOTER,
  DEFAULT_INVOICE_CUSTOM_CSS,
} from '../services/defaultTemplates.js';
import { withPdfPage, closePdfBrowser } from '../utils/launchPdfBrowser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'uploads', 'invoice-footer-qa');

const template = {
  type: 'invoice',
  name: 't',
  headerHtml: DEFAULT_INVOICE_HEADER,
  bodyHtml: DEFAULT_INVOICE_BODY,
  footerHtml: DEFAULT_INVOICE_FOOTER,
  customCss: DEFAULT_INVOICE_CUSTOM_CSS,
  pageSize: 'A4',
};

const vars = {
  agency_name: 'HDN CAR',
  agency_address: 'AB IBN BATTOUTA, QUARTIER AZIB DERAI, SAFI, MAROC',
  agency_phone: '+212 661 865 184',
  agency_email: 'haddanecar@gmail.com',
  agency_ice: '003790056000093',
  agency_if: '68379943',
  agency_rc: '16263',
  agency_address_line1: 'AB IBN BATTOUTA, QUARTIER AZIB DERAI',
  agency_address_line2: 'SAFI, MAROC',
  invoice_footer_note: '',
  invoice_number: 'INV-DEBUG',
  invoice_date: '28 octobre 2026',
  invoice_due_date: '—',
  invoice_payment_method: 'Espèces',
  invoice_payment_reference: '—',
  customer_name: 'ESSADI ISMAIL',
  customer_address: 'Safi',
  customer_phone: '',
  customer_email: '',
  customer_tax_id_line: '',
  notes: '',
  payment_instructions: '',
  company_logo_html: '',
  agency_brand_name_html: '<div class="inv-brand-name is-fallback">HDN CAR</div>',
  invoice_reservation_meta_html: '',
  invoice_rental_section_html: '',
  invoice_items_html: Array.from({ length: 20 }, (_, i) => `<tr><td>Prestation ${i + 1}</td><td>1</td><td>100,00 MAD</td><td>100,00 MAD</td></tr>`).join(''),
  invoice_subtotal: '2.000,00 MAD',
  invoice_discount_row_html: '',
  invoice_total_ht: '2.000,00 MAD',
  invoice_tax_row_html: '',
  invoice_total_ttc: '2.000,00 MAD',
  invoice_amount_paid: '0,00 MAD',
  invoice_balance_due: '2.000,00 MAD',
  invoice_amount_in_words_html: '<div class="inv-amount-words"><p class="inv-section-label">Arrêtée à</p><p class="inv-amount-words-text">Deux mille dirhams.</p></div>',
  company_cachet_signature_html: '<div class="inv-cachet"><p class="inv-cachet-title">Cachet et signature</p><div class="inv-cachet-box"></div></div>',
};

const { html, pdfOptions } = buildDocumentForPdf(template, vars);
fs.writeFileSync(path.join(outDir, 'debug-pdf.html'), html, 'utf8');
console.log('has doc-footer', /class="doc-footer"/.test(html));
console.log('has inv-legal-footer in html', /inv-legal-footer/.test(html));
console.log('body class', html.match(/<body class="([^"]*)"/)?.[1]);
console.log('margin', pdfOptions.margin);
console.log('displayHeaderFooter', pdfOptions.displayHeaderFooter);
console.log('footerTemplate:\n', pdfOptions.footerTemplate);

const pdfPath = path.join(outDir, 'debug-margin.pdf');
await withPdfPage(async (page) => {
  await page.setContent(html, { waitUntil: 'load', timeout: 60_000 });
  await page.emulateMediaType('print');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: pdfOptions.footerTemplate,
    margin: pdfOptions.margin,
  });
});
console.log('Wrote', pdfPath);
await closePdfBrowser();
process.exit(0);

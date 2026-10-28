import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { resolveChromeExecutablePath } from '../utils/launchPdfBrowser.js';
import { buildChromePageFooterTemplate, renderTemplate } from '../services/templateEngine.js';
import { DEFAULT_INVOICE_FOOTER } from '../services/defaultTemplates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'uploads', 'invoice-footer-qa');

const footer = buildChromePageFooterTemplate(renderTemplate(DEFAULT_INVOICE_FOOTER, {
  agency_name: 'HDN CAR',
  agency_address: 'AB IBN BATTOUTA, QUARTIER AZIB DERAI, SAFI, MAROC',
  agency_phone: '+212 661 865 184',
  agency_email: 'haddanecar@gmail.com',
  agency_ice: '003790056000093',
  agency_if: '68379943',
  agency_rc: '16263',
  invoice_footer_note: '',
}));

const rows = Array.from({ length: 40 }, (_, i) => `<div style="padding:6px 0;border-bottom:1px solid #ddd;">Line ${i + 1} — enough content to force multiple pages</div>`).join('');

const html = `<!DOCTYPE html><html><head><style>
  @page { size: A4; }
  body { margin: 0; font-family: Arial, sans-serif; font-size: 11pt; }
</style></head><body>
  <h1>Chrome footer margin probe</h1>
  ${rows}
</body></html>`;

const executablePath = resolveChromeExecutablePath();
const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const pdfPath = path.join(outDir, 'margin-probe.pdf');
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: footer,
  margin: { top: '12mm', right: '12mm', bottom: '22mm', left: '12mm' },
  preferCSSPageSize: false,
});
await browser.close();
console.log('Wrote', pdfPath);
console.log('Footer template:\n', footer);
process.exit(0);

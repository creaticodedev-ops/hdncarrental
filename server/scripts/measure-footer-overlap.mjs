/**
 * Measure chrome footer vs content using PDF.js raw viewport Y (0 = top).
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import puppeteer from 'puppeteer';
import { resolveChromeExecutablePath } from '../utils/launchPdfBrowser.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.resolve(process.argv[2] || path.join(__dirname, '..', 'uploads', 'invoice-footer-qa', 'invoice-footer-multi.pdf'));
const outPath = path.join(path.dirname(pdfPath), 'overlap-report.json');
const pdfjsPath = require.resolve('pdfjs-dist/build/pdf.mjs');
const pdfjsWorker = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
const pdfBytes = fs.readFileSync(pdfPath);

const log = (msg) => process.stdout.write(`${msg}\n`);

let htmlPage = '';
const server = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*' };
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...cors });
    res.end(htmlPage);
    return;
  }
  if (req.url === '/doc.pdf') {
    res.writeHead(200, { 'Content-Type': 'application/pdf', ...cors });
    res.end(pdfBytes);
    return;
  }
  if (req.url === '/pdf.mjs') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', ...cors });
    res.end(fs.readFileSync(pdfjsPath));
    return;
  }
  if (req.url === '/pdf.worker.mjs') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', ...cors });
    res.end(fs.readFileSync(pdfjsWorker));
    return;
  }
  res.writeHead(404); res.end();
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

htmlPage = `<!DOCTYPE html><html><body><script type="module">
import * as pdfjs from '${base}/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '${base}/pdf.worker.mjs';
const doc = await pdfjs.getDocument({ url: '${base}/doc.pdf' }).promise;
const page = await doc.getPage(1);
const viewport = page.getViewport({ scale: 1 });
const tc = await page.getTextContent();
const items = tc.items.map((it) => {
  const t = pdfjs.Util.transform(viewport.transform, it.transform);
  return { str: it.str, x: t[4], yTop: t[5], fontSize: Math.hypot(t[0], t[1]) };
});
window.__result = { pageHeight: viewport.height, items };
window.__ready = true;
</script></body></html>`;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChromeExecutablePath(),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.goto(`${base}/`, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForFunction(() => window.__ready === true, { timeout: 60_000 });
  const result = await page.evaluate(() => window.__result);

  const prestations = result.items.filter((i) => /Prestation\s+\d+/i.test(i.str));
  const chromeFooter = result.items.filter((i) =>
    i.fontSize < 7.2 && (/ICE\s*:|haddanecar@|HDN CAR/i.test(i.str)));
  const lastContent = [...prestations].sort((a, b) => b.yTop - a.yTop)[0];
  const firstFooter = [...chromeFooter].sort((a, b) => a.yTop - b.yTop)[0];
  const gap = firstFooter && lastContent ? firstFooter.yTop - lastContent.yTop : null;

  const report = {
    pageHeight: result.pageHeight,
    prestationCount: prestations.length,
    lastContent,
    firstFooter,
    gap,
    status: gap == null ? 'UNKNOWN' : (gap < 10 ? 'OVERLAP' : 'OK'),
    allPrestations: [...prestations].sort((a, b) => a.yTop - b.yTop).map((i) => ({ str: i.str, yTop: i.yTop })),
    chromeFooter: [...chromeFooter].sort((a, b) => a.yTop - b.yTop),
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  log(`prestations on p1: ${report.prestationCount}`);
  log(`last content: ${lastContent?.str} yTop=${lastContent?.yTop?.toFixed(1)}`);
  log(`first chrome footer: ${firstFooter?.str} yTop=${firstFooter?.yTop?.toFixed(1)}`);
  log(`gap=${gap?.toFixed(1)} status=${report.status}`);
} finally {
  await browser.close();
  server.close();
  process.exit(0);
}

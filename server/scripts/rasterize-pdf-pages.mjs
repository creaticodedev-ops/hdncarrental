/**
 * Rasterize PDF pages to PNG via Chromium + PDF.js over HTTP.
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { withPdfPage } from '../utils/launchPdfBrowser.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pdfPath = path.resolve(process.argv[2] || path.join(__dirname, '..', 'uploads', 'invoice-footer-qa', 'invoice-footer-single.pdf'));
const outPrefix = process.argv[3] || path.join(path.dirname(pdfPath), path.basename(pdfPath, '.pdf'));
const pdfjsPath = require.resolve('pdfjs-dist/build/pdf.mjs');
const pdfjsWorker = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
const pdfBytes = fs.readFileSync(pdfPath);

const server = http.createServer((req, res) => {
  if (req.url === '/doc.pdf') {
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBytes.length,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(pdfBytes);
    return;
  }
  if (req.url === '/pdf.mjs') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(pdfjsPath));
    return;
  }
  if (req.url === '/pdf.worker.mjs') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(pdfjsWorker));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const html = `<!DOCTYPE html>
<html><body style="margin:0;background:#fff">
<canvas id="c"></canvas>
<script type="module">
  import * as pdfjs from '${base}/pdf.mjs';
  pdfjs.GlobalWorkerOptions.workerSrc = '${base}/pdf.worker.mjs';
  try {
    const doc = await pdfjs.getDocument({ url: '${base}/doc.pdf' }).promise;
    window.__pdfPageCount = doc.numPages;
    window.__renderPage = async (n, scale = 2) => {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale });
      const canvas = document.getElementById('c');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    };
    window.__error = '';
  } catch (e) {
    window.__error = String(e && e.message ? e.message : e);
  }
  window.__ready = true;
</script>
</body></html>`;

try {
  await withPdfPage(async (page) => {
    page.setDefaultNavigationTimeout(120_000);
    page.on('console', (msg) => console.log('BROWSER:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
    await page.setContent(html, { waitUntil: 'load', timeout: 120_000 });
    await page.waitForFunction(() => window.__ready === true, { timeout: 120_000 });
    const err = await page.evaluate(() => window.__error || '');
    if (err) throw new Error(`pdf.js failed: ${err}`);
    const count = await page.evaluate(() => window.__pdfPageCount);
    console.log('Pages:', count);
    for (let i = 1; i <= count; i += 1) {
      await page.evaluate(async (n) => { await window.__renderPage(n, 2); }, i);
      const out = `${outPrefix}-p${i}.png`;
      const canvas = await page.$('#c');
      await canvas.screenshot({ path: out, type: 'png' });
      console.log('Wrote', out);
    }
  });
} finally {
  server.close();
  process.exit(0);
}

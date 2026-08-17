/**
 * Screenshots of the signature-only page against a stubbed API (dev aid).
 *
 *   cd client && npx vite preview --port 4174
 *   cd server && node scripts/shot-signature-only.mjs
 */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.SMOKE_BASE || 'http://localhost:4174'
const TOKEN = 'a'.repeat(64)
const OUT = process.env.SHOT_DIR || path.join(process.cwd(), 'tmp-shots')
const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

fs.mkdirSync(OUT, { recursive: true })

const booking = {
  reservationId: 'RES-1001',
  status: 'confirmed',
  channel: 'walk_in',
  mode: 'signature_only',
  requestStatus: 'pending',
  customerName: 'Zakaria Douami',
  customerEmail: '',
  customerPhone: '+212 611 223 344',
  pickupDate: '2026-08-20T10:00:00.000Z',
  returnDate: '2026-08-25T10:00:00.000Z',
  pickupLocation: 'Casablanca Airport',
  returnLocation: 'Casablanca Airport',
  price: 1700,
  paymentStatus: 'paid',
  secondDriver: { enabled: false },
  car: { brand: 'Renault', model: 'Clio 5', year: 2024, category: 'Compact' },
  completion: { documentsComplete: false, paymentComplete: true, signatureComplete: false },
}

const contractHtml = `<!DOCTYPE html><html><head><style>
body{font-family:Georgia,serif;padding:28px;color:#1a1a1a}
h1{font-size:19px;letter-spacing:.06em;text-align:center;margin:0 0 4px}
.sub{text-align:center;color:#777;font-size:12px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:16px}
td{border:1px solid #ddd;padding:7px 9px}
td:first-child{background:#fafafa;color:#666;width:38%}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#8f1f1f;margin:18px 0 8px}
p{font-size:12px;line-height:1.6;color:#444}
</style></head><body>
<h1>CONTRAT DE LOCATION DE VÉHICULE</h1>
<div class="sub">N° RES-1001 — Americonfort Car</div>
<h2>Locataire</h2>
<table><tr><td>Nom / Prénom</td><td>Zakaria Douami</td></tr>
<tr><td>Téléphone</td><td>+212 611 223 344</td></tr>
<tr><td>Adresse</td><td>—</td></tr>
<tr><td>CIN</td><td>—</td></tr>
<tr><td>Permis de conduire</td><td>—</td></tr></table>
<h2>Véhicule et période</h2>
<table><tr><td>Véhicule</td><td>Renault Clio 5 (2024)</td></tr>
<tr><td>Départ</td><td>20/08/2026 10:00 — Casablanca Airport</td></tr>
<tr><td>Retour</td><td>25/08/2026 10:00 — Casablanca Airport</td></tr>
<tr><td>Total</td><td>1 700 MAD</td></tr></table>
<h2>Conditions générales</h2>
<p>Le locataire s'engage à restituer le véhicule dans l'état où il l'a reçu, à la date et au lieu convenus.
Toute prolongation doit faire l'objet d'un accord écrit préalable de l'agence.</p>
</body></html>`

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const shoot = async ({ name, width, height, expand }) => {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 2 })
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (!url.includes('/api/')) return req.continue()
    const json = (body) =>
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.includes('/contract-preview')) return json({ success: true, html: contractHtml })
    if (url.includes('/api/booking-completion/')) return json({ success: true, booking })
    return json({ success: true })
  })

  await page.goto(`${BASE}/complete-booking/${TOKEN}`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 700))

  if (expand) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /view contract|voir le contrat|ver contrato/i.test(b.textContent || ''),
      )
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 1200))
  }

  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(file)
  await page.close()
}

await shoot({ name: 'signature-only-mobile', width: 390, height: 844 })
await shoot({ name: 'signature-only-desktop', width: 1180, height: 900, expand: true })

await browser.close()

/**
 * Renders the signature-only completion page against a stubbed API and asserts
 * the customer sees a locked "review + sign" screen with no editable reservation
 * fields and no untranslated strings.
 *
 * Requires a built client served by `vite preview`:
 *   cd client && npx vite preview --port 4174
 *   cd server && node scripts/smoke-signature-only-page.mjs
 */
import puppeteer from 'puppeteer'

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:4174'
const TOKEN = 'a'.repeat(64)
const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

/**
 * Deliberately a *bare* walk-in: every identity field blank, which is what the desk
 * form produces and what used to drop the customer into the completion wizard.
 * A complete fixture here would hide that regression.
 */
const bookingPayload = {
  reservationId: 'RES-1001',
  status: 'confirmed',
  channel: 'walk_in',
  mode: 'signature_only',
  requestStatus: 'pending',
  customerName: 'Zakaria Douami',
  customerEmail: '',
  customerPhone: '+212611223344',
  customerAddress: '',
  placeOfBirth: '',
  identityDocumentNumber: '',
  identityIssuedOn: '',
  driverLicenseIssuedOn: '',
  driverLicenseNumber: '',
  driverLicenseExpiry: '',
  dateOfBirth: '',
  nationality: '',
  passportNumber: '',
  pickupDate: '2026-08-20T10:00:00.000Z',
  returnDate: '2026-08-25T10:00:00.000Z',
  pickupLocation: 'Casablanca Airport',
  returnLocation: 'Casablanca Airport',
  price: 1700,
  paymentStatus: 'paid',
  secondDriver: { enabled: false },
  car: { brand: 'Renault', model: 'Clio 5', year: 2024, category: 'Compact' },
  completion: {
    signatureUrl: '',
    documentsComplete: false,
    paymentComplete: true,
    signatureComplete: false,
    contractPdfUrl: '',
  },
}

const contractHtml =
  '<!DOCTYPE html><html><body><h1>CONTRAT DE LOCATION</h1><p>RES-1001</p></body></html>'

const fail = (msg) => {
  console.error(`✗ ${msg}`)
  process.exitCode = 1
}
const ok = (msg) => console.log(`  ✓ ${msg}`)

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844 })
page.setDefaultTimeout(45_000)

const pageErrors = []
page.on('pageerror', (err) => pageErrors.push(err.message))

const seenRequests = []
await page.setRequestInterception(true)
page.on('request', (req) => {
  const url = req.url()
  if (!url.includes('/api/')) return req.continue()
  seenRequests.push(`${req.method()} ${new URL(url).pathname}`)

  const json = (body) =>
    req.respond({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(body),
    })

  if (url.includes(`/api/booking-completion/${TOKEN}/contract-preview`)) {
    return json({ success: true, html: contractHtml, contractNumber: 'RES-1001' })
  }
  if (url.includes(`/api/booking-completion/${TOKEN}`)) {
    return json({ success: true, booking: bookingPayload })
  }
  return json({ success: true })
})

console.log('smoke-signature-only-page')

await page.goto(`${BASE}/complete-booking/${TOKEN}`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 800))

const body = await page.evaluate(() => document.body.innerText)

if (/Sign your rental contract|Signez votre contrat|Firme su contrato/i.test(body)) {
  ok('locked signature page rendered')
} else {
  fail(`expected the signature-only heading, got:\n${body.slice(0, 400)}`)
}

if (body.includes('Zakaria Douami') && body.includes('Renault Clio 5')) {
  ok('reservation details shown read-only')
} else {
  fail('reservation summary missing')
}

// The exact wording from the bug report: none of this may appear on a walk-in link.
const wizardPrompts = [
  /passport/i,
  /driving licen[cs]e|driver'?s? licen[cs]e|permis de conduire/i,
  /national id|identity document|carte nationale/i,
  /upload|téléverser|browse files|choose file/i,
  /issued on|date of issue|délivré/i,
  /additional driver|second driver|deuxième conducteur/i,
]
const leaked = wizardPrompts.filter((re) => re.test(body)).map(String)
if (leaked.length === 0) {
  ok('no document, ID or additional-driver prompts')
} else {
  fail(`completion-wizard prompts leaked onto the signature page: ${leaked.join(', ')}`)
}

if (!(await page.$('input[type="file"]'))) {
  ok('no file inputs anywhere on the page')
} else {
  fail('the page still offers document uploads')
}

const editableInputs = await page.$$eval('input, select, textarea', (nodes) =>
  nodes
    .filter((n) => n.type !== 'checkbox' && n.type !== 'hidden' && !n.disabled && !n.readOnly)
    .map((n) => `${n.tagName.toLowerCase()}[${n.type || 'text'}]`),
)
if (editableInputs.length === 0) {
  ok('no editable reservation fields on the page')
} else {
  fail(`customer can still edit: ${editableInputs.join(', ')}`)
}

const hasPad = await page.$('canvas')
if (hasPad) ok('signature pad present')
else fail('signature pad missing')

// "View contract" must fetch and embed the unsigned contract.
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    /view contract|voir le contrat|ver contrato/i.test(b.textContent || ''),
  )
  if (!btn) return false
  btn.click()
  return true
})
if (!clicked) fail('no "View contract" button found')
await new Promise((r) => setTimeout(r, 1200))
const frameCount = await page.$$eval('iframe', (n) => n.length)
if (seenRequests.some((r) => r.endsWith('/contract-preview')) && frameCount > 0) {
  ok('contract preview loaded into the page')
} else {
  fail(`contract preview not loaded (requests: ${seenRequests.join(', ')})`)
}

const untranslated = (body.match(/completion\.[a-zA-Z.]+|admin\.[a-zA-Z.]+/g) || []).filter(Boolean)
if (untranslated.length === 0) ok('no untranslated i18n keys visible')
else fail(`untranslated keys rendered: ${[...new Set(untranslated)].join(', ')}`)

const wroteReservation = seenRequests.filter((r) => /\/details|\/documents/.test(r))
if (wroteReservation.length === 0) ok('page never called the details or documents endpoints')
else fail(`page called locked endpoints: ${wroteReservation.join(', ')}`)

if (pageErrors.length === 0) ok('no runtime errors')
else fail(`runtime errors: ${pageErrors.join(' | ')}`)

await browser.close()

console.log(process.exitCode ? '\nFAILED' : '\nAll checks passed')

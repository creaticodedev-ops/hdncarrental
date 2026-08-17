/**
 * Renders the redesigned car details page against a stubbed API and asserts the
 * gallery, the 3-step reservation wizard, per-step validation and mobile layout all
 * behave. Business logic (quote, booking rules) is stubbed, not bypassed.
 *
 * Requires a built client served by `vite preview`:
 *   cd client && npx vite preview --port 4174
 *   cd server && node scripts/verify-car-details-page.mjs
 */
import puppeteer from 'puppeteer'

const BASE = process.env.SMOKE_BASE || 'http://localhost:4174'
const CAR_ID = '65f000000000000000000001'
const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const photo = (n) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#e8e2de"/><text x="50%" y="52%" font-size="64" text-anchor="middle" fill="#8F1F1F" font-family="serif">${n}</text></svg>`,
  )}`

const CAR = {
  _id: CAR_ID,
  brand: 'Kia',
  model: 'Picanto 2025',
  year: 2025,
  category: 'Economy',
  image: photo(1),
  images: [photo(1), photo(2), photo(3), photo(4), photo(5)],
  seating_capacity: 5,
  fuel_type: 'Gasoline',
  transmission: 'Automatic',
  pricePerDay: 250,
  locations: ['Casablanca', 'Marrakech'],
  description: 'The Kia Picanto 2025 is the perfect city car: compact, efficient and easy to drive.',
  features: ['Bluetooth', 'Air conditioning', 'USB-C', 'Reversing camera'],
  isAvaliable: true,
  status: 'available',
}

// minRentalDays 3 mirrors the reference screenshot's "Minimum rental duration" notice.
const BOOKING_RULES = {
  minRentalDays: 3,
  maxRentalDays: 90,
  advanceBookingDays: 365,
  pickupHoursStart: '08:00',
  pickupHoursEnd: '20:00',
  returnHoursStart: '08:00',
  returnHoursEnd: '20:00',
}

const LOCATIONS = [
  { _id: 'loc1', name: 'Casablanca Airport', address: 'Mohammed V', city: 'Casablanca', deliveryFee: 0 },
  { _id: 'loc2', name: 'Marrakech Menara', address: 'Menara', city: 'Marrakech', deliveryFee: 150 },
]

let failures = 0
const fail = (msg) => {
  failures += 1
  console.error(`  \u2717 ${msg}`)
}
const ok = (msg) => console.log(`  \u2713 ${msg}`)

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const openPage = async (width, height) => {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 2 })
  page.setDefaultTimeout(45_000)

  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|404/i.test(m.text())) errors.push(m.text())
  })

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (!url.includes('/api/')) return req.continue()
    const json = (body) =>
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

    if (url.includes('/booking-rules')) {
      return json({ success: true, bookingRules: BOOKING_RULES, unavailablePeriods: [], unitCount: 1 })
    }
    if (url.includes(`/api/user/cars/${CAR_ID}`)) {
      return json({ success: true, car: { ...CAR, bookingRules: BOOKING_RULES } })
    }
    if (url.includes('/api/user/cars')) return json({ success: true, cars: [CAR] })
    if (url.includes('/api/pickup-locations')) return json({ success: true, locations: LOCATIONS })
    if (url.includes('/api/bookings/quote')) {
      return json({
        success: true,
        bookingSettings: BOOKING_RULES,
        priceBreakdown: {
          days: 5,
          pricePerDay: 250,
          rentalPrice: 1250,
          pickupDeliveryFee: 0,
          dropoffDeliveryFee: 0,
          extraDriverFee: 0,
          discounts: [],
          discountTotal: 0,
          subtotal: 1250,
          total: 1250,
        },
      })
    }
    return json({ success: true })
  })

  await page.goto(`${BASE}/car-details/${CAR_ID}`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 1200))
  return { page, errors }
}

const text = (page) => page.evaluate(() => document.body.innerText)

const clickByText = (page, re) =>
  page.evaluate((source) => {
    const rx = new RegExp(source, 'i')
    const btn = [...document.querySelectorAll('button')].find((b) => rx.test(b.textContent || ''))
    if (!btn) return false
    btn.click()
    return true
  }, re.source)

console.log('verify-car-details-page')

/* ---------------------------------------------------------------- desktop ---- */
{
  const { page, errors } = await openPage(1280, 900)
  const body = await text(page)

  if (/Kia Picanto 2025/.test(body) && /ECONOMY|Economy/.test(body)) ok('vehicle identity rendered')
  else fail(`vehicle title missing:\n${body.slice(0, 300)}`)

  if (/250/.test(body) && /Starting from/i.test(body)) ok('price shown as "starting from"')
  else fail('starting-from price missing')

  // Gallery: counter, arrows, thumbnails.
  const counter = await page.evaluate(() =>
    [...document.querySelectorAll('span')]
      .map((s) => s.textContent.replace(/\s+/g, ''))
      .find((s) => /^0\d\/0\d$/.test(s)) || '',
  )
  if (counter === '01/05') ok(`gallery counter shows ${counter}`)
  else fail(`expected counter 01/05, got "${counter}"`)

  const thumbs = await page.$$eval('button[aria-label^="Show photo"]', (n) => n.length)
  if (thumbs >= 5) ok(`${thumbs} thumbnails rendered from images[]`)
  else fail(`expected 5 thumbnails, got ${thumbs}`)

  await page.click('button[aria-label="Next photo"]')
  await new Promise((r) => setTimeout(r, 600))
  const counter2 = await page.evaluate(() =>
    [...document.querySelectorAll('span')]
      .map((s) => s.textContent.replace(/\s+/g, ''))
      .find((s) => /^0\d\/0\d$/.test(s)) || '',
  )
  if (counter2 === '02/05') ok('next arrow advances the gallery')
  else fail(`arrow did not advance, counter is "${counter2}"`)

  // Specs must only reflect real Car fields.
  if (/Gasoline/.test(body) && /Automatic/.test(body) && /Casablanca/.test(body)) {
    ok('spec grid built from real model fields')
  } else fail('spec grid missing values')

  if (/Luggage|Doors|\bA\/C\b/i.test(body)) fail('spec grid invents fields absent from the Car model')
  else ok('no invented specs (luggage / doors / A-C)')

  // Wizard: 3 steps, step 1 active, gated Continue.
  const stepLabels = await page.$$eval('ol > li', (items) =>
    items.map((li) => li.lastElementChild?.textContent.trim() || ''),
  )
  if (stepLabels.length === 3 && stepLabels.every(Boolean)) {
    ok(`stepper renders 3 steps: ${stepLabels.join(' / ')}`)
  } else fail(`expected 3 labelled steps, got ${JSON.stringify(stepLabels)}`)

  const activeStep = await page.$eval('button[aria-current="step"]', (n) => n.textContent.trim())
  if (activeStep === '1') ok('step 1 is active on load')
  else fail(`expected step 1 active, got "${activeStep}"`)

  if (/Minimum|minimum/.test(body)) ok('minimum rental duration notice surfaced')
  else fail('minimum rental duration notice missing')

  if (!(await clickByText(page, /continue/i))) fail('no Continue button')
  await new Promise((r) => setTimeout(r, 500))
  const blocked = await page.$eval('button[aria-current="step"]', (n) => n.textContent.trim())
  const afterBlock = await text(page)
  if (blocked === '1' && /choose your pickup and return dates/i.test(afterBlock)) {
    ok('Continue is blocked with an explanation while dates are missing')
  } else fail(`step advanced without dates (step=${blocked})`)

  // A contact field must not exist yet — that would mean all steps are mounted at once.
  if (!(await page.$('#fullName'))) ok('later steps are unmounted, not just hidden')
  else fail('step 2 fields are present during step 1')

  if (errors.length === 0) ok('no runtime errors (desktop)')
  else fail(`runtime errors: ${errors.join(' | ')}`)

  await page.close()
}

/* ----------------------------------------------------------------- mobile ---- */
{
  const { page, errors } = await openPage(390, 844)

  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  if (overflow.scroll <= overflow.client + 1) ok(`no horizontal overflow at 390px (${overflow.scroll}px)`)
  else fail(`horizontal overflow: scrollWidth ${overflow.scroll} > clientWidth ${overflow.client}`)

  // Content inside a deliberate horizontal scroll rail (thumbnails, trust chips) is
  // allowed to extend past the fold; anything else is a layout bug.
  const wide = await page.evaluate(() => {
    const inScrollRail = (el) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(node).overflowX)) return true
      }
      return false
    }
    return [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .filter((el) => !inScrollRail(el))
      .slice(0, 4)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`)
  })
  if (wide.length === 0) ok('no element escapes the viewport outside a scroll rail')
  else fail(`elements overflow horizontally: ${wide.join(', ')}`)

  // Measures the real hit area, which may be widened by an ::after overlay.
  const tapTargets = await page.$$eval('button', (nodes) =>
    nodes
      .filter((n) => n.offsetParent !== null && !n.disabled)
      .filter((n) => {
        const after = getComputedStyle(n, '::after')
        const grow = after.content && after.content !== 'none' ? Math.abs(parseFloat(after.top) || 0) : 0
        return n.getBoundingClientRect().height + grow * 2 < 40
      })
      .map((n) => (n.getAttribute('aria-label') || n.textContent || '').trim().slice(0, 24))
      .filter(Boolean),
  )
  if (tapTargets.length === 0) ok('every enabled control has a >=40px hit area')
  else fail(`controls too small to tap: ${[...new Set(tapTargets)].join(', ')}`)

  const untranslated = (await text(page)).match(/carDetails\.[a-zA-Z]+/g)
  if (!untranslated) ok('no untranslated i18n keys visible')
  else fail(`untranslated keys: ${[...new Set(untranslated)].join(', ')}`)

  if (errors.length === 0) ok('no runtime errors (mobile)')
  else fail(`runtime errors: ${errors.join(' | ')}`)

  await page.close()
}

await browser.close()
console.log(failures ? `\nFAILED (${failures})` : '\nAll checks passed')
process.exitCode = failures ? 1 : 0

/**
 * Reproduces the reported bug end to end: a walk-in reservation created the way the
 * desk form actually creates one (name + phone + car + dates + locations, every
 * identity field left blank) must produce a signature-only link, not the old
 * completion wizard.
 *
 * Runs the real router and controllers over real HTTP. Only the Mongoose layer is
 * stubbed, so token hashing, token validation, mode detection, the write locks and
 * the signature write are all the production code paths.
 *
 * Offline: node scripts/repro-walkin-signature-link.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import mongoose from 'mongoose'

process.env.JWT_SECRET ||= 'repro-secret'
process.env.API_PUBLIC_URL ||= 'http://localhost:3000'
delete process.env.STRIPE_SECRET_KEY
delete process.env.PAYMENT_MODE

const { hashToken } = await import('../services/completionToken.js')
const { default: Booking } = await import('../models/Booking.js')
const { default: Contract } = await import('../models/Contract.js')
const { default: completionRouter } = await import('../routes/bookingCompletionRoutes.js')

const TOKEN = 'f'.repeat(64)
const BOOKING_ID = new mongoose.Types.ObjectId()
const OWNER_ID = new mongoose.Types.ObjectId()

let passed = 0
const check = (name, fn) => {
  const done = () => {
    passed += 1
    console.log(`  ✓ ${name}`)
  }
  const out = fn()
  return out instanceof Promise ? out.then(done) : (done(), undefined)
}

/**
 * Exactly what `createWalkInBooking` persists when staff fill in only the fields the
 * walk-in form marks required. Every identity field is `''`, which is the state that
 * used to flip the link into the customer wizard.
 */
const makeWalkIn = () => ({
  _id: BOOKING_ID,
  owner: OWNER_ID,
  reservationId: 'RES-WALKIN-REPRO',
  channel: 'walk_in',
  status: 'confirmed',
  paymentStatus: 'paid',
  customerName: 'Zakaria Douami',
  customerEmail: '',
  customerPhone: '+212611223344',
  customerAddress: '',
  dateOfBirth: '',
  nationality: '',
  placeOfBirth: '',
  identityDocumentNumber: '',
  identityIssuedOn: '',
  driverLicenseNumber: '',
  driverLicenseExpiry: '',
  driverLicenseIssuedOn: '',
  passportNumber: '',
  secondDriver: { enabled: false },
  pickupDate: new Date('2026-08-20T10:00:00Z'),
  returnDate: new Date('2026-08-25T10:00:00Z'),
  pickupLocation: 'Casablanca Airport',
  returnLocation: 'Casablanca Airport',
  price: 1700,
  car: { brand: 'Renault', model: 'Clio 5', year: 2024, category: 'Compact' },
  completion: {
    tokenHash: hashToken(TOKEN),
    tokenExpiresAt: new Date(Date.now() + 7 * 86_400_000),
    requestStatus: 'pending',
    shareableCompletionUrl: `http://localhost:5173/complete-booking/${TOKEN}`,
    documentsComplete: false,
    paymentComplete: true,
    amountPaid: 1700,
    paymentCompletedAt: new Date(),
    signatureComplete: false,
    signatureUrl: '',
  },
  saves: 0,
  save() {
    this.saves += 1
    return Promise.resolve(this)
  },
  toObject() {
    const { save, toObject, saves, ...rest } = this
    return rest
  },
})

let booking = makeWalkIn()

/** Minimal thenable that mimics the bits of a Mongoose query the code chains. */
const query = (result) => {
  const q = {
    populate: () => q,
    select: () => q,
    sort: () => q,
    lean: () => Promise.resolve(result),
    then: (res, rej) => Promise.resolve(result).then(res, rej),
    catch: (f) => Promise.resolve(result).catch(f),
    finally: (f) => Promise.resolve(result).finally(f),
  }
  return q
}

Booking.findOne = (filter = {}) => {
  const wanted = filter['completion.tokenHash']
  return query(!wanted || wanted === booking.completion.tokenHash ? booking : null)
}
Booking.findById = (id) => query(String(id) === String(BOOKING_ID) ? booking : null)

let storedContract = null
Contract.findOne = () => query(storedContract)

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use('/api/booking-completion', completionRouter)

const server = await new Promise((resolve) => {
  const s = app.listen(0, () => resolve(s))
})
const BASE = `http://127.0.0.1:${server.address().port}/api/booking-completion`

const call = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

console.log('repro-walkin-signature-link')
console.log(`  reservation ${booking.reservationId} — channel=${booking.channel}, every identity field blank\n`)

await check('GET /:token classifies the bare walk-in as signature_only', async () => {
  const { status, body } = await call('GET', `/${TOKEN}`)
  assert.equal(status, 200)
  assert.equal(body.success, true)
  assert.equal(
    body.booking.mode,
    'signature_only',
    `THIS IS THE REPORTED BUG — got mode="${body.booking.mode}"`,
  )
  assert.equal(body.booking.customerName, 'Zakaria Douami')
  assert.equal(body.booking.car.model, 'Clio 5')
  assert.equal(body.booking.price, 1700)
})

await check('an expired or wrong token is still rejected', async () => {
  const { status } = await call('GET', `/${'0'.repeat(64)}`)
  assert.equal(status, 404)
})

await check('POST /:token/details is refused (customer cannot edit the reservation)', async () => {
  const { status, body } = await call('POST', `/${TOKEN}/details`, {
    customerName: 'Attacker',
    identityDocumentNumber: 'FAKE',
    secondDriver: { enabled: true, fullName: 'Injected Driver' },
  })
  assert.equal(status, 403)
  assert.equal(body.code, 'SIGNATURE_ONLY')
  assert.equal(booking.customerName, 'Zakaria Douami')
  assert.equal(booking.secondDriver.enabled, false)
})

await check('POST /:token/documents is refused (no uploads on a signature link)', async () => {
  const res = await fetch(`${BASE}/${TOKEN}/documents`, { method: 'POST' })
  assert.equal(res.status, 403)
  assert.equal((await res.json()).code, 'SIGNATURE_ONLY')
})

await check('contract preview serves the owner-generated contract, re-signed', async () => {
  storedContract = {
    contractNumber: 'CTR-2026-0042',
    renderedHtml:
      '<html><body><h1>CONTRAT</h1>'
      + '<img src="http://localhost:3000/uploads/templates/stamp.png?exp=1&sig=stale"/>'
      + '</body></html>',
  }
  const { status, body } = await call('GET', `/${TOKEN}/contract-preview`)
  assert.equal(status, 200)
  assert.equal(body.source, 'generated')
  assert.equal(body.contractNumber, 'CTR-2026-0042')
  assert.match(body.html, /CONTRAT/)
  assert.ok(!body.html.includes('sig=stale'), 'expired upload signature must be refreshed')
  assert.match(body.html, /uploads\/templates\/stamp\.png\?exp=\d{10}&sig=[a-f0-9]{64}/)
})

await check('signature is accepted despite every identity field being blank', async () => {
  const before = booking.saves
  const { status, body } = await call('POST', `/${TOKEN}/signature`, {
    signatureDataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    agreed: true,
    // A tampered client trying to smuggle reservation edits through the sign call.
    customerName: 'Attacker',
    driverLicenseNumber: 'FAKE-999',
    secondDriver: { enabled: true, fullName: 'Injected Driver' },
  })

  // Finalization needs a real DB (contract template + PDF), so a 500 past this point
  // is expected offline. What must NOT happen is a 400 completeness rejection.
  assert.ok(
    !(status === 400 && /Please complete/i.test(body.message || '')),
    `completeness gate wrongly rejected a desk booking: ${body.message}`,
  )
  assert.ok(booking.saves > before, 'the booking should have been saved')
  assert.match(booking.completion.signatureUrl, /^https?:\/\/|\/uploads\//)
  assert.ok(booking.completion.signatureSignedAt instanceof Date)
  assert.equal(booking.completion.signatureComplete, true)
  assert.equal(booking.completion.requestStatus, 'signed')
})

await check('the smuggled reservation edits were discarded', () => {
  assert.equal(booking.customerName, 'Zakaria Douami')
  assert.equal(booking.driverLicenseNumber, '')
  assert.equal(booking.secondDriver.enabled, false)
  assert.equal(booking.completion.secondDriverSignatureUrl, '')
})

const signatureFile = booking.completion.signatureUrl

await check('a bare ONLINE booking still gets the full customer wizard', async () => {
  booking = makeWalkIn()
  booking.channel = 'online'
  const { body } = await call('GET', `/${TOKEN}`)
  assert.equal(body.booking.mode, 'full')

  const { status } = await call('POST', `/${TOKEN}/details`, { nationality: 'Moroccan' })
  assert.equal(status, 200, 'online customers must still be able to save their details')
  assert.equal(booking.nationality, 'Moroccan')
})

server.close()

// The signature write is real, so remove the image this run left on disk.
const uploadsRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads')
const rel = String(signatureFile).split('/uploads/')[1]
if (rel) fs.rmSync(path.join(uploadsRoot, ...rel.split('/')), { force: true })

console.log(`\n${passed} checks passed`)

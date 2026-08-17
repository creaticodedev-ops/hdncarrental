/**
 * Signature-only completion links.
 *
 * Asserts that a reservation carrying every contract field produces a locked
 * "review + sign" link, that an incomplete one falls back to the original customer
 * wizard, and that the public API refuses reservation edits on locked links.
 *
 * Offline: node scripts/verify-signature-only-link.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getMissingCompletionFields,
  validateCompletionDetails,
} from '../utils/applyCompletionDetails.js'
import {
  DESK_CHANNELS,
  getSignatureRequestSummary,
  isSignatureOnlyCompletion,
  resolveCompletionMode,
} from '../services/bookingCompletionService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..', '..')
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8')

let passed = 0
const check = (name, fn) => {
  fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

/** A walk-in captured at the desk with the full contract data set. */
const completeWalkIn = (overrides = {}) => ({
  reservationId: 'RES-1001',
  channel: 'walk_in',
  customerName: 'Amine Bennani',
  customerEmail: '',
  customerPhone: '+212600112233',
  customerAddress: '12 Rue Tarik, Casablanca',
  dateOfBirth: '1990-04-12',
  nationality: 'Moroccan',
  placeOfBirth: 'Casablanca',
  identityDocumentNumber: 'BK123456',
  identityIssuedOn: '2018-06-01',
  driverLicenseNumber: 'DL998877',
  driverLicenseExpiry: '2030-01-01',
  driverLicenseIssuedOn: '2010-01-01',
  secondDriver: { enabled: false },
  completion: {},
  ...overrides,
})

console.log('verify-signature-only-link')

check('complete walk-in has no missing contract fields', () => {
  assert.deepEqual(getMissingCompletionFields(completeWalkIn()), [])
  assert.doesNotThrow(() => validateCompletionDetails(completeWalkIn()))
})

check('complete walk-in resolves to signature_only', () => {
  assert.equal(resolveCompletionMode(completeWalkIn()), 'signature_only')
  assert.equal(isSignatureOnlyCompletion(completeWalkIn()), true)
})

check('email stays optional — no email must not force the full flow', () => {
  const noEmail = completeWalkIn({ customerEmail: '' })
  assert.equal(resolveCompletionMode(noEmail), 'signature_only')
})

// The regression this rule exists for: the walk-in form marks every identity field
// optional, so a real desk booking is routinely missing several of them. It must
// still produce a signature-only link.
check('desk channel is signature_only regardless of blank fields', () => {
  assert.deepEqual(DESK_CHANNELS, ['walk_in'])

  const bare = {
    channel: 'walk_in',
    customerName: 'Zakaria Douami',
    customerPhone: '+212611223344',
    secondDriver: { enabled: false },
    completion: {},
  }
  assert.ok(getMissingCompletionFields(bare).length >= 8, 'fixture should be missing most fields')
  assert.equal(resolveCompletionMode(bare), 'signature_only')

  // Every single required field blank except the two the walk-in form enforces.
  for (const field of getMissingCompletionFields(completeWalkIn()).concat(
    ['customerAddress', 'dateOfBirth', 'nationality', 'placeOfBirth', 'identityDocumentNumber',
      'identityIssuedOn', 'driverLicenseNumber', 'driverLicenseExpiry', 'driverLicenseIssuedOn']
      .map((f) => ({ field: f })),
  )) {
    assert.equal(resolveCompletionMode(completeWalkIn({ [field.field]: '' })), 'signature_only')
  }
})

check('a walk-in with an owner-added second driver stays signature_only', () => {
  const booking = completeWalkIn({
    secondDriver: { enabled: true, fullName: 'Sara Idrissi', dateOfBirth: '', driverLicenseNumber: '' },
  })
  assert.equal(resolveCompletionMode(booking), 'signature_only')
})

check('guest booking with a missing field falls back to the full customer flow', () => {
  const booking = completeWalkIn({ channel: 'online', placeOfBirth: '   ' })
  assert.deepEqual(
    getMissingCompletionFields(booking).map((m) => m.field),
    ['placeOfBirth'],
  )
  assert.equal(resolveCompletionMode(booking), 'full')
})

check('whatsapp is a guest channel, not a desk channel', () => {
  assert.equal(resolveCompletionMode(completeWalkIn({ channel: 'whatsapp', nationality: '' })), 'full')
  assert.equal(resolveCompletionMode(completeWalkIn({ channel: 'whatsapp' })), 'signature_only')
})

check('a missing channel is treated as a guest booking', () => {
  const legacy = completeWalkIn({ nationality: '' })
  delete legacy.channel
  assert.equal(resolveCompletionMode(legacy), 'full')
})

check('a complete guest booking upgrades to signature_only', () => {
  const booking = completeWalkIn({
    channel: 'online',
    secondDriver: {
      enabled: true,
      fullName: 'Sara Idrissi',
      dateOfBirth: '1992-02-02',
      driverLicenseNumber: 'DL111222',
    },
  })
  assert.equal(resolveCompletionMode(booking), 'signature_only')
})

check('an incomplete second driver blocks signature_only on guest bookings', () => {
  const booking = completeWalkIn({
    channel: 'online',
    secondDriver: { enabled: true, fullName: 'Sara Idrissi', dateOfBirth: '', driverLicenseNumber: '' },
  })
  assert.deepEqual(
    getMissingCompletionFields(booking).map((m) => m.field),
    ['secondDriver.dateOfBirth', 'secondDriver.driverLicenseNumber'],
  )
  assert.equal(resolveCompletionMode(booking), 'full')
})

check('validation error carries the missing field list', () => {
  const booking = completeWalkIn({ customerAddress: '', driverLicenseNumber: '' })
  assert.throws(
    () => validateCompletionDetails(booking),
    (err) => {
      assert.equal(err.code, 'VALIDATION')
      assert.deepEqual(
        err.missingFields.map((m) => m.field),
        ['customerAddress', 'driverLicenseNumber'],
      )
      return true
    },
  )
})

check('owner signature summary reports the mode the customer will see', () => {
  const ready = completeWalkIn({
    completion: {
      tokenHash: 'abc',
      tokenExpiresAt: new Date(Date.now() + 86_400_000),
      shareableCompletionUrl: 'https://example.com/complete-booking/tok',
    },
  })
  const summary = getSignatureRequestSummary(ready)
  assert.equal(summary.requestStatus, 'pending')
  assert.equal(summary.mode, 'signature_only')
  assert.deepEqual(summary.missingFields, [])

  // A desk booking with blanks reports them for the owner's information, but the
  // mode must stay locked.
  const deskBlanks = completeWalkIn({
    nationality: '',
    completion: { tokenHash: 'abc', tokenExpiresAt: new Date(Date.now() + 86_400_000) },
  })
  const deskSummary = getSignatureRequestSummary(deskBlanks)
  assert.equal(deskSummary.mode, 'signature_only')
  assert.deepEqual(
    deskSummary.missingFields.map((m) => m.field),
    ['nationality'],
  )

  const guest = completeWalkIn({
    channel: 'online',
    nationality: '',
    completion: { tokenHash: 'abc', tokenExpiresAt: new Date(Date.now() + 86_400_000) },
  })
  assert.equal(getSignatureRequestSummary(guest).mode, 'full')
})

// ---- wiring assertions (source level, so they fail loudly on refactor) ----

const routes = read('server', 'routes', 'bookingCompletionRoutes.js')
const controller = read('server', 'controllers', 'bookingCompletionController.js')
const service = read('server', 'services', 'bookingCompletionService.js')

check('contract preview is exposed on the token route', () => {
  assert.match(routes, /completionRouter\.get\(\s*"\/:token\/contract-preview",\s*tokenLimit/)
  const ownerIndex = routes.indexOf('/owner/ensure-link')
  const tokenIndex = routes.indexOf('"/:token"')
  assert.ok(ownerIndex < tokenIndex, 'owner routes must be declared before the :token catch-all')
})

check('detail and document writes are refused on signature-only links', () => {
  const detailsBody = controller.slice(
    controller.indexOf('export const saveCompletionDetails'),
    controller.indexOf('export const createCompletionPayment'),
  )
  assert.match(detailsBody, /rejectIfSignatureOnly\(booking, res\)/)

  const uploadBody = controller.slice(
    controller.indexOf('export const uploadCompletionDocument'),
    controller.indexOf('export const saveCompletionDetails'),
  )
  assert.match(uploadBody, /rejectIfSignatureOnly\(booking, res\)/)
  assert.match(controller, /code: "SIGNATURE_ONLY"/)
})

check('signature endpoint discards detail fields when the link is locked', () => {
  const signBody = controller.slice(
    controller.indexOf('export const submitCompletionSignature'),
    controller.indexOf('/** Owner: ensure a valid completion link exists'),
  )
  assert.match(signBody, /const signatureOnly = resolveCompletionMode\(booking\) === "signature_only"/)
  assert.match(signBody, /if \(!signatureOnly\) \{[\s\S]*applyCompletionDetailsToBooking/)
  assert.match(signBody, /if \(!signatureOnly && !booking\.completion\.documentsComplete\)/)
})

// The bug that made a locked link unsignable: the completeness gate ran on every
// path, so a desk booking with blank identity fields got a 400 the signer could
// not act on. It must live inside the `!signatureOnly` branch.
check('the completeness gate does not run on signature-only links', () => {
  const signBody = controller.slice(
    controller.indexOf('export const submitCompletionSignature'),
    controller.indexOf('/** Owner: ensure a valid completion link exists'),
  )
  const branch = signBody.slice(
    signBody.indexOf('if (!signatureOnly) {'),
    signBody.indexOf('refreshCompletionFlags(booking)'),
  )
  const validateCalls = [...signBody.matchAll(/validateCompletionDetails\(booking\)/g)]
  assert.equal(validateCalls.length, 1, 'expected exactly one completeness gate')
  assert.ok(
    branch.includes('validateCompletionDetails(booking)'),
    'validateCompletionDetails must be inside the !signatureOnly branch',
  )
  // A contract still needs a name, on every path.
  assert.match(signBody, /if \(!String\(booking\.customerName \|\| ''\)\.trim\(\)\)/)
})

check('the preview serves the contract the owner already generated', () => {
  const previewBody = service.slice(
    service.indexOf('export const renderContractPreviewHtml'),
    service.indexOf('export const markCompletionPayment'),
  )
  assert.match(previewBody, /Contract\.findOne\(\{ booking: booking\._id \}\)/)
  assert.match(previewBody, /\.sort\(\{ createdAt: -1 \}\)/)
  assert.match(previewBody, /source: "generated"/)
  // ...and still works before one exists.
  assert.match(previewBody, /source: "draft"/)
  // Stored HTML carries signed /uploads URLs that expire after 7 days.
  assert.match(previewBody, /resignUploadUrls\(existing\.renderedHtml\)/)
})

check('finalization only demands uploads on the full flow', () => {
  assert.match(service, /const documentsRequired = resolveCompletionMode\(booking\) === "full"/)
  assert.match(
    service,
    /if \(!flags\.signatureComplete \|\| \(documentsRequired && !flags\.documentsComplete\)\)/,
  )
})

check('the public booking view advertises the mode', () => {
  assert.match(controller, /mode: resolveCompletionMode\(booking\)/)
})

check('the customer page renders the locked screen for signature_only', () => {
  const page = read('client', 'src', 'pages', 'CompleteBooking.jsx')
  assert.match(page, /booking\?\.mode === 'signature_only'/)
  assert.match(page, /<SignatureOnlyCompletion/)
})

check('the locked page posts nothing but the signature', () => {
  const page = read('client', 'src', 'pages', 'completion', 'SignatureOnlyCompletion.jsx')
  const signIndex = page.indexOf('/signature`')
  assert.ok(signIndex > 0, 'the locked page must post the signature')
  const post = page.slice(signIndex, page.indexOf('if (!data.success)', signIndex))
  assert.match(post, /signatureDataUrl/)
  assert.match(post, /agreed: true/)
  for (const forbidden of [
    'customerName',
    'customerEmail',
    'customerPhone',
    'dateOfBirth',
    'identityDocumentNumber',
    'driverLicenseNumber',
    'secondDriver:',
  ]) {
    assert.ok(!post.includes(forbidden), `signature payload must not carry ${forbidden}`)
  }
  // No editable inputs beyond the terms checkbox.
  const inputs = [...page.matchAll(/<input[^>]*type="([a-z]+)"/g)].map((m) => m[1])
  assert.deepEqual([...new Set(inputs)], ['checkbox'])
  assert.ok(!page.includes('/details'), 'the locked page must never call the details endpoint')
  assert.ok(!page.includes('/documents'), 'the locked page must never call the documents endpoint')
})

check('owner and server agree on the required contract fields', () => {
  const helpers = read('client', 'src', 'components', 'owner', 'bookings', 'reservationHelpers.js')
  const clientBlock = helpers.slice(
    helpers.indexOf('const CONTRACT_FIELDS'),
    helpers.indexOf('const SECOND_DRIVER_FIELDS'),
  )
  const clientFields = [...clientBlock.matchAll(/\['([a-zA-Z]+)',/g)].map((m) => m[1])
  const serverFields = getMissingCompletionFields({}).map((m) => m.field)
  assert.deepEqual(clientFields, serverFields)
})

check('owner and server agree on which channels are desk channels', () => {
  const helpers = read('client', 'src', 'components', 'owner', 'bookings', 'reservationHelpers.js')
  const match = helpers.match(/export const DESK_CHANNELS = \[([^\]]*)\]/)
  assert.ok(match, 'client must export DESK_CHANNELS')
  const clientChannels = [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  assert.deepEqual(clientChannels, DESK_CHANNELS)
  assert.match(helpers, /DESK_CHANNELS\.includes\(booking\?\.channel \|\| 'online'\)/)
})

console.log(`\n${passed} checks passed`)

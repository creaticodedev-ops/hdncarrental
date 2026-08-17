/**
 * Every string the signature-only screens render must resolve in EN, FR and ES.
 *
 * Offline: node scripts/verify-signature-only-i18n.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientI18n = path.join(__dirname, '..', '..', 'client', 'src', 'i18n')

const { en, fr, es } = await import(
  pathToFileURL(path.join(clientI18n, 'translations.js')).href
)
const { adminEn, adminFr, adminEs } = await import(
  pathToFileURL(path.join(clientI18n, 'adminTranslations.js')).href
)

const LOCALES = [
  ['en', en, adminEn],
  ['fr', fr, adminFr],
  ['es', es, adminEs],
]

const PUBLIC_KEYS = [
  'completion.padHint',
  'completion.padCaptured',
  'completion.padClear',
  'completion.needSignature',
  'completion.needSecondDriverSignature',
  'completion.needAgree',
  'completion.agreeTerms',
  'completion.signatureCustomerLabel',
  'completion.signatureSecondDriverLabel',
  'completion.signatureAgencyNote',
  'completion.downloadContract',
  'completion.backHome',
  'completion.only.eyebrow',
  'completion.only.title',
  'completion.only.reviewStep',
  'completion.only.reviewHint',
  'completion.only.lockedHint',
  'completion.only.viewContract',
  'completion.only.hideContract',
  'completion.only.openNewTab',
  'completion.only.contractLoading',
  'completion.only.contractError',
  'completion.only.signStep',
  'completion.only.signHint',
  'completion.only.saveSignature',
  'completion.only.saving',
  'completion.only.confirmedTitle',
  'completion.only.confirmedHint',
  'completion.only.viewSigned',
  'confirmation.name',
  'confirmation.phoneLabel',
  'confirmation.vehicle',
  'confirmation.from',
  'confirmation.until',
  'confirmation.pickup',
  'confirmation.total',
  'docGen.retry',
]

// Mode banner + missing-field chips rendered by the owner signature drawer.
const ADMIN_KEYS = [
  ...[
    'linkModeSignatureOnly',
    'linkModeSignatureOnlyHint',
    'linkModeBlanksHint',
    'linkModeFull',
    'linkModeFullHint',
    'completeReservation',
    'signatureDrawerTitle',
    'signatureDrawerSigned',
  ].map((k) => `bookings.${k}`),
  ...[
    'customerName',
    'phone',
    'address',
    'dateOfBirth',
    'nationality',
    'placeOfBirth',
    'identityNumber',
    'identityIssued',
    'driverLicense',
    'licenseExpiry',
    'licenseIssued',
    'secondDriverName',
    'secondDriverDob',
  ].map((k) => `contracts.${k}`),
]

const resolve = (tree, keyPath) =>
  keyPath.split('.').reduce((node, part) => (node == null ? undefined : node[part]), tree)

let checked = 0
const missing = []

for (const [locale, publicTree, adminTree] of LOCALES) {
  for (const key of PUBLIC_KEYS) {
    const value = resolve(publicTree, key)
    checked += 1
    if (typeof value !== 'string' || !value.trim()) missing.push(`${locale}: ${key}`)
  }
  for (const key of ADMIN_KEYS) {
    const value = resolve(adminTree, key)
    checked += 1
    if (typeof value !== 'string' || !value.trim()) missing.push(`${locale}: admin.${key}`)
  }
}

// The drawer builds chip labels from reservationHelpers, so check the keys it can
// actually emit rather than trusting the hardcoded list above to stay in sync.
const helpers = await readFile(
  path.join(__dirname, '..', '..', 'client', 'src', 'components', 'owner', 'bookings', 'reservationHelpers.js'),
  'utf8',
)
const chipBlock = helpers.slice(
  helpers.indexOf('const CONTRACT_FIELDS'),
  helpers.indexOf('const isBlank'),
)
const chipKeys = [...new Set([...chipBlock.matchAll(/,\s*'([a-zA-Z]+)'\]/g)].map((m) => m[1]))]
assert.ok(chipKeys.length >= 11, 'could not parse the drawer chip keys')
for (const [locale, , adminTree] of LOCALES) {
  for (const key of chipKeys) {
    checked += 1
    if (typeof resolve(adminTree, `contracts.${key}`) !== 'string') {
      missing.push(`${locale}: admin.contracts.${key} (drawer chip)`)
    }
  }
}

console.log('verify-signature-only-i18n')
assert.deepEqual(missing, [], `missing translations:\n  ${missing.join('\n  ')}`)
console.log(`  ✓ ${checked} strings resolved across ${LOCALES.map(([l]) => l).join(', ')}`)

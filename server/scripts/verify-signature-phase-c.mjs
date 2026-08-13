/**
 * Phase C: signature-request lifecycle on completion tokens.
 *
 * Offline: node scripts/verify-signature-phase-c.mjs
 */
import assert from 'node:assert/strict'
import {
  generateCompletionToken,
  hashToken,
  isTokenExpired,
} from '../services/completionToken.js'
import {
  SIGNATURE_REQUEST_STATUSES,
  syncSignatureRequestStatus,
  getSignatureRequestSummary,
} from '../services/bookingCompletionService.js'

let passed = 0
const check = (name, fn) => {
  fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

console.log('verify-signature-phase-c')

check('request statuses catalog', () => {
  assert.deepEqual(SIGNATURE_REQUEST_STATUSES, [
    'none',
    'pending',
    'signed',
    'expired',
    'cancelled',
  ])
})

check('token generate + hash stable', () => {
  const a = generateCompletionToken()
  assert.equal(a.tokenHash, hashToken(a.token))
  assert.equal(isTokenExpired(a.expiresAt), false)
  assert.equal(isTokenExpired(new Date(Date.now() - 1000)), true)
})

check('cancelled is sticky', () => {
  const booking = {
    completion: {
      requestStatus: 'cancelled',
      tokenHash: 'x',
      tokenExpiresAt: new Date(Date.now() + 86400000),
    },
  }
  assert.equal(syncSignatureRequestStatus(booking), 'cancelled')
})

check('signed wins over pending token', () => {
  const booking = {
    completion: {
      requestStatus: 'pending',
      tokenHash: 'x',
      tokenExpiresAt: new Date(Date.now() + 86400000),
      signatureUrl: '/uploads/sig.png',
      signatureSignedAt: new Date(),
      signatureComplete: true,
    },
  }
  assert.equal(syncSignatureRequestStatus(booking), 'signed')
})

check('expired when token past due', () => {
  const booking = {
    completion: {
      requestStatus: 'pending',
      tokenHash: 'abc',
      tokenExpiresAt: new Date(Date.now() - 60_000),
    },
  }
  assert.equal(syncSignatureRequestStatus(booking), 'expired')
})

check('pending when token valid', () => {
  const booking = {
    completion: {
      tokenHash: 'abc',
      tokenExpiresAt: new Date(Date.now() + 86400000),
      shareableCompletionUrl: 'https://example.com/complete-booking/tok',
    },
  }
  assert.equal(syncSignatureRequestStatus(booking), 'pending')
  const summary = getSignatureRequestSummary(booking)
  assert.equal(summary.requestStatus, 'pending')
  assert.equal(summary.hasActiveLink, true)
  assert.ok(summary.shareableCompletionUrl.includes('complete-booking'))
})

check('summary hides url when cancelled', () => {
  const booking = {
    completion: {
      requestStatus: 'cancelled',
      shareableCompletionUrl: 'https://example.com/complete-booking/tok',
      tokenHash: '',
    },
  }
  const summary = getSignatureRequestSummary(booking)
  assert.equal(summary.requestStatus, 'cancelled')
  assert.equal(summary.shareableCompletionUrl, '')
  assert.equal(summary.hasActiveLink, false)
})

check('reuse semantics: valid token not expired', () => {
  const first = generateCompletionToken()
  const booking = {
    status: 'confirmed',
    completion: {
      tokenHash: first.tokenHash,
      tokenExpiresAt: first.expiresAt,
      shareableCompletionUrl: 'https://example.com/complete-booking/' + first.token,
      requestStatus: 'pending',
    },
  }
  const stillValid =
    Boolean(booking.completion.tokenHash) &&
    !isTokenExpired(booking.completion.tokenExpiresAt) &&
    booking.completion.requestStatus !== 'cancelled' &&
    booking.completion.requestStatus !== 'signed'
  assert.equal(stillValid, true)

  booking.completion.requestStatus = 'cancelled'
  const afterCancel =
    Boolean(booking.completion.tokenHash) &&
    !isTokenExpired(booking.completion.tokenExpiresAt) &&
    booking.completion.requestStatus !== 'cancelled' &&
    booking.completion.requestStatus !== 'signed'
  assert.equal(afterCancel, false)
})

console.log(`\n${passed} checks passed`)

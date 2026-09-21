/**
 * Public site browsers must call same-origin /api, not api.hdncar.com.
 * Offline: node scripts/verify-api-base.mjs
 */
import assert from 'node:assert/strict'
import { resolveApiBaseUrl } from '../src/utils/apiBase.js'

const same = resolveApiBaseUrl({
  hostname: 'hdncar.com',
  origin: 'https://hdncar.com',
  envUrl: 'https://api.hdncar.com',
  isDev: false,
})
assert.equal(same, 'https://hdncar.com')

const www = resolveApiBaseUrl({
  hostname: 'www.hdncar.com',
  origin: 'https://www.hdncar.com',
  envUrl: 'https://api.hdncar.com',
  isDev: false,
})
assert.equal(www, 'https://www.hdncar.com')

const scripts = resolveApiBaseUrl({
  hostname: '',
  origin: '',
  envUrl: 'https://api.hdncar.com',
  isDev: false,
})
assert.equal(scripts, 'https://api.hdncar.com')

const dev = resolveApiBaseUrl({
  hostname: 'localhost',
  origin: 'http://localhost:5173',
  envUrl: '',
  isDev: true,
})
assert.equal(dev, '')

console.log('verify-api-base: ok')

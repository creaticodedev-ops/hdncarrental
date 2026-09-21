/**
 * Diagnose the public TLS certificate on api.hdncar.com.
 *
 * Does not disable verification for API calls. If this machine is behind
 * SSL inspection (FortiGate, etc.), the presented issuer will not match
 * Google Trust Services — that is a local network problem, not Render.
 *
 * Run: node scripts/check-api-tls.mjs
 */
import tls from 'node:tls'
import https from 'node:https'

const HOST = process.env.API_TLS_HOST || 'api.hdncar.com'
const EXPECTED_ISSUER_O = 'Google Trust Services'

const inspect = (servername) =>
  new Promise((resolve, reject) => {
    const sock = tls.connect(
      { host: servername, port: 443, servername, rejectUnauthorized: false },
      () => {
        const cert = sock.getPeerCertificate(true)
        const info = {
          authorized: sock.authorized,
          authorizationError: sock.authorizationError || null,
          protocol: sock.getProtocol(),
          subjectCN: cert.subject?.CN || null,
          san: cert.subjectaltname || null,
          issuer: cert.issuer || {},
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
        }
        sock.end()
        resolve(info)
      },
    )
    sock.setTimeout(12_000, () => {
      sock.destroy()
      reject(new Error(`TLS timeout connecting to ${servername}`))
    })
    sock.on('error', reject)
  })

const getJson = (url) =>
  new Promise((resolve) => {
    https
      .get(url, { timeout: 15_000, headers: { Accept: 'application/json' } }, (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, body: body.slice(0, 180) })
        })
      })
      .on('error', (err) => resolve({ ok: false, status: 0, body: `${err.code || ''} ${err.message}` }))
  })

console.log(`check-api-tls ${HOST}\n`)

const info = await inspect(HOST)
const issuerO = info.issuer.O || ''
const issuerCN = info.issuer.CN || ''
const isFortinet = /fortinet/i.test(`${issuerO} ${issuerCN}`)
const isGts = issuerO.includes(EXPECTED_ISSUER_O)
const sanOk = String(info.san || '').includes(`DNS:${HOST}`)
const now = Date.now()
const toMs = Date.parse(info.validTo)
const fromMs = Date.parse(info.validFrom)
const datesOk = Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs < now && now < toMs

console.log(`  subject     ${info.subjectCN}`)
console.log(`  SAN         ${info.san}`)
console.log(`  issuer O    ${issuerO}`)
console.log(`  issuer CN   ${issuerCN}`)
console.log(`  valid       ${info.validFrom} → ${info.validTo}`)
console.log(`  protocol    ${info.protocol}`)
console.log(`  node-trust  ${info.authorized ? 'yes' : `no (${info.authorizationError})`}`)

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed += 1
}

check('certificate matches hostname', info.subjectCN === HOST && sanOk)
check('certificate dates are current', datesOk, `${info.validFrom} → ${info.validTo}`)

if (isFortinet) {
  check(
    'presented issuer is a public CA',
    false,
    `Fortinet SSL inspection (${issuerCN}). This machine never sees Render’s Google Trust Services certificate.`,
  )
  console.log(`
This is local HTTPS interception (FortiGate ${issuerCN}), not a broken Render cert.
Public CT logs issue api.hdncar.com under Google Trust Services WE1.

Fix on this network:
  • Install the FortiGate CA into the OS/browser trust store, or
  • Exclude ${HOST} from SSL deep inspection, or
  • Test from a network without inspection (phone LTE).

Optional Cloudflare (after Render shows the custom domain cert as Issued):
  • DNS: CNAME api → hdncarrental-api.onrender.com, Proxied (orange cloud)
  • SSL/TLS mode: Full (strict)
  Browsers then terminate TLS at Cloudflare, same as hdncar.com.
`)
} else {
  check(`issuer is ${EXPECTED_ISSUER_O}`, isGts, issuerO || issuerCN)
  check('Node can verify the chain', info.authorized, info.authorizationError || '')
}

console.log('\nHTTPS fetches (verification on):')
for (const path of ['/health', '/api/user/cars', '/api/pickup-locations']) {
  const url = `https://${HOST}${path}`
  const res = await getJson(url)
  check(path, res.ok, res.ok ? String(res.status) : res.body)
}

if (failed) {
  console.log(`\n${failed} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nTLS and API checks passed')
}

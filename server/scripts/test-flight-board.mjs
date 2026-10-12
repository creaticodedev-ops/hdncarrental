/**
 * Flight board service checks with a mocked upstream (adsb.lol /v2/point payload shape).
 * Run: node scripts/test-flight-board.mjs
 * Live smoke test (real adsb.lol, no key):  node scripts/test-flight-board.mjs --live CMN
 * Classifier on real traffic elsewhere:     node scripts/test-flight-board.mjs --live-at 40.4719,-3.5626,MAD
 */
import assert from 'node:assert/strict';
import {
  OFFICIAL_FLIGHT_INFO_URL,
  classifyAircraft,
  fetchUpstream,
  getFlightBoard,
  normalizeBoard,
  readFlightConfig,
  resetFlightBoardState,
} from '../services/flightBoardService.js';
import { findMoroccoAirport } from '../utils/moroccoAirports.js';

const CMN = findMoroccoAirport('CMN');
const NOW = Date.parse('2026-10-12T12:00:00Z');

const aircraft = (overrides) => ({
  hex: '020123',
  type: 'adsb_icao',
  flight: 'RAM973  ',
  t: 'B738',
  category: 'A3',
  alt_baro: 4000,
  baro_rate: -800,
  gs: 190,
  track: 225,
  lat: 33.5089,
  lon: -7.4206,
  seen_pos: 1.5,
  seen: 0.4,
  ...overrides,
});

const fixture = {
  now: NOW,
  total: 11,
  ac: [
    // 12 NM north-east, tracking straight at CMN, descending → arrival
    aircraft({}),
    // same airframe reported twice → counted once
    aircraft({ seen_pos: 3 }),
    // 25 NM north, descending towards CMN → arrival, listed after the closer one
    aircraft({ hex: '4ca8e1', flight: 'EZY85EC', t: 'A320', alt_baro: 9000, baro_rate: -1200, track: 180, lat: 33.7842, lon: -7.59 }),
    // 8 NM south-west, climbing away → departure
    aircraft({ hex: '4ca123', flight: 'RYR4412', alt_baro: 5000, baro_rate: 1800, track: 225, lat: 33.2732, lon: -7.7029 }),
    // cruise overflight
    aircraft({ hex: '495001', flight: 'TAP109', alt_baro: 36000, baro_rate: 0, track: 200 }),
    // on the ground: arrival or departure can't be told apart
    aircraft({ hex: '020200', flight: 'RAM200', alt_baro: 'ground', lat: 33.37, lon: -7.585 }),
    // airport vehicle
    aircraft({ hex: '020300', flight: 'FOLLOW1', category: 'C1', alt_baro: 'ground' }),
    // position too old
    aircraft({ hex: '020400', flight: 'RAM401', seen_pos: 120 }),
    // closer to Rabat than to Casablanca
    aircraft({ hex: '020500', flight: 'MAC500', lat: 33.75, lon: -7.15, track: 48, alt_baro: 3000 }),
    // pointing at CMN but climbing → neither approaching nor departing
    aircraft({ hex: '020600', flight: 'RAM600', baro_rate: 1500 }),
    // no callsign
    aircraft({ hex: '020700', flight: undefined }),
  ],
};

const emptySky = { now: NOW, total: 0, ac: [] };
const overflightsOnly = { now: NOW, total: 1, ac: [fixture.ac[4]] };

const jsonResponse = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

let passed = 0;
const test = async (name, fn) => {
  resetFlightBoardState();
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

const env = { FLIGHTS_CACHE_TTL_SECONDS: '90', FLIGHTS_UPSTREAM_GAP_MS: '0' };

const printBoard = (label, board) => {
  console.log(`[${label}] in range=${board.aircraftInRange ?? board.coverage?.aircraftInRange} arrivals=${board.arrivals.length} departures=${board.departures.length}`);
  for (const f of [...board.arrivals, ...board.departures].slice(0, 12)) {
    console.log(`  ${f.number.padEnd(8)} ${f.statusKey.padEnd(12)} ${String(f.distanceNm).padStart(5)} NM ${String(f.altitudeFt).padStart(6)} ft  ${f.airline.name || ''}`);
  }
};

if (process.argv.includes('--live')) {
  const code = process.argv[process.argv.indexOf('--live') + 1] || 'CMN';
  try {
    printBoard(`live ${code}`, await getFlightBoard(code));
  } catch (error) {
    console.log(`[live ${code}] ${error.status} ${error.code} — ${error.message}`);
  }
  process.exit(0);
}

if (process.argv.includes('--live-at')) {
  const [lat, lon, iata = 'TEST'] = String(process.argv[process.argv.indexOf('--live-at') + 1] || '').split(',');
  const airport = { iata, lat: Number(lat), lon: Number(lon) };
  const payload = await fetchUpstream(airport, readFlightConfig({ FLIGHTS_UPSTREAM_GAP_MS: '0' }));
  printBoard(`live-at ${iata}`, normalizeBoard(payload, airport, { neighbours: [airport] }));
  process.exit(0);
}

console.log('flight board service (adsb.lol)');

await test('classifies only clear arrivals/departures and keeps the board shape', () => {
  const board = normalizeBoard(fixture, CMN, { logoTemplate: 'https://logo.test/{iata}.png' });
  assert.equal(board.aircraftInRange, fixture.ac.length);
  assert.deepEqual(board.arrivals.map((f) => f.number), ['RAM973', 'EZY85EC']);
  assert.deepEqual(board.departures.map((f) => f.number), ['RYR4412']);

  const ram = board.arrivals[0];
  assert.equal(ram.status, 'Approaching');
  assert.equal(ram.statusKey, 'approaching');
  assert.equal(ram.live, true);
  assert.deepEqual(ram.airline, { name: 'Royal Air Maroc', iata: 'AT', icao: 'RAM', logoUrl: 'https://logo.test/AT.png' });
  assert.equal(ram.observedAt, new Date(NOW - 1500).toISOString());
  assert.ok(ram.distanceNm > 11 && ram.distanceNm < 13);
  assert.equal(ram.altitudeFt, 4000);
  assert.equal(ram.aircraftType, 'B738');
  for (const field of ['scheduled', 'estimated', 'runway', 'delayMinutes', 'terminal', 'gate', 'baggageBelt']) {
    assert.equal(ram[field], null, `${field} must never be invented`);
  }
  assert.deepEqual(ram.airport, { iata: null, icao: null, name: null, city: null });

  const ryr = board.departures[0];
  assert.equal(ryr.statusKey, 'departed');
  assert.equal(ryr.airline.iata, 'FR');
});

await test('unknown callsign prefixes stay unbranded', () => {
  const obs = classifyAircraft(aircraft({ flight: 'CNXYZ' }), CMN, NOW);
  assert.equal(obs.callsign, 'CNXYZ');
  const board = normalizeBoard({ now: NOW, ac: [aircraft({ flight: 'XXX123' })] }, CMN);
  assert.deepEqual(board.arrivals[0].airline, { name: null, iata: null, icao: 'XXX', logoUrl: null });
});

await test('unsupported airport → 404 without calling upstream', async () => {
  let calls = 0;
  await assert.rejects(
    getFlightBoard('CDG', { env, fetchImpl: async () => { calls += 1; } }),
    (err) => err.status === 404 && err.code === 'AIRPORT_UNSUPPORTED',
  );
  assert.equal(calls, 0);
});

await test('no API key needed; calls adsb.lol point endpoint with a contact User-Agent', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push({ url, init }); return jsonResponse(200, fixture); };
  await getFlightBoard('cmn', { env: {}, fetchImpl });
  await getFlightBoard('RAK', { env: { FLIGHTS_CONTACT: 'ops@example.com', FLIGHTS_UPSTREAM_GAP_MS: '0' }, fetchImpl }).catch(() => {});
  assert.equal(seen[0].url, 'https://api.adsb.lol/v2/point/33.3675/-7.59/40');
  assert.match(seen[0].init.headers['User-Agent'], /^HDNCarFlightBoard\/1\.0 \(\+https:\/\/hdncar\.com; haddanecar@gmail\.com\)$/);
  assert.ok(seen[0].init.signal instanceof AbortSignal);
  assert.match(seen[1].url, /\/v2\/point\/31\.6069\/-8\.0363\/40$/);
  assert.match(seen[1].init.headers['User-Agent'], /ops@example\.com/);
});

await test('empty sky → 503 FLIGHTS_NO_COVERAGE (never "no flights"), cached for the TTL', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return jsonResponse(200, emptySky); };
  for (let i = 0; i < 3; i += 1) {
    await assert.rejects(getFlightBoard('CMN', { env, fetchImpl }), (err) => err.status === 503 && err.code === 'FLIGHTS_NO_COVERAGE');
  }
  assert.equal(calls, 1);
});

await test('only overflights in range → still FLIGHTS_NO_COVERAGE', async () => {
  await assert.rejects(
    getFlightBoard('CMN', { env, fetchImpl: async () => jsonResponse(200, overflightsOnly) }),
    (err) => err.code === 'FLIGHTS_NO_COVERAGE',
  );
});

await test('caches per airport and dedupes concurrent requests', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; await new Promise((r) => setTimeout(r, 20)); return jsonResponse(200, fixture); };
  const [a, b] = await Promise.all([getFlightBoard('CMN', { env, fetchImpl }), getFlightBoard('CMN', { env, fetchImpl })]);
  const c = await getFlightBoard('CMN', { env, fetchImpl });
  assert.equal(calls, 1);
  assert.equal(a.fetchedAt, b.fetchedAt);
  assert.equal(c.stale, false);
  assert.equal(c.provider, 'adsb.lol');
  assert.equal(c.license, 'ODbL-1.0');
  assert.equal(c.dataKind, 'observed');
  assert.equal(c.officialUrl, OFFICIAL_FLIGHT_INFO_URL);
  assert.equal(c.hasLiveData, true);
  assert.deepEqual(c.coverage, { radiusNm: 40, aircraftInRange: fixture.ac.length });
  assert.ok(c.refreshAfterSeconds >= 60 && c.refreshAfterSeconds <= 90);
});

await test('upstream calls are spaced out across airports', async () => {
  const starts = [];
  const fetchImpl = async () => { starts.push(Date.now()); return jsonResponse(200, fixture); };
  const paced = { ...env, FLIGHTS_UPSTREAM_GAP_MS: '200' };
  await Promise.all([getFlightBoard('CMN', { env: paced, fetchImpl }), getFlightBoard('RAK', { env: paced, fetchImpl }).catch(() => {})]);
  assert.equal(starts.length, 2);
  assert.ok(starts[1] - starts[0] >= 180, `gap was ${starts[1] - starts[0]}ms`);
});

await test('refresh failure with cached flights → last board flagged stale with original timestamp', async () => {
  const first = await getFlightBoard('CMN', { env, fetchImpl: async () => jsonResponse(200, fixture) });
  const realNow = Date.now;
  Date.now = () => realNow() + 95_000;
  try {
    const second = await getFlightBoard('CMN', { env, fetchImpl: async () => jsonResponse(500, {}) });
    assert.equal(second.stale, true);
    assert.equal(second.staleReason, 'upstream');
    assert.equal(second.fetchedAt, first.fetchedAt);
    assert.equal(second.arrivals.length, 2);
  } finally {
    Date.now = realNow;
  }
});

await test('stale observations expire after 10 minutes', async () => {
  await getFlightBoard('CMN', { env, fetchImpl: async () => jsonResponse(200, fixture) });
  const realNow = Date.now;
  Date.now = () => realNow() + 11 * 60_000;
  try {
    await assert.rejects(getFlightBoard('CMN', { env, fetchImpl: async () => jsonResponse(500, {}) }), (err) => err.status === 502);
  } finally {
    Date.now = realNow;
  }
});

await test('failure without cache → 502, then backs off instead of hammering', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return jsonResponse(503, {}); };
  await assert.rejects(getFlightBoard('TNG', { env, fetchImpl }), (err) => err.status === 502);
  await assert.rejects(getFlightBoard('TNG', { env, fetchImpl }), (err) => err.code === 'FLIGHTS_TEMPORARILY_UNAVAILABLE');
  assert.equal(calls, 1);
});

await test('timeouts / network errors → generic 502', async () => {
  const fetchImpl = async () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); };
  await assert.rejects(getFlightBoard('CMN', { env, fetchImpl }), (err) => err.status === 502 && err.code === 'FLIGHTS_UPSTREAM_ERROR');
});

await test('malformed payload → 502', async () => {
  await assert.rejects(getFlightBoard('CMN', { env, fetchImpl: async () => jsonResponse(200, { msg: 'nope' }) }), (err) => err.status === 502);
});

await test('429 and 403 trigger a global cooldown', async () => {
  let calls = 0;
  await assert.rejects(getFlightBoard('CMN', { env, fetchImpl: async () => { calls += 1; return jsonResponse(429, {}); } }), (err) => err.code === 'FLIGHTS_UPSTREAM_RATE_LIMITED');
  await assert.rejects(getFlightBoard('RAK', { env, fetchImpl: async () => { calls += 1; return jsonResponse(200, fixture); } }), (err) => err.code === 'FLIGHTS_TEMPORARILY_UNAVAILABLE');
  assert.equal(calls, 1);
  resetFlightBoardState();
  await assert.rejects(getFlightBoard('CMN', { env, fetchImpl: async () => jsonResponse(403, {}) }), (err) => err.code === 'FLIGHTS_UPSTREAM_BLOCKED');
  await assert.rejects(getFlightBoard('AGA', { env, fetchImpl: async () => jsonResponse(200, fixture) }), (err) => err.code === 'FLIGHTS_TEMPORARILY_UNAVAILABLE');
});

await test('logo template "off" disables logos', () => {
  const config = readFlightConfig({ FLIGHTS_AIRLINE_LOGO_URL: 'off' });
  const board = normalizeBoard(fixture, CMN, { logoTemplate: config.logoTemplate });
  assert.equal(board.arrivals[0].airline.logoUrl, null);
});

const { default: express } = await import('express');
const { default: http } = await import('node:http');
const { default: flightRouter } = await import('../routes/flightRoutes.js');

const app = express();
app.use('/api/flights', flightRouter);
const server = await new Promise((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const port = server.address().port;
const get = (path) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path }, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(body) }));
  }).on('error', reject);
});

const realFetch = globalThis.fetch;
const savedGap = process.env.FLIGHTS_UPSTREAM_GAP_MS;
process.env.FLIGHTS_UPSTREAM_GAP_MS = '0';
try {
  await test('HTTP: airport list is public', async () => {
    const res = await get('/api/flights/airports');
    assert.equal(res.status, 200);
    assert.ok(res.json.airports.some((a) => a.iata === 'CMN'));
  });

  await test('HTTP: no coverage → 503 "Live flight data unavailable" with official link, no-store', async () => {
    globalThis.fetch = async () => jsonResponse(200, emptySky);
    const res = await get('/api/flights/CMN');
    assert.equal(res.status, 503);
    assert.equal(res.json.success, false);
    assert.equal(res.json.code, 'FLIGHTS_NO_COVERAGE');
    assert.equal(res.json.message, 'Live flight data unavailable');
    assert.equal(res.json.officialUrl, 'https://www.onda.ma/');
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  await test('HTTP: unsupported airport → 404', async () => {
    const res = await get('/api/flights/JFK');
    assert.equal(res.status, 404);
    assert.equal(res.json.code, 'AIRPORT_UNSUPPORTED');
  });

  await test('HTTP: observed traffic → board in the existing response format', async () => {
    globalThis.fetch = async () => jsonResponse(200, fixture);
    const res = await get('/api/flights/cmn');
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    for (const key of ['airport', 'provider', 'timeZone', 'fetchedAt', 'stale', 'staleReason', 'refreshAfterSeconds', 'hasLiveData', 'arrivals', 'departures']) {
      assert.ok(key in res.json, `missing ${key}`);
    }
    assert.deepEqual(res.json.airport, { iata: 'CMN', icao: 'GMMN', name: 'Mohammed V International', city: 'Casablanca' });
    assert.equal(res.json.timeZone, 'Africa/Casablanca');
    assert.equal(res.json.arrivals[0].number, 'RAM973');
    assert.match(res.headers['cache-control'], /max-age=60/);
  });

  await test('HTTP: upstream refusal is reported generically', async () => {
    globalThis.fetch = async () => jsonResponse(403, {});
    const res = await get('/api/flights/AGA');
    assert.equal(res.status, 502);
    assert.equal(res.json.code, 'FLIGHTS_UPSTREAM_ERROR');
    assert.equal(res.json.message, 'Live flight data unavailable');
  });
} finally {
  globalThis.fetch = realFetch;
  if (savedGap === undefined) delete process.env.FLIGHTS_UPSTREAM_GAP_MS;
  else process.env.FLIGHTS_UPSTREAM_GAP_MS = savedGap;
  server.close();
}

console.log(`\n${passed} checks passed`);

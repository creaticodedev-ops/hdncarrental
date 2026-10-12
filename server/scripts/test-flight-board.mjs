/**
 * Flight board service checks with a mocked upstream (shape per AeroDataBox OpenAPI
 * `AirportFidsContract`). Run: node scripts/test-flight-board.mjs
 * Optional live smoke test: AERODATABOX_API_KEY=... node scripts/test-flight-board.mjs --live CMN
 */
import assert from 'node:assert/strict';
import {
  FLIGHT_STATUS_KEYS,
  getFlightBoard,
  mapFlightStatus,
  normalizeBoard,
  resetFlightBoardState,
} from '../services/flightBoardService.js';

const fixture = {
  arrivals: [
    {
      number: 'AT  801',
      status: 'Arrived',
      codeshareStatus: 'IsOperator',
      isCargo: false,
      airline: { name: 'Royal Air Maroc', iata: 'AT', icao: 'RAM' },
      movement: {
        airport: { icao: 'LFPG', iata: 'CDG', name: 'Paris Charles de Gaulle', municipalityName: 'Paris', timeZone: 'Europe/Paris' },
        scheduledTime: { utc: '2026-10-12 12:40Z', local: '2026-10-12 13:40+01:00' },
        revisedTime: { utc: '2026-10-12 13:05Z', local: '2026-10-12 14:05+01:00' },
        terminal: '1',
        baggageBelt: '4',
        quality: ['Basic', 'Live'],
      },
    },
    {
      number: 'AF 1396',
      status: 'Expected',
      codeshareStatus: 'IsCodeshared',
      isCargo: false,
      airline: { name: 'Air France', iata: 'AF', icao: 'AFR' },
      movement: {
        airport: { iata: 'CDG', name: 'Paris Charles de Gaulle' },
        scheduledTime: { utc: '2026-10-12 12:40Z' },
        quality: ['Basic'],
      },
    },
    {
      number: 'QY 100',
      status: 'Expected',
      isCargo: true,
      airline: { name: 'DHL', iata: 'QY' },
      movement: { airport: { iata: 'LEJ' }, scheduledTime: { utc: '2026-10-12 11:00Z' }, quality: ['Basic'] },
    },
  ],
  departures: [
    {
      number: 'FR 4412',
      status: 'Boarding',
      codeshareStatus: 'IsOperator',
      isCargo: false,
      airline: { name: 'Ryanair', iata: 'FR', icao: 'RYR' },
      movement: {
        airport: { iata: 'MAD', name: 'Madrid Barajas', municipalityName: 'Madrid' },
        scheduledTime: { utc: '2026-10-12 14:10Z' },
        terminal: '2',
        gate: 'B12',
        quality: ['Basic', 'Live'],
      },
    },
    {
      number: '3O 211',
      status: 'Canceled',
      codeshareStatus: 'IsOperator',
      isCargo: false,
      airline: { name: 'Air Arabia Maroc', iata: '3O' },
      movement: { airport: { iata: 'BCN', shortName: 'Barcelona' }, scheduledTime: { utc: '2026-10-12 13:20Z' }, quality: ['Basic'] },
    },
    { number: 'XX 1', status: 'Expected', movement: { airport: {}, quality: [] } },
  ],
};

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

const env = { AERODATABOX_API_KEY: 'test-key', AERODATABOX_GATEWAY: 'direct', FLIGHTS_CACHE_TTL_SECONDS: '600' };

if (process.argv.includes('--live')) {
  const code = process.argv[process.argv.indexOf('--live') + 1] || 'CMN';
  const board = await getFlightBoard(code);
  console.log(`[live] ${board.airport.iata} fetchedAt=${board.fetchedAt} live=${board.hasLiveData} arrivals=${board.arrivals.length} departures=${board.departures.length}`);
  for (const f of [...board.arrivals.slice(0, 5), ...board.departures.slice(0, 5)]) {
    console.log(`  ${f.number.padEnd(8)} ${String(f.airport.city || f.airport.iata).padEnd(18)} ${f.scheduled} ${f.status}`);
  }
  process.exit(0);
}

console.log('flight board service');

await test('status mapping covers every provider enum value', () => {
  for (const [raw, key] of Object.entries(FLIGHT_STATUS_KEYS)) assert.equal(mapFlightStatus(raw), key);
  assert.equal(mapFlightStatus('SomethingNew'), 'other');
  assert.equal(mapFlightStatus(undefined), 'unknown');
});

await test('normalises FIDS items, drops cargo/codeshares/incomplete rows, sorts by time', () => {
  const board = normalizeBoard(fixture, { logoTemplate: 'https://logo.test/{iata}.png' });
  assert.equal(board.arrivals.length, 1);
  const at = board.arrivals[0];
  assert.equal(at.number, 'AT 801');
  assert.equal(at.airline.name, 'Royal Air Maroc');
  assert.equal(at.airline.logoUrl, 'https://logo.test/AT.png');
  assert.equal(at.airport.iata, 'CDG');
  assert.equal(at.airport.city, 'Paris');
  assert.equal(at.scheduled, '2026-10-12T12:40:00.000Z');
  assert.equal(at.estimated, '2026-10-12T13:05:00.000Z');
  assert.equal(at.delayMinutes, 25);
  assert.equal(at.baggageBelt, '4');
  assert.equal(at.status, 'Arrived');
  assert.equal(at.statusKey, 'arrived');
  assert.equal(at.live, true);

  assert.deepEqual(board.departures.map((f) => f.number), ['3O 211', 'FR 4412']);
  assert.equal(board.departures[0].statusKey, 'canceled');
  assert.equal(board.departures[0].airport.city, 'Barcelona');
  assert.equal(board.departures[0].live, false);
  assert.equal(board.departures[1].gate, 'B12');
  assert.equal(board.departures[1].baggageBelt, null);
});

await test('not configured → 503 without calling upstream', async () => {
  let calls = 0;
  await assert.rejects(
    getFlightBoard('CMN', { env: {}, fetchImpl: async () => { calls += 1; } }),
    (err) => err.status === 503 && err.code === 'FLIGHTS_NOT_CONFIGURED',
  );
  assert.equal(calls, 0);
});

await test('unsupported airport → 404', async () => {
  await assert.rejects(getFlightBoard('CDG', { env }), (err) => err.status === 404 && err.code === 'AIRPORT_UNSUPPORTED');
});

await test('uses the right gateway URL and auth headers', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push({ url, headers: init.headers }); return jsonResponse(200, fixture); };
  await getFlightBoard('rak', { env, fetchImpl });
  await getFlightBoard('CMN', { env: { ...env, AERODATABOX_GATEWAY: 'rapidapi' }, fetchImpl });
  await getFlightBoard('AGA', { env: { ...env, AERODATABOX_GATEWAY: 'apimarket' }, fetchImpl });
  assert.match(seen[0].url, /^https:\/\/api\.aerodatabox\.com\/flights\/airports\/iata\/RAK\?/);
  assert.match(seen[0].url, /direction=Both/);
  assert.match(seen[0].url, /withCodeshared=false/);
  assert.equal(seen[0].headers['X-Api-Key'], 'test-key');
  assert.match(seen[1].url, /^https:\/\/aerodatabox\.p\.rapidapi\.com\//);
  assert.equal(seen[1].headers['X-RapidAPI-Host'], 'aerodatabox.p.rapidapi.com');
  assert.match(seen[2].url, /^https:\/\/prod\.api\.market\/api\/v1\/aedbx\/aerodatabox\//);
  assert.equal(seen[2].headers['x-api-market-key'], 'test-key');
});

await test('caches per airport and dedupes concurrent requests', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; await new Promise((r) => setTimeout(r, 20)); return jsonResponse(200, fixture); };
  const [a, b] = await Promise.all([getFlightBoard('CMN', { env, fetchImpl }), getFlightBoard('CMN', { env, fetchImpl })]);
  const c = await getFlightBoard('CMN', { env, fetchImpl });
  assert.equal(calls, 1);
  assert.equal(a.fetchedAt, b.fetchedAt);
  assert.equal(c.stale, false);
  assert.equal(c.hasLiveData, true);
  assert.ok(c.refreshAfterSeconds > 0 && c.refreshAfterSeconds <= 600);
});

await test('204 No Content → empty boards, not an error', async () => {
  const board = await getFlightBoard('ESU', { env, fetchImpl: async () => jsonResponse(204) });
  assert.deepEqual([board.arrivals.length, board.departures.length, board.stale], [0, 0, false]);
});

await test('upstream failure with cached data → last valid board flagged stale with original timestamp', async () => {
  const shortTtl = { ...env, FLIGHTS_CACHE_TTL_SECONDS: '120' };
  const first = await getFlightBoard('CMN', { env: shortTtl, fetchImpl: async () => jsonResponse(200, fixture) });
  const realNow = Date.now;
  Date.now = () => realNow() + 125_000;
  try {
    const second = await getFlightBoard('CMN', { env: shortTtl, fetchImpl: async () => jsonResponse(500, {}) });
    assert.equal(second.stale, true);
    assert.equal(second.staleReason, 'upstream');
    assert.equal(second.fetchedAt, first.fetchedAt);
    assert.equal(second.arrivals.length, 1);
  } finally {
    Date.now = realNow;
  }
});

await test('upstream failure without cache → 502, then backs off instead of hammering', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return jsonResponse(503, {}); };
  await assert.rejects(getFlightBoard('TNG', { env, fetchImpl }), (err) => err.status === 502);
  await assert.rejects(getFlightBoard('TNG', { env, fetchImpl }), (err) => err.code === 'FLIGHTS_TEMPORARILY_UNAVAILABLE');
  assert.equal(calls, 1);
});

await test('429 and 401 trigger a global cooldown', async () => {
  let calls = 0;
  await assert.rejects(getFlightBoard('CMN', { env, fetchImpl: async () => { calls += 1; return jsonResponse(429, {}); } }));
  await assert.rejects(getFlightBoard('RAK', { env, fetchImpl: async () => { calls += 1; return jsonResponse(200, fixture); } }));
  assert.equal(calls, 1);
  resetFlightBoardState();
  await assert.rejects(getFlightBoard('CMN', { env, fetchImpl: async () => jsonResponse(401, {}) }), (err) => err.code === 'FLIGHTS_UPSTREAM_AUTH');
});

await test('daily call limit stops upstream calls', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return jsonResponse(200, fixture); };
  const capped = { ...env, FLIGHTS_DAILY_CALL_LIMIT: '2' };
  await getFlightBoard('CMN', { env: capped, fetchImpl });
  await getFlightBoard('RAK', { env: capped, fetchImpl });
  await assert.rejects(getFlightBoard('AGA', { env: capped, fetchImpl }), (err) => err.code === 'FLIGHTS_TEMPORARILY_UNAVAILABLE');
  assert.equal(calls, 2);
});

await test('logo template "off" disables logos', () => {
  const board = normalizeBoard(fixture, { logoTemplate: '' });
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
const savedKey = process.env.AERODATABOX_API_KEY;
try {
  await test('HTTP: airport list is public', async () => {
    const res = await get('/api/flights/airports');
    assert.equal(res.status, 200);
    assert.ok(res.json.airports.some((a) => a.iata === 'CMN'));
  });

  await test('HTTP: no key → 503 FLIGHTS_NOT_CONFIGURED, no-store', async () => {
    delete process.env.AERODATABOX_API_KEY;
    const res = await get('/api/flights/CMN');
    assert.equal(res.status, 503);
    assert.equal(res.json.code, 'FLIGHTS_NOT_CONFIGURED');
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  await test('HTTP: unsupported airport → 404', async () => {
    process.env.AERODATABOX_API_KEY = 'test-key';
    const res = await get('/api/flights/JFK');
    assert.equal(res.status, 404);
  });

  await test('HTTP: configured → normalised board, key never echoed', async () => {
    process.env.AERODATABOX_API_KEY = 'secret-key-123';
    globalThis.fetch = async () => jsonResponse(200, fixture);
    const res = await get('/api/flights/rak');
    assert.equal(res.status, 200);
    assert.equal(res.json.airport.iata, 'RAK');
    assert.equal(res.json.stale, false);
    assert.equal(res.json.arrivals[0].number, 'AT 801');
    assert.match(res.headers['cache-control'], /max-age=60/);
    assert.ok(!JSON.stringify(res.json).includes('secret-key-123'));
  });

  await test('HTTP: upstream auth failure is reported generically', async () => {
    process.env.AERODATABOX_API_KEY = 'bad';
    globalThis.fetch = async () => jsonResponse(401, {});
    const res = await get('/api/flights/AGA');
    assert.equal(res.status, 502);
    assert.equal(res.json.code, 'FLIGHTS_UPSTREAM_ERROR');
  });
} finally {
  globalThis.fetch = realFetch;
  if (savedKey === undefined) delete process.env.AERODATABOX_API_KEY;
  else process.env.AERODATABOX_API_KEY = savedKey;
  server.close();
}

console.log(`\n${passed} checks passed`);

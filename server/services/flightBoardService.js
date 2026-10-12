import { MOROCCO_AIRPORTS, findMoroccoAirport } from '../utils/moroccoAirports.js';

/**
 * Live movements around Moroccan airports from adsb.lol — a free, keyless community ADS-B network
 * (data under ODbL 1.0: attribution required, commercial use allowed).
 * It reports aircraft positions, not airline schedules: a flight appears only while a volunteer receiver
 * hears it, so an empty result means "no live coverage", never "no flights". Nothing is ever inferred
 * beyond what was observed — no scheduled times, gates or origins.
 */

export const PROVIDER = { name: 'adsb.lol', url: 'https://adsb.lol', license: 'ODbL-1.0' };
export const OFFICIAL_FLIGHT_INFO_URL = 'https://www.onda.ma/';

const ADSB_API_URL = 'https://api.adsb.lol';
const DEFAULT_CONTACT = 'haddanecar@gmail.com';
const DEFAULT_LOGO_TEMPLATE = 'https://pics.avs.io/120/40/{iata}.png';
const SEARCH_RADIUS_NM = 40;
const UPSTREAM_TIMEOUT_MS = 8_000;
const UPSTREAM_MIN_GAP_MS = 1_500;
const UPSTREAM_MAX_WAIT_MS = 6_000;
const STALE_MAX_AGE_MS = 10 * 60_000;
const FAILURE_RETRY_MS = 60_000;
const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
const BLOCKED_COOLDOWN_MS = 30 * 60_000;
const MAX_POSITION_AGE_S = 60;
const MAX_ALTITUDE_FT = 12_000;
const DEPARTURE_MAX_DISTANCE_NM = 25;
const EARTH_RADIUS_NM = 3440.065;

/** ICAO callsign prefix → [IATA code, name] for airlines commonly seen at Moroccan airports. */
const AIRLINES = {
  RAM: ['AT', 'Royal Air Maroc'],
  MAC: ['3O', 'Air Arabia Maroc'],
  AFR: ['AF', 'Air France'],
  TVF: ['TO', 'Transavia France'],
  TRA: ['HV', 'Transavia'],
  RYR: ['FR', 'Ryanair'],
  EZY: ['U2', 'easyJet'],
  EJU: ['EC', 'easyJet Europe'],
  IBE: ['IB', 'Iberia'],
  IBS: ['I2', 'Iberia Express'],
  ANE: ['YW', 'Air Nostrum'],
  VLG: ['VY', 'Vueling'],
  AEA: ['UX', 'Air Europa'],
  IBB: ['NT', 'Binter Canarias'],
  VOE: ['V7', 'Volotea'],
  TAP: ['TP', 'TAP Air Portugal'],
  DLH: ['LH', 'Lufthansa'],
  EWG: ['EW', 'Eurowings'],
  CFG: ['DE', 'Condor'],
  BEL: ['SN', 'Brussels Airlines'],
  JAF: ['TB', 'TUI fly Belgium'],
  KLM: ['KL', 'KLM'],
  BAW: ['BA', 'British Airways'],
  EXS: ['LS', 'Jet2'],
  ITY: ['AZ', 'ITA Airways'],
  WZZ: ['W6', 'Wizz Air'],
  TAR: ['TU', 'Tunisair'],
  MSR: ['MS', 'EgyptAir'],
  THY: ['TK', 'Turkish Airlines'],
  UAE: ['EK', 'Emirates'],
  QTR: ['QR', 'Qatar Airways'],
  SVA: ['SV', 'Saudia'],
};

export class FlightBoardError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

const readInt = (value, fallback, min) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, n);
};

export const readFlightConfig = (env = process.env) => {
  const logo = env.FLIGHTS_AIRLINE_LOGO_URL;
  const contact = String(env.FLIGHTS_CONTACT || '').trim() || DEFAULT_CONTACT;
  return {
    ttlMs: readInt(env.FLIGHTS_CACHE_TTL_SECONDS, 90, 60) * 1000,
    minGapMs: readInt(env.FLIGHTS_UPSTREAM_GAP_MS, UPSTREAM_MIN_GAP_MS, 0),
    // adsb.lol rejects generic clients with 403 "include valid contact info".
    userAgent: `HDNCarFlightBoard/1.0 (+https://hdncar.com; ${contact})`,
    logoTemplate: logo === undefined ? DEFAULT_LOGO_TEMPLATE : String(logo).trim().toLowerCase() === 'off' ? '' : String(logo).trim(),
  };
};

const toRad = (deg) => (deg * Math.PI) / 180;

export const distanceNm = (lat1, lon1, lat2, lon2) => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
};

const bearingDeg = (lat1, lon1, lat2, lon2) => {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const angleBetween = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

const nearestAirport = (lat, lon, airports) => {
  let best = null;
  let bestDistance = Infinity;
  for (const airport of airports) {
    const d = distanceNm(lat, lon, airport.lat, airport.lon);
    if (d < bestDistance) {
      best = airport;
      bestDistance = d;
    }
  }
  return best;
};

/**
 * Classify one ADS-B position as an arrival or departure at `airport` from geometry alone:
 * low, within range, nearest to this airport, and either heading in while level/descending
 * or climbing away. Overflights, aircraft on the ground and old positions are dropped.
 */
export const classifyAircraft = (ac, airport, referenceMs = Date.now(), { neighbours = MOROCCO_AIRPORTS } = {}) => {
  const callsign = String(ac?.flight || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,8}$/.test(callsign)) return null;
  if (/^[BC]/.test(String(ac.category || ''))) return null;

  const lat = Number(ac.lat);
  const lon = Number(ac.lon);
  const track = Number(ac.track);
  const altitude = ac.alt_baro;
  const positionAge = Number(ac.seen_pos ?? ac.seen);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(track)) return null;
  if (typeof altitude !== 'number' || altitude > MAX_ALTITUDE_FT) return null;
  if (!Number.isFinite(positionAge) || positionAge > MAX_POSITION_AGE_S) return null;

  const distance = distanceNm(lat, lon, airport.lat, airport.lon);
  if (distance > SEARCH_RADIUS_NM || nearestAirport(lat, lon, neighbours)?.iata !== airport.iata) return null;

  const verticalRate = Number(ac.baro_rate ?? ac.geom_rate ?? 0) || 0;
  const offCourse = angleBetween(track, bearingDeg(lat, lon, airport.lat, airport.lon));

  let direction = null;
  if (offCourse <= 40 && verticalRate <= 300 && altitude <= 3000 + 450 * distance) {
    direction = 'arrival';
  } else if (offCourse >= 120 && verticalRate >= 300 && distance <= DEPARTURE_MAX_DISTANCE_NM && altitude <= 2000 + 700 * distance) {
    direction = 'departure';
  }
  if (!direction) return null;

  return {
    direction,
    callsign,
    hex: String(ac.hex || '').trim() || null,
    distance,
    altitude,
    aircraftType: String(ac.t || '').trim() || null,
    observedAt: new Date(referenceMs - positionAge * 1000).toISOString(),
  };
};

const airlineLogoUrl = (template, iata) => {
  if (!template || !iata || !/^[A-Z0-9]{2}$/.test(iata)) return null;
  return template.replace('{iata}', iata);
};

/** Same flight shape the board has always used; schedule-only fields stay null because ADS-B can't know them. */
const toFlight = (obs, { logoTemplate = '' } = {}) => {
  const isArrival = obs.direction === 'arrival';
  const airlineIcao = /^[A-Z]{3}\d/.test(obs.callsign) ? obs.callsign.slice(0, 3) : null;
  const [airlineIata = null, airlineName = null] = AIRLINES[airlineIcao] || [];
  return {
    id: `${obs.hex || obs.callsign}|${obs.direction}`,
    number: obs.callsign,
    airline: {
      name: airlineName,
      iata: airlineIata,
      icao: airlineIcao,
      logoUrl: airlineLogoUrl(logoTemplate, airlineIata),
    },
    airport: { iata: null, icao: null, name: null, city: null },
    scheduled: null,
    estimated: null,
    runway: null,
    delayMinutes: null,
    terminal: null,
    gate: null,
    baggageBelt: null,
    status: isArrival ? 'Approaching' : 'Departed',
    statusKey: isArrival ? 'approaching' : 'departed',
    live: true,
    observedAt: obs.observedAt,
    distanceNm: Math.round(obs.distance * 10) / 10,
    altitudeFt: Math.round(obs.altitude / 100) * 100,
    aircraftType: obs.aircraftType,
  };
};

export const normalizeBoard = (payload, airport, options = {}) => {
  const referenceMs = Number(payload?.now) || Date.now();
  const aircraft = Array.isArray(payload?.ac) ? payload.ac : [];
  const seen = new Set();
  const arrivals = [];
  const departures = [];
  for (const ac of aircraft) {
    const obs = classifyAircraft(ac, airport, referenceMs, options);
    if (!obs) continue;
    const key = obs.hex || obs.callsign;
    if (seen.has(key)) continue;
    seen.add(key);
    (obs.direction === 'arrival' ? arrivals : departures).push(toFlight(obs, options));
  }
  const byDistance = (a, b) => a.distanceNm - b.distanceNm;
  return {
    arrivals: arrivals.sort(byDistance),
    departures: departures.sort(byDistance),
    aircraftInRange: aircraft.length,
  };
};

const cache = new Map();
const inflight = new Map();
const retryAt = new Map();
const cooldown = { until: 0, reason: null };
let nextSlotAt = 0;

/** adsb.lol throttles bursts, so upstream calls are spaced out across all airports. */
const reserveUpstreamSlot = async (minGapMs) => {
  const now = Date.now();
  const at = Math.max(now, nextSlotAt);
  if (at - now > UPSTREAM_MAX_WAIT_MS) {
    throw new FlightBoardError(503, 'FLIGHTS_TEMPORARILY_UNAVAILABLE', 'Flight data source busy');
  }
  nextSlotAt = at + minGapMs;
  if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
};

export const fetchUpstream = async (airport, config, fetchImpl = fetch) => {
  await reserveUpstreamSlot(config.minGapMs);
  const url = `${ADSB_API_URL}/v2/point/${airport.lat}/${airport.lon}/${SEARCH_RADIUS_NM}`;
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': config.userAgent },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (response.status === 429) {
    cooldown.until = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    cooldown.reason = 'rate_limited';
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_RATE_LIMITED', 'adsb.lol rate limit reached');
  }
  if (response.status === 401 || response.status === 403) {
    cooldown.until = Date.now() + BLOCKED_COOLDOWN_MS;
    cooldown.reason = 'blocked';
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_BLOCKED', `adsb.lol refused the request (${response.status})`);
  }
  if (!response.ok) {
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_ERROR', `adsb.lol responded ${response.status}`);
  }
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.ac)) {
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_ERROR', 'adsb.lol returned an unexpected payload');
  }
  return payload;
};

const hasFlights = (entry) => Boolean(entry?.board.arrivals.length || entry?.board.departures.length);

const present = (airport, entry, config, { stale, staleReason = null }) => {
  if (!hasFlights(entry)) {
    throw new FlightBoardError(503, 'FLIGHTS_NO_COVERAGE', 'No live flight data is available near this airport');
  }
  const ageMs = Date.now() - entry.fetchedAt;
  const refreshInMs = stale ? FAILURE_RETRY_MS : Math.max(60_000, config.ttlMs - ageMs);
  return {
    airport: { iata: airport.iata, icao: airport.icao, name: airport.name, city: airport.city },
    provider: PROVIDER.name,
    providerUrl: PROVIDER.url,
    license: PROVIDER.license,
    dataKind: 'observed',
    officialUrl: OFFICIAL_FLIGHT_INFO_URL,
    timeZone: 'Africa/Casablanca',
    fetchedAt: new Date(entry.fetchedAt).toISOString(),
    stale,
    staleReason,
    refreshAfterSeconds: Math.round(refreshInMs / 1000),
    hasLiveData: true,
    coverage: { radiusNm: SEARCH_RADIUS_NM, aircraftInRange: entry.board.aircraftInRange },
    arrivals: entry.board.arrivals,
    departures: entry.board.departures,
  };
};

export const getFlightBoard = async (code, { env = process.env, fetchImpl = fetch } = {}) => {
  const airport = findMoroccoAirport(code);
  if (!airport) throw new FlightBoardError(404, 'AIRPORT_UNSUPPORTED', 'Airport not supported');

  const config = readFlightConfig(env);
  const now = Date.now();
  let entry = cache.get(airport.iata);
  if (entry && now - entry.fetchedAt > STALE_MAX_AGE_MS) {
    cache.delete(airport.iata);
    entry = undefined;
  }
  if (entry && now - entry.fetchedAt < config.ttlMs) {
    return present(airport, entry, config, { stale: false });
  }

  const blockedReason =
    now < cooldown.until ? cooldown.reason
      : now < (retryAt.get(airport.iata) || 0) ? 'upstream'
        : null;
  if (blockedReason) {
    if (hasFlights(entry)) return present(airport, entry, config, { stale: true, staleReason: blockedReason });
    throw new FlightBoardError(503, 'FLIGHTS_TEMPORARILY_UNAVAILABLE', 'Flight data temporarily unavailable');
  }

  if (!inflight.has(airport.iata)) {
    const job = fetchUpstream(airport, config, fetchImpl)
      .then((payload) => {
        const fresh = { fetchedAt: Date.now(), board: normalizeBoard(payload, airport, { logoTemplate: config.logoTemplate }) };
        cache.set(airport.iata, fresh);
        retryAt.delete(airport.iata);
        return fresh;
      })
      .finally(() => inflight.delete(airport.iata));
    inflight.set(airport.iata, job);
  }

  let fresh;
  try {
    fresh = await inflight.get(airport.iata);
  } catch (error) {
    retryAt.set(airport.iata, Date.now() + FAILURE_RETRY_MS);
    console.warn(`[flights] ${airport.iata}: ${error?.message || error}`);
    if (hasFlights(entry)) return present(airport, entry, config, { stale: true, staleReason: 'upstream' });
    if (error instanceof FlightBoardError) throw error;
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_ERROR', 'Flight data provider unavailable');
  }
  return present(airport, fresh, config, { stale: false });
};

/** Test hook: clears caches, cooldowns and upstream pacing. */
export const resetFlightBoardState = () => {
  cache.clear();
  inflight.clear();
  retryAt.clear();
  cooldown.until = 0;
  cooldown.reason = null;
  nextSlotAt = 0;
};

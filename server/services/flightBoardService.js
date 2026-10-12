import { findMoroccoAirport } from '../utils/moroccoAirports.js';

/**
 * Live airport arrivals/departures (FIDS) from AeroDataBox.
 * One upstream call (direction=Both, Tier 2 = 2 API units) feeds both boards for an airport,
 * and is shared by every visitor through the in-memory cache below.
 */

const GATEWAYS = {
  direct: {
    baseUrl: 'https://api.aerodatabox.com',
    headers: (key) => ({ 'X-Api-Key': key }),
  },
  rapidapi: {
    baseUrl: 'https://aerodatabox.p.rapidapi.com',
    headers: (key) => ({ 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' }),
  },
  apimarket: {
    baseUrl: 'https://prod.api.market/api/v1/aedbx/aerodatabox',
    headers: (key) => ({ 'x-api-market-key': key }),
  },
};

const DEFAULT_LOGO_TEMPLATE = 'https://pics.avs.io/120/40/{iata}.png';
const WINDOW_OFFSET_MINUTES = -90;
const WINDOW_DURATION_MINUTES = 480;
const UPSTREAM_TIMEOUT_MS = 9_000;
const STALE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 60_000;
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000;
const AUTH_COOLDOWN_MS = 15 * 60 * 1000;

export const FLIGHT_STATUS_KEYS = {
  Unknown: 'unknown',
  Expected: 'expected',
  EnRoute: 'enRoute',
  CheckIn: 'checkIn',
  Boarding: 'boarding',
  GateClosed: 'gateClosed',
  Departed: 'departed',
  Delayed: 'delayed',
  Approaching: 'approaching',
  Arrived: 'arrived',
  Canceled: 'canceled',
  CanceledUncertain: 'canceledUncertain',
  Diverted: 'diverted',
};

/** Provider status → stable UI key. Unrecognised provider values stay visible as `other`. */
export const mapFlightStatus = (status) => {
  if (!status) return 'unknown';
  return FLIGHT_STATUS_KEYS[status] || 'other';
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
  const gatewayName = String(env.AERODATABOX_GATEWAY || 'direct').trim().toLowerCase();
  const logo = env.FLIGHTS_AIRLINE_LOGO_URL;
  return {
    apiKey: String(env.AERODATABOX_API_KEY || '').trim(),
    gatewayName: GATEWAYS[gatewayName] ? gatewayName : 'direct',
    ttlMs: readInt(env.FLIGHTS_CACHE_TTL_SECONDS, 600, 120) * 1000,
    dailyCallLimit: readInt(env.FLIGHTS_DAILY_CALL_LIMIT, 400, 0),
    logoTemplate: logo === undefined ? DEFAULT_LOGO_TEMPLATE : String(logo).trim().toLowerCase() === 'off' ? '' : String(logo).trim(),
  };
};

/** AeroDataBox times look like "2026-10-12 13:30Z"; return ISO-8601 UTC or null. */
const toIsoUtc = (dateTime) => {
  const raw = dateTime?.utc;
  if (!raw) return null;
  const parsed = new Date(String(raw).trim().replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const cleanText = (value) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
};

const airlineLogoUrl = (template, iata) => {
  if (!template || !iata || !/^[A-Z0-9]{2}$/.test(iata)) return null;
  return template.replace('{iata}', iata);
};

/**
 * Normalise one FIDS item. `direction` is 'arrival' | 'departure' relative to the requested airport.
 * Without `withLeg`, `movement` holds this airport's times while `movement.airport` is the other end.
 */
export const normalizeFlight = (item, direction, { logoTemplate = '' } = {}) => {
  if (!item || typeof item !== 'object') return null;
  const isArrival = direction === 'arrival';
  const here = item.movement || (isArrival ? item.arrival : item.departure) || {};
  const there = item.movement?.airport || (isArrival ? item.departure?.airport : item.arrival?.airport) || {};

  const number = cleanText(item.number);
  const scheduled = toIsoUtc(here.scheduledTime);
  if (!number || !scheduled) return null;

  const estimated = toIsoUtc(here.revisedTime);
  const runway = toIsoUtc(here.runwayTime);
  const quality = Array.isArray(here.quality) ? here.quality : [];
  const airlineIata = cleanText(item.airline?.iata)?.toUpperCase() || null;
  const status = cleanText(item.status) || 'Unknown';
  const delayMinutes = estimated ? Math.round((Date.parse(estimated) - Date.parse(scheduled)) / 60_000) : null;

  return {
    id: `${number}|${scheduled}|${direction}`,
    number,
    airline: {
      name: cleanText(item.airline?.name),
      iata: airlineIata,
      icao: cleanText(item.airline?.icao)?.toUpperCase() || null,
      logoUrl: airlineLogoUrl(logoTemplate, airlineIata),
    },
    airport: {
      iata: cleanText(there.iata)?.toUpperCase() || null,
      icao: cleanText(there.icao)?.toUpperCase() || null,
      name: cleanText(there.name),
      city: cleanText(there.municipalityName) || cleanText(there.shortName) || cleanText(there.name),
    },
    scheduled,
    estimated,
    runway,
    delayMinutes,
    terminal: cleanText(here.terminal),
    gate: cleanText(here.gate),
    baggageBelt: isArrival ? cleanText(here.baggageBelt) : null,
    status,
    statusKey: mapFlightStatus(status),
    live: quality.includes('Live'),
  };
};

export const normalizeBoard = (payload, options = {}) => {
  const build = (list, direction) => {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .filter((item) => !item?.isCargo && item?.codeshareStatus !== 'IsCodeshared')
      .map((item) => normalizeFlight(item, direction, options))
      .filter((flight) => {
        if (!flight || seen.has(flight.id)) return false;
        seen.add(flight.id);
        return true;
      })
      .sort((a, b) => a.scheduled.localeCompare(b.scheduled));
  };
  return {
    arrivals: build(payload?.arrivals, 'arrival'),
    departures: build(payload?.departures, 'departure'),
  };
};

const cache = new Map();
const inflight = new Map();
const retryAt = new Map();
const cooldown = { until: 0, reason: null };
const usage = { day: '', calls: 0 };

const todayKey = () => new Date().toISOString().slice(0, 10);

const quotaExhausted = (limit) => {
  if (!limit) return false;
  if (usage.day !== todayKey()) {
    usage.day = todayKey();
    usage.calls = 0;
  }
  return usage.calls >= limit;
};

const fetchUpstream = async (airport, config, fetchImpl) => {
  const gateway = GATEWAYS[config.gatewayName];
  const params = new URLSearchParams({
    offsetMinutes: String(WINDOW_OFFSET_MINUTES),
    durationMinutes: String(WINDOW_DURATION_MINUTES),
    direction: 'Both',
    withLeg: 'false',
    withCancelled: 'true',
    withCodeshared: 'false',
    withCargo: 'false',
    withPrivate: 'false',
    withLocation: 'false',
  });
  const url = `${gateway.baseUrl}/flights/airports/iata/${airport.iata}?${params}`;

  usage.calls += 1;
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', ...gateway.headers(config.apiKey) },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (response.status === 204) return { arrivals: [], departures: [] };
  if (response.status === 401 || response.status === 403) {
    cooldown.until = Date.now() + AUTH_COOLDOWN_MS;
    cooldown.reason = 'auth';
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_AUTH', `AeroDataBox rejected the API key (${response.status})`);
  }
  if (response.status === 429) {
    cooldown.until = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    cooldown.reason = 'rate_limited';
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_RATE_LIMITED', 'AeroDataBox rate limit reached');
  }
  if (!response.ok) {
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_ERROR', `AeroDataBox responded ${response.status}`);
  }
  return response.json();
};

const present = (airport, entry, config, { stale, staleReason = null }) => {
  const ageMs = Date.now() - entry.fetchedAt;
  const refreshInMs = stale ? FAILURE_RETRY_MS : Math.max(60_000, config.ttlMs - ageMs);
  return {
    airport: { iata: airport.iata, icao: airport.icao, name: airport.name, city: airport.city },
    provider: 'AeroDataBox',
    timeZone: 'Africa/Casablanca',
    fetchedAt: new Date(entry.fetchedAt).toISOString(),
    stale,
    staleReason,
    refreshAfterSeconds: Math.round(refreshInMs / 1000),
    hasLiveData: entry.board.arrivals.some((f) => f.live) || entry.board.departures.some((f) => f.live),
    arrivals: entry.board.arrivals,
    departures: entry.board.departures,
  };
};

export const getFlightBoard = async (code, { env = process.env, fetchImpl = fetch } = {}) => {
  const airport = findMoroccoAirport(code);
  if (!airport) throw new FlightBoardError(404, 'AIRPORT_UNSUPPORTED', 'Airport not supported');

  const config = readFlightConfig(env);
  if (!config.apiKey) throw new FlightBoardError(503, 'FLIGHTS_NOT_CONFIGURED', 'Flight data provider is not configured');

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
        : quotaExhausted(config.dailyCallLimit) ? 'quota'
          : null;
  if (blockedReason) {
    if (entry) return present(airport, entry, config, { stale: true, staleReason: blockedReason });
    throw new FlightBoardError(503, 'FLIGHTS_TEMPORARILY_UNAVAILABLE', 'Flight data temporarily unavailable');
  }

  if (!inflight.has(airport.iata)) {
    const job = fetchUpstream(airport, config, fetchImpl)
      .then((payload) => {
        const fresh = { fetchedAt: Date.now(), board: normalizeBoard(payload, { logoTemplate: config.logoTemplate }) };
        cache.set(airport.iata, fresh);
        retryAt.delete(airport.iata);
        return fresh;
      })
      .finally(() => inflight.delete(airport.iata));
    inflight.set(airport.iata, job);
  }

  try {
    const fresh = await inflight.get(airport.iata);
    return present(airport, fresh, config, { stale: false });
  } catch (error) {
    retryAt.set(airport.iata, Date.now() + FAILURE_RETRY_MS);
    console.warn(`[flights] ${airport.iata}: ${error?.message || error}`);
    if (entry) return present(airport, entry, config, { stale: true, staleReason: 'upstream' });
    if (error instanceof FlightBoardError) throw error;
    throw new FlightBoardError(502, 'FLIGHTS_UPSTREAM_ERROR', 'Flight data provider unavailable');
  }
};

/** Test hook: clears caches, cooldowns and quota counters. */
export const resetFlightBoardState = () => {
  cache.clear();
  inflight.clear();
  retryAt.clear();
  cooldown.until = 0;
  cooldown.reason = null;
  usage.day = '';
  usage.calls = 0;
};

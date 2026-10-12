import { FlightBoardError, OFFICIAL_FLIGHT_INFO_URL, getFlightBoard } from '../services/flightBoardService.js';
import { MOROCCO_AIRPORTS } from '../utils/moroccoAirports.js';

const UNAVAILABLE_MESSAGE = 'Live flight data unavailable';

export const listFlightAirports = (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    success: true,
    airports: MOROCCO_AIRPORTS.map(({ iata, name, city }) => ({ iata, name, city })),
  });
};

export const getAirportFlights = async (req, res) => {
  try {
    const board = await getFlightBoard(req.params.iata);
    res.setHeader('Cache-Control', board.stale ? 'no-store' : 'public, max-age=60');
    res.json({ success: true, ...board });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    if (error instanceof FlightBoardError) {
      const publicCode = error.code.startsWith('FLIGHTS_UPSTREAM') ? 'FLIGHTS_UPSTREAM_ERROR' : error.code;
      const message = error.status === 404 ? 'Airport not supported' : UNAVAILABLE_MESSAGE;
      return res.status(error.status).json({ success: false, code: publicCode, message, officialUrl: OFFICIAL_FLIGHT_INFO_URL });
    }
    console.error('[flights]', error?.message || error);
    res.status(500).json({ success: false, code: 'FLIGHTS_ERROR', message: UNAVAILABLE_MESSAGE, officialUrl: OFFICIAL_FLIGHT_INFO_URL });
  }
};

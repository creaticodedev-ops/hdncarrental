import { FlightBoardError, getFlightBoard } from '../services/flightBoardService.js';
import { MOROCCO_AIRPORTS } from '../utils/moroccoAirports.js';

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
      return res.status(error.status).json({ success: false, code: publicCode, message: 'Flight information is unavailable right now' });
    }
    console.error('[flights]', error?.message || error);
    res.status(500).json({ success: false, code: 'FLIGHTS_ERROR', message: 'Flight information is unavailable right now' });
  }
};

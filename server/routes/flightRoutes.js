import express from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import { getAirportFlights, listFlightAirports } from '../controllers/flightController.js';

const flightRouter = express.Router();
const flightLimiter = rateLimit({ windowMs: 60_000, max: 30, message: 'Too many flight board requests' });

flightRouter.get('/airports', flightLimiter, listFlightAirports);
flightRouter.get('/:iata', flightLimiter, getAirportFlights);

export default flightRouter;

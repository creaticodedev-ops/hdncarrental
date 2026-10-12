/** Moroccan airports exposed on the public flight board (IATA → metadata, aerodrome reference point). */
export const MOROCCO_AIRPORTS = [
  { iata: 'CMN', icao: 'GMMN', name: 'Mohammed V International', city: 'Casablanca', lat: 33.3675, lon: -7.59 },
  { iata: 'RAK', icao: 'GMMX', name: 'Marrakech Menara', city: 'Marrakech', lat: 31.6069, lon: -8.0363 },
  { iata: 'RBA', icao: 'GMME', name: 'Rabat–Salé', city: 'Rabat', lat: 34.0515, lon: -6.7515 },
  { iata: 'AGA', icao: 'GMAD', name: 'Agadir Al Massira', city: 'Agadir', lat: 30.325, lon: -9.4131 },
  { iata: 'TNG', icao: 'GMTT', name: 'Tangier Ibn Battouta', city: 'Tanger', lat: 35.7269, lon: -5.9169 },
  { iata: 'FEZ', icao: 'GMFF', name: 'Fès–Saïss', city: 'Fès', lat: 33.9273, lon: -4.978 },
  { iata: 'ESU', icao: 'GMMI', name: 'Essaouira Mogador', city: 'Essaouira', lat: 31.3975, lon: -9.6817 },
  { iata: 'OUD', icao: 'GMFO', name: 'Oujda Angads', city: 'Oujda', lat: 34.7872, lon: -1.924 },
  { iata: 'NDR', icao: 'GMMW', name: 'Nador Al Aroui', city: 'Nador', lat: 34.9888, lon: -3.0282 },
  { iata: 'TTU', icao: 'GMTN', name: 'Tétouan Sania Ramel', city: 'Tétouan', lat: 35.5943, lon: -5.32 },
  { iata: 'AHU', icao: 'GMTA', name: 'Al Hoceima Cherif Al Idrissi', city: 'Al Hoceima', lat: 35.1772, lon: -3.8395 },
  { iata: 'OZZ', icao: 'GMMZ', name: 'Ouarzazate', city: 'Ouarzazate', lat: 30.9391, lon: -6.9094 },
  { iata: 'ERH', icao: 'GMFK', name: 'Errachidia Moulay Ali Cherif', city: 'Errachidia', lat: 31.9475, lon: -4.3983 },
  { iata: 'EUN', icao: 'GMML', name: 'Laâyoune Hassan I', city: 'Laâyoune', lat: 27.1517, lon: -13.2192 },
  { iata: 'VIL', icao: 'GMMH', name: 'Dakhla', city: 'Dakhla', lat: 23.7183, lon: -15.932 },
];

const BY_IATA = new Map(MOROCCO_AIRPORTS.map((airport) => [airport.iata, airport]));

export const findMoroccoAirport = (code) => BY_IATA.get(String(code || '').trim().toUpperCase()) || null;

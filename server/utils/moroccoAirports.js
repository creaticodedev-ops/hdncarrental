/** Moroccan airports exposed on the public flight board (IATA → metadata). */
export const MOROCCO_AIRPORTS = [
  { iata: 'CMN', icao: 'GMMN', name: 'Mohammed V International', city: 'Casablanca' },
  { iata: 'RAK', icao: 'GMMX', name: 'Marrakech Menara', city: 'Marrakech' },
  { iata: 'RBA', icao: 'GMME', name: 'Rabat–Salé', city: 'Rabat' },
  { iata: 'AGA', icao: 'GMAD', name: 'Agadir Al Massira', city: 'Agadir' },
  { iata: 'TNG', icao: 'GMTT', name: 'Tangier Ibn Battouta', city: 'Tanger' },
  { iata: 'FEZ', icao: 'GMFF', name: 'Fès–Saïss', city: 'Fès' },
  { iata: 'ESU', icao: 'GMMI', name: 'Essaouira Mogador', city: 'Essaouira' },
  { iata: 'OUD', icao: 'GMFO', name: 'Oujda Angads', city: 'Oujda' },
  { iata: 'NDR', icao: 'GMMW', name: 'Nador Al Aroui', city: 'Nador' },
  { iata: 'TTU', icao: 'GMTN', name: 'Tétouan Sania Ramel', city: 'Tétouan' },
  { iata: 'AHU', icao: 'GMTA', name: 'Al Hoceima Cherif Al Idrissi', city: 'Al Hoceima' },
  { iata: 'OZZ', icao: 'GMMZ', name: 'Ouarzazate', city: 'Ouarzazate' },
  { iata: 'ERH', icao: 'GMFK', name: 'Errachidia Moulay Ali Cherif', city: 'Errachidia' },
  { iata: 'EUN', icao: 'GMML', name: 'Laâyoune Hassan I', city: 'Laâyoune' },
  { iata: 'VIL', icao: 'GMMH', name: 'Dakhla', city: 'Dakhla' },
];

const BY_IATA = new Map(MOROCCO_AIRPORTS.map((airport) => [airport.iata, airport]));

export const findMoroccoAirport = (code) => BY_IATA.get(String(code || '').trim().toUpperCase()) || null;

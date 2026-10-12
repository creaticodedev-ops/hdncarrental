/** Mirrors server/utils/moroccoAirports.js (the server rejects anything else). */
export const MOROCCO_AIRPORTS = [
  { iata: 'CMN', city: 'Casablanca' },
  { iata: 'RAK', city: 'Marrakech', aliases: ['Marrakesh'] },
  { iata: 'RBA', city: 'Rabat', aliases: ['Salé', 'Sale'] },
  { iata: 'AGA', city: 'Agadir' },
  { iata: 'TNG', city: 'Tanger', aliases: ['Tangier', 'Tanja'] },
  { iata: 'FEZ', city: 'Fès', aliases: ['Fez'] },
  { iata: 'ESU', city: 'Essaouira' },
  { iata: 'OUD', city: 'Oujda' },
  { iata: 'NDR', city: 'Nador' },
  { iata: 'TTU', city: 'Tétouan', aliases: ['Tetuan'] },
  { iata: 'AHU', city: 'Al Hoceima' },
  { iata: 'OZZ', city: 'Ouarzazate' },
  { iata: 'ERH', city: 'Errachidia' },
  { iata: 'EUN', city: 'Laâyoune', aliases: ['Laayoune', 'El Aaiún'] },
  { iata: 'VIL', city: 'Dakhla' },
]

export const DEFAULT_AIRPORT = 'CMN'

const fold = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

/** Active pickup city (as stored in PickupLocation.city) served by this airport, or null. */
export const pickupCityForAirport = (airport, pickupCities = []) => {
  if (!airport) return null
  const names = new Set([airport.city, ...(airport.aliases || [])].map(fold))
  return pickupCities.find((city) => names.has(fold(city))) || null
}

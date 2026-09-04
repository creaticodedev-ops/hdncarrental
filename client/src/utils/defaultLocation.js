/** Agency HQ — default pickup and drop-off city when the field is still empty. */
export const DEFAULT_PICKUP_CITY = 'Safi'

const matchesCity = (value) =>
  String(value || '').trim().toLowerCase() === DEFAULT_PICKUP_CITY.toLowerCase()

/** Location `_id` for Safi within a (possibly car-filtered) location list. */
export const findDefaultLocationId = (locations = []) => {
  if (!Array.isArray(locations) || locations.length === 0) return ''
  const byCity = locations.find((loc) => matchesCity(loc.city))
  if (byCity?._id) return String(byCity._id)
  const byName = locations.find((loc) => String(loc.name || '').toLowerCase().includes(DEFAULT_PICKUP_CITY.toLowerCase()))
  return byName?._id ? String(byName._id) : ''
}

/** City name for the public search picker (Hero). */
export const findDefaultCityName = (cities = []) => {
  if (!Array.isArray(cities) || cities.length === 0) return ''
  return cities.find((city) => matchesCity(city)) || ''
}

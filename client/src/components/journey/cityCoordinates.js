/**
 * City-centre coordinates (WGS84) for Moroccan cities HDN Car may serve.
 * Pickup locations are matched by city name; cities missing here simply don't appear on the map.
 */
const CITY_COORDINATES = {
  agadir: [30.4278, -9.5981],
  aitmelloul: [30.3342, -9.4972],
  alhoceima: [35.2517, -3.9372],
  asilah: [35.465, -6.034],
  benimellal: [32.3373, -6.3498],
  benslimane: [33.6122, -7.1211],
  berrechid: [33.2655, -7.5875],
  casablanca: [33.5731, -7.5898],
  chefchaouen: [35.1688, -5.2636],
  dakhla: [23.6848, -15.958],
  eljadida: [33.2316, -8.5007],
  errachidia: [31.9314, -4.4246],
  essaouira: [31.5085, -9.7595],
  fes: [34.0181, -5.0078],
  ifrane: [33.5228, -5.1106],
  kenitra: [34.261, -6.5802],
  laayoune: [27.1253, -13.1625],
  larache: [35.1932, -6.1557],
  marrakech: [31.6295, -7.9811],
  meknes: [33.8935, -5.5473],
  merzouga: [31.0802, -4.0134],
  mohammedia: [33.6866, -7.383],
  nador: [35.1681, -2.9335],
  ouarzazate: [30.9189, -6.8934],
  oujda: [34.6814, -1.9086],
  rabat: [34.0209, -6.8416],
  safi: [32.2994, -9.2372],
  sale: [34.0531, -6.7985],
  settat: [33.001, -7.6166],
  tanger: [35.7595, -5.834],
  tangier: [35.7595, -5.834],
  taroudant: [30.4703, -8.877],
  tetouan: [35.5889, -5.3626],
  tiznit: [29.6974, -9.7316],
}

export const foldCityName = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

/** `{ lat, lon }` for a city name as stored on pickup locations, or null. */
export const coordinatesForCity = (city) => {
  const hit = CITY_COORDINATES[foldCityName(city)]
  return hit ? { lat: hit[0], lon: hit[1] } : null
}

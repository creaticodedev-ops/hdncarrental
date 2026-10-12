import { getCarLocations } from '../../utils/carLocations.js'
import { getDisplayDailyPrices } from '../../utils/promotionDisplay.js'
import { calcRentalDays } from '../../utils/pricing.js'
import { coordinatesForCity, foldCityName } from './cityCoordinates.js'

/**
 * Journey Composer — matches a trip intent to the real fleet.
 * Every score is derived from catalogue fields (seats, category, gearbox, fuel, price, booking rules);
 * nothing is assumed about a vehicle that the catalogue doesn't say.
 */

export const LUGGAGE_LEVELS = ['light', 'standard', 'heavy']
export const GEARBOX_OPTIONS = ['any', 'automatic', 'manual']
export const TRIP_STYLES = ['city', 'roadtrip', 'atlas']
export const MAX_TRAVELLERS = 9

/** Body size tier by catalogue category: 1 = small hatchback, 2 = mid-size, 3 = SUV / van body. */
const CABIN_TIER = {
  economy: 1,
  compact: 1,
  electric: 1,
  sports: 1,
  sedan: 2,
  luxury: 2,
  other: 2,
  suv: 3,
  van: 3,
  pickup: 3,
}

const ROUGH_ROAD_CATEGORIES = new Set(['suv', 'pickup'])
const EARTH_RADIUS_KM = 6371

const toRad = (deg) => (deg * Math.PI) / 180

export const haversineKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const sameCity = (a, b) => Boolean(a) && foldCityName(a) === foldCityName(b)

/** Straight-line distance between two cities, or null when unknown / round trip. */
export const straightLineKm = (startCity, endCity) => {
  if (!startCity || !endCity || sameCity(startCity, endCity)) return null
  const a = coordinatesForCity(startCity)
  const b = coordinatesForCity(endCity)
  return a && b ? haversineKm(a, b) : null
}

export const tripDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  return calcRentalDays(`${startDate}T10:00`, `${endDate}T10:00`)
}

export const effectiveDailyPrice = (car) => {
  const promo = car?.displayPromotion ? getDisplayDailyPrices(car) : null
  return promo ? promo.final : Number(car?.pricePerDay) || 0
}

export const servesCity = (car, city) => getCarLocations(car).some((c) => sameCity(c, city))

export const cabinTier = (car) => CABIN_TIER[String(car?.category || '').trim().toLowerCase()] ?? 2

export const luggageNeed = ({ luggage, travellers }) => {
  if (luggage === 'light') return 1
  if (luggage === 'heavy') return travellers >= 3 ? 3 : 2
  return travellers >= 3 ? 2 : 1
}

const isAutomatic = (car) => /auto/i.test(String(car?.transmission || ''))
const isDiesel = (car) => /diesel|gasoil/i.test(String(car?.fuel_type || ''))

/** Location to quote from in a city: the cheapest delivery fee (ties keep API order). */
export const locationForCity = (locations = [], city) => {
  const inCity = locations.filter((l) => sameCity(l.city, city))
  if (!inCity.length) return null
  return inCity.reduce((best, l) => ((Number(l.deliveryFee) || 0) < (Number(best.deliveryFee) || 0) ? l : best))
}

/**
 * Score one car against the trip (0–100). Weights: seats 25, luggage 20, gearbox 20, trip style 20, value 15.
 * `blocked` means the car cannot do this trip at all (and is never ranked).
 */
export const evaluateCar = (car, prefs, { minPrice, maxPrice, days = 0 } = {}) => {
  const seats = Number(car?.seating_capacity) || 0
  if (seats < prefs.travellers) return { car, blocked: 'seats' }
  if (!servesCity(car, prefs.startCity) || !servesCity(car, prefs.endCity || prefs.startCity)) {
    return { car, blocked: 'route' }
  }
  const minDays = Number(car?.bookingRules?.minRentalDays) || 0
  if (days > 0 && minDays > days) return { car, blocked: 'minDays', minDays }

  const reasons = []
  const category = String(car.category || '').trim().toLowerCase()
  const tier = cabinTier(car)
  let score = 25
  reasons.push({ key: 'seats', tone: 'good', params: { seats, travellers: prefs.travellers } })

  const need = luggageNeed(prefs)
  if (tier >= need) {
    score += 20
    if (need >= 2 && tier >= 3) reasons.push({ key: 'luggageRoom', tone: 'good' })
  } else {
    score += Math.max(0, 20 - 9 * (need - tier))
    reasons.push({ key: 'luggageTight', tone: 'warn' })
  }

  const auto = isAutomatic(car)
  if (prefs.gearbox === 'any') {
    score += 20
  } else if ((prefs.gearbox === 'automatic') === auto) {
    score += 20
    reasons.push({ key: auto ? 'automatic' : 'manual', tone: 'good' })
  } else {
    reasons.push({ key: auto ? 'notManual' : 'notAutomatic', tone: 'warn' })
  }

  if (prefs.style === 'city') {
    score += tier === 1 ? 20 : tier === 2 ? 14 : 9
    if (tier === 1) reasons.push({ key: 'cityEasy', tone: 'good' })
  } else if (prefs.style === 'roadtrip') {
    score += tier === 1 ? 11 : tier === 2 ? 16 : 17
    if (isDiesel(car)) {
      score += 3
      reasons.push({ key: 'dieselRange', tone: 'good' })
    }
    if (tier >= 2) reasons.push({ key: 'longComfort', tone: 'good' })
  } else if (prefs.style === 'atlas') {
    if (ROUGH_ROAD_CATEGORIES.has(category)) {
      score += 20
      reasons.push({ key: 'suvMountain', tone: 'good' })
    } else {
      score += 8
      reasons.push({ key: 'pavedOnly', tone: 'warn' })
    }
  }

  const daily = effectiveDailyPrice(car)
  if (maxPrice > minPrice) {
    score += 5 + (10 * (maxPrice - daily)) / (maxPrice - minPrice)
  } else {
    score += 15
  }
  if (daily > 0 && daily === minPrice) reasons.push({ key: 'bestValue', tone: 'good' })
  if (car.displayPromotion && getDisplayDailyPrices(car)?.showStrike) reasons.push({ key: 'offer', tone: 'good' })

  return { car, score: Math.max(0, Math.min(100, Math.round(score))), reasons, daily, blocked: null }
}

/**
 * Rank cars for a trip. Returns ranked matches plus how many cars were ruled out and why,
 * so the UI can explain an empty or short list honestly.
 */
export const composeJourney = (cars = [], prefs) => {
  const days = tripDays(prefs.startDate, prefs.endDate)
  const priced = cars.filter((car) => car?._id && effectiveDailyPrice(car) > 0)
  const eligible = priced.filter(
    (car) => (Number(car.seating_capacity) || 0) >= prefs.travellers
      && servesCity(car, prefs.startCity)
      && servesCity(car, prefs.endCity || prefs.startCity),
  )
  const prices = eligible.map(effectiveDailyPrice)
  const range = { minPrice: Math.min(...prices), maxPrice: Math.max(...prices), days }

  const blocked = { seats: 0, route: 0, minDays: 0 }
  let minDaysRequired = 0
  const matches = []
  for (const car of priced) {
    const result = evaluateCar(car, prefs, range)
    if (result.blocked) {
      blocked[result.blocked] += 1
      if (result.minDays) minDaysRequired = minDaysRequired ? Math.min(minDaysRequired, result.minDays) : result.minDays
      continue
    }
    matches.push(result)
  }
  matches.sort((a, b) => b.score - a.score || a.daily - b.daily)

  return {
    matches,
    blocked,
    minDaysRequired,
    days,
    maxSeats: priced.reduce((max, car) => Math.max(max, Number(car.seating_capacity) || 0), 0),
  }
}

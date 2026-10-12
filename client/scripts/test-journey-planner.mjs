/**
 * Journey Composer planner checks. Run: node scripts/test-journey-planner.mjs
 * Rank the real public fleet:            node scripts/test-journey-planner.mjs --live
 */
import assert from 'node:assert/strict'
import {
  composeJourney,
  evaluateCar,
  locationForCity,
  servesCity,
  straightLineKm,
  tripDays,
} from '../src/components/journey/journeyPlanner.js'
import { coordinatesForCity } from '../src/components/journey/cityCoordinates.js'

const CITIES = ['Agadir', 'Casablanca', 'EL jadida', 'Essaouira', 'Marrakech', 'Rabat', 'Safi']
const rules = { minRentalDays: 3, maxRentalDays: 90 }
const car = (id, overrides) => ({
  _id: id,
  brand: 'TEST',
  model: id,
  category: 'Economy',
  seating_capacity: 5,
  fuel_type: 'Diesel',
  transmission: 'Manual',
  pricePerDay: 300,
  locations: CITIES,
  bookingRules: rules,
  ...overrides,
})

const fleet = [
  car('clio', {}),
  car('picanto', { fuel_type: 'Gas', transmission: 'Automatic', pricePerDay: 250 }),
  car('duster', { category: 'SUV', seating_capacity: 6, transmission: 'Automatic', pricePerDay: 400 }),
  car('tucson', { category: 'SUV', seating_capacity: 6, transmission: 'Automatic', pricePerDay: 600 }),
  car('troc', { category: 'Luxury', seating_capacity: 6, transmission: 'Automatic', pricePerDay: 700 }),
  car('promo', {
    pricePerDay: 300,
    displayPromotion: { discountType: 'percentage', discountValue: 20, pricePerDay: 300, discountedPricePerDay: 240 },
  }),
  car('nocity', { locations: ['Tanger'] }),
  car('unpriced', { pricePerDay: 0 }),
]

const base = {
  startCity: 'Marrakech',
  endCity: 'Marrakech',
  startDate: '2026-11-10',
  endDate: '2026-11-15',
  travellers: 2,
  luggage: 'standard',
  gearbox: 'any',
  style: 'city',
}

let passed = 0
const test = (name, fn) => {
  fn()
  passed += 1
  console.log(`  ok  ${name}`)
}

if (process.argv.includes('--live')) {
  const api = 'https://api.hdncar.com'
  const { cars } = await (await fetch(`${api}/api/user/cars`)).json()
  const scenarios = [
    { ...base, travellers: 2, luggage: 'light', style: 'city' },
    { ...base, startCity: 'Marrakech', endCity: 'Agadir', travellers: 4, luggage: 'heavy', style: 'atlas', gearbox: 'automatic' },
    { ...base, startCity: 'Casablanca', endCity: 'Essaouira', travellers: 3, style: 'roadtrip', gearbox: 'manual' },
    { ...base, travellers: 7 },
  ]
  for (const prefs of scenarios) {
    const out = composeJourney(cars, prefs)
    const km = straightLineKm(prefs.startCity, prefs.endCity)
    console.log(`\n${prefs.startCity} → ${prefs.endCity}${km ? ` (~${Math.round(km)} km)` : ''} · ${prefs.travellers} pax · ${prefs.luggage} · ${prefs.gearbox} · ${prefs.style} · ${out.days} days`)
    console.log(`  ranked ${out.matches.length}, blocked ${JSON.stringify(out.blocked)}, max seats ${out.maxSeats}`)
    for (const m of out.matches.slice(0, 3)) {
      console.log(`  ${String(m.score).padStart(3)}  ${`${m.car.brand} ${m.car.model}`.padEnd(34)} ${m.daily} MAD/day  ${m.reasons.map((r) => r.key).join(', ')}`)
    }
  }
  process.exit(0)
}

console.log('journey planner')

test('straight-line distance uses real city coordinates; round trips have none', () => {
  const km = straightLineKm('Marrakech', 'Agadir')
  assert.ok(km > 195 && km < 215, `Marrakech–Agadir ${km}`)
  assert.equal(straightLineKm('Safi', 'safi'), null)
  assert.equal(straightLineKm('Safi', 'Atlantis'), null)
  assert.ok(coordinatesForCity('EL jadida'))
  assert.ok(coordinatesForCity('Fès'))
})

test('rental days follow the shared billing rule', () => {
  assert.equal(tripDays('2026-11-10', '2026-11-15'), 5)
  assert.equal(tripDays('2026-11-10', ''), 0)
})

test('cars that cannot do the trip are never ranked, and the reason is counted', () => {
  const out = composeJourney(fleet, { ...base, travellers: 6 })
  assert.deepEqual(out.matches.map((m) => m.car._id).sort(), ['duster', 'troc', 'tucson'])
  assert.equal(out.blocked.seats, 4)
  assert.equal(out.blocked.route, 0)
  assert.equal(out.maxSeats, 6)
  const sixSeaterElsewhere = composeJourney([...fleet, car('van', { seating_capacity: 6, locations: ['Tanger'] })], { ...base, travellers: 6 })
  assert.equal(sixSeaterElsewhere.blocked.route, 1)
})

test('one-way trips need a car that serves both cities', () => {
  assert.equal(servesCity(fleet[0], 'el jadida'), true)
  const out = composeJourney(fleet, { ...base, startCity: 'Marrakech', endCity: 'Tanger' })
  assert.equal(out.matches.length, 0)
  assert.equal(out.blocked.route, 7)
})

test('trips shorter than the booking rules are flagged, not quoted', () => {
  const out = composeJourney(fleet, { ...base, endDate: '2026-11-12' })
  assert.equal(out.matches.length, 0)
  assert.equal(out.minDaysRequired, 3)
})

test('city trips favour small cars; mountain trips favour SUVs', () => {
  const city = composeJourney(fleet, { ...base, style: 'city', luggage: 'light' })
  assert.equal(cabin(city.matches[0].car), 'Economy')
  const atlas = composeJourney(fleet, { ...base, style: 'atlas', travellers: 4, luggage: 'heavy' })
  assert.equal(atlas.matches[0].car.category, 'SUV')
  assert.ok(atlas.matches[0].reasons.some((r) => r.key === 'suvMountain'))
  const hatch = atlas.matches.find((m) => m.car.category === 'Economy')
  assert.ok(hatch.reasons.some((r) => r.key === 'pavedOnly' && r.tone === 'warn'))
  assert.ok(hatch.reasons.some((r) => r.key === 'luggageTight' && r.tone === 'warn'))
})

test('gearbox preference ranks matches first and explains mismatches', () => {
  const out = composeJourney(fleet, { ...base, gearbox: 'automatic' })
  assert.ok(/auto/i.test(out.matches[0].car.transmission))
  const manual = out.matches.find((m) => m.car._id === 'clio')
  assert.ok(manual.reasons.some((r) => r.key === 'notAutomatic'))
})

test('promotions use the discounted daily price and are surfaced', () => {
  const out = composeJourney(fleet, base)
  const promo = out.matches.find((m) => m.car._id === 'promo')
  assert.equal(promo.daily, 240)
  assert.ok(promo.reasons.some((r) => r.key === 'offer'))
  assert.ok(promo.reasons.some((r) => r.key === 'bestValue'))
})

test('scores stay within 0–100 and unpriced cars are ignored', () => {
  for (const style of ['city', 'roadtrip', 'atlas']) {
    for (const m of composeJourney(fleet, { ...base, style }).matches) {
      assert.ok(m.score >= 0 && m.score <= 100)
      assert.notEqual(m.car._id, 'unpriced')
    }
  }
  assert.equal(evaluateCar(fleet[0], { ...base, travellers: 9 }).blocked, 'seats')
})

test('quotes use the cheapest delivery point in a city', () => {
  const locations = [
    { _id: 'a', city: 'Casablanca', deliveryFee: 500 },
    { _id: 'b', city: 'casablanca', deliveryFee: 0 },
    { _id: 'c', city: 'Safi', deliveryFee: 0 },
  ]
  assert.equal(locationForCity(locations, 'Casablanca')._id, 'b')
  assert.equal(locationForCity(locations, 'Rabat'), null)
})

function cabin(c) { return c.category }

console.log(`\n${passed} checks passed`)

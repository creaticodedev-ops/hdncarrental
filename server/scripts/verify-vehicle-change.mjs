/**
 * Offline checks for vehicle-change source overlay.
 * Run: node server/scripts/verify-vehicle-change.mjs
 */
import assert from 'node:assert/strict'
import {
  overlayVehicleSourceData,
  VEHICLE_SOURCE_KEYS,
} from '../services/bookingVehicleChangeService.js'

const check = (name, fn) => {
  try {
    fn()
    console.log(`ok  ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    throw error
  }
}

check('overlay updates vehicle keys only', () => {
  const existing = {
    customer_name: 'Ahmed',
    customer_phone: '+212600000000',
    total_price: '1200',
    price_per_day: '400',
    pickup_date: '12/08/2026',
    signature_customer: 'kept-signature',
    car_brand: 'Dacia',
    car_model: 'Logan',
    car_make: 'Dacia Logan',
    car_year: '2022',
    car_category: 'B',
    car_registration: 'A-12345',
    carBrand: 'Dacia',
    carModel: 'Logan',
    carMake: 'Dacia Logan',
    carYear: '2022',
    carCategory: 'B',
    carRegistration: 'A-12345',
  }
  const fresh = {
    customer_name: 'SHOULD-NOT-APPLY',
    total_price: '9999',
    price_per_day: '1',
    pickup_date: '01/01/2099',
    signature_customer: 'new-sig',
    car_brand: 'Renault',
    car_model: 'Clio',
    car_make: 'Renault Clio',
    car_year: '2024',
    car_category: 'A',
    car_registration: 'B-67890',
    carBrand: 'Renault',
    carModel: 'Clio',
    carMake: 'Renault Clio',
    carYear: '2024',
    carCategory: 'A',
    carRegistration: 'B-67890',
  }

  const next = overlayVehicleSourceData(existing, fresh)

  assert.equal(next.customer_name, 'Ahmed')
  assert.equal(next.customer_phone, '+212600000000')
  assert.equal(next.total_price, '1200')
  assert.equal(next.price_per_day, '400')
  assert.equal(next.pickup_date, '12/08/2026')
  assert.equal(next.signature_customer, 'kept-signature')
  assert.equal(next.car_brand, 'Renault')
  assert.equal(next.car_model, 'Clio')
  assert.equal(next.car_make, 'Renault Clio')
  assert.equal(next.car_registration, 'B-67890')
  assert.equal(next.carBrand, 'Renault')
  assert.equal(next.carModel, 'Clio')
  assert.equal(next.carRegistration, 'B-67890')
})

check('vehicle source keys cover contract aliases', () => {
  const needed = [
    'car_brand',
    'car_model',
    'car_make',
    'car_year',
    'car_category',
    'car_registration',
    'carBrand',
    'carModel',
    'carMake',
    'carYear',
    'carCategory',
    'carRegistration',
  ]
  for (const key of needed) {
    assert.ok(VEHICLE_SOURCE_KEYS.includes(key), `missing ${key}`)
  }
})

console.log('vehicle-change overlay checks passed')

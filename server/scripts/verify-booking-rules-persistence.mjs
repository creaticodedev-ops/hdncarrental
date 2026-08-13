/**
 * Regression: Admin → Règles & Horaires (bookingSettings) must persist.
 *
 * Covers the Mongoose subdocument spread bug where normalizeBookingSettings()
 * collapsed every read back to defaults, so the UI toasted success while
 * subsequent GET/refresh showed old/default values.
 *
 * Run offline:  node scripts/verify-booking-rules-persistence.mjs
 * Run with DB:  MONGODB_URI=... node scripts/verify-booking-rules-persistence.mjs
 */
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  DEFAULT_BOOKING_SETTINGS,
  normalizeBookingSettings,
  plainBookingSettings,
  updateBookingSettings,
  getBookingSettings,
} from '../services/bookingSettingsService.js'
import { serializeAgencySettings } from '../services/agencySettingsService.js'

let passed = 0
const check = async (name, fn) => {
  await fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

console.log('verify-booking-rules-persistence')

await check('plainBookingSettings extracts Mongoose subdoc fields', () => {
  const nested = new mongoose.Schema(
    {
      minRentalDays: { type: Number, default: 1 },
      pickupHoursStart: { type: String, default: '08:00' },
      maxRentalDays: { type: Number, default: 90 },
    },
    { _id: false },
  )
  const schema = new mongoose.Schema({
    bookingSettings: { type: nested, default: () => ({}) },
  })
  const Model = mongoose.model(`RulesPersist_${Date.now()}`, schema)
  const doc = new Model({
    bookingSettings: { minRentalDays: 7, pickupHoursStart: '09:30', maxRentalDays: 60 },
  })

  // Object spread alone loses schema fields (the original bug).
  const broken = { ...DEFAULT_BOOKING_SETTINGS, ...doc.bookingSettings }
  assert.equal(broken.minRentalDays, 1, 'spread must not see subdoc fields')

  const plain = plainBookingSettings(doc.bookingSettings)
  assert.equal(plain.minRentalDays, 7)
  assert.equal(plain.pickupHoursStart, '09:30')

  const normalized = normalizeBookingSettings(doc.bookingSettings)
  assert.equal(normalized.minRentalDays, 7)
  assert.equal(normalized.pickupHoursStart, '09:30')
  assert.equal(normalized.maxRentalDays, 60)
})

await check('normalize accepts HTML time with seconds', () => {
  const n = normalizeBookingSettings({
    pickupHoursStart: '09:30:00',
    pickupHoursEnd: '21:00:00',
    returnHoursStart: '10:15:00',
    returnHoursEnd: '19:45:00',
  })
  assert.equal(n.pickupHoursStart, '09:30')
  assert.equal(n.pickupHoursEnd, '21:00')
  assert.equal(n.returnHoursStart, '10:15')
  assert.equal(n.returnHoursEnd, '19:45')
})

await check('normalize coerces all admin form numeric fields', () => {
  const n = normalizeBookingSettings({
    minRentalDays: '4',
    maxRentalDays: '45',
    advanceBookingDays: '120',
    securityDepositDefault: '1500.5',
    extraDriverFeePerDay: '50',
    mileageLimitKmPerDay: '300',
    pendingReservationExpiryHours: '24',
    cancellationFeeValue: '10',
    cancellationFeeType: 'percent',
    mileageMode: 'limited',
    extraDriverAllowed: false,
    cancellationPolicyText: 'Annulation 48h avant',
  })
  assert.equal(n.minRentalDays, 4)
  assert.equal(n.maxRentalDays, 45)
  assert.equal(n.advanceBookingDays, 120)
  assert.equal(n.securityDepositDefault, 1500.5)
  assert.equal(n.extraDriverFeePerDay, 50)
  assert.equal(n.mileageLimitKmPerDay, 300)
  assert.equal(n.pendingReservationExpiryHours, 24)
  assert.equal(n.cancellationFeeType, 'percent')
  assert.equal(n.cancellationFeeValue, 10)
  assert.equal(n.mileageMode, 'limited')
  assert.equal(n.extraDriverAllowed, false)
  assert.equal(n.cancellationPolicyText, 'Annulation 48h avant')
})

const uri = process.env.MONGODB_URI
if (uri) {
  await mongoose.connect(uri)
  try {
    const AgencySettings = (await import('../models/AgencySettings.js')).default
    const ownerId = new mongoose.Types.ObjectId()
    await AgencySettings.create({
      owner: ownerId,
      bookingSettings: { ...DEFAULT_BOOKING_SETTINGS },
    })

    const patch = {
      minRentalDays: 5,
      maxRentalDays: 30,
      advanceBookingDays: 90,
      pickupHoursStart: '09:00',
      pickupHoursEnd: '19:00',
      returnHoursStart: '09:30',
      returnHoursEnd: '18:30',
      mileageMode: 'limited',
      mileageLimitKmPerDay: 200,
      extraDriverAllowed: false,
      extraDriverFeePerDay: 75,
      securityDepositDefault: 2000,
      cancellationFeeType: 'fixed',
      cancellationFeeValue: 150,
      cancellationPolicyText: 'Frais fixes 150 MAD',
      pendingReservationExpiryHours: 12,
    }

    await check('live updateBookingSettings persists every Règles & Horaires field', async () => {
      const saved = await updateBookingSettings(ownerId, patch)
      for (const [key, value] of Object.entries(patch)) {
        assert.equal(saved[key], value, `saved.${key}`)
      }
    })

    await check('live getBookingSettings survives re-read (page refresh)', async () => {
      const read = await getBookingSettings(ownerId)
      for (const [key, value] of Object.entries(patch)) {
        assert.equal(read[key], value, `read.${key}`)
      }
    })

    await check('live serializeAgencySettings returns persisted bookingSettings', async () => {
      const doc = await AgencySettings.findOne({ owner: ownerId })
      const serialized = await serializeAgencySettings(ownerId, doc)
      for (const [key, value] of Object.entries(patch)) {
        assert.equal(serialized.bookingSettings[key], value, `serialized.${key}`)
      }
    })

    await check('live second update then re-read (create/update/read cycle)', async () => {
      const second = await updateBookingSettings(ownerId, {
        minRentalDays: 2,
        pickupHoursStart: '10:00',
      })
      assert.equal(second.minRentalDays, 2)
      assert.equal(second.pickupHoursStart, '10:00')
      // Unchanged fields remain
      assert.equal(second.maxRentalDays, 30)
      assert.equal(second.pickupHoursEnd, '19:00')

      const again = await getBookingSettings(ownerId)
      assert.equal(again.minRentalDays, 2)
      assert.equal(again.pickupHoursStart, '10:00')
      assert.equal(again.maxRentalDays, 30)
    })

    await AgencySettings.deleteOne({ owner: ownerId })
  } finally {
    await mongoose.disconnect()
  }
} else {
  console.log('  · skipped live Mongo persistence (set MONGODB_URI to enable)')
}

console.log(`verify-booking-rules-persistence: ${passed} assertions passed`)

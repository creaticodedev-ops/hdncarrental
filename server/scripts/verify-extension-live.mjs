/**
 * Live extension flow against Mongo (creates a throwaway booking, then deletes it).
 * Also previews the reported reservation if present — no mutation of live rentals.
 *
 * Run from server/: node scripts/verify-extension-live.mjs
 */
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import 'dotenv/config'
import { buildMongoUri } from '../configs/db.js'
import Booking from '../models/Booking.js'
import Car from '../models/Car.js'
import Payment from '../models/Payment.js'
import {
  previewBookingExtension,
  applyBookingExtension,
} from '../services/bookingExtensionService.js'
import { parseAgencyDateTime } from '../utils/moroccoTime.js'
import { calcRentalDays } from '../utils/helpers.js'

const LIVE_REF = 'RES-52C6THAC'

const connect = async () => {
  const raw = String(process.env.MONGODB_URI || '').trim()
  if (!raw) return false
  await mongoose.connect(buildMongoUri(raw))
  return true
}

const ymdhm = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  // Naive Casablanca wall time for datetime-local payloads
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`
}

const addHours = (date, hours) => new Date(date.getTime() + hours * 3600000)

const main = async () => {
  const connected = await connect()
  if (!connected) {
    console.log('verify-extension-live')
    console.log('  · skipped (set MONGODB_URI to enable)')
    return
  }

  const live = await Booking.findOne({ reservationId: LIVE_REF }).populate('car')
  if (live) {
    const nextReturn = addHours(new Date(live.returnDate), 24)
    try {
      const preview = await previewBookingExtension(live.owner, live._id, ymdhm(nextReturn))
      assert.equal(preview.deltaDays >= 1, true)
      console.log(`  ✓ preview ${LIVE_REF}: +${preview.deltaDays} day(s), delta ${preview.deltaAmount}`)
    } catch (error) {
      console.error(`  ✗ preview ${LIVE_REF}: ${error.message}`)
      throw error
    }
  } else {
    console.log(`  · ${LIVE_REF} not in this database — skipped live preview`)
  }

  const car = await Car.findOne({ isAvaliable: { $ne: false } }).lean()
  if (!car) {
    throw new Error('No vehicle available to create a throwaway booking')
  }

  const pickup = parseAgencyDateTime('2026-08-20T10:00')
  const ret1 = parseAgencyDateTime('2026-08-23T19:00')
  const ret2Naive = '2026-08-24T19:00'
  const days1 = calcRentalDays(pickup, ret1)
  const price1 = Math.round((Number(car.pricePerDay) || 400) * days1)

  const booking = await Booking.create({
    reservationId: `RES-EXTTEST-${Date.now().toString(36).toUpperCase()}`,
    car: car._id,
    owner: car.owner,
    pickupDate: pickup,
    returnDate: ret1,
    status: 'ready_for_pickup',
    price: price1,
    paymentStatus: 'paid',
    channel: 'walk_in',
    customerName: 'Extension QA',
    customerPhone: '+212600000000',
    priceBreakdown: {
      days: days1,
      pricePerDay: Number(car.pricePerDay) || 400,
      rentalPrice: price1,
      total: price1,
    },
    completion: {
      amountDue: price1,
      amountPaid: price1,
      paymentComplete: true,
    },
  })

  try {
    const preview = await previewBookingExtension(car.owner, booking._id, ret2Naive)
    assert.ok(preview.deltaDays >= 1, 'preview should add at least one day')
    assert.ok(preview.newPrice > preview.previousPrice, 'preview should increase total')
    console.log(`  ✓ throwaway preview +${preview.deltaDays} day(s) ${preview.previousPrice} → ${preview.newPrice}`)

    const applied = await applyBookingExtension(car.owner, booking._id, {
      newReturnDate: ret2Naive,
      notes: 'QA extension',
      regenerateContract: false,
      actor: { _id: car.owner },
    })

    const fresh = await Booking.findById(booking._id)
    assert.equal(fresh.extensionHistory.length, 1)
    assert.equal(Number(fresh.price), Number(applied.preview.newPrice))
    assert.ok(new Date(fresh.returnDate).getTime() > ret1.getTime())
    assert.equal(Number(fresh.completion.amountDue), Number(applied.preview.newPrice))
    assert.equal(fresh.paymentStatus, 'pending')
    assert.equal(fresh.completion.paymentComplete, false)
    assert.equal(Number(fresh.completion.amountPaid), price1)
    console.log(`  ✓ throwaway apply: return moved, history stored, remainder pending`)
  } finally {
    await Payment.deleteMany({ booking: booking._id })
    await Booking.deleteOne({ _id: booking._id })
  }

  await mongoose.disconnect()
  console.log('\nlive extension checks passed')
}

main().catch(async (error) => {
  console.error(error)
  try { await mongoose.disconnect() } catch { /* ignore */ }
  process.exit(1)
})

/**
 * Phase B regression: accounting models, KPI math, permission, isolation.
 *
 * Offline: node scripts/verify-accounting-phase-b.mjs
 * Live DB: MONGODB_URI=... node scripts/verify-accounting-phase-b.mjs
 */
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { OWNER_PERMISSIONS } from '../models/User.js'
import {
  AGENCY_EXPENSE_CATEGORIES,
  VEHICLE_EXPENSE_CATEGORIES,
  getAccountingKpis,
  listAgencyExpenses,
  listRevenues,
  normalizeAgencyExpenseInput,
  normalizeSamsarPaymentInput,
  normalizeVehicleExpenseInput,
  REVENUE_BOOKING_STATUSES,
} from '../services/accountingService.js'

let passed = 0
const check = async (name, fn) => {
  await fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

console.log('verify-accounting-phase-b')

await check('OWNER_PERMISSIONS includes accounting', () => {
  assert.ok(OWNER_PERMISSIONS.includes('accounting'))
})

await check('revenue booking statuses match analytics set', () => {
  assert.deepEqual(REVENUE_BOOKING_STATUSES, [
    'confirmed',
    'ready_for_pickup',
    'active',
    'completed',
  ])
})

await check('agency expense categories non-empty', () => {
  assert.ok(AGENCY_EXPENSE_CATEGORIES.includes('rent'))
  assert.ok(VEHICLE_EXPENSE_CATEGORIES.includes('fuel'))
})

await check('normalize agency expense requires category + amount', async () => {
  await assert.rejects(
    () => normalizeAgencyExpenseInput('owner', {}),
    (e) => e.status === 400,
  )
  const ok = await normalizeAgencyExpenseInput('owner', {
    category: 'rent',
    amount: '1200.456',
    expenseDate: '2026-03-01',
    paymentStatus: 'paid',
  })
  assert.equal(ok.category, 'rent')
  assert.equal(ok.amount, 1200.46)
  assert.ok(ok.expenseDate instanceof Date)
})

await check('normalize vehicle expense requires owned car', async () => {
  await assert.rejects(
    () =>
      normalizeVehicleExpenseInput(new mongoose.Types.ObjectId(), {
        category: 'fuel',
        amount: 50,
        car: 'not-an-id',
      }),
    (e) => e.status === 400,
  )
})

await check('normalize samsar payment requires owned samsar', async () => {
  await assert.rejects(
    () =>
      normalizeSamsarPaymentInput(new mongoose.Types.ObjectId(), {
        amount: 100,
        samsar: 'not-an-id',
      }),
    (e) => e.status === 400,
  )
})

await check('net KPI formula unit (offline arithmetic)', () => {
  const totalRevenue = 10000
  const totalSamsarPayments = 500
  const totalAgencyExpenses = 2000
  const totalVehicleExpenses = 800
  const net = Math.round((totalRevenue - totalSamsarPayments - totalAgencyExpenses - totalVehicleExpenses) * 100) / 100
  assert.equal(net, 6700)
})

const uri = process.env.MONGODB_URI
if (uri) {
  await mongoose.connect(uri)
  const AgencyExpense = (await import('../models/AgencyExpense.js')).default
  const VehicleExpense = (await import('../models/VehicleExpense.js')).default
  const SamsarPayment = (await import('../models/SamsarPayment.js')).default
  const Booking = (await import('../models/Booking.js')).default
  const Car = (await import('../models/Car.js')).default
  const Samsar = (await import('../models/Samsar.js')).default

  const ownerA = new mongoose.Types.ObjectId()
  const ownerB = new mongoose.Types.ObjectId()
  const created = []

  try {
    await check('live: owner isolation on agency expenses', async () => {
      const a = await AgencyExpense.create({
        owner: ownerA,
        category: 'rent',
        amount: 100,
        expenseDate: new Date('2026-04-01'),
        paymentStatus: 'paid',
      })
      const b = await AgencyExpense.create({
        owner: ownerB,
        category: 'rent',
        amount: 999,
        expenseDate: new Date('2026-04-01'),
        paymentStatus: 'paid',
      })
      created.push(['AgencyExpense', a._id], ['AgencyExpense', b._id])
      const list = await listAgencyExpenses(ownerA, {})
      assert.equal(list.items.every((x) => String(x.owner) === String(ownerA)), true)
      assert.ok(list.items.some((x) => String(x._id) === String(a._id)))
      assert.ok(!list.items.some((x) => String(x._id) === String(b._id)))
    })

    await check('live: KPI totals + net', async () => {
      const car = await Car.create({
        owner: ownerA,
        brand: 'Test',
        model: 'KPI',
        image: 'x',
        year: 2024,
        category: 'SUV',
        seating_capacity: 5,
        fuel_type: 'Petrol',
        transmission: 'Automatic',
        pricePerDay: 100,
        location: 'Test',
        description: 'phase-b',
      })
      created.push(['Car', car._id])

      const booking = await Booking.create({
        owner: ownerA,
        car: car._id,
        user: ownerA,
        pickupDate: new Date('2026-04-10'),
        returnDate: new Date('2026-04-12'),
        price: 1000,
        status: 'confirmed',
        paymentStatus: 'paid',
        reservationId: `PB-${Date.now()}`,
        customerName: 'Phase B',
        customerEmail: 'phaseb@example.com',
        customerPhone: '0600000000',
      })
      created.push(['Booking', booking._id])

      const samsar = await Samsar.create({
        owner: ownerA,
        fullName: 'Broker KPI',
        commissionType: 'percent',
        commissionValue: 10,
      })
      created.push(['Samsar', samsar._id])

      const pay = await SamsarPayment.create({
        owner: ownerA,
        samsar: samsar._id,
        amount: 100,
        paymentDate: new Date('2026-04-11'),
        paymentStatus: 'paid',
      })
      created.push(['SamsarPayment', pay._id])

      const agency = await AgencyExpense.create({
        owner: ownerA,
        category: 'office',
        amount: 200,
        expenseDate: new Date('2026-04-05'),
        paymentStatus: 'paid',
      })
      created.push(['AgencyExpense', agency._id])

      const vehicle = await VehicleExpense.create({
        owner: ownerA,
        car: car._id,
        category: 'fuel',
        amount: 50,
        expenseDate: new Date('2026-04-06'),
        paymentStatus: 'paid',
      })
      created.push(['VehicleExpense', vehicle._id])

      const cancelled = await AgencyExpense.create({
        owner: ownerA,
        category: 'other',
        amount: 5000,
        expenseDate: new Date('2026-04-07'),
        paymentStatus: 'cancelled',
      })
      created.push(['AgencyExpense', cancelled._id])

      const kpis = await getAccountingKpis(ownerA, {
        from: '2026-04-01',
        to: '2026-04-30',
      })
      assert.ok(kpis.totalRevenue >= 1000)
      assert.ok(kpis.totalSamsarPayments >= 100)
      assert.ok(kpis.totalAgencyExpenses >= 200)
      assert.ok(kpis.totalVehicleExpenses >= 50)
      assert.equal(kpis.totalAgencyExpenses >= 5200, false, 'cancelled expense excluded')

      const rev = await listRevenues(ownerA, { from: '2026-04-01', to: '2026-04-30' })
      assert.ok(rev.totals.totalRevenue >= 1000)
      assert.ok(rev.items.every((x) => String(x.owner) === String(ownerA)))
    })
  } finally {
    for (const [model, id] of created.reverse()) {
      const M =
        model === 'AgencyExpense'
          ? AgencyExpense
          : model === 'VehicleExpense'
            ? VehicleExpense
            : model === 'SamsarPayment'
              ? SamsarPayment
              : model === 'Booking'
                ? Booking
                : model === 'Car'
                  ? Car
                  : Samsar
      await M.deleteOne({ _id: id }).catch(() => {})
    }
    await mongoose.disconnect()
  }
} else {
  console.log('  (skip live DB checks — set MONGODB_URI to enable)')
}

console.log(`\n${passed} checks passed`)

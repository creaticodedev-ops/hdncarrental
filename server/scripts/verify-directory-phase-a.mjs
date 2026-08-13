/**
 * Phase A regression: directory entities + owner isolation.
 *
 * Offline: node scripts/verify-directory-phase-a.mjs
 * Live DB: MONGODB_URI=... node scripts/verify-directory-phase-a.mjs
 */
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  normalizeChauffeurInput,
  normalizeSamsarInput,
  normalizePartnerCompanyInput,
  listDirectoryEntities,
} from '../services/directoryService.js'
import { OWNER_PERMISSIONS } from '../models/User.js'

let passed = 0
const check = async (name, fn) => {
  await fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

console.log('verify-directory-phase-a')

await check('OWNER_PERMISSIONS includes chauffeurs + partners', () => {
  assert.ok(OWNER_PERMISSIONS.includes('chauffeurs'))
  assert.ok(OWNER_PERMISSIONS.includes('partners'))
})

await check('normalize chauffeur requires fullName', () => {
  assert.throws(() => normalizeChauffeurInput({}), (e) => e.status === 400)
  const ok = normalizeChauffeurInput({
    fullName: '  Karim Benali  ',
    phone: '0612345678',
    email: 'Karim@Example.com',
    licenseExpiry: '2027-01-15',
  })
  assert.equal(ok.fullName, 'Karim Benali')
  assert.equal(ok.email, 'karim@example.com')
  assert.ok(ok.licenseExpiry instanceof Date)
})

await check('normalize samsar commission clamp', () => {
  const p = normalizeSamsarInput({
    fullName: 'Samsar A',
    commissionType: 'percent',
    commissionValue: 150,
  })
  assert.equal(p.commissionType, 'percent')
  assert.equal(p.commissionValue, 100)

  const f = normalizeSamsarInput({
    fullName: 'Samsar B',
    commissionType: 'fixed',
    commissionValue: 250.456,
  })
  assert.equal(f.commissionType, 'fixed')
  assert.equal(f.commissionValue, 250.46)
})

await check('normalize partner company requires companyName', () => {
  assert.throws(() => normalizePartnerCompanyInput({}), (e) => e.status === 400)
  const ok = normalizePartnerCompanyInput({
    companyName: 'Atlas Travel SARL',
    taxId: 'ICE123',
  })
  assert.equal(ok.companyName, 'Atlas Travel SARL')
  assert.equal(ok.taxId, 'ICE123')
})

await check('invalid email rejected', () => {
  assert.throws(
    () => normalizeChauffeurInput({ fullName: 'X', email: 'not-an-email' }),
    (e) => e.status === 400,
  )
})

const uri = process.env.MONGODB_URI
if (uri) {
  await mongoose.connect(uri)
  try {
    const Chauffeur = (await import('../models/Chauffeur.js')).default
    const Samsar = (await import('../models/Samsar.js')).default
    const PartnerCompany = (await import('../models/PartnerCompany.js')).default

    const ownerA = new mongoose.Types.ObjectId()
    const ownerB = new mongoose.Types.ObjectId()

    await check('live create + list scoped to owner', async () => {
      const a = await Chauffeur.create({
        owner: ownerA,
        fullName: 'OwnerA Driver',
        status: 'active',
      })
      const b = await Chauffeur.create({
        owner: ownerB,
        fullName: 'OwnerB Driver',
        status: 'active',
      })

      const listA = await listDirectoryEntities(Chauffeur, ownerA, {})
      assert.equal(listA.pagination.total, 1)
      assert.equal(String(listA.items[0]._id), String(a._id))

      const listB = await listDirectoryEntities(Chauffeur, ownerB, {})
      assert.equal(listB.pagination.total, 1)
      assert.equal(String(listB.items[0]._id), String(b._id))

      // Cross-owner get must fail via owner filter
      const cross = await Chauffeur.findOne({ _id: a._id, owner: ownerB })
      assert.equal(cross, null)
    })

    await check('live Samsar + PartnerCompany isolation', async () => {
      await Samsar.create({ owner: ownerA, fullName: 'Samsar A', commissionType: 'percent', commissionValue: 10 })
      await Samsar.create({ owner: ownerB, fullName: 'Samsar B', commissionType: 'fixed', commissionValue: 50 })
      await PartnerCompany.create({ owner: ownerA, companyName: 'Co A' })
      await PartnerCompany.create({ owner: ownerB, companyName: 'Co B' })

      const sA = await listDirectoryEntities(Samsar, ownerA, {})
      const sB = await listDirectoryEntities(Samsar, ownerB, {})
      assert.equal(sA.pagination.total, 1)
      assert.equal(sB.pagination.total, 1)
      assert.equal(sA.items[0].fullName, 'Samsar A')

      const pA = await listDirectoryEntities(PartnerCompany, ownerA, {
        searchFields: ['companyName', 'legalName', 'contactName', 'phone', 'email', 'taxId'],
      })
      assert.equal(pA.pagination.total, 1)
      assert.equal(pA.items[0].companyName, 'Co A')
    })

    await Chauffeur.deleteMany({ owner: { $in: [ownerA, ownerB] } })
    await Samsar.deleteMany({ owner: { $in: [ownerA, ownerB] } })
    await PartnerCompany.deleteMany({ owner: { $in: [ownerA, ownerB] } })
  } finally {
    await mongoose.disconnect()
  }
} else {
  console.log('  · skipped live Mongo isolation (set MONGODB_URI to enable)')
}

console.log(`verify-directory-phase-a: ${passed} assertions passed`)

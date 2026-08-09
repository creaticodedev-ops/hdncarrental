import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../../utils/apiError'
import { VEHICLE_CATEGORIES } from '../../../utils/vehicleCategories'

const OCCASIONS = [
  'custom', 'summer', 'winter', 'new_year', 'ramadan', 'eid',
  'black_friday', 'special_event', 'last_minute', 'long_stay',
]

const emptyPromo = () => {
  const start = new Date()
  const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const toLocal = (d) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return {
    name: '',
    description: '',
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    startAt: toLocal(start),
    endAt: toLocal(end),
    minRentalDays: 1,
    maxRentalDays: 0,
    minBookingAmount: 0,
    maxDiscountAmount: 0,
    vehicleCategories: [],
    vehicleModels: '',
    globalUsageLimit: 0,
    perCustomerUsageLimit: 0,
    isActive: true,
    requirePromoCode: true,
    priority: 100,
    allowStacking: false,
    occasion: 'custom',
  }
}

const lifecycleBadge = (lifecycle, t) => {
  const map = {
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    scheduled: 'bg-sky-50 text-sky-800 border-sky-200',
    expired: 'bg-gray-100 text-gray-600 border-gray-200',
    inactive: 'bg-amber-50 text-amber-800 border-amber-200',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${map[lifecycle] || map.inactive}`}>
      {t(`admin.settings.promoLifecycle.${lifecycle}`)}
    </span>
  )
}

const PromotionsPanel = ({ axios, t, currency, inputClass }) => {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyPromo())
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (status !== 'all') params.status = status
      if (q.trim()) params.q = q.trim()
      const { data } = await axios.get('/api/owner/promotions', { params })
      if (data.success) setPromotions(data.promotions || [])
      else toast.error(data.message || t('admin.settings.promoLoadError'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [axios, status, q, t])

  useEffect(() => {
    load()
  }, [load])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const openCreate = () => {
    setEditing('new')
    setForm(emptyPromo())
    setPreview(null)
  }

  const openEdit = (p) => {
    const toLocal = (iso) => {
      if (!iso) return ''
      const d = new Date(iso)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    setEditing(p._id)
    setForm({
      name: p.name || '',
      description: p.description || '',
      code: p.code || '',
      discountType: p.discountType || 'percentage',
      discountValue: p.discountValue ?? 0,
      startAt: toLocal(p.startAt),
      endAt: toLocal(p.endAt),
      minRentalDays: p.minRentalDays ?? 1,
      maxRentalDays: p.maxRentalDays ?? 0,
      minBookingAmount: p.minBookingAmount ?? 0,
      maxDiscountAmount: p.maxDiscountAmount ?? 0,
      vehicleCategories: p.vehicleCategories || [],
      vehicleModels: (p.vehicleModels || []).join(', '),
      globalUsageLimit: p.globalUsageLimit ?? 0,
      perCustomerUsageLimit: p.perCustomerUsageLimit ?? 0,
      isActive: p.isActive !== false,
      requirePromoCode: p.requirePromoCode !== false,
      priority: p.priority ?? 100,
      allowStacking: Boolean(p.allowStacking),
      occasion: p.occasion || 'custom',
    })
    setPreview(null)
  }

  const payloadFromForm = () => ({
    ...form,
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    vehicleModels: String(form.vehicleModels || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    discountValue: Number(form.discountValue),
    minRentalDays: Number(form.minRentalDays),
    maxRentalDays: Number(form.maxRentalDays),
    minBookingAmount: Number(form.minBookingAmount),
    maxDiscountAmount: Number(form.maxDiscountAmount),
    globalUsageLimit: Number(form.globalUsageLimit),
    perCustomerUsageLimit: Number(form.perCustomerUsageLimit),
    priority: Number(form.priority),
  })

  const onSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error(t('admin.settings.promoNameRequired'))
      return
    }
    setSaving(true)
    try {
      const body = payloadFromForm()
      const { data } = editing === 'new'
        ? await axios.post('/api/owner/promotions', body)
        : await axios.put(`/api/owner/promotions/${editing}`, body)
      if (!data.success) {
        toast.error(data.message || t('admin.settings.saveError'))
        return
      }
      toast.success(t('admin.settings.promoSaved'))
      setEditing(null)
      load()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (p) => {
    try {
      const { data } = await axios.patch(`/api/owner/promotions/${p._id}/active`, {
        isActive: !p.isActive,
      })
      if (data.success) load()
      else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onDelete = async (p) => {
    if (!window.confirm(t('admin.settings.promoDeleteConfirm', { name: p.name }))) return
    try {
      const { data } = await axios.delete(`/api/owner/promotions/${p._id}`)
      if (data.success) {
        toast.success(t('admin.settings.promoDeleted'))
        load()
      } else toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const runPreview = async () => {
    try {
      const { data } = await axios.post('/api/owner/promotions/preview', {
        pricePerDay: 500,
        days: 7,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscountAmount: Number(form.maxDiscountAmount),
      })
      if (data.success) setPreview(data.preview)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const counts = useMemo(() => {
    const c = { all: promotions.length, active: 0, scheduled: 0, expired: 0, codes: 0 }
    for (const p of promotions) {
      if (p.lifecycle === 'active') c.active += 1
      if (p.lifecycle === 'scheduled') c.scheduled += 1
      if (p.lifecycle === 'expired') c.expired += 1
      if (p.code) c.codes += 1
    }
    return c
  }, [promotions])

  const Field = ({ label, children, hint }) => (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      {children}
      {hint ? <p className="text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  )

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            {t('admin.settings.promotionsSection')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{t('admin.settings.promotionsHint')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium"
        >
          {t('admin.settings.promoCreate')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {[
          ['all', counts.all],
          ['active', counts.active],
          ['scheduled', counts.scheduled],
          ['expired', counts.expired],
          ['codes', counts.codes],
        ].map(([key, n]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={`px-3 py-1.5 rounded-lg text-xs border ${
              status === key ? 'bg-primary text-white border-primary' : 'bg-white border-borderColor text-gray-600'
            }`}
          >
            {t(`admin.settings.promoFilter.${key}`)} ({n})
          </button>
        ))}
        <input
          className={`${inputClass} max-w-xs`}
          placeholder={t('admin.settings.promoSearch')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {editing && (
        <form onSubmit={onSave} className="rounded-xl border border-borderColor bg-white p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800">
              {editing === 'new' ? t('admin.settings.promoCreate') : t('admin.settings.promoEdit')}
            </h3>
            <button type="button" className="text-sm text-gray-500" onClick={() => setEditing(null)}>
              {t('admin.settings.cancel')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('admin.settings.promoName')}>
              <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </Field>
            <Field label={t('admin.settings.promoOccasion')}>
              <select className={inputClass} value={form.occasion} onChange={(e) => set('occasion', e.target.value)}>
                {OCCASIONS.map((o) => (
                  <option key={o} value={o}>{t(`admin.settings.promoOccasionLabel.${o}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.settings.promoCode')} hint={t('admin.settings.promoCodeHint')}>
              <input className={inputClass} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} />
            </Field>
            <Field label={t('admin.settings.promoPriority')}>
              <input type="number" className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value)} />
            </Field>
            <Field label={t('admin.settings.discountType')}>
              <select className={inputClass} value={form.discountType} onChange={(e) => set('discountType', e.target.value)}>
                <option value="percentage">{t('admin.settings.discountPercentage')}</option>
                <option value="fixed">{t('admin.settings.discountFixed')}</option>
              </select>
            </Field>
            <Field label={t('admin.settings.discountValue')}>
              <input type="number" min={0} step="0.01" className={inputClass}
                value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} />
            </Field>
            <Field label={t('admin.settings.startAt')}>
              <input type="datetime-local" className={inputClass} value={form.startAt}
                onChange={(e) => set('startAt', e.target.value)} required />
            </Field>
            <Field label={t('admin.settings.endAt')}>
              <input type="datetime-local" className={inputClass} value={form.endAt}
                onChange={(e) => set('endAt', e.target.value)} required />
            </Field>
            <Field label={t('admin.settings.minRentalDays')}>
              <input type="number" min={1} className={inputClass} value={form.minRentalDays}
                onChange={(e) => set('minRentalDays', e.target.value)} />
            </Field>
            <Field label={t('admin.settings.promoMaxRentalDays')} hint={t('admin.settings.zeroUnlimited')}>
              <input type="number" min={0} className={inputClass} value={form.maxRentalDays}
                onChange={(e) => set('maxRentalDays', e.target.value)} />
            </Field>
            <Field label={t('admin.settings.minBookingAmount')}>
              <input type="number" min={0} className={inputClass} value={form.minBookingAmount}
                onChange={(e) => set('minBookingAmount', e.target.value)} />
            </Field>
            <Field label={t('admin.settings.maxDiscountAmount')} hint={t('admin.settings.zeroUnlimited')}>
              <input type="number" min={0} className={inputClass} value={form.maxDiscountAmount}
                onChange={(e) => set('maxDiscountAmount', e.target.value)} />
            </Field>
            <Field label={t('admin.settings.globalUsageLimit')} hint={t('admin.settings.zeroUnlimited')}>
              <input type="number" min={0} className={inputClass} value={form.globalUsageLimit}
                onChange={(e) => set('globalUsageLimit', e.target.value)} />
            </Field>
            <Field label={t('admin.settings.perCustomerLimit')} hint={t('admin.settings.zeroUnlimited')}>
              <input type="number" min={0} className={inputClass} value={form.perCustomerUsageLimit}
                onChange={(e) => set('perCustomerUsageLimit', e.target.value)} />
            </Field>
          </div>

          <Field label={t('admin.settings.promoDescription')}>
            <textarea rows={2} className={inputClass} value={form.description}
              onChange={(e) => set('description', e.target.value)} />
          </Field>

          <Field label={t('admin.settings.vehicleCategories')}>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_CATEGORIES.map((cat) => {
                const checked = form.vehicleCategories.includes(cat)
                return (
                  <label key={cat} className="inline-flex items-center gap-1.5 text-xs border border-borderColor rounded-md px-2 py-1 bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        set(
                          'vehicleCategories',
                          checked
                            ? form.vehicleCategories.filter((c) => c !== cat)
                            : [...form.vehicleCategories, cat],
                        )
                      }}
                    />
                    {cat}
                  </label>
                )
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{t('admin.settings.vehicleCategoriesHint')}</p>
          </Field>

          <Field label={t('admin.settings.vehicleModels')} hint={t('admin.settings.vehicleModelsHint')}>
            <input className={inputClass} value={form.vehicleModels}
              onChange={(e) => set('vehicleModels', e.target.value)} />
          </Field>

          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              {t('admin.settings.promoActive')}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.requirePromoCode} onChange={(e) => set('requirePromoCode', e.target.checked)} />
              {t('admin.settings.requirePromoCode')}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.allowStacking} onChange={(e) => set('allowStacking', e.target.checked)} />
              {t('admin.settings.allowStacking')}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={runPreview} className="px-3 py-2 rounded-lg border border-borderColor text-sm">
              {t('admin.settings.pricingPreview')}
            </button>
            {preview && (
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {currency}{preview.originalPrice} → −{preview.discountAmount} → {currency}{preview.finalPrice}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="ml-auto px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? t('admin.settings.saving') : t('admin.settings.save')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">{t('admin.settings.loading')}</p>
      ) : promotions.length === 0 ? (
        <p className="text-sm text-gray-500">{t('admin.settings.promoEmpty')}</p>
      ) : (
        <div className="space-y-2">
          {promotions.map((p) => (
            <div
              key={p._id}
              className="rounded-xl border border-borderColor bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  {lifecycleBadge(p.lifecycle, t)}
                  {p.code ? (
                    <span className="text-[11px] font-mono bg-gray-100 px-2 py-0.5 rounded">{p.code}</span>
                  ) : (
                    <span className="text-[11px] text-gray-500">{t('admin.settings.autoPromo')}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {p.discountType === 'percentage' ? `${p.discountValue}%` : `${currency}${p.discountValue}`}
                  {' · '}
                  {t(`admin.settings.promoOccasionLabel.${p.occasion || 'custom'}`)}
                  {' · '}
                  {t('admin.settings.usageStat', { used: p.usageCount || 0, limit: p.globalUsageLimit || '∞' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openEdit(p)} className="px-3 py-1.5 text-xs border border-borderColor rounded-lg">
                  {t('admin.settings.edit')}
                </button>
                <button type="button" onClick={() => toggleActive(p)} className="px-3 py-1.5 text-xs border border-borderColor rounded-lg">
                  {p.isActive ? t('admin.settings.deactivate') : t('admin.settings.activate')}
                </button>
                <button type="button" onClick={() => onDelete(p)} className="px-3 py-1.5 text-xs border border-red-200 text-red-700 rounded-lg">
                  {t('admin.settings.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PromotionsPanel

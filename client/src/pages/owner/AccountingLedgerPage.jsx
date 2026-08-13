import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'

const inputClass =
  'w-full min-h-11 rounded-xl border border-borderColor bg-white px-3.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40'
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted'

const toInputDate = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const formatMoney = (n, currency = 'MAD') =>
  `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`

const carLabel = (car) => {
  if (!car) return '—'
  const plate = car.licensePlate ? ` · ${car.licensePlate}` : ''
  return `${car.brand || ''} ${car.model || ''}${plate}`.trim() || '—'
}

/**
 * Shared ledger CRUD for agency expenses / vehicle expenses / Samsar payments.
 */
const AccountingLedgerPage = ({ config }) => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [carId, setCarId] = useState('')
  const [samsarId, setSamsarId] = useState('')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => config.emptyForm())
  const [saving, setSaving] = useState(false)
  const [cars, setCars] = useState([])
  const [samsars, setSamsars] = useState([])

  const loadRefs = useCallback(async () => {
    try {
      if (config.needsCars) {
        const { data } = await axios.get('/api/owner/accounting/cars')
        if (data.success) setCars(data.cars || data.data || [])
      }
      if (config.needsSamsars) {
        const { data } = await axios.get('/api/owner/accounting/samsars')
        if (data.success) setSamsars(data.samsars || [])
      }
    } catch {
      /* optional lookups */
    }
  }, [axios, config.needsCars, config.needsSamsars])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 20,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(paymentStatus !== 'all' ? { paymentStatus } : {}),
        ...(category !== 'all' && config.categories ? { category } : {}),
        ...(config.needsCars && carId ? { car: carId } : {}),
        ...(config.needsSamsars && samsarId ? { samsar: samsarId } : {}),
      }
      const { data } = await axios.get(config.listPath, { params })
      if (!data.success) {
        toast.error(data.message || t('admin.accounting.loadError'))
        return
      }
      setItems(data[config.listKey] || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [
    axios,
    carId,
    category,
    config.categories,
    config.listKey,
    config.listPath,
    config.needsCars,
    config.needsSamsars,
    from,
    page,
    paymentStatus,
    samsarId,
    t,
    to,
  ])

  useEffect(() => {
    loadRefs()
  }, [loadRefs])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(config.emptyForm())
    setDrawerOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm(config.toForm(row))
    setDrawerOpen(true)
  }

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const onSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = config.toPayload(form)
      const { data } = editing
        ? await axios.put(`${config.listPath}/${editing._id}`, payload)
        : await axios.post(config.listPath, payload)
      if (!data.success) {
        toast.error(data.message || t('admin.accounting.saveError'))
        return
      }
      toast.success(editing ? t('admin.accounting.updated') : t('admin.accounting.created'))
      setDrawerOpen(false)
      load()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row) => {
    if (!window.confirm(t('admin.accounting.deleteConfirm'))) return
    try {
      const { data } = await axios.delete(`${config.listPath}/${row._id}`)
      if (!data.success) {
        toast.error(data.message || t('admin.accounting.saveError'))
        return
      }
      toast.success(t('admin.accounting.deleted'))
      load()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Title title={t(config.titleKey)} subTitle={t(config.subtitleKey)} />
        <button
          type="button"
          onClick={openCreate}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
        >
          {t(config.createKey)}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className={labelClass}>{t('admin.accounting.from')}</span>
          <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value) }} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>{t('admin.accounting.to')}</span>
          <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value) }} className={inputClass} />
        </label>
        {config.categories ? (
          <label className="text-sm">
            <span className={labelClass}>{t('admin.accounting.category')}</span>
            <select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value) }} className={inputClass}>
              <option value="all">{t('admin.accounting.filterAll')}</option>
              {config.categories.map((c) => (
                <option key={c} value={c}>
                  {config.categoryI18nPrefix
                    ? t(`${config.categoryI18nPrefix}.${c}`)
                    : c}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm">
          <span className={labelClass}>{t('admin.accounting.paymentStatus')}</span>
          <select
            value={paymentStatus}
            onChange={(e) => { setPage(1); setPaymentStatus(e.target.value) }}
            className={inputClass}
          >
            <option value="all">{t('admin.accounting.filterAll')}</option>
            {['pending', 'paid', 'cancelled'].map((s) => (
              <option key={s} value={s}>
                {t(`admin.accounting.paymentStatuses.${s}`)}
              </option>
            ))}
          </select>
        </label>
        {config.needsCars ? (
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className={labelClass}>{t('admin.accounting.vehicle')}</span>
            <select value={carId} onChange={(e) => { setPage(1); setCarId(e.target.value) }} className={inputClass}>
              <option value="">{t('admin.accounting.filterAll')}</option>
              {cars.map((c) => (
                <option key={c._id} value={c._id}>
                  {carLabel(c)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {config.needsSamsars ? (
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className={labelClass}>{t('admin.accounting.samsar')}</span>
            <select
              value={samsarId}
              onChange={(e) => { setPage(1); setSamsarId(e.target.value) }}
              className={inputClass}
            >
              <option value="">{t('admin.accounting.filterAll')}</option>
              {samsars.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-borderColor bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-borderColor bg-sand/40 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              {config.columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-semibold">
                  {t(col.labelKey)}
                </th>
              ))}
              <th className="px-4 py-3 font-semibold">{t('admin.accounting.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-4 py-8 text-muted">
                  {t('admin.accounting.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-4 py-8 text-muted">
                  {t('admin.accounting.empty')}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row._id} className="border-b border-borderColor/70 last:border-0">
                  {config.columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-ink">
                      {col.render(row, { t, currency, formatMoney, carLabel, toInputDate })}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(row)} className="text-sm font-medium text-primary">
                        {t('admin.accounting.edit')}
                      </button>
                      <button type="button" onClick={() => onDelete(row)} className="text-sm font-medium text-red-600">
                        {t('admin.accounting.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            {t('admin.accounting.pageOf', { page: pagination.page, total: pagination.totalPages })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-borderColor px-3 py-1.5 disabled:opacity-40"
            >
              {t('admin.accounting.prev')}
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-borderColor px-3 py-1.5 disabled:opacity-40"
            >
              {t('admin.accounting.next')}
            </button>
          </div>
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-ink/40">
          <form
            onSubmit={onSave}
            className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-borderColor px-5 py-4">
              <h2 className="text-lg font-semibold text-ink">
                {editing ? t(config.editKey) : t(config.createKey)}
              </h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-muted">
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 px-5 py-5">
              {config.renderFields({
                form,
                setField,
                t,
                cars,
                samsars,
                inputClass,
                labelClass,
                carLabel,
              })}
            </div>
            <div className="border-t border-borderColor px-5 py-4">
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? t('admin.accounting.saving') : t('admin.accounting.save')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export default AccountingLedgerPage
export { toInputDate, formatMoney, carLabel, inputClass, labelClass }

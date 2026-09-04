import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { carLabel, formatMoney, toInputDate, inputClass, labelClass } from './AccountingLedgerPage'
import { VehicleSelect } from '../../admin/ui'
import { downloadXlsx } from '../../utils/downloadXlsx'
import DateField from '../../components/calendar/DateField'

const AccountingRevenues = () => {
  const { axios, currency } = useAppContext()
  const { t, language } = useI18n()
  const [items, setItems] = useState([])
  const [totals, setTotals] = useState(null)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [carId, setCarId] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [cars, setCars] = useState([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    axios
      .get('/api/owner/accounting/cars')
      .then(({ data }) => {
        if (data.success) setCars(data.cars || [])
      })
      .catch(() => {})
  }, [axios])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 20,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(paymentStatus !== 'all' ? { paymentStatus } : {}),
        ...(carId ? { car: carId } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      }
      const { data } = await axios.get('/api/owner/accounting/revenues', { params })
      if (!data.success) {
        toast.error(data.message || t('admin.accounting.loadError'))
        return
      }
      setItems(data.revenues || [])
      setTotals(data.totals || null)
      setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [axios, carId, from, page, paymentStatus, q, t, to])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="px-4 py-6 md:px-8">
      <Title title={t('admin.accounting.revenuesTitle')} subTitle={t('admin.accounting.revenuesSubtitle')} />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className={labelClass}>{t('admin.accounting.from')}</span>
          <DateField value={from} onChange={(value) => { setPage(1); setFrom(value) }} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>{t('admin.accounting.to')}</span>
          <DateField value={to} onChange={(value) => { setPage(1); setTo(value) }} className={inputClass} />
        </label>
        <label className="min-w-[10rem] text-sm">
          <span className={labelClass}>{t('admin.accounting.paymentStatus')}</span>
          <select
            value={paymentStatus}
            onChange={(e) => { setPage(1); setPaymentStatus(e.target.value) }}
            className={inputClass}
          >
            <option value="all">{t('admin.accounting.filterAll')}</option>
            {['pending', 'paid', 'failed', 'refunded'].map((s) => (
              <option key={s} value={s}>
                {t(`admin.accounting.bookingPaymentStatuses.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className={labelClass}>{t('admin.accounting.vehicle')}</span>
          <VehicleSelect
            includeEmpty
            emptyOptionLabel={t('admin.accounting.filterAll')}
            cars={cars}
            value={carId}
            onChange={(v) => { setPage(1); setCarId(v) }}
            placeholder={t('admin.accounting.searchVehicle')}
            searchPlaceholder={t('admin.accounting.searchVehicle')}
            emptyLabel={t('admin.ui.noResults')}
          />
        </label>
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className={labelClass}>{t('admin.accounting.search')}</span>
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value) }}
            placeholder={t('admin.accounting.searchPlaceholder')}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          disabled={exporting}
          onClick={async () => {
            setExporting(true)
            try {
              await downloadXlsx(axios, '/api/owner/accounting/export', {
                params: {
                  ledger: 'revenues',
                  ...(from ? { from } : {}),
                  ...(to ? { to } : {}),
                  ...(paymentStatus !== 'all' ? { paymentStatus } : {}),
                  ...(carId ? { car: carId } : {}),
                  ...(q.trim() ? { q: q.trim() } : {}),
                },
                language,
                fallbackName: 'revenues.xlsx',
              })
              toast.success(t('admin.common.exportSuccess'))
            } catch (error) {
              toast.error(getErrorMessage(error) || t('admin.common.exportError'))
            } finally {
              setExporting(false)
            }
          }}
          className="admin-btn admin-btn-secondary"
        >
          {exporting ? t('admin.common.exporting') : t('admin.common.exportExcel')}
        </button>
      </div>

      {totals ? (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="rounded-xl border border-borderColor bg-white px-4 py-2">
            {t('admin.accounting.totalRevenue')}: <strong>{formatMoney(totals.totalRevenue, currency)}</strong>
          </span>
          <span className="rounded-xl border border-borderColor bg-white px-4 py-2">
            {t('admin.accounting.paidRevenue')}: <strong>{formatMoney(totals.paidRevenue, currency)}</strong>
          </span>
          <span className="rounded-xl border border-borderColor bg-white px-4 py-2">
            {t('admin.accounting.unpaidRevenue')}: <strong>{formatMoney(totals.unpaidRevenue, currency)}</strong>
          </span>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-borderColor bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-borderColor bg-sand/40 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('admin.accounting.colReservation')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.accounting.colCustomer')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.accounting.colVehicle')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.accounting.colPickup')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.accounting.colAmount')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.accounting.colPaymentStatus')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.accounting.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-muted">
                  {t('admin.accounting.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-muted">
                  {t('admin.accounting.empty')}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row._id} className="border-b border-borderColor/70 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{row.reservationId || '—'}</td>
                  <td className="px-4 py-3 text-ink">{row.customerName || '—'}</td>
                  <td className="px-4 py-3 text-ink">{carLabel(row.car)}</td>
                  <td className="px-4 py-3 text-ink">{toInputDate(row.pickupDate) || '—'}</td>
                  <td className="px-4 py-3 text-ink">{formatMoney(row.price, currency)}</td>
                  <td className="px-4 py-3 text-ink">
                    {t(`admin.accounting.bookingPaymentStatuses.${row.paymentStatus}`)}
                  </td>
                  <td className="px-4 py-3 text-ink">{row.status}</td>
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
    </div>
  )
}

export default AccountingRevenues

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'

const cardClass = 'rounded-2xl border border-borderColor bg-white p-5 shadow-sm'

const formatMoney = (n, currency = 'MAD') =>
  `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`

const AccountingOverview = () => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (from) params.from = from
      if (to) params.to = to
      const { data } = await axios.get('/api/owner/accounting/kpis', { params })
      if (!data.success) {
        toast.error(data.message || t('admin.accounting.loadError'))
        return
      }
      setKpis(data.kpis)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [axios, from, to, t])

  useEffect(() => {
    load()
  }, [load])

  const tiles = useMemo(() => {
    if (!kpis) return []
    return [
      {
        key: 'revenue',
        label: t('admin.accounting.kpiRevenue'),
        value: formatMoney(kpis.totalRevenue, currency),
        hint: t('admin.accounting.kpiPaidHint', {
          paid: formatMoney(kpis.paidRevenue, currency),
        }),
        to: '/owner/accounting/revenues',
      },
      {
        key: 'samsar',
        label: t('admin.accounting.kpiSamsar'),
        value: formatMoney(kpis.totalSamsarPayments, currency),
        hint: t('admin.accounting.countItems', { count: kpis.samsarPaymentCount }),
        to: '/owner/accounting/samsar-payments',
      },
      {
        key: 'agency',
        label: t('admin.accounting.kpiAgency'),
        value: formatMoney(kpis.totalAgencyExpenses, currency),
        hint: t('admin.accounting.countItems', { count: kpis.agencyExpenseCount }),
        to: '/owner/accounting/agency-expenses',
      },
      {
        key: 'vehicle',
        label: t('admin.accounting.kpiVehicle'),
        value: formatMoney(kpis.totalVehicleExpenses, currency),
        hint: t('admin.accounting.countItems', { count: kpis.vehicleExpenseCount }),
        to: '/owner/accounting/vehicle-expenses',
      },
      {
        key: 'net',
        label: t('admin.accounting.kpiNet'),
        value: formatMoney(kpis.netResult, currency),
        hint: t('admin.accounting.kpiNetHint'),
        to: null,
        emphasize: true,
      },
    ]
  }, [currency, kpis, t])

  return (
    <div className="px-4 py-6 md:px-8">
      <Title title={t('admin.accounting.overviewTitle')} subTitle={t('admin.accounting.overviewSubtitle')} />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('admin.accounting.from')}
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-h-11 rounded-xl border border-borderColor bg-white px-3 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('admin.accounting.to')}
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-h-11 rounded-xl border border-borderColor bg-white px-3 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={load}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
        >
          {t('admin.accounting.applyFilters')}
        </button>
      </div>

      {loading && !kpis ? (
        <p className="mt-8 text-sm text-muted">{t('admin.accounting.loading')}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile) => {
            const inner = (
              <div
                className={`${cardClass} ${tile.emphasize ? 'ring-1 ring-primary/30' : ''} transition hover:border-primary/40`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{tile.label}</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{tile.value}</p>
                {tile.hint ? <p className="mt-1 text-xs text-muted">{tile.hint}</p> : null}
              </div>
            )
            return tile.to ? (
              <Link key={tile.key} to={tile.to}>
                {inner}
              </Link>
            ) : (
              <div key={tile.key}>{inner}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AccountingOverview

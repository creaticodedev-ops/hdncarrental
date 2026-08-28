import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { AdminPage, StatCard, SkeletonBlock } from '../../admin/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { downloadXlsx } from '../../utils/downloadXlsx'
import DateField from '../../components/calendar/DateField'

const formatMoney = (n, currency = 'MAD') =>
  `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`

const AccountingOverview = () => {
  const { axios, currency } = useAppContext()
  const { t, language } = useI18n()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

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
        tone: 'success',
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
        tone: 'primary',
      },
    ]
  }, [currency, kpis, t])

  return (
    <AdminPage>
      <Title title={t('admin.accounting.overviewTitle')} subTitle={t('admin.accounting.overviewSubtitle')} />

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="text-sm">
          <span className="admin-label">{t('admin.accounting.from')}</span>
          <DateField value={from} onChange={setFrom} className="admin-input" />
        </label>
        <label className="text-sm">
          <span className="admin-label">{t('admin.accounting.to')}</span>
          <DateField value={to} onChange={setTo} className="admin-input" />
        </label>
        <button type="button" onClick={load} className="admin-btn admin-btn-primary">
          {t('admin.accounting.applyFilters')}
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={async () => {
            setExporting(true)
            try {
              await downloadXlsx(axios, '/api/owner/accounting/export', {
                params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
                language,
                fallbackName: 'accounting.xlsx',
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

      {loading && !kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile) => (
            <StatCard
              key={tile.key}
              label={tile.label}
              value={tile.value}
              hint={tile.hint}
              to={tile.to || undefined}
              tone={tile.tone || 'default'}
            />
          ))}
        </div>
      )}
    </AdminPage>
  )
}

export default AccountingOverview

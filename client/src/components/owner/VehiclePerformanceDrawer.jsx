import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AdminDrawer, DrawerSection } from '../../admin/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { downloadXlsx } from '../../utils/downloadXlsx'
import { assets } from '../../assets/assets'
import { parsePct } from '../../pages/owner/fleetPerformanceUtils'
import '../../components/calendar/opsCalendar.css'

const money = (value, currency, language) => {
  const locale = language === 'fr' ? 'fr-MA' : language === 'es' ? 'es-ES' : 'en-GB'
  return `${Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 0 })} ${currency}`
}

const Spark = ({ values }) => {
  const nums = (values || []).map((n) => Number(n || 0))
  if (!nums.length) return null
  const max = Math.max(...nums, 1)
  const min = Math.min(...nums, 0)
  const w = 280
  const h = 88
  const pts = nums.map((value, index) => {
    const x = nums.length === 1 ? w / 2 : (index / (nums.length - 1)) * w
    const y = h - 8 - ((value - min) / (max - min || 1)) * (h - 16)
    return `${x},${y}`
  })
  const area = `0,${h} ${pts.join(' ')} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polygon fill="currentColor" opacity="0.1" points={area} />
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" points={pts.join(' ')} />
    </svg>
  )
}

const VehiclePerformanceDrawer = ({ open, onClose, car, stats, loading }) => {
  const { axios, currency } = useAppContext()
  const { t, language } = useI18n()
  const [series, setSeries] = useState('monthly')
  const [tab, setTab] = useState('overview')
  const fallbackImage = assets.car_image1
  const overview = stats?.overview || {}
  const analytics = stats?.analytics || {}
  const chart = series === 'yearly' ? stats?.yearlyPerformance : stats?.monthlyPerformance

  useEffect(() => {
    setTab('overview')
    setSeries('monthly')
  }, [car?._id])

  const statusKey = useMemo(() => {
    if (!car) return 'offline'
    if (car.status === 'maintenance') return 'maintenance'
    if (Number(overview.activeBookings || 0) > 0) return 'rented'
    if (car.isAvaliable) return 'available'
    return 'offline'
  }, [car, overview.activeBookings])

  const status = {
    available: t('admin.vehicleStats.statusAvailable'),
    rented: t('admin.vehicleStats.statusRented'),
    offline: t('admin.vehicleStats.statusOffline'),
    maintenance: t('admin.vehicleStats.statusMaintenance'),
  }[statusKey]

  const exportReport = async (type = 'xlsx') => {
    if (!car?._id) return
    if (type === 'pdf') {
      window.print()
      return
    }
    try {
      await downloadXlsx(axios, `/api/owner/vehicles/${car._id}/stats/export`, {
        language,
        fallbackName: `${car.fleetId || car.licensePlate || 'vehicle'}-report.xlsx`,
      })
      toast.success(t('admin.common.exportSuccess'))
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.common.exportError'))
    }
  }

  const tabs = [
    ['overview', t('admin.vehicleStats.tabOverview')],
    ['trend', t('admin.vehicleStats.tabTrend')],
    ['operations', t('admin.vehicleStats.tabOperations')],
  ]

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      size="xl"
      title={car ? `${car.brand} ${car.model}` : t('admin.vehicleStats.drawerTitle')}
      description={car ? `${car.licensePlate || car.fleetId || '—'} · ${status}` : ''}
      footer={car ? (
        <>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => exportReport('pdf')}>
            {t('admin.vehicleStats.exportPdf')}
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => exportReport('xlsx')}>
            {t('admin.common.exportExcel')}
          </button>
        </>
      ) : null}
    >
      {!car ? null : loading && !stats ? (
        <p className="text-sm text-[var(--admin-muted)]">{t('admin.vehicleStats.loadingDetail')}</p>
      ) : !stats ? (
        <p className="text-sm text-[var(--admin-muted)]">{t('admin.vehicleStats.none')}</p>
      ) : (
        <div>
          <div className="fp-drawer-hero">
            <img
              src={car.image || fallbackImage}
              alt=""
              onError={(e) => { e.currentTarget.src = fallbackImage }}
            />
            <div className="min-w-0">
              <h3>{car.brand} {car.model}</h3>
              <p>
                {t('admin.vehicleStats.fleetIdLabel')}: {car.fleetId || '—'} · {car.category || '—'} · {car.year || '—'}
              </p>
              <p>
                {t('admin.vehicleStats.price')}: {money(car.pricePerDay, currency, language)}{t('admin.fleet.perDay')}
              </p>
              <p className="mt-2">
                <span className={`fp-status is-${statusKey}`}>
                  <span className={`fp-dot is-${statusKey}`} />
                  {status}
                </span>
              </p>
            </div>
          </div>

          <div className="fp-tabs" role="tablist">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`fp-tab ${tab === key ? 'is-on' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'overview' ? (
            <>
              <div className="fp-metrics">
                <div className="fp-metric">
                  <p>{t('admin.vehicleStats.revenue')}</p>
                  <strong>{money(overview.totalRevenue, currency, language)}</strong>
                </div>
                <div className="fp-metric">
                  <p>{t('admin.vehicleStats.utilization')}</p>
                  <strong>{overview.utilizationRate || '0%'}</strong>
                </div>
                <div className="fp-metric">
                  <p>{t('admin.vehicleStats.bookings')}</p>
                  <strong>{overview.totalBookings ?? 0}</strong>
                </div>
                <div className="fp-metric">
                  <p>{t('admin.vehicleStats.averageRental')}</p>
                  <strong>{overview.averageRentalDuration || '—'}</strong>
                </div>
                <div className="fp-metric">
                  <p>{t('admin.vehicleStats.activeBookings')}</p>
                  <strong>{overview.activeBookings ?? 0}</strong>
                </div>
                <div className="fp-metric">
                  <p>{t('admin.vehicleStats.outstandingBalance')}</p>
                  <strong>{money(overview.outstandingBalance, currency, language)}</strong>
                </div>
              </div>

              <DrawerSection title={t('admin.vehicleStats.utilizationTrend')} description={t('admin.vehicleStats.utilizationTrendHint')} className="mb-5">
                <div className="sm:col-span-2">
                  <div className={`fp-util ${parsePct(overview.utilizationRate) < 25 ? 'is-low' : parsePct(overview.utilizationRate) < 50 ? 'is-mid' : ''}`}>
                    <div className="fp-util-track">
                      <div className="fp-util-fill" style={{ width: `${Math.min(100, parsePct(overview.utilizationRate))}%` }} />
                    </div>
                    <span>{overview.utilizationRate}</span>
                  </div>
                  <div className="fp-metrics mt-3" style={{ marginBottom: 0 }}>
                    <div className="fp-metric">
                      <p>{t('admin.vehicleStats.completed')}</p>
                      <strong>{overview.completedBookings ?? 0}</strong>
                    </div>
                    <div className="fp-metric">
                      <p>{t('admin.vehicleStats.rentalDays')}</p>
                      <strong>{overview.rentalDays ?? 0}</strong>
                    </div>
                    <div className="fp-metric">
                      <p>{t('admin.vehicleStats.avgDailyRevenue')}</p>
                      <strong>{money(analytics.averageDailyRevenue, currency, language)}</strong>
                    </div>
                  </div>
                </div>
              </DrawerSection>
            </>
          ) : null}

          {tab === 'trend' ? (
            <>
              <DrawerSection title={t('admin.vehicleStats.revenueTrend')} description={t('admin.vehicleStats.revenueTrendHint')} className="mb-5">
                <div className="sm:col-span-2">
                  <div className="fp-tabs" style={{ maxWidth: 16 + 'rem' }}>
                    <button type="button" className={`fp-tab ${series === 'monthly' ? 'is-on' : ''}`} onClick={() => setSeries('monthly')}>{t('admin.vehicleStats.monthlyView')}</button>
                    <button type="button" className={`fp-tab ${series === 'yearly' ? 'is-on' : ''}`} onClick={() => setSeries('yearly')}>{t('admin.vehicleStats.yearlyView')}</button>
                  </div>
                  <div className="fp-chart mt-3">
                    <Spark values={(chart || []).map((item) => item.revenue)} />
                  </div>
                  <div className="fp-series">
                    {(chart || []).slice(-6).map((item) => (
                      <div key={item.label} className="fp-series-row">
                        <span>{item.label}</span>
                        <strong>{item.bookings} · {money(item.revenue, currency, language)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </DrawerSection>

              <DrawerSection title={t('admin.vehicleStats.businessIntelligence')} description={t('admin.vehicleStats.businessIntelligenceHint')}>
                <div className="sm:col-span-2 fp-metrics" style={{ marginBottom: 0 }}>
                  <div className="fp-metric">
                    <p>{t('admin.vehicleStats.monthlyRevenue')}</p>
                    <strong>{money(overview.monthlyRevenue, currency, language)}</strong>
                  </div>
                  <div className="fp-metric">
                    <p>{t('admin.vehicleStats.yearlyRevenue')}</p>
                    <strong>{money(overview.yearlyRevenue, currency, language)}</strong>
                  </div>
                  <div className="fp-metric">
                    <p>{t('admin.vehicleStats.estimatedProfit')}</p>
                    <strong>{money(analytics.estimatedProfit, currency, language)}</strong>
                  </div>
                  <div className="fp-metric">
                    <p>{t('admin.vehicleStats.profitMargin')}</p>
                    <strong>{analytics.profitMargin ?? 0}%</strong>
                  </div>
                  <div className="fp-metric">
                    <p>{t('admin.vehicleStats.avgDailyRevenue')}</p>
                    <strong>{money(analytics.averageDailyRevenue, currency, language)}</strong>
                  </div>
                  <div className="fp-metric">
                    <p>{t('admin.vehicleStats.bestPerformingPeriod')}</p>
                    <strong>{analytics.bestPerformingPeriod?.label || '—'}</strong>
                  </div>
                </div>
              </DrawerSection>
            </>
          ) : null}

          {tab === 'operations' ? (
            <>
              <DrawerSection title={t('admin.vehicleStats.upcomingReservations')} description={t('admin.vehicleStats.upcomingHint')} className="mb-5">
                <div className="sm:col-span-2 fp-list">
                  {(stats.upcomingReservations || []).length ? stats.upcomingReservations.map((booking) => (
                    <div key={booking._id} className="fp-list-item">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{booking.customerName || t('admin.vehicleStats.guest')}</span>
                        <span className="text-[11px] uppercase text-[var(--admin-muted)]">{booking.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString() : '—'}
                        {' → '}
                        {booking.returnDate ? new Date(booking.returnDate).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  )) : <p className="text-sm text-[var(--admin-muted)]">{t('admin.vehicleStats.noUpcoming')}</p>}
                </div>
              </DrawerSection>

              <DrawerSection title={t('admin.vehicleStats.maintenanceHistory')} description={t('admin.vehicleStats.maintenanceHint')} className="mb-5">
                <div className="sm:col-span-2 fp-list">
                  {(stats.maintenanceHistory || []).length ? stats.maintenanceHistory.slice(0, 8).map((record) => (
                    <div key={record._id} className="fp-list-item">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{record.type || t('admin.vehicleStats.maintenanceDefault')}</span>
                        <span className="text-[11px] uppercase text-[var(--admin-muted)]">{record.status || t('admin.vehicleStats.logged')}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {record.scheduledDate ? new Date(record.scheduledDate).toLocaleDateString() : t('admin.vehicleStats.noDate')}
                      </p>
                    </div>
                  )) : <p className="text-sm text-[var(--admin-muted)]">{t('admin.vehicleStats.noMaintenance')}</p>}
                </div>
              </DrawerSection>

              <DrawerSection title={t('admin.vehicleStats.availabilityTimeline')} description={t('admin.vehicleStats.availabilityHint')}>
                <div className="sm:col-span-2 hdn-ops">
                  <div className="fp-week">
                    {(stats.availabilityCalendar || []).slice(0, 7).map((day) => (
                      <div key={day.date} className={`fp-week-day ${day.isBooked ? 'is-busy' : ''}`}>
                        <p className="uppercase tracking-wider">{day.label}</p>
                        <strong>{String(day.date).slice(-2)}</strong>
                        <p>{day.isBooked ? t('admin.vehicleStats.booked') : t('admin.vehicleStats.free')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </DrawerSection>
            </>
          ) : null}
        </div>
      )}
    </AdminDrawer>
  )
}

export default VehiclePerformanceDrawer

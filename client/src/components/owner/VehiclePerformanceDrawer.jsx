import React, { useMemo, useState } from 'react'
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
  const h = 72
  const pts = nums.map((value, index) => {
    const x = nums.length === 1 ? w / 2 : (index / (nums.length - 1)) * w
    const y = h - 6 - ((value - min) / (max - min || 1)) * (h - 12)
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-20 w-full" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" points={pts.join(' ')} />
    </svg>
  )
}

const VehiclePerformanceDrawer = ({ open, onClose, car, stats, loading }) => {
  const { axios, currency } = useAppContext()
  const { t, language } = useI18n()
  const [series, setSeries] = useState('monthly')
  const fallbackImage = assets.car_image1
  const overview = stats?.overview || {}
  const analytics = stats?.analytics || {}
  const chart = series === 'yearly' ? stats?.yearlyPerformance : stats?.monthlyPerformance

  const status = useMemo(() => {
    if (!car) return ''
    if (car.status === 'maintenance') return t('admin.vehicleStats.statusMaintenance')
    if (Number(overview.activeBookings || 0) > 0) return t('admin.vehicleStats.statusRented')
    if (car.isAvaliable) return t('admin.vehicleStats.statusAvailable')
    return t('admin.vehicleStats.statusOffline')
  }, [car, overview.activeBookings, t])

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
              <p className="fp-status">
                <span className={`fp-dot is-${car.status === 'maintenance' ? 'maintenance' : Number(overview.activeBookings || 0) > 0 ? 'rented' : car.isAvaliable ? 'available' : 'offline'}`} />
                {status}
              </p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                {t('admin.vehicleStats.fleetIdLabel')}: {car.fleetId || '—'} · {car.category || '—'} · {car.year || '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                {t('admin.vehicleStats.price')}: {money(car.pricePerDay, currency, language)}{t('admin.fleet.perDay')}
              </p>
            </div>
          </div>

          <div className="fp-drawer-kpis">
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.revenue')}</p>
              <strong>{money(overview.totalRevenue, currency, language)}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.utilization')}</p>
              <strong>{overview.utilizationRate || '0%'}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.bookings')}</p>
              <strong>{overview.totalBookings ?? 0}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.averageRental')}</p>
              <strong>{overview.averageRentalDuration || '—'}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.activeBookings')}</p>
              <strong>{overview.activeBookings ?? 0}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.outstandingBalance')}</p>
              <strong>{money(overview.outstandingBalance, currency, language)}</strong>
            </div>
          </div>

          <DrawerSection title={t('admin.vehicleStats.utilizationTrend')} description={t('admin.vehicleStats.utilizationTrendHint')} className="mb-6">
            <div className="sm:col-span-2">
              <div className={`fp-util ${parsePct(overview.utilizationRate) < 25 ? 'is-low' : parsePct(overview.utilizationRate) < 50 ? 'is-mid' : ''}`}>
                <div className="fp-util-track">
                  <div className="fp-util-fill" style={{ width: `${Math.min(100, parsePct(overview.utilizationRate))}%` }} />
                </div>
                <span>{overview.utilizationRate}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-[var(--admin-border)] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--admin-muted)]">{t('admin.vehicleStats.completed')}</p>
                  <p className="font-semibold">{overview.completedBookings ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[var(--admin-border)] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--admin-muted)]">{t('admin.vehicleStats.rentalDays')}</p>
                  <p className="font-semibold">{overview.rentalDays ?? 0}</p>
                </div>
              </div>
            </div>
          </DrawerSection>

          <DrawerSection title={t('admin.vehicleStats.revenueTrend')} description={t('admin.vehicleStats.revenueTrendHint')} className="mb-6">
            <div className="sm:col-span-2">
              <div className="mb-2 flex gap-2">
                <button type="button" className={`fp-period ${series === 'monthly' ? 'is-on' : ''}`} onClick={() => setSeries('monthly')}>{t('admin.vehicleStats.monthlyView')}</button>
                <button type="button" className={`fp-period ${series === 'yearly' ? 'is-on' : ''}`} onClick={() => setSeries('yearly')}>{t('admin.vehicleStats.yearlyView')}</button>
              </div>
              <div className="text-[var(--admin-primary)]">
                <Spark values={(chart || []).map((item) => item.revenue)} />
              </div>
              <div className="mt-2 space-y-1.5 text-xs text-[var(--admin-muted)]">
                {(chart || []).slice(-6).map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span>{item.label}</span>
                    <span className="font-medium text-[var(--admin-ink)]">{item.bookings} · {money(item.revenue, currency, language)}</span>
                  </div>
                ))}
              </div>
            </div>
          </DrawerSection>

          <DrawerSection title={t('admin.vehicleStats.upcomingReservations')} description={t('admin.vehicleStats.upcomingHint')} className="mb-6">
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

          <DrawerSection title={t('admin.vehicleStats.maintenanceHistory')} description={t('admin.vehicleStats.maintenanceHint')} className="mb-6">
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

          <DrawerSection title={t('admin.vehicleStats.availabilityTimeline')} description={t('admin.vehicleStats.availabilityHint')} className="mb-6">
            <div className="sm:col-span-2 hdn-ops">
              <div className="fp-week">
                {(stats.availabilityCalendar || []).slice(0, 7).map((day) => (
                  <div key={day.date} className={`fp-week-day ${day.isBooked ? 'is-busy' : ''}`}>
                    <p className="uppercase tracking-wider text-[var(--admin-muted)]">{day.label}</p>
                    <p className="mt-1 text-sm font-semibold">{String(day.date).slice(-2)}</p>
                    <p className="mt-1">{day.isBooked ? t('admin.vehicleStats.booked') : t('admin.vehicleStats.free')}</p>
                  </div>
                ))}
              </div>
            </div>
          </DrawerSection>

          <DrawerSection title={t('admin.vehicleStats.businessIntelligence')} description={t('admin.vehicleStats.businessIntelligenceHint')}>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.monthlyRevenue')}</p>
              <strong>{money(overview.monthlyRevenue, currency, language)}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.yearlyRevenue')}</p>
              <strong>{money(overview.yearlyRevenue, currency, language)}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.estimatedProfit')}</p>
              <strong>{money(analytics.estimatedProfit, currency, language)}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.profitMargin')}</p>
              <strong>{analytics.profitMargin ?? 0}%</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.avgDailyRevenue')}</p>
              <strong>{money(analytics.averageDailyRevenue, currency, language)}</strong>
            </div>
            <div className="fp-drawer-kpi">
              <p>{t('admin.vehicleStats.bestPerformingPeriod')}</p>
              <strong>{analytics.bestPerformingPeriod?.label || '—'}</strong>
            </div>
          </DrawerSection>
        </div>
      )}
    </AdminDrawer>
  )
}

export default VehiclePerformanceDrawer

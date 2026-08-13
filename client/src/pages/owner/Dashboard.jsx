import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Title from '../../components/owner/Title'
import RevenueChart from '../../components/owner/RevenueChart'
import { AdminPage, StatCard, SkeletonBlock, ErrorState } from '../../admin/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

const Dashboard = () => {
  const { axios, isOwner, currency, hasPermission } = useAppContext()
  const { t } = useI18n()
  const [dash, setDash] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [ops, an] = await Promise.all([
        axios.get('/api/owner/ops-dashboard'),
        axios.get('/api/owner/analytics'),
      ])
      if (ops.data.success) setDash(ops.data.dashboard)
      else toast.error(ops.data.message)
      if (an.data.success) setAnalytics(an.data.analytics)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOwner) return
    load()
  }, [isOwner, axios])

  if (loading) {
    return (
      <AdminPage>
        <Title title={t('admin.dashboard.title')} subTitle={t('admin.dashboard.subtitle')} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
      </AdminPage>
    )
  }

  if (!dash) {
    return (
      <AdminPage>
        <Title title={t('admin.dashboard.title')} subTitle={t('admin.dashboard.subtitle')} />
        <ErrorState
          title={t('admin.shell.loadError')}
          onRetry={load}
          retryLabel={t('admin.shell.retry')}
        />
      </AdminPage>
    )
  }

  return (
    <AdminPage>
      <Title
        title={t('admin.dashboard.title')}
        subTitle={t('admin.dashboard.subtitle')}
        secondaryAction={
          <Link to="/owner/analytics" className="admin-btn admin-btn-secondary min-h-10">
            {t('admin.dashboard.analytics')}
          </Link>
        }
        primaryAction={
          <Link to="/owner/manage-bookings" className="admin-btn admin-btn-primary min-h-10">
            {t('admin.dashboard.reservations')}
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 -mt-2 mb-6">
        <Link to="/owner/reports" className="admin-btn admin-btn-ghost min-h-9 text-xs">
          {t('admin.dashboard.reports')}
        </Link>
        {hasPermission('contracts') && (
          <Link to="/owner/contracts" className="admin-btn admin-btn-ghost min-h-9 text-xs">
            {t('admin.dashboard.contracts')}
          </Link>
        )}
        {hasPermission('templates') && (
          <Link to="/owner/templates" className="admin-btn admin-btn-ghost min-h-9 text-xs">
            {t('admin.dashboard.templates')}
          </Link>
        )}
        {hasPermission('accounting') && (
          <Link to="/owner/accounting" className="admin-btn admin-btn-ghost min-h-9 text-xs">
            {t('admin.menu.accountingOverview')}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard label={t('admin.dashboard.todayBookings')} value={dash.todayBookings} tone="primary" />
        <StatCard label={t('admin.dashboard.activeRentals')} value={dash.activeRentals} tone="success" />
        <StatCard label={t('admin.dashboard.upcomingReturns')} value={dash.upcomingReturns?.length || 0} />
        <StatCard
          label={t('admin.dashboard.overdueRentals')}
          value={dash.overdueCount}
          tone={dash.overdueCount ? 'danger' : 'default'}
        />
        <StatCard label={t('admin.dashboard.monthlyRevenue')} value={`${currency}${dash.monthlyRevenue}`} tone="success" />
        <StatCard
          label={t('admin.dashboard.occupancyRate')}
          value={`${dash.occupancyRate}%`}
          hint={t('admin.dashboard.occupancySub', { rented: dash.activeRentals, total: dash.totalCars })}
        />
        <StatCard
          label={t('admin.dashboard.fleetUtilization')}
          value={`${dash.fleetUtilization}%`}
          hint={t('admin.dashboard.fleetUtilSub')}
        />
        <StatCard
          label={t('admin.dashboard.pendingRequests')}
          value={dash.pendingBookings}
          tone={dash.pendingBookings ? 'warn' : 'default'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mt-6">
        <div className="admin-card p-5 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="font-semibold text-[var(--admin-ink)]">{t('admin.dashboard.revenueTrend')}</h2>
            <Link to="/owner/analytics" className="text-sm text-[var(--admin-primary)] shrink-0">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          <RevenueChart data={analytics?.monthlyTrend || []} currency={currency} />
        </div>

        <div className="admin-card p-5 min-w-0">
          <h2 className="font-semibold text-[var(--admin-ink)] mb-4">{t('admin.dashboard.fleetSnapshot')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[var(--admin-radius)] bg-[var(--admin-success-soft)] p-3 text-center min-w-0">
              <p className="text-2xl font-semibold text-[var(--admin-success)]">{dash.availableVehicles}</p>
              <p className="text-xs text-[var(--admin-success)]">{t('admin.dashboard.available')}</p>
            </div>
            <div className="rounded-[var(--admin-radius)] bg-[var(--admin-info-soft)] p-3 text-center min-w-0">
              <p className="text-2xl font-semibold text-[var(--admin-info)]">{dash.rentedVehicles}</p>
              <p className="text-xs text-[var(--admin-info)]">{t('admin.dashboard.onRent')}</p>
            </div>
            <div className="rounded-[var(--admin-radius)] bg-[var(--admin-warn-soft)] p-3 text-center min-w-0">
              <p className="text-2xl font-semibold text-[var(--admin-warn)]">{dash.maintenanceVehicles}</p>
              <p className="text-xs text-[var(--admin-warn)]">{t('admin.dashboard.offline')}</p>
            </div>
          </div>
          <Link to="/owner/maintenance" className="mt-4 inline-block text-sm text-[var(--admin-primary)]">
            {t('admin.dashboard.maintenanceLink')}
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6 mt-6">
        {[
          {
            title: t('admin.dashboard.upcomingPickups'),
            empty: t('admin.dashboard.noPickups'),
            items: dash.upcomingPickups || [],
            dateKey: 'pickupDate',
          },
          {
            title: t('admin.dashboard.upcomingReturnsTitle'),
            empty: t('admin.dashboard.noReturns'),
            items: dash.upcomingReturns || [],
            dateKey: 'returnDate',
          },
          {
            title: t('admin.dashboard.overdueTitle'),
            empty: t('admin.dashboard.noOverdue'),
            items: dash.overdueRentals || [],
            dateKey: 'returnDate',
            danger: true,
          },
        ].map((panel) => (
          <div key={panel.title} className="admin-card p-5">
            <h2 className="font-semibold text-[var(--admin-ink)] mb-3">{panel.title}</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {panel.items.length === 0 && (
                <p className="text-sm text-[var(--admin-muted)]">{panel.empty}</p>
              )}
              {panel.items.map((b) => (
                <div key={b._id} className="text-sm border-b border-[var(--admin-border)] pb-2 min-w-0">
                  <p className={`font-medium truncate ${panel.danger ? 'text-[var(--admin-danger)]' : 'text-[var(--admin-ink)]'}`}>
                    {b.customerName || t('admin.common.guest')}
                  </p>
                  <p className="text-xs text-[var(--admin-muted)] truncate">
                    {b.car?.brand} {b.car?.model} · {new Date(b[panel.dateKey]).toLocaleString()}
                    {b.reservationId ? ` · ${b.reservationId}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminPage>
  )
}

export default Dashboard

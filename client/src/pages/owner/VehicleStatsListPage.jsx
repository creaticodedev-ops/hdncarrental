import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AdminPage, PageHeader, VehicleSelect } from '../../admin/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { assets } from '../../assets/assets'
import { VEHICLE_CATEGORIES } from '../../utils/vehicleCategories'
import VehiclePerformanceDrawer from '../../components/owner/VehiclePerformanceDrawer'
import {
  activeFilterChips,
  applyPeriod,
  buildRow,
  clearChip,
  defaultFilters,
  isoToDisplay,
  loadSavedFilters,
  matchesFilters,
  needsAttention,
  saveFilters,
  scoreRows,
  sortRows,
} from './fleetPerformanceUtils'
import DateRangePicker from '../../components/DateRangePicker'
import './fleetPerformance.css'

const BATCH = 5

const money = (value, currency, language) => {
  const locale = language === 'fr' ? 'fr-MA' : language === 'es' ? 'es-ES' : 'en-GB'
  return `${Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 0 })} ${currency}`
}

const Spark = ({ values }) => {
  const nums = (values || []).map((n) => Number(n || 0))
  if (nums.length < 2) return <span className="fp-spark" />
  const max = Math.max(...nums, 1)
  const min = Math.min(...nums, 0)
  const w = 56
  const h = 20
  const pts = nums.map((value, index) => {
    const x = (index / (nums.length - 1)) * w
    const y = h - 2 - ((value - min) / (max - min || 1)) * (h - 4)
    return `${x},${y}`
  })
  const area = `0,${h} ${pts.join(' ')} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="fp-spark" aria-hidden>
      <polygon fill="currentColor" opacity="0.12" points={area} />
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" points={pts.join(' ')} />
    </svg>
  )
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.2-3.2" />
  </svg>
)

const COL_SORT = {
  revenue: { desc: 'revenueDesc', asc: 'revenueAsc' },
  utilization: { desc: 'utilDesc', asc: 'utilAsc' },
  bookings: { desc: 'rentalsDesc', asc: 'rentalsAsc' },
  upcoming: { desc: 'upcomingDesc', asc: 'upcomingDesc' },
  maintenance: { desc: 'maintDesc', asc: 'maintDesc' },
  score: { desc: 'perfDesc', asc: 'perfAsc' },
}

const VehicleStatsListPage = () => {
  const { isOwner, axios, currency } = useAppContext()
  const { t, language } = useI18n()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('vehicle')
  const fallbackImage = assets.car_image1

  const [vehicles, setVehicles] = useState([])
  const [statsMap, setStatsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [metricsPending, setMetricsPending] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState(loadSavedFilters)

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    saveFilters(filters)
  }, [filters])

  const rangeReady = (!filters.from && !filters.to) || (Boolean(filters.from) && Boolean(filters.to) && filters.from <= filters.to)

  useEffect(() => {
    if (!isOwner) return undefined
    let cancelled = false

    const loadCars = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/owner/cars')
        if (!data.success) {
          toast.error(data.message || t('admin.vehicleStats.loadError'))
          return
        }
        if (!cancelled) setVehicles(data.cars || [])
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCars()
    return () => { cancelled = true }
  }, [axios, isOwner, t])

  useEffect(() => {
    if (!isOwner || !vehicles.length || !rangeReady) return undefined
    let cancelled = false

    const loadStats = async () => {
      setMetricsPending(true)
      const next = {}
      const params = {}
      if (filters.from && filters.to) {
        params.from = filters.from
        params.to = filters.to
      }
      for (let i = 0; i < vehicles.length; i += BATCH) {
        if (cancelled) return
        const slice = vehicles.slice(i, i + BATCH)
        const results = await Promise.all(slice.map(async (car) => {
          try {
            const res = await axios.get(`/api/owner/vehicles/${car._id}/stats`, { params })
            return [car._id, res.data?.success ? res.data.stats : null]
          } catch {
            return [car._id, null]
          }
        }))
        results.forEach(([id, stats]) => { next[id] = stats })
        if (!cancelled) setStatsMap({ ...next })
      }
      if (!cancelled) setMetricsPending(false)
    }

    loadStats()
    return () => { cancelled = true }
  }, [axios, isOwner, vehicles, filters.from, filters.to, rangeReady])

  const rows = useMemo(() => {
    const built = vehicles.map((car) => buildRow(car, statsMap[car._id]))
    return sortRows(scoreRows(built).filter((row) => matchesFilters(row, filters)), filters.sort)
  }, [vehicles, statsMap, filters])

  const kpis = useMemo(() => {
    const all = scoreRows(vehicles.map((car) => buildRow(car, statsMap[car._id])))
    const revenue = all.reduce((sum, row) => sum + row.revenue, 0)
    const util = all.length ? all.reduce((sum, row) => sum + row.utilization, 0) / all.length : 0
    const rented = all.filter((row) => row.status === 'rented').length
    const available = all.filter((row) => row.status === 'available').length
    const attention = all.filter(needsAttention).length
    return { revenue, util, rented, available, attention, total: all.length }
  }, [vehicles, statsMap])

  const brands = useMemo(() => [...new Set(vehicles.map((car) => car.brand).filter(Boolean))].sort(), [vehicles])
  const models = useMemo(() => {
    const source = filters.brand ? vehicles.filter((car) => car.brand === filters.brand) : vehicles
    return [...new Set(source.map((car) => car.model).filter(Boolean))].sort()
  }, [vehicles, filters.brand])

  const chips = useMemo(() => activeFilterChips(filters, t, vehicles), [filters, t, vehicles])
  const selectedCar = vehicles.find((car) => String(car._id) === String(selectedId)) || null
  const periodHint = filters.from && filters.to
    ? `${isoToDisplay(filters.from)} → ${isoToDisplay(filters.to)}`
    : t('admin.vehicleStats.periodAll')
  const PERIODS = [
    { key: 'all', label: t('admin.vehicleStats.periodAll') },
    { key: 'last7', label: t('admin.vehicleStats.periodLast7') },
    { key: 'last30', label: t('admin.vehicleStats.periodLast30') },
    { key: 'month', label: t('admin.vehicleStats.periodMonth') },
    { key: 'year', label: t('admin.vehicleStats.periodYear') },
  ]

  const mixOther = Math.max(0, kpis.total - kpis.rented - kpis.available)
  const mixPct = (n) => (kpis.total ? `${(n / kpis.total) * 100}%` : '0%')

  const setRange = ({ startDate, endDate }) => {
    setFilters((prev) => ({
      ...prev,
      period: startDate || endDate ? 'custom' : 'all',
      from: startDate || '',
      to: endDate || '',
    }))
  }

  const openVehicle = (id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('vehicle', id)
    else next.delete('vehicle')
    setParams(next, { replace: true })
  }

  const sortState = (column) => {
    const pair = COL_SORT[column]
    if (!pair) return ''
    if (filters.sort === pair.desc) return 'desc'
    if (filters.sort === pair.asc) return 'asc'
    return ''
  }

  const toggleSort = (column) => {
    const pair = COL_SORT[column]
    if (!pair) return
    setFilter('sort', filters.sort === pair.desc ? pair.asc : pair.desc)
  }

  const statusLabel = (status) => ({
    available: t('admin.vehicleStats.statusAvailable'),
    rented: t('admin.vehicleStats.statusRented'),
    offline: t('admin.vehicleStats.statusOffline'),
    maintenance: t('admin.vehicleStats.statusMaintenance'),
  }[status] || status)

  const applyKpi = (preset) => {
    if (preset === 'attention') setFilters((prev) => ({ ...prev, attention: !prev.attention, sort: prev.attention ? prev.sort : 'perfAsc' }))
    if (preset === 'rented') setFilters((prev) => ({ ...prev, status: prev.status === 'rented' ? '' : 'rented' }))
    if (preset === 'available') setFilters((prev) => ({ ...prev, status: prev.status === 'available' ? '' : 'available' }))
    if (preset === 'util') setFilters((prev) => ({ ...prev, sort: 'utilAsc', utilMax: '25' }))
    if (preset === 'revenue') setFilters((prev) => ({ ...prev, sort: 'revenueDesc' }))
  }

  const SortHead = ({ column, children, numeric = true }) => {
    const dir = sortState(column)
    return (
      <th className={`${numeric ? 'is-num' : ''} ${dir ? 'is-sorted' : ''}`}>
        <button type="button" onClick={() => toggleSort(column)}>
          {children}
          <span className="fp-sort" aria-hidden>{dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '↕'}</span>
        </button>
      </th>
    )
  }

  const metricCell = (ready, content, fallback = <span className="fp-skel is-mid" />) => (
    ready ? content : fallback
  )

  return (
    <AdminPage className="fp-workspace pb-12">
      <PageHeader
        title={t('admin.vehicleStats.workspaceTitle')}
        description={t('admin.vehicleStats.workspaceSubtitle')}
        secondaryAction={(
          <span className="fp-header-meta">
            <strong>{vehicles.length}</strong>
            {t('admin.vehicleStats.fleetMix')}
            <span aria-hidden>·</span>
            {periodHint}
          </span>
        )}
      />

      <section className="fp-intel" aria-label={t('admin.vehicleStats.workspaceTitle')}>
        <div className="fp-intel-grid">
          <button type="button" className="fp-kpi" onClick={() => applyKpi('revenue')}>
            <span className="fp-kpi-kicker">{t('admin.vehicleStats.kpiRevenue')}</span>
            <span className="fp-kpi-value">{money(kpis.revenue, currency, language)}</span>
            <span className="fp-kpi-hint">{periodHint}</span>
          </button>
          <button type="button" className="fp-kpi" onClick={() => applyKpi('util')}>
            <span className="fp-kpi-kicker">{t('admin.vehicleStats.kpiUtilization')}</span>
            <span className="fp-kpi-value">{kpis.util.toFixed(1)}%</span>
            <span className="fp-kpi-hint">{t('admin.vehicleStats.kpiUtilizationHint')}</span>
          </button>
          <button type="button" className={`fp-kpi ${filters.status === 'rented' ? 'is-on' : ''}`} onClick={() => applyKpi('rented')}>
            <span className="fp-kpi-kicker">{t('admin.vehicleStats.kpiActiveRentals')}</span>
            <span className="fp-kpi-value">{kpis.rented}</span>
            <span className="fp-kpi-hint">{t('admin.vehicleStats.kpiOfFleet', { count: kpis.rented, total: kpis.total || 0 })}</span>
          </button>
          <button type="button" className={`fp-kpi ${filters.status === 'available' ? 'is-on' : ''}`} onClick={() => applyKpi('available')}>
            <span className="fp-kpi-kicker">{t('admin.vehicleStats.kpiAvailable')}</span>
            <span className="fp-kpi-value">{kpis.available}</span>
            <span className="fp-kpi-hint">{t('admin.vehicleStats.kpiAvailableHint')}</span>
          </button>
          <button type="button" className={`fp-kpi is-warn ${filters.attention ? 'is-on' : ''}`} onClick={() => applyKpi('attention')}>
            <span className="fp-kpi-kicker">{t('admin.vehicleStats.kpiAttention')}</span>
            <span className="fp-kpi-value">{kpis.attention}</span>
            <span className="fp-kpi-hint">{t('admin.vehicleStats.kpiAttentionHint')}</span>
          </button>
        </div>
        <div className="fp-mix">
          <span className="fp-mix-label">{t('admin.vehicleStats.fleetComposition')}</span>
          <div className="fp-mix-track" aria-hidden>
            <span className="fp-mix-seg is-rented" style={{ width: mixPct(kpis.rented) }} />
            <span className="fp-mix-seg is-available" style={{ width: mixPct(kpis.available) }} />
            <span className="fp-mix-seg is-other" style={{ width: mixPct(mixOther) }} />
          </div>
          <div className="fp-mix-legend">
            <span><i className="is-rented" />{t('admin.vehicleStats.statusRented')} {kpis.rented}</span>
            <span><i className="is-available" />{t('admin.vehicleStats.statusAvailable')} {kpis.available}</span>
            <span><i className="is-other" />{t('admin.vehicleStats.mixOther')} {mixOther}</span>
          </div>
        </div>
      </section>

      <section className="fp-board">
        <div className="fp-command">
          <div className="fp-search-wrap">
            <SearchIcon />
            <input
              className="fp-search"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder={t('admin.vehicleStats.searchPlaceholder')}
              aria-label={t('admin.vehicleStats.searchPlaceholder')}
            />
          </div>
          <div className="fp-periods" role="tablist" aria-label={t('admin.vehicleStats.periodAll')}>
            {PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`fp-period ${filters.period === item.key ? 'is-on' : ''}`}
                onClick={() => setFilters((prev) => applyPeriod(prev, item.key))}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className={`fp-dates${filters.period === 'custom' ? ' is-custom' : ''}`}>
            <DateRangePicker
              variant="split"
              startDate={filters.from}
              endDate={filters.to}
              onChange={setRange}
              minDate={null}
              pickupLabel={t('admin.vehicleStats.rangeFrom')}
              returnLabel={t('admin.vehicleStats.rangeTo')}
              className="fp-range-fields"
            />
          </div>
          <select className="fp-select" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} aria-label={t('admin.vehicleStats.sortBy')}>
            <option value="revenueDesc">{t('admin.vehicleStats.sortRevenueDesc')}</option>
            <option value="revenueAsc">{t('admin.vehicleStats.sortRevenueAsc')}</option>
            <option value="utilDesc">{t('admin.vehicleStats.sortUtilDesc')}</option>
            <option value="utilAsc">{t('admin.vehicleStats.sortUtilAsc')}</option>
            <option value="rentalsDesc">{t('admin.vehicleStats.sortRentalsDesc')}</option>
            <option value="rentalsAsc">{t('admin.vehicleStats.sortRentalsAsc')}</option>
            <option value="upcomingDesc">{t('admin.vehicleStats.sortUpcoming')}</option>
            <option value="maintDesc">{t('admin.vehicleStats.sortMaint')}</option>
            <option value="perfDesc">{t('admin.vehicleStats.sortPerfDesc')}</option>
            <option value="perfAsc">{t('admin.vehicleStats.sortPerfAsc')}</option>
          </select>
          <button type="button" className={`fp-ghost ${filtersOpen ? 'is-on' : ''}`} onClick={() => setFiltersOpen((open) => !open)}>
            {t('admin.vehicleStats.filters')}
            {chips.length ? <em className="fp-filter-count">{chips.length}</em> : null}
          </button>
          {metricsPending ? (
            <span className="fp-live is-busy">{t('admin.vehicleStats.loadingMetrics')}</span>
          ) : filters.from && !filters.to ? (
            <span className="fp-live is-busy">{t('admin.vehicleStats.rangePickEnd')}</span>
          ) : (
            <span className="fp-live">{t('admin.vehicleStats.inspectHint')}</span>
          )}
        </div>

        {filtersOpen ? (
          <div className="fp-filters">
            <div className="fp-field">
              <label htmlFor="fp-vehicle">{t('admin.vehicleStats.filterVehicle')}</label>
              <VehicleSelect
                id="fp-vehicle"
                includeEmpty
                emptyOptionLabel={t('admin.vehicleStats.any')}
                cars={vehicles}
                value={filters.vehicleId}
                onChange={(vehicleId) => setFilter('vehicleId', vehicleId)}
                placeholder={t('admin.vehicleStats.filterVehicle')}
                searchPlaceholder={t('admin.accounting.searchVehicle')}
                emptyLabel={t('admin.ui.noResults')}
              />
            </div>
            <div className="fp-field">
              <label htmlFor="fp-brand">{t('admin.vehicleStats.filterBrand')}</label>
              <select id="fp-brand" className="fp-select" value={filters.brand} onChange={(e) => setFilters((prev) => ({ ...prev, brand: e.target.value, model: '' }))}>
                <option value="">{t('admin.vehicleStats.any')}</option>
                {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label htmlFor="fp-model">{t('admin.vehicleStats.filterModel')}</label>
              <select id="fp-model" className="fp-select" value={filters.model} onChange={(e) => setFilter('model', e.target.value)}>
                <option value="">{t('admin.vehicleStats.any')}</option>
                {models.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label htmlFor="fp-cat">{t('admin.vehicleStats.filterCategory')}</label>
              <select id="fp-cat" className="fp-select" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
                <option value="">{t('admin.vehicleStats.any')}</option>
                {VEHICLE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label htmlFor="fp-status">{t('admin.vehicleStats.filterStatus')}</label>
              <select id="fp-status" className="fp-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">{t('admin.vehicleStats.any')}</option>
                <option value="available">{t('admin.vehicleStats.statusAvailable')}</option>
                <option value="rented">{t('admin.vehicleStats.statusRented')}</option>
                <option value="maintenance">{t('admin.vehicleStats.statusMaintenance')}</option>
                <option value="offline">{t('admin.vehicleStats.statusOffline')}</option>
              </select>
            </div>
            <div className="fp-field">
              <label htmlFor="fp-avail">{t('admin.vehicleStats.filterAvailability')}</label>
              <select id="fp-avail" className="fp-select" value={filters.availability} onChange={(e) => setFilter('availability', e.target.value)}>
                <option value="">{t('admin.vehicleStats.any')}</option>
                <option value="free">{t('admin.vehicleStats.availFree')}</option>
                <option value="booked">{t('admin.vehicleStats.availBooked')}</option>
              </select>
            </div>
            <div className="fp-field">
              <span>{t('admin.vehicleStats.filterUtil')}</span>
              <div className="fp-range">
                <input className="fp-num" type="number" min="0" max="100" placeholder="0" value={filters.utilMin} onChange={(e) => setFilter('utilMin', e.target.value)} />
                <input className="fp-num" type="number" min="0" max="100" placeholder="100" value={filters.utilMax} onChange={(e) => setFilter('utilMax', e.target.value)} />
              </div>
            </div>
            <div className="fp-field">
              <span>{t('admin.vehicleStats.filterRevenue')}</span>
              <div className="fp-range">
                <input className="fp-num" type="number" min="0" placeholder="Min" value={filters.revenueMin} onChange={(e) => setFilter('revenueMin', e.target.value)} />
                <input className="fp-num" type="number" min="0" placeholder="Max" value={filters.revenueMax} onChange={(e) => setFilter('revenueMax', e.target.value)} />
              </div>
            </div>
            <div className="fp-field">
              <label htmlFor="fp-rentals">{t('admin.vehicleStats.filterRentals')}</label>
              <input id="fp-rentals" className="fp-num" type="number" min="0" placeholder="0" value={filters.rentalsMin} onChange={(e) => setFilter('rentalsMin', e.target.value)} />
            </div>
            <div className="fp-field">
              <label htmlFor="fp-maint">{t('admin.vehicleStats.filterMaintenance')}</label>
              <select id="fp-maint" className="fp-select" value={filters.maintenance} onChange={(e) => setFilter('maintenance', e.target.value)}>
                <option value="">{t('admin.vehicleStats.any')}</option>
                <option value="open">{t('admin.vehicleStats.maintOpen')}</option>
                <option value="none">{t('admin.vehicleStats.maintClear')}</option>
              </select>
            </div>
          </div>
        ) : null}

        {(chips.length || rows.length !== vehicles.length) ? (
          <div className="fp-chips">
            {chips.map((chip) => (
              <button key={chip.key} type="button" className="fp-chip" onClick={() => setFilters((prev) => clearChip(prev, chip.key))}>
                {chip.label}
                <span aria-hidden>×</span>
              </button>
            ))}
            {chips.length ? (
              <button type="button" className="fp-chip" onClick={() => setFilters(defaultFilters())}>
                {t('admin.vehicleStats.resetFilters')}
                <span aria-hidden>×</span>
              </button>
            ) : null}
            <span className="fp-count">{t('admin.vehicleStats.showingOf', { shown: rows.length, total: vehicles.length })}</span>
          </div>
        ) : (
          <div className="fp-chips">
            <span className="fp-count">{t('admin.vehicleStats.showingOf', { shown: rows.length, total: vehicles.length })}</span>
          </div>
        )}

        {loading ? (
          <div className="fp-scroller">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>{t('admin.vehicleStats.colVehicle')}</th>
                  <th>{t('admin.vehicleStats.colStatus')}</th>
                  <th className="is-num">{t('admin.vehicleStats.colUtilization')}</th>
                  <th className="is-num">{t('admin.vehicleStats.colRentals')}</th>
                  <th className="is-num">{t('admin.vehicleStats.colRevenue')}</th>
                  <th className="is-num">{t('admin.vehicleStats.colAvgDuration')}</th>
                  <th className="is-num">{t('admin.vehicleStats.colUpcoming')}</th>
                  <th>{t('admin.vehicleStats.colMaintenance')}</th>
                  <th className="is-num">{t('admin.vehicleStats.colPerformance')}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    <td><span className="fp-skel is-wide" /></td>
                    <td><span className="fp-skel is-mid" /></td>
                    <td className="is-num"><span className="fp-skel is-mid" /></td>
                    <td className="is-num"><span className="fp-skel is-mid" /></td>
                    <td className="is-num"><span className="fp-skel is-wide" /></td>
                    <td className="is-num"><span className="fp-skel is-mid" /></td>
                    <td className="is-num"><span className="fp-skel is-mid" /></td>
                    <td><span className="fp-skel is-mid" /></td>
                    <td className="is-num"><span className="fp-skel is-wide" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="fp-empty">
            <h3>{t('admin.vehicleStats.none')}</h3>
          </div>
        ) : rows.length === 0 ? (
          <div className="fp-empty">
            <h3>{t('admin.vehicleStats.emptyFiltered')}</h3>
            <p>{t('admin.vehicleStats.emptyFilteredHint')}</p>
            <button type="button" className="fp-ghost" onClick={() => setFilters(defaultFilters())}>
              {t('admin.vehicleStats.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="fp-scroller">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>{t('admin.vehicleStats.colVehicle')}</th>
                  <th>{t('admin.vehicleStats.colStatus')}</th>
                  <SortHead column="utilization">{t('admin.vehicleStats.colUtilization')}</SortHead>
                  <SortHead column="bookings">{t('admin.vehicleStats.colRentals')}</SortHead>
                  <SortHead column="revenue">{t('admin.vehicleStats.colRevenue')}</SortHead>
                  <th className="is-num">{t('admin.vehicleStats.colAvgDuration')}</th>
                  <SortHead column="upcoming">{t('admin.vehicleStats.colUpcoming')}</SortHead>
                  <SortHead column="maintenance" numeric={false}>{t('admin.vehicleStats.colMaintenance')}</SortHead>
                  <SortHead column="score">{t('admin.vehicleStats.colPerformance')}</SortHead>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const ready = Boolean(row.stats) || !metricsPending
                  const watch = needsAttention(row)
                  return (
                    <tr
                      key={row.car._id}
                      className={String(selectedId) === String(row.car._id) ? 'is-on' : ''}
                      onClick={() => openVehicle(row.car._id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVehicle(row.car._id) } }}
                      tabIndex={0}
                    >
                      <td>
                        <div className="fp-car">
                          <img
                            src={row.car.image || fallbackImage}
                            alt=""
                            onError={(e) => { e.currentTarget.src = fallbackImage }}
                          />
                          <div className="min-w-0">
                            <div className="fp-car-name">{row.car.brand} {row.car.model}</div>
                            <div className="fp-car-meta">{row.car.licensePlate || row.car.fleetId || '—'} · {row.car.category || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`fp-status is-${row.status}`}>
                          <span className={`fp-dot is-${row.status}`} />
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="is-num">
                        {metricCell(ready, (
                          <div className={`fp-util ${row.utilization < 25 ? 'is-low' : row.utilization < 50 ? 'is-mid' : ''}`}>
                            <div className="fp-util-track">
                              <div className="fp-util-fill" style={{ width: `${Math.min(100, row.utilization)}%` }} />
                            </div>
                            <span>{row.utilization.toFixed(1)}%</span>
                          </div>
                        ))}
                      </td>
                      <td className="is-num">{metricCell(ready, row.bookings)}</td>
                      <td className="is-num">
                        {metricCell(ready, <span className="fp-money">{money(row.revenue, currency, language)}</span>)}
                      </td>
                      <td className="is-num">
                        {metricCell(ready, <span className="fp-muted-num">{t('admin.vehicleStats.daysShort', { n: row.avgDays.toFixed(1) })}</span>)}
                      </td>
                      <td className="is-num">{metricCell(ready, row.upcoming || <span className="fp-muted-num">—</span>)}</td>
                      <td>
                        {metricCell(ready, row.maintenanceOpen
                          ? <span className="fp-badge is-watch">{t('admin.vehicleStats.maintOpen')}</span>
                          : <span className="fp-muted-num">{row.maintenanceCount || '—'}</span>)}
                      </td>
                      <td className="is-num">
                        {metricCell(ready, (
                          <div className="fp-score">
                            {watch ? <span className="fp-pip" title={t('admin.vehicleStats.rankWatch')} /> : null}
                            {index < 3 && filters.sort === 'perfDesc' ? <span className="fp-badge is-top">{t('admin.vehicleStats.rankTop')}</span> : null}
                            <strong>{row.score}</strong>
                            <Spark values={row.spark} />
                          </div>
                        ), <span className="fp-skel is-wide" />)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <VehiclePerformanceDrawer
        open={Boolean(selectedCar)}
        onClose={() => openVehicle(null)}
        car={selectedCar}
        stats={selectedCar ? statsMap[selectedCar._id] : null}
        loading={metricsPending && selectedCar && !statsMap[selectedCar._id]}
      />
    </AdminPage>
  )
}

export default VehicleStatsListPage

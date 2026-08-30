const FILTER_KEY = 'hdn.fleetPerformance.filters'

export const defaultFilters = () => ({
  search: '',
  vehicleId: '',
  brand: '',
  model: '',
  category: '',
  status: '',
  availability: '',
  utilMin: '',
  utilMax: '',
  revenueMin: '',
  revenueMax: '',
  rentalsMin: '',
  maintenance: '',
  attention: false,
  period: 'all',
  sort: 'revenueDesc',
})

export const loadSavedFilters = () => {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY)
    if (!raw) return defaultFilters()
    return { ...defaultFilters(), ...JSON.parse(raw) }
  } catch {
    return defaultFilters()
  }
}

export const saveFilters = (filters) => {
  try {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters))
  } catch {
    /* ignore quota / private mode */
  }
}

export const parsePct = (value) => {
  const n = Number(String(value ?? '').replace('%', '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const parseDays = (value) => {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export const last = (list) => (Array.isArray(list) && list.length ? list[list.length - 1] : null)

export const opsStatus = (car, stats) => {
  if (car?.status === 'maintenance') return 'maintenance'
  if (Number(stats?.overview?.activeBookings || 0) > 0) return 'rented'
  if (car?.isAvaliable) return 'available'
  return 'offline'
}

export const hasOpenMaintenance = (stats) =>
  (stats?.maintenanceHistory || []).some((record) => {
    const status = String(record.status || '').toLowerCase()
    return status === 'scheduled' || status === 'in_progress'
  })

export const periodMetrics = (stats, period) => {
  const overview = stats?.overview || {}
  const analytics = stats?.analytics || {}
  if (period === 'month') {
    return {
      revenue: Number(overview.monthlyRevenue || 0),
      bookings: Number(last(analytics.bookingsByMonth)?.bookings || 0),
      utilization: parsePct(last(analytics.occupancyByMonth)?.occupancyRate),
    }
  }
  if (period === 'year') {
    return {
      revenue: Number(overview.yearlyRevenue || 0),
      bookings: Number(last(analytics.bookingsByYear)?.bookings || 0),
      utilization: parsePct(last(analytics.occupancyByYear)?.occupancyRate),
    }
  }
  return {
    revenue: Number(overview.totalRevenue || 0),
    bookings: Number(overview.totalBookings || 0),
    utilization: parsePct(overview.utilizationRate),
  }
}

export const buildRow = (car, stats, period) => {
  const metrics = periodMetrics(stats, period)
  const overview = stats?.overview || {}
  return {
    car,
    stats,
    status: opsStatus(car, stats),
    utilization: metrics.utilization,
    bookings: metrics.bookings,
    revenue: metrics.revenue,
    avgDays: parseDays(overview.averageRentalDuration),
    upcoming: (stats?.upcomingReservations || []).length,
    maintenanceOpen: hasOpenMaintenance(stats),
    maintenanceCount: (stats?.maintenanceHistory || []).length,
    activeBookings: Number(overview.activeBookings || 0),
    outstanding: Number(overview.outstandingBalance || 0),
    spark: (stats?.monthlyPerformance || []).map((item) => Number(item.revenue || 0)),
  }
}

export const scoreRows = (rows) => {
  const maxRev = Math.max(...rows.map((row) => row.revenue), 1)
  const maxBook = Math.max(...rows.map((row) => row.bookings), 1)
  return rows.map((row) => {
    const score = Math.round(
      (Math.min(row.utilization, 100) / 100) * 40
      + (row.revenue / maxRev) * 40
      + (row.bookings / maxBook) * 20,
    )
    return { ...row, score }
  })
}

export const needsAttention = (row) => {
  if (row.status === 'maintenance' || row.status === 'offline' || row.maintenanceOpen) return true
  if (!row.stats) return false
  return row.utilization < 20 || row.outstanding > 0
}

export const matchesFilters = (row, filters) => {
  const hay = [
    row.car.brand,
    row.car.model,
    row.car.licensePlate,
    row.car.fleetId,
    row.car.category,
    row.car.year,
  ].join(' ').toLowerCase()
  if (filters.search && !hay.includes(filters.search.trim().toLowerCase())) return false
  if (filters.vehicleId && String(row.car._id) !== String(filters.vehicleId)) return false
  if (filters.brand && String(row.car.brand || '') !== filters.brand) return false
  if (filters.model && String(row.car.model || '') !== filters.model) return false
  if (filters.category && String(row.car.category || '') !== filters.category) return false
  if (filters.status && row.status !== filters.status) return false
  if (filters.availability === 'free' && (row.status === 'rented' || row.status === 'maintenance')) return false
  if (filters.availability === 'booked' && row.status !== 'rented') return false
  if (filters.utilMin !== '' && row.utilization < Number(filters.utilMin)) return false
  if (filters.utilMax !== '' && row.utilization > Number(filters.utilMax)) return false
  if (filters.revenueMin !== '' && row.revenue < Number(filters.revenueMin)) return false
  if (filters.revenueMax !== '' && row.revenue > Number(filters.revenueMax)) return false
  if (filters.rentalsMin !== '' && row.bookings < Number(filters.rentalsMin)) return false
  if (filters.maintenance === 'open' && !row.maintenanceOpen) return false
  if (filters.maintenance === 'none' && row.maintenanceOpen) return false
  if (filters.attention && !needsAttention(row)) return false
  return true
}

const SORTS = {
  revenueDesc: (a, b) => b.revenue - a.revenue,
  revenueAsc: (a, b) => a.revenue - b.revenue,
  utilDesc: (a, b) => b.utilization - a.utilization,
  utilAsc: (a, b) => a.utilization - b.utilization,
  rentalsDesc: (a, b) => b.bookings - a.bookings,
  rentalsAsc: (a, b) => a.bookings - b.bookings,
  upcomingDesc: (a, b) => b.upcoming - a.upcoming,
  maintDesc: (a, b) => Number(b.maintenanceOpen) - Number(a.maintenanceOpen) || b.maintenanceCount - a.maintenanceCount,
  perfDesc: (a, b) => b.score - a.score,
  perfAsc: (a, b) => a.score - b.score,
}

export const SORT_KEYS = Object.keys(SORTS)

export const sortRows = (rows, sort) => {
  const compare = SORTS[sort] || SORTS.revenueDesc
  return [...rows].sort((a, b) => compare(a, b) || String(a.car.brand).localeCompare(String(b.car.brand)))
}

export const activeFilterChips = (filters, t, vehicles) => {
  const chips = []
  const add = (key, label) => chips.push({ key, label })
  const statusLabel = {
    available: t('admin.vehicleStats.statusAvailable'),
    rented: t('admin.vehicleStats.statusRented'),
    offline: t('admin.vehicleStats.statusOffline'),
    maintenance: t('admin.vehicleStats.statusMaintenance'),
  }
  if (filters.search) add('search', `"${filters.search}"`)
  if (filters.vehicleId) {
    const car = vehicles.find((item) => String(item._id) === String(filters.vehicleId))
    add('vehicleId', car ? `${car.brand} ${car.model}` : t('admin.vehicleStats.filterVehicle'))
  }
  if (filters.brand) add('brand', filters.brand)
  if (filters.model) add('model', filters.model)
  if (filters.category) add('category', filters.category)
  if (filters.status) add('status', statusLabel[filters.status] || filters.status)
  if (filters.availability) add('availability', t(`admin.vehicleStats.avail${filters.availability === 'free' ? 'Free' : 'Booked'}`))
  if (filters.utilMin !== '' || filters.utilMax !== '') {
    add('util', `${filters.utilMin || 0}–${filters.utilMax || 100}%`)
  }
  if (filters.revenueMin !== '' || filters.revenueMax !== '') {
    add('revenue', `${filters.revenueMin || 0}–${filters.revenueMax || '∞'}`)
  }
  if (filters.rentalsMin !== '') add('rentalsMin', `≥ ${filters.rentalsMin}`)
  if (filters.maintenance) add('maintenance', t(`admin.vehicleStats.maint${filters.maintenance === 'open' ? 'Open' : 'Clear'}`))
  if (filters.attention) add('attention', t('admin.vehicleStats.kpiAttention'))
  return chips
}

export const clearChip = (filters, key) => {
  const next = { ...filters }
  if (key === 'util') {
    next.utilMin = ''
    next.utilMax = ''
  } else if (key === 'revenue') {
    next.revenueMin = ''
    next.revenueMax = ''
  } else if (key === 'attention') {
    next.attention = false
  } else {
    next[key] = key === 'search' || key === 'vehicleId' || key === 'brand' || key === 'model' || key === 'category' || key === 'status' || key === 'availability' || key === 'maintenance' ? '' : defaultFilters()[key]
  }
  return next
}

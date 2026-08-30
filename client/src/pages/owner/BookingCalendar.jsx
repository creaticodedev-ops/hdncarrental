import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Title from '../../components/owner/Title'
import ChannelBadge from '../../components/owner/ChannelBadge'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { AdminDrawer } from '../../admin/ui'
import {
  MONTHS,
  WEEKDAYS,
  addDays,
  addMonths,
  buildMonthCells,
  sameDay,
  startOfDay,
  startOfWeek,
} from '../../components/calendar/calendarUtils'
import { formatTime, vehicleLabel } from '../../components/owner/bookings/reservationHelpers'
import '../../components/calendar/calendar.css'
import '../../components/calendar/opsCalendar.css'

const monthName = (date, lang) => (MONTHS[lang] || MONTHS.en)[date.getMonth()]

const VIEWS = ['month', 'week', 'day', 'list']
const LENSES = ['all', 'pickups', 'returns', 'onrent']
const MONTH_VISIBLE = 2

const toneOf = (status) => {
  if (status === 'pending') return 'is-pending'
  if (status === 'confirmed') return 'is-confirmed'
  if (status === 'ready_for_pickup') return 'is-ready'
  if (status === 'active') return 'is-active'
  if (status === 'completed') return 'is-done'
  return 'is-other'
}

const dayRole = (booking, date) => {
  const start = startOfDay(new Date(booking.pickupDate))
  const end = startOfDay(new Date(booking.returnDate))
  const d = startOfDay(date)
  if (sameDay(d, start) && sameDay(d, end)) return 'same'
  if (sameDay(d, start)) return 'pickup'
  if (sameDay(d, end)) return 'return'
  return 'stay'
}

const matchesLens = (booking, date, lens) => {
  if (lens === 'all') return true
  const role = dayRole(booking, date)
  if (lens === 'pickups') return role === 'pickup' || role === 'same'
  if (lens === 'returns') return role === 'return' || role === 'same'
  if (lens === 'onrent') return role === 'stay' || booking.status === 'active'
  return true
}

const matchesQuery = (booking, q) => {
  if (!q) return true
  const hay = [
    booking.reservationId,
    booking.customerName,
    booking.car?.brand,
    booking.car?.model,
    booking.status,
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

const Chevron = ({ dir }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
  </svg>
)

const Chip = ({ booking, date, language, onOpen }) => {
  const role = dayRole(booking, date)
  const timeSrc = role === 'return' ? booking.returnDate : booking.pickupDate
  const time = formatTime(timeSrc, language)
  const car = vehicleLabel(booking.car)
  const mark = role === 'return' ? '↓' : role === 'stay' ? '·' : '↑'
  return (
    <button
      type="button"
      className={`hdn-ops-chip ${toneOf(booking.status)}`}
      title={`${booking.customerName || ''} · ${car}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(booking)
      }}
    >
      <span className="hdn-ops-chip-dot" />
      <span className="hdn-ops-chip-txt">
        {mark} {time} {car}
      </span>
    </button>
  )
}

const BookingCalendar = () => {
  const { axios, currency, hasPermission } = useAppContext()
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const now = startOfDay(new Date())
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(now)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [dayFocus, setDayFocus] = useState(null)
  const [lens, setLens] = useState('all')
  const [query, setQuery] = useState('')

  const month = cursor.getMonth() + 1
  const year = cursor.getFullYear()
  const weekdays = WEEKDAYS[language] || WEEKDAYS.en
  const q = query.trim().toLowerCase()

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true)
      try {
        const months = view === 'month'
          ? [month]
          : [month === 1 ? 12 : month - 1, month, month === 12 ? 1 : month + 1]
        const yearsFor = months.map((m, i) => {
          if (view === 'month') return year
          if (i === 0 && month === 1) return year - 1
          if (i === 2 && month === 12) return year + 1
          return year
        })

        const responses = await Promise.all(
          [...new Set(months.map((m, i) => `${yearsFor[i]}-${m}`))].map(async (key) => {
            const [y, m] = key.split('-').map(Number)
            const { data } = await axios.get(`/api/bookings/owner/calendar?month=${m}&year=${y}`)
            return data.success ? data.bookings : []
          }),
        )
        const merged = []
        const seen = new Set()
        for (const list of responses) {
          for (const b of list) {
            if (!seen.has(b._id)) {
              seen.add(b._id)
              merged.push(b)
            }
          }
        }
        setBookings(merged)
      } catch (error) {
        toast.error(getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }
    fetchCalendar()
  }, [month, year, view, axios])

  const shift = (delta) => {
    if (view === 'month' || view === 'list') setCursor((d) => addMonths(d, delta))
    else if (view === 'week') setCursor((d) => addDays(d, delta * 7))
    else setCursor((d) => addDays(d, delta))
  }

  const bookingsOnDay = useCallback((date) => {
    const dayStart = startOfDay(date)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)
    return bookings.filter((b) => {
      const start = new Date(b.pickupDate)
      const end = new Date(b.returnDate)
      if (!(start <= dayEnd && end >= dayStart)) return false
      if (!matchesLens(b, date, lens)) return false
      return matchesQuery(b, q)
    })
  }, [bookings, lens, q])

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [cursor])

  const monthCells = useMemo(
    () => buildMonthCells(year, cursor.getMonth()),
    [year, cursor],
  )

  const headerLabel = useMemo(() => {
    const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'
    if (view === 'week') {
      return `${weekDays[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    if (view === 'day') {
      return cursor.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    return `${monthName(cursor, language)} ${year}`
  }, [view, cursor, weekDays, language, year])

  const kpis = useMemo(() => {
    const pickups = bookings.filter((b) => sameDay(startOfDay(new Date(b.pickupDate)), now) && matchesQuery(b, q))
    const returns = bookings.filter((b) => sameDay(startOfDay(new Date(b.returnDate)), now) && matchesQuery(b, q))
    const onRent = bookings.filter((b) => {
      if (!matchesQuery(b, q)) return false
      const start = startOfDay(new Date(b.pickupDate))
      const end = startOfDay(new Date(b.returnDate))
      return start <= now && end >= now && b.status !== 'completed' && b.status !== 'cancelled'
    })
    const monthBookings = bookings.filter((b) => {
      const start = new Date(b.pickupDate)
      const end = new Date(b.returnDate)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
      return start <= monthEnd && end >= monthStart && matchesQuery(b, q)
    })
    const revenue = monthBookings.reduce((sum, b) => sum + Number(b.price || 0), 0)
    return {
      month: monthBookings.length,
      pickups: pickups.length,
      onRent: onRent.length,
      returns: returns.length,
      revenue,
    }
  }, [bookings, now, month, year, q])

  const dayDesk = useMemo(() => {
    const list = bookingsOnDay(cursor)
    return {
      pickups: list.filter((b) => {
        const r = dayRole(b, cursor)
        return r === 'pickup' || r === 'same'
      }),
      onrent: list.filter((b) => dayRole(b, cursor) === 'stay' || b.status === 'active'),
      returns: list.filter((b) => {
        const r = dayRole(b, cursor)
        return r === 'return' || r === 'same'
      }),
    }
  }, [bookings, cursor, lens, q])

  const listGroups = useMemo(() => {
    const map = new Map()
    monthCells.forEach(({ date, inMonth }) => {
      if (!inMonth) return
      const items = bookingsOnDay(date)
      if (!items.length) return
      map.set(date.toISOString(), { date, items })
    })
    return [...map.values()]
  }, [monthCells, bookings, lens, q])

  const openDay = (date) => {
    setCursor(date)
    setView('day')
  }

  const money = (n) =>
    `${Number(n || 0).toLocaleString(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB', { maximumFractionDigits: 0 })} ${currency || 'MAD'}`

  const renderDayStack = (date, max = MONTH_VISIBLE) => {
    const items = bookingsOnDay(date)
    return (
      <>
        {items.slice(0, max).map((b) => (
          <Chip key={b._id} booking={b} date={date} language={language} onOpen={setSelected} />
        ))}
        {items.length > max ? (
          <button
            type="button"
            className="hdn-ops-more"
            onClick={(e) => {
              e.stopPropagation()
              setDayFocus(date)
            }}
          >
            {t('admin.calendar.more', { count: items.length - max })}
          </button>
        ) : null}
      </>
    )
  }

  const AgendaCard = ({ booking }) => (
    <button type="button" className="hdn-ops-card" onClick={() => setSelected(booking)}>
      <div className="hdn-ops-card-top">
        <span className="hdn-ops-card-car">{vehicleLabel(booking.car)}</span>
        <span className={`hdn-ops-chip ${toneOf(booking.status)}`} style={{ width: 'auto' }}>
          {(() => {
            const key = `admin.bookings.statuses.${booking.status}`
            const label = t(key)
            return label === key ? booking.status : label
          })()}
        </span>
      </div>
      <p className="hdn-ops-card-sub">
        {booking.customerName || '—'} · {formatTime(booking.pickupDate, language)} → {formatTime(booking.returnDate, language)}
      </p>
    </button>
  )

  return (
    <div className="admin-page-pad flex-1 pb-10 hdn-ops">
      <Title
        title={t('admin.calendar.title')}
        subTitle={t('admin.calendar.subtitle')}
        primaryAction={
          hasPermission?.('bookings') ? (
            <Link to="/owner/walk-in" className="admin-btn admin-btn-primary">
              {t('admin.calendar.newReservation')}
            </Link>
          ) : null
        }
      />

      <div className="hdn-ops-kpis">
        <button type="button" className="hdn-ops-kpi" onClick={() => { setLens('all'); setView('month') }}>
          <span className="hdn-ops-kpi-ico">▣</span>
          <span>
            <span className="hdn-ops-kpi-val">{kpis.month}</span>
            <span className="hdn-ops-kpi-lab">{t('admin.calendar.kpiMonth')}</span>
          </span>
        </button>
        <button
          type="button"
          className={`hdn-ops-kpi${lens === 'pickups' ? ' is-on' : ''}`}
          onClick={() => { setLens('pickups'); setCursor(now); setView('day') }}
        >
          <span className="hdn-ops-kpi-ico">↑</span>
          <span>
            <span className="hdn-ops-kpi-val">{kpis.pickups}</span>
            <span className="hdn-ops-kpi-lab">{t('admin.calendar.kpiPickups')}</span>
          </span>
        </button>
        <button
          type="button"
          className={`hdn-ops-kpi${lens === 'onrent' ? ' is-on' : ''}`}
          onClick={() => { setLens('onrent'); setCursor(now); setView('day') }}
        >
          <span className="hdn-ops-kpi-ico">●</span>
          <span>
            <span className="hdn-ops-kpi-val">{kpis.onRent}</span>
            <span className="hdn-ops-kpi-lab">{t('admin.calendar.kpiOnRent')}</span>
          </span>
        </button>
        <button
          type="button"
          className={`hdn-ops-kpi${lens === 'returns' ? ' is-on' : ''}`}
          onClick={() => { setLens('returns'); setCursor(now); setView('day') }}
        >
          <span className="hdn-ops-kpi-ico">↓</span>
          <span>
            <span className="hdn-ops-kpi-val">{kpis.returns}</span>
            <span className="hdn-ops-kpi-lab">{t('admin.calendar.kpiReturns')}</span>
          </span>
        </button>
        <div className="hdn-ops-kpi" style={{ cursor: 'default' }}>
          <span className="hdn-ops-kpi-ico">◊</span>
          <span>
            <span className="hdn-ops-kpi-val">{money(kpis.revenue)}</span>
            <span className="hdn-ops-kpi-lab">{t('admin.calendar.kpiRevenue')}</span>
          </span>
        </div>
      </div>

      <div className="hdn-ops-shell mt-4">
        <div className="hdn-ops-toolbar">
          <div className="hdn-ops-views">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                className={`hdn-ops-view${view === v ? ' is-on' : ''}`}
                onClick={() => setView(v)}
              >
                {t(`admin.calendar.${v}`)}
              </button>
            ))}
          </div>

          <div className="hdn-ops-nav">
            <button type="button" className="hdn-cal-icon-btn" onClick={() => shift(-1)} aria-label={t('admin.calendar.prev')}>
              <Chevron dir="prev" />
            </button>
            <h2 className="hdn-ops-title">{headerLabel}</h2>
            <button type="button" className="hdn-cal-icon-btn" onClick={() => shift(1)} aria-label={t('admin.calendar.next')}>
              <Chevron dir="next" />
            </button>
          </div>

          <div className="hdn-ops-tools">
            <button type="button" className="hdn-ops-ghost" onClick={() => { setCursor(now); setView(view === 'list' ? 'month' : view) }}>
              {t('admin.calendar.today')}
            </button>
            <input
              className="hdn-ops-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('admin.calendar.search')}
            />
          </div>
        </div>

        <div className="hdn-ops-lenses">
          {LENSES.map((key) => (
            <button
              key={key}
              type="button"
              className={`hdn-ops-lens${lens === key ? ' is-on' : ''}`}
              onClick={() => setLens(key)}
            >
              {t(`admin.calendar.lens.${key}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="hdn-ops-skel">{t('admin.calendar.loading')}</p>
        ) : (
          <div className="hdn-ops-body">
            {view === 'month' ? (
              <div className="hdn-ops-scroll">
                <div className="hdn-ops-weekdays">
                  {weekdays.map((d) => (
                    <div key={d} className="hdn-ops-weekday">{d}</div>
                  ))}
                </div>
                <div className="hdn-ops-month">
                  {monthCells.map(({ date, inMonth }) => {
                    const items = bookingsOnDay(date)
                    const isToday = sameDay(date, now)
                    const isFocus = sameDay(date, cursor)
                    return (
                      <div
                        key={date.toISOString()}
                        className={`hdn-ops-cell${inMonth ? '' : ' is-out'}${isToday ? ' is-today' : ''}${isFocus && !isToday ? ' is-focus' : ''}`}
                        onClick={() => openDay(date)}
                      >
                        <div className="hdn-ops-cell-top">
                          <span className="hdn-ops-num">{date.getDate()}</span>
                          {items.length ? <span className="hdn-ops-count">{items.length}</span> : null}
                        </div>
                        {renderDayStack(date)}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {view === 'week' ? (
              <div className="hdn-ops-week">
                {weekDays.map((date) => {
                  const items = bookingsOnDay(date)
                  return (
                    <div key={date.toISOString()} className={`hdn-ops-week-col${sameDay(date, now) ? ' is-today' : ''}`}>
                      <button type="button" className="w-full text-left cursor-pointer" onClick={() => openDay(date)}>
                        <p className="hdn-ops-week-kicker">{date.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short' })}</p>
                        <p className="hdn-ops-week-num">{date.getDate()}</p>
                      </button>
                      <div className="space-y-1">
                        {items.length ? renderDayStack(date, 6) : <p className="hdn-ops-empty">—</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}

            {view === 'day' ? (
              <div className="hdn-ops-desk">
                <section className="hdn-ops-col">
                  <h3>{t('admin.calendar.colPickups')} · {dayDesk.pickups.length}</h3>
                  {dayDesk.pickups.map((b) => <AgendaCard key={b._id} booking={b} />)}
                  {!dayDesk.pickups.length ? <p className="hdn-ops-empty">{t('admin.calendar.noneHere')}</p> : null}
                </section>
                <section className="hdn-ops-col">
                  <h3>{t('admin.calendar.colOnRent')} · {dayDesk.onrent.length}</h3>
                  {dayDesk.onrent.map((b) => <AgendaCard key={`r-${b._id}`} booking={b} />)}
                  {!dayDesk.onrent.length ? <p className="hdn-ops-empty">{t('admin.calendar.noneHere')}</p> : null}
                </section>
                <section className="hdn-ops-col">
                  <h3>{t('admin.calendar.colReturns')} · {dayDesk.returns.length}</h3>
                  {dayDesk.returns.map((b) => <AgendaCard key={`t-${b._id}`} booking={b} />)}
                  {!dayDesk.returns.length ? <p className="hdn-ops-empty">{t('admin.calendar.noneHere')}</p> : null}
                </section>
              </div>
            ) : null}

            {view === 'list' ? (
              <div className="hdn-ops-list">
                {!listGroups.length ? <p className="hdn-ops-empty">{t('admin.calendar.noMonth')}</p> : null}
                {listGroups.map(({ date, items }) => (
                  <div key={date.toISOString()}>
                    <h3 className="hdn-ops-list-day">
                      {date.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </h3>
                    {items.map((b) => <AgendaCard key={b._id} booking={b} />)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="hdn-ops-legend">
          <span><i style={{ background: '#f59e0b' }} /> {t('admin.calendar.legendPending')}</span>
          <span><i style={{ background: '#0ea5e9' }} /> {t('admin.calendar.legendConfirmed')}</span>
          <span><i style={{ background: '#8f1f1f' }} /> {t('admin.calendar.legendReady')}</span>
          <span><i style={{ background: '#10b981' }} /> {t('admin.calendar.legendActive')}</span>
          <span>↑ {t('admin.calendar.legendPickup')} · ↓ {t('admin.calendar.legendReturn')}</span>
        </div>
      </div>

      <AdminDrawer
        open={Boolean(dayFocus)}
        onClose={() => setDayFocus(null)}
        title={dayFocus ? dayFocus.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
        closeLabel={t('admin.ui.close')}
      >
        {dayFocus ? (
          <div>
            {bookingsOnDay(dayFocus).map((b) => <AgendaCard key={b._id} booking={b} />)}
            {!bookingsOnDay(dayFocus).length ? <p className="hdn-ops-empty">{t('admin.calendar.noDay')}</p> : null}
          </div>
        ) : null}
      </AdminDrawer>

      <AdminDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.reservationId || t('admin.bookings.reservation')}
        closeLabel={t('admin.ui.close')}
        footer={
          <>
            <button type="button" onClick={() => setSelected(null)} className="admin-btn admin-btn-secondary">
              {t('admin.calendar.close')}
            </button>
            {selected ? (
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => navigate(`/owner/manage-bookings?bookingId=${selected._id}`)}
              >
                {t('admin.calendar.openReservation')}
              </button>
            ) : null}
          </>
        }
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <ChannelBadge channel={selected.channel || 'online'} />
            <p><span className="font-medium">{t('admin.bookings.customer')}:</span> {selected.customerName || '—'}</p>
            <p><span className="font-medium">{t('admin.bookings.vehicle')}:</span> {vehicleLabel(selected.car)}</p>
            <p><span className="font-medium">{t('admin.walkIn.pickup')}:</span> {new Date(selected.pickupDate).toLocaleString()}</p>
            <p><span className="font-medium">{t('admin.walkIn.return')}:</span> {new Date(selected.returnDate).toLocaleString()}</p>
            <p><span className="font-medium">{t('admin.bookings.status')}:</span> <span className="capitalize">{selected.status}</span></p>
          </div>
        )}
      </AdminDrawer>
    </div>
  )
}

export default BookingCalendar

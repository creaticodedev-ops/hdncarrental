import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { DEFAULT_AIRPORT, MOROCCO_AIRPORTS, pickupCityForAirport } from '../data/moroccoAirports'
import { requestBookingPrefill } from '../utils/bookingPrefill'
import { useFlightBoard } from './flights/useFlightBoard'
import './flights/flightBoard.css'

const ROTATE_MS = 7000
const STALE_AFTER_MS = 20 * 60_000
const MAX_FLIGHTS = 24
const TICKER_ITEMS = 8
const MOROCCO_TZ = 'Africa/Casablanca'
const LOCALES = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' }
const COMPLETED = new Set(['arrived', 'departed'])
const TONES = {
  checkIn: 'info',
  enRoute: 'info',
  boarding: 'active',
  approaching: 'active',
  arrived: 'good',
  departed: 'good',
  delayed: 'warn',
  gateClosed: 'warn',
  canceledUncertain: 'warn',
  canceled: 'bad',
  diverted: 'bad',
}

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setMatches(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])
  return matches
}

const usePageVisible = () => {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  return visible
}

/** Flights still worth showing: upcoming, plus recent arrivals/departures for a short grace period. */
const relevantFlights = (list, now, direction) => {
  const graceMs = (direction === 'arrivals' ? 45 : 30) * 60_000
  const current = list.filter((f) => Date.parse(f.estimated || f.scheduled) >= now - graceMs)
  return (current.length ? current : list).slice(0, MAX_FLIGHTS)
}

const formatPlace = (value, prefix) => {
  if (!value) return null
  return /^\d+$/.test(value) ? `${prefix}${value}` : value
}

const AirlineMark = ({ airline }) => {
  const [failed, setFailed] = useState(false)
  const code = airline.iata || airline.icao || ''
  if (!airline.logoUrl || failed) {
    return <span className="fb-mark is-mono" aria-hidden="true">{code || '—'}</span>
  }
  return (
    <span className="fb-mark" aria-hidden="true">
      <img
        src={airline.logoUrl}
        alt=""
        width="60"
        height="20"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  )
}

const PlaneGlyph = ({ direction }) => (
  <svg className={`fb-tab-glyph is-${direction}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1 4-4.5c.9-1 2.6-1.3 3.2-.7.6.6.3 2.3-.7 3.2l-4.5 4 1 7.5L13.5 21 11 13.5" />
  </svg>
)

const Banner = () => {
  const { t, language } = useI18n()
  const { axios, pickupLocations } = useAppContext()
  const sectionRef = useRef(null)
  const tabRefs = useRef({})

  const [iata, setIata] = useState(DEFAULT_AIRPORT)
  const [direction, setDirection] = useState('arrivals')
  const [page, setPage] = useState(0)
  const [userPaused, setUserPaused] = useState(null)
  const [hold, setHold] = useState(false)
  const [cycle, setCycle] = useState(0)
  const boardRef = useRef(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
  const [now, setNow] = useState(() => Date.now())

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isWide = useMediaQuery('(min-width: 768px)')
  const pageVisible = usePageVisible()
  const active = inView && pageVisible

  const { board, error, loading, retry } = useFlightBoard(axios, iata, active)

  useEffect(() => {
    const node = sectionRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '160px 0px' })
    io.observe(node)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!active) return undefined
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [active])

  const fmt = useMemo(() => {
    const locale = LOCALES[language] || 'en-GB'
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: MOROCCO_TZ })
    const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: MOROCCO_TZ })
    return {
      time: (iso) => (iso ? time.format(new Date(iso)) : '—'),
      stamp: (iso, nowMs) => {
        const date = new Date(iso)
        return nowMs - date.getTime() > 12 * 3600_000 ? `${day.format(date)} ${time.format(date)}` : time.format(date)
      },
    }
  }, [language])

  const airport = MOROCCO_AIRPORTS.find((a) => a.iata === iata) || MOROCCO_AIRPORTS[0]
  const pickupCities = useMemo(() => [...new Set(pickupLocations.map((l) => l.city).filter(Boolean))], [pickupLocations])
  const pickupCity = pickupCityForAirport(airport, pickupCities)

  const lists = useMemo(() => ({
    arrivals: board ? relevantFlights(board.arrivals || [], now, 'arrivals') : [],
    departures: board ? relevantFlights(board.departures || [], now, 'departures') : [],
  }), [board, now])

  const other = direction === 'arrivals' ? 'departures' : 'arrivals'
  const flights = lists[direction]
  const rowsPerPage = isWide ? 6 : 4
  const pageCount = Math.max(1, Math.ceil(flights.length / rowsPerPage))
  const safePage = Math.min(page, pageCount - 1)
  const pageFlights = flights.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage)

  const paused = userPaused ?? reducedMotion
  const otherCount = lists[other].length
  const canRotate = pageCount > 1 || otherCount > 0
  const running = Boolean(board) && active && canRotate && !paused && !hold

  useEffect(() => {
    if (!running) return undefined
    const id = window.setTimeout(() => {
      if (boardRef.current?.querySelector(':focus-visible')) {
        setCycle((n) => n + 1)
        return
      }
      if (safePage + 1 < pageCount) {
        setPage(safePage + 1)
        return
      }
      if (otherCount) setDirection(other)
      setPage(0)
    }, ROTATE_MS)
    return () => window.clearTimeout(id)
  }, [running, safePage, pageCount, other, otherCount, cycle])

  const ageMs = board ? now - Date.parse(board.fetchedAt) : 0
  const isStale = Boolean(board) && (board.stale || Boolean(error) || ageMs > STALE_AFTER_MS)
  const mode = !board
    ? (error ? 'offline' : 'loading')
    : isStale ? 'stale' : board.hasLiveData ? 'live' : 'schedule'
  const modeLabel = {
    live: t('flights.live'),
    schedule: t('flights.schedule'),
    stale: t('flights.stale'),
    offline: t('flights.offline'),
    loading: t('flights.connecting'),
  }[mode]

  const statusLabel = (f) => (f.statusKey === 'other' ? f.status : t(`flights.status.${f.statusKey}`))

  const revisedLabel = (f) => {
    if (!f.estimated || f.statusKey === 'canceled') return null
    if (COMPLETED.has(f.statusKey)) return t('flights.actual', { time: fmt.time(f.estimated) })
    if (Math.abs(f.delayMinutes || 0) < 1) return null
    return t('flights.estimated', { time: fmt.time(f.estimated) })
  }

  const placeLabel = (f) => {
    if (direction === 'departures' && f.gate) return `${t('flights.gate')} ${f.gate}`
    if (direction === 'arrivals' && f.baggageBelt) return `${t('flights.belt')} ${f.baggageBelt}`
    return formatPlace(f.terminal, 'T') || '—'
  }

  const selectDirection = (next) => {
    setDirection(next)
    setPage(0)
  }

  const onTabKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    selectDirection(other)
    tabRefs.current[other]?.focus()
  }

  const onAirportChange = (event) => {
    setIata(event.target.value)
    setPage(0)
  }

  const handlePickup = () => {
    requestBookingPrefill({ city: pickupCity, airport: airport.iata, source: 'flight-board' })
  }

  const tickerItems = flights.slice(0, TICKER_ITEMS)
  const placeHeading = direction === 'arrivals' ? t('flights.from') : t('flights.to')
  const panelId = 'fb-panel'
  const blanks = Math.max(0, rowsPerPage - pageFlights.length)

  const renderTicker = () => (
    <div className="fb-ticker" aria-hidden="true">
      <div
        className={`fb-ticker-track${running ? '' : ' is-paused'}`}
        style={{ '--fb-ticker-dur': `${tickerItems.length * 4.5}s` }}
      >
        {[0, 1].map((copy) => (
          <span className="fb-ticker-set" key={copy}>
            {tickerItems.map((f) => (
              <span className="fb-tick" key={`${copy}-${f.id}`}>
                <b>{f.number}</b>
                <span>{f.airport.city || f.airport.iata}</span>
                <span className="fb-tick-time">{fmt.time(f.estimated || f.scheduled)}</span>
                <span className={`fb-tick-status tone-${TONES[f.statusKey] || 'neutral'}`}>{statusLabel(f)}</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  )

  const renderBody = () => {
    if (!board && error) {
      return (
        <div className="fb-message" role="status">
          <p className="fb-message-title">{t('flights.unavailable')}</p>
          <p className="fb-message-text">{t('flights.unavailableHint')}</p>
          {error.code !== 'FLIGHTS_NOT_CONFIGURED' ? (
            <button type="button" className="fb-retry" onClick={retry} disabled={loading}>{t('flights.retry')}</button>
          ) : null}
        </div>
      )
    }
    if (!board) {
      return (
        <ol className="fb-rows is-loading" aria-label={t('flights.loading')} style={{ '--fb-rows': rowsPerPage }}>
          {Array.from({ length: rowsPerPage }, (_, i) => (
            <li className="fb-row is-skeleton" key={i} aria-hidden="true"><span /><span /><span /><span /></li>
          ))}
        </ol>
      )
    }
    if (!flights.length) {
      return (
        <div className="fb-message" role="status">
          <p className="fb-message-title">{t(direction === 'arrivals' ? 'flights.emptyArrivals' : 'flights.emptyDepartures')}</p>
        </div>
      )
    }
    return (
      <>
        <div className="fb-head" aria-hidden="true">
          <span>{t('flights.time')}</span>
          <span>{t('flights.flight')}</span>
          <span>{placeHeading}</span>
          <span className="fb-head-gate">{direction === 'arrivals' ? t('flights.belt') : t('flights.gate')}</span>
          <span>{t('flights.statusLabel')}</span>
        </div>
        <ol className="fb-rows" key={`${iata}-${direction}-${safePage}`} style={{ '--fb-rows': rowsPerPage }}>
          {pageFlights.map((f, index) => {
            const revised = revisedLabel(f)
            const late = !COMPLETED.has(f.statusKey) && (f.delayMinutes || 0) >= 15
            return (
              <li className={`fb-row tone-${TONES[f.statusKey] || 'neutral'}`} key={f.id} style={{ '--fb-i': index }}>
                <span className="fb-c-time">
                  <span className="sr-only">{t('flights.time')}: </span>
                  <time dateTime={f.scheduled} className={revised && !COMPLETED.has(f.statusKey) ? 'is-revised' : ''}>{fmt.time(f.scheduled)}</time>
                </span>
                <span className="fb-c-flight">
                  <AirlineMark airline={f.airline} />
                  <span className="fb-flight-text">
                    <span className="fb-number">{f.number}</span>
                    {f.airline.name ? <span className="fb-airline">{f.airline.name}</span> : null}
                  </span>
                </span>
                <span className="fb-c-place">
                  <span className="sr-only">{placeHeading}: </span>
                  <span className="fb-city">{f.airport.city || f.airport.name || f.airport.iata || '—'}</span>
                  {f.airport.iata ? <span className="fb-iata">{f.airport.iata}</span> : null}
                </span>
                <span className="fb-c-gate">{placeLabel(f)}</span>
                <span className="fb-c-status">
                  <span className="sr-only">{t('flights.statusLabel')}: </span>
                  <span className="fb-pill">{statusLabel(f)}</span>
                  {revised ? <span className={`fb-revised${late ? ' is-late' : ''}`}>{revised}</span> : null}
                </span>
              </li>
            )
          })}
          {Array.from({ length: blanks }, (_, i) => (
            <li className="fb-row is-blank" key={`blank-${i}`} aria-hidden="true" />
          ))}
        </ol>
      </>
    )
  }

  return (
    <section ref={sectionRef} id="flights" className="fb-wrap page-pad page-shell" aria-labelledby="fb-title">
      <div className="fb">
        <span className="fb-glow" aria-hidden="true" />

        <div className="fb-intro">
          <p className="fb-eyebrow">
            <span className="fb-eyebrow-rule" aria-hidden="true" />
            {t('flights.eyebrow')}
          </p>
          <h2 id="fb-title" className="fb-title">
            <span>{t('flights.titleLead')}</span>{' '}
            <em>{t('flights.titleAccent')}</em>
          </h2>
          <p className="fb-lead">{t('flights.lead')}</p>
          <p className="fb-support">{t('flights.support')}</p>
          <button type="button" className="fb-cta booking-tap" onClick={handlePickup}>
            <span>{t('flights.cta')}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </button>
          {pickupCities.length ? (
            <p className="fb-cta-note">
              {pickupCity ? t('flights.ctaCity', { city: pickupCity }) : t('flights.ctaNoCity', { city: airport.city })}
            </p>
          ) : null}
        </div>

        <div
          ref={boardRef}
          className="fb-board"
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHold(true)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setHold(false)}
        >
          <div className="fb-bar">
            <div className="fb-tabs" role="tablist" aria-label={t('flights.boardLabel')}>
              {['arrivals', 'departures'].map((key) => (
                <button
                  key={key}
                  ref={(node) => { tabRefs.current[key] = node }}
                  type="button"
                  role="tab"
                  id={`fb-tab-${key}`}
                  aria-selected={direction === key}
                  aria-controls={panelId}
                  tabIndex={direction === key ? 0 : -1}
                  className={`fb-tab${direction === key ? ' is-active' : ''}`}
                  onClick={() => selectDirection(key)}
                  onKeyDown={onTabKeyDown}
                >
                  <PlaneGlyph direction={key} />
                  <span>{t(`flights.${key}`)}</span>
                  {board ? <span className="fb-tab-count">{lists[key].length}</span> : null}
                </button>
              ))}
            </div>

            <label className="fb-airport">
              <span className="sr-only">{t('flights.airport')}</span>
              <select value={iata} onChange={onAirportChange}>
                {MOROCCO_AIRPORTS.map((a) => (
                  <option key={a.iata} value={a.iata}>{`${a.iata} · ${a.city}`}</option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </label>
          </div>

          <div className="fb-meta">
            <span className={`fb-signal is-${mode}`} role="status">
              <span className="fb-signal-dot" aria-hidden="true" />
              {modeLabel}
            </span>
            {board ? (
              <span className="fb-updated">{t('flights.updated', { time: fmt.stamp(board.fetchedAt, now) })}</span>
            ) : null}
            <span className="fb-tz">{t('flights.timesNote')}</span>
            {board && canRotate ? (
              <button
                type="button"
                className="fb-pause"
                aria-pressed={paused}
                aria-label={paused ? t('flights.play') : t('flights.pause')}
                onClick={() => setUserPaused(!paused)}
              >
                {paused ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
                )}
                <span className="fb-pause-text" aria-hidden="true">{paused ? t('flights.play') : t('flights.pause')}</span>
              </button>
            ) : null}
          </div>

          {board && tickerItems.length > 1 ? renderTicker() : null}

          <div id={panelId} role="tabpanel" aria-labelledby={`fb-tab-${direction}`} className="fb-panel">
            {board && isStale ? (
              <p className="fb-notice is-stale" role="status">
                {t('flights.staleNotice', { time: fmt.stamp(board.fetchedAt, now) })}
              </p>
            ) : null}
            {board && !isStale && !board.hasLiveData && flights.length ? (
              <p className="fb-notice">{t('flights.scheduleNotice')}</p>
            ) : null}
            {renderBody()}
          </div>

          <div className="fb-foot">
            {board && flights.length ? (
              <span className="fb-page">{t('flights.page', { page: safePage + 1, total: pageCount })}</span>
            ) : <span />}
            <span className="fb-progress" aria-hidden="true">
              {running ? (
                <span key={`${iata}-${direction}-${safePage}-${cycle}`} className="fb-progress-bar" style={{ animationDuration: `${ROTATE_MS}ms` }} />
              ) : null}
            </span>
            <span className="fb-source">{t('flights.source')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Banner

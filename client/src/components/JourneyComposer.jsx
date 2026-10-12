import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import CitySelect from './CitySelect'
import DateRangePicker from './DateRangePicker'
import JourneyMap from './journey/JourneyMap'
import { coordinatesForCity } from './journey/cityCoordinates.js'
import {
  GEARBOX_OPTIONS,
  LUGGAGE_LEVELS,
  MAX_TRAVELLERS,
  TRIP_STYLES,
  composeJourney,
  locationForCity,
  sameCity,
  straightLineKm,
} from './journey/journeyPlanner.js'
import { assets } from '../assets/assets'
import { findDefaultCityName } from '../utils/defaultLocation'
import { getDisplayDailyPrices } from '../utils/promotionDisplay'
import { carDisplayName } from '../utils/carDisplay'
import { getErrorMessage } from '../utils/apiError'
import { buildWaMeUrl } from '../utils/whatsapp'
import { trackSearch } from '../analytics/ga4'
import { haptic } from '../utils/haptics'
import './journey/journey.css'

const LOCALES = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' }
const QUOTED_MATCHES = 3
const PICKUP_TIME = 'T10:00'

const modelKey = (car) => `${String(car?.brand || '').trim().toLowerCase()}|${String(car?.model || '').trim().toLowerCase()}`
const carImage = (car) => car?.image || car?.images?.[0] || assets.car_image1

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

const StyleIcon = ({ name }) => {
  const paths = {
    city: 'M4 20V9l5-3v14M9 20V4l7 3v13M16 20v-8l4 2v6M3 20h18M12 9h1M12 12h1M12 15h1',
    roadtrip: 'M8 3 5 21M16 3l3 18M12 4v3M12 10v3M12 16v4',
    atlas: 'M3 19 9.5 8l3.5 6 2.5-4L21 19H3ZM8 11.5l1.5 1.5L11 11.5',
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

const ReasonIcon = ({ tone }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tone === 'warn' ? <path d="M12 8v5M12 16.5v.5" /> : <path d="m5 12.5 4.5 4.5L19 7.5" />}
  </svg>
)

const ScoreRing = ({ score, label, size = 'lg' }) => {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <span className={`jc-ring is-${size}`} role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="jc-ring-track" cx="32" cy="32" r={r} />
        <circle className="jc-ring-value" cx="32" cy="32" r={r} style={{ strokeDasharray: c, strokeDashoffset: c * (1 - score / 100) }} />
      </svg>
      <span className="jc-ring-text" aria-hidden="true">{score}<small>%</small></span>
    </span>
  )
}

const Choice = ({ name, value, checked, onChange, children, className = '' }) => (
  <label className={`jc-choice ${className}${checked ? ' is-checked' : ''}`}>
    <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
    {children}
  </label>
)

const JourneyComposer = () => {
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const { axios, cars, carsLoading, pickupLocations, pickupDate, setPickupDate, returnDate, setReturnDate } = useAppContext()
  const reducedMotion = useReducedMotion()
  const currency = (import.meta.env.VITE_CURRENCY || 'MAD ').trim()

  const [startCity, setStartCity] = useState('')
  const [endCity, setEndCity] = useState('')
  const [travellers, setTravellers] = useState(2)
  const [luggage, setLuggage] = useState('standard')
  const [gearbox, setGearbox] = useState('any')
  const [style, setStyle] = useState('roadtrip')
  const [pickTarget, setPickTarget] = useState('start')
  const [live, setLive] = useState(null)
  const [quotes, setQuotes] = useState({})
  const [selectedId, setSelectedId] = useState('')
  const requested = useRef(new Set())

  const startISO = typeof pickupDate === 'string' ? pickupDate.slice(0, 10) : ''
  const endISO = typeof returnDate === 'string' ? returnDate.slice(0, 10) : ''

  const cities = useMemo(
    () => [...new Set(pickupLocations.map((l) => l.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [pickupLocations],
  )
  const mapCities = useMemo(
    () => cities.map((city) => ({ city, coords: coordinatesForCity(city) })).filter((c) => c.coords),
    [cities],
  )

  useEffect(() => {
    if (startCity || !cities.length) return
    const initial = findDefaultCityName(cities) || cities[0]
    setStartCity(initial)
    setEndCity(initial)
  }, [cities, startCity])

  const returnCity = endCity || startCity
  const prefs = useMemo(
    () => ({ startCity, endCity: returnCity, startDate: startISO, endDate: endISO, travellers, luggage, gearbox, style }),
    [startCity, returnCity, startISO, endISO, travellers, luggage, gearbox, style],
  )

  const liveKey = `${startCity}|${startISO}|${endISO}`
  const isLive = live?.key === liveKey && live.status === 'ready'
  const liveLoading = live?.key === liveKey && live.status === 'loading'
  const liveError = live?.key === liveKey && live.status === 'error' ? live : null

  const startLoc = useMemo(() => locationForCity(pickupLocations, startCity), [pickupLocations, startCity])
  const endLoc = useMemo(() => locationForCity(pickupLocations, returnCity), [pickupLocations, returnCity])
  const quoteKey = (car) => `${car._id}|${startISO}|${endISO}|${startLoc?._id || ''}|${endLoc?._id || ''}`

  const journey = useMemo(() => composeJourney(isLive ? live.cars : cars, prefs), [isLive, live, cars, prefs])
  const matches = useMemo(
    () => (isLive ? journey.matches.filter((m) => quotes[quoteKey(m.car)]?.status !== 'unavailable') : journey.matches),
    // quoteKey only depends on the values listed here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [journey, isLive, quotes, startISO, endISO, startLoc, endLoc],
  )

  const top = matches.find((m) => m.car._id === selectedId) || matches[0] || null
  const others = matches.filter((m) => m !== top).slice(0, 2)
  const distanceKm = straightLineKm(startCity, returnCity)
  const days = journey.days

  useEffect(() => {
    if (!isLive || !startLoc || !endLoc) return
    for (const match of matches.slice(0, QUOTED_MATCHES)) {
      const key = quoteKey(match.car)
      if (requested.current.has(key)) continue
      requested.current.add(key)
      setQuotes((prev) => ({ ...prev, [key]: { status: 'loading' } }))
      axios
        .post('/api/bookings/quote', {
          car: match.car._id,
          pickupDate: `${startISO}${PICKUP_TIME}`,
          returnDate: `${endISO}${PICKUP_TIME}`,
          pickupLocationId: startLoc._id,
          returnLocationId: endLoc._id,
        })
        .then(({ data }) => {
          setQuotes((prev) => ({
            ...prev,
            [key]: data?.success ? { status: 'ready', data } : { status: 'error', message: data?.message },
          }))
        })
        .catch((error) => {
          const res = error?.response
          setQuotes((prev) => ({
            ...prev,
            [key]: {
              status: res?.status === 409 ? 'unavailable' : 'error',
              minDays: res?.data?.minRentalDays,
              code: res?.data?.code,
            },
          }))
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, matches, startLoc, endLoc, axios])

  const fmt = useMemo(() => {
    const locale = LOCALES[language] || 'en-GB'
    const money = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
    const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    return {
      money: (value) => `${money.format(value)} ${currency}`,
      date: (iso) => (iso ? day.format(new Date(`${iso}T12:00:00`)) : ''),
      clock: (ms) => clock.format(new Date(ms)),
    }
  }, [language, currency])

  const datesLabel = startISO && endISO ? `${fmt.date(startISO)} – ${fmt.date(endISO)}` : ''

  const pickCity = (city) => {
    haptic()
    if (pickTarget === 'start') {
      const wasRoundTrip = sameCity(startCity, returnCity)
      setStartCity(city)
      if (wasRoundTrip) setEndCity(city)
      setPickTarget('end')
    } else {
      setEndCity(city)
      setPickTarget('start')
    }
    setSelectedId('')
  }

  const changeStart = (city) => {
    const wasRoundTrip = sameCity(startCity, returnCity)
    setStartCity(city)
    if (wasRoundTrip) setEndCity(city)
    setSelectedId('')
  }

  const swapCities = () => {
    setStartCity(returnCity)
    setEndCity(startCity)
    setSelectedId('')
  }

  const checkLive = async () => {
    if (!startCity || !startISO || !endISO) return
    const key = liveKey
    setLive({ key, status: 'loading' })
    try {
      const { data } = await axios.post('/api/bookings/check-availability', {
        location: startCity,
        pickupDate: startISO,
        returnDate: endISO,
      })
      if (!data?.success) throw new Error(data?.message || 'Availability check failed')
      const byId = new Map(cars.map((c) => [c._id, c]))
      const byModel = new Map(cars.map((c) => [modelKey(c), c]))
      const merged = (data.availableCars || []).map((car) => {
        const base = byId.get(car._id) || byModel.get(modelKey(car)) || {}
        return {
          ...base,
          ...car,
          displayPromotion: car.displayPromotion ?? base.displayPromotion,
          bookingRules: car.bookingRules ?? base.bookingRules,
        }
      })
      setLive({ key, status: 'ready', cars: merged, checkedAt: Date.now() })
      setSelectedId('')
      haptic('success')
      trackSearch({ location: startCity, has_dates: true, result_count: merged.length, source: 'journey_composer' })
    } catch (error) {
      setLive({ key, status: 'error', message: getErrorMessage(error) })
    }
  }

  const reserve = (car) => {
    if (startISO && endISO) {
      setPickupDate(`${startISO}${PICKUP_TIME}`)
      setReturnDate(`${endISO}${PICKUP_TIME}`)
    }
    const params = new URLSearchParams()
    if (startLoc) params.set('pickup', startLoc._id)
    if (endLoc) params.set('return', endLoc._id)
    const query = params.toString()
    navigate(`/car-details/${car._id}${query ? `?${query}` : ''}`)
    window.scrollTo(0, 0)
  }

  const whatsappUrl = (car) => buildWaMeUrl(t('journey.whatsappMessage', {
    from: startCity,
    to: returnCity,
    dates: datesLabel || t('journey.datesFlexible'),
    travellers,
    car: car ? carDisplayName(car) : t('journey.carOpen'),
  }))

  const plural = (key, count, vars = {}) => t(count === 1 ? `${key}One` : key, { count, ...vars })
  const reasonText = (reason) => t(`journey.reason.${reason.key}`, reason.params || {})

  const renderPrice = (match, compact = false) => {
    const quote = isLive ? quotes[quoteKey(match.car)] : null
    const promo = match.car.displayPromotion ? getDisplayDailyPrices(match.car) : null

    if (quote?.status === 'ready') {
      const breakdown = quote.data.priceBreakdown || {}
      const mileage = quote.data.pricingSnapshot?.mileage
      if (compact) {
        return (
          <p className="jc-price is-compact">
            <strong>{fmt.money(breakdown.total)}</strong>
            <span>{plural('journey.totalFor', breakdown.days)}</span>
          </p>
        )
      }
      const lines = (breakdown.lineItems || []).filter((line) => line.type === 'rental' || Number(line.amount) > 0)
      return (
        <div className="jc-quote">
          <p className="jc-price">
            <strong>{fmt.money(breakdown.total)}</strong>
            <span>{plural('journey.totalFor', breakdown.days)}</span>
          </p>
          <dl className="jc-lines">
            {lines.map((line) => (
              <div key={line.type + line.label}>
                <dt>
                  {line.type === 'rental'
                    ? t('journey.lineRental', { days: line.meta?.days ?? breakdown.days, price: fmt.money(line.meta?.pricePerDay ?? breakdown.pricePerDay) })
                    : t(`journey.line.${line.type}`) === `journey.line.${line.type}` ? line.label : t(`journey.line.${line.type}`)}
                </dt>
                <dd>{fmt.money(line.amount)}</dd>
              </div>
            ))}
            {(breakdown.discounts || []).map((discount) => (
              <div key={`d-${discount.label}`} className="is-discount">
                <dt>{discount.label}</dt>
                <dd>−{fmt.money(discount.amount)}</dd>
              </div>
            ))}
          </dl>
          <p className="jc-quote-meta">
            <span className="jc-verified">{t('journey.priceConfirmed')}</span>
            {mileage?.mode === 'unlimited' ? <span>{t('journey.mileageUnlimited')}</span> : null}
            {mileage?.mode && mileage.mode !== 'unlimited' && mileage.limitKmPerDay ? (
              <span>{t('journey.mileageLimited', { km: mileage.limitKmPerDay })}</span>
            ) : null}
          </p>
        </div>
      )
    }

    if (quote?.status === 'loading') {
      return <p className="jc-price is-pending">{t('journey.confirmingPrice')}</p>
    }

    const daily = (
      <p className={`jc-price${compact ? ' is-compact' : ''}`}>
        {promo?.showStrike ? <s>{fmt.money(promo.original)}</s> : null}
        <strong>{fmt.money(match.daily)}</strong>
        <span>{t('journey.perDay')}</span>
      </p>
    )

    if (quote?.status === 'error') {
      return (
        <>
          {daily}
          <p className="jc-price-note is-warn">
            {quote.minDays ? t('journey.minDays', { days: quote.minDays }) : t('journey.quoteFailed')}
          </p>
        </>
      )
    }

    return (
      <>
        {daily}
        {!compact && days > 0 ? (
          <p className="jc-price-note">{plural('journey.estimate', days, { total: fmt.money(match.daily * days) })}</p>
        ) : null}
      </>
    )
  }

  const renderEmpty = () => {
    if ((carsLoading && !isLive) || liveLoading) {
      return <div className="jc-skeleton" aria-hidden="true" />
    }
    let title = t('journey.empty.none')
    let action = null
    if (travellers > journey.maxSeats && journey.maxSeats > 0) {
      title = t('journey.empty.tooMany', { seats: journey.maxSeats })
      action = (
        <a className="jc-btn jc-btn-ghost" href={whatsappUrl(null)} target="_blank" rel="noopener noreferrer" data-analytics-source="journey_composer">
          {t('journey.askWhatsapp')}
        </a>
      )
    } else if (journey.blocked.minDays > 0 && journey.minDaysRequired) {
      title = t('journey.empty.minDays', { days: journey.minDaysRequired })
    } else if (journey.blocked.route > 0 && !sameCity(startCity, returnCity)) {
      title = t('journey.empty.route', { from: startCity, to: returnCity })
      action = (
        <button type="button" className="jc-btn jc-btn-ghost" onClick={() => setEndCity(startCity)}>
          {t('journey.returnTo', { city: startCity })}
        </button>
      )
    } else if (isLive) {
      title = t('journey.empty.soldOut')
    }
    return (
      <div className="jc-empty" role="status">
        <p>{title}</p>
        {action}
      </div>
    )
  }

  const statusLine = () => {
    if (liveLoading) return { tone: 'busy', text: t('journey.status.checking') }
    if (isLive) return { tone: 'live', text: t('journey.status.live', { count: live.cars.length, time: fmt.clock(live.checkedAt) }) }
    if (liveError) return { tone: 'warn', text: t('journey.status.error') }
    if (startISO && endISO) return { tone: 'idle', text: t('journey.status.ready') }
    return { tone: 'idle', text: t('journey.status.preview') }
  }
  const status = statusLine()
  const canCheck = Boolean(startCity && startISO && endISO) && !liveLoading

  return (
    <section id="journey" className="jc-wrap" aria-labelledby="jc-title">
      <span className="jc-glow" aria-hidden="true" />
      <div className="jc page-pad page-shell">

        <header className="jc-head">
          <p className="jc-eyebrow">
            <span aria-hidden="true" />
            {t('journey.eyebrow')}
          </p>
          <h2 id="jc-title" className="jc-title">
            <span>{t('journey.titleLead')}</span>{' '}
            <em>{t('journey.titleAccent')}</em>
          </h2>
          <p className="jc-lead">{t('journey.lead')}</p>
        </header>

        <div className="jc-stage">
          <div className="jc-map">
            <div className="jc-map-head">
              <p className="jc-map-route">
                <span>{startCity || '—'}</span>
                <svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  {sameCity(startCity, returnCity) ? <path d="M3 6a5 4 0 1 0 5-4h6l-2-2M14 2l-2 2" /> : <path d="M1 6h19M15 1l5 5-5 5" />}
                </svg>
                <span>{sameCity(startCity, returnCity) ? t('journey.roundTrip') : returnCity}</span>
              </p>
              <p className="jc-map-meta">
                {datesLabel ? <span>{datesLabel}</span> : null}
                {days > 0 ? <span>{plural('journey.days', days)}</span> : null}
                <span>{plural('journey.travellersCount', travellers)}</span>
              </p>
            </div>
            {mapCities.length >= 2 ? (
              <JourneyMap
                cities={mapCities}
                startCity={startCity}
                endCity={returnCity}
                distanceKm={distanceKm}
                pickTarget={pickTarget}
                onPick={pickCity}
                reducedMotion={reducedMotion}
              />
            ) : (
              <div className="jc-map-empty" aria-hidden="true" />
            )}
            <p className="jc-map-hint" aria-live="polite">
              {t(pickTarget === 'start' ? 'journey.hintStart' : 'journey.hintEnd')}
            </p>
          </div>

          <form className="jc-panel" onSubmit={(event) => { event.preventDefault(); checkLive() }} aria-label={t('journey.formLabel')}>
            <div className="jc-shell">
              <div className="jc-route-fields">
                <div className="jc-field" onFocusCapture={() => setPickTarget('start')}>
                  <CitySelect value={startCity} onChange={changeStart} options={cities} label={t('journey.from')} placeholder={t('hero.selectLocation')} />
                </div>
                <button type="button" className="jc-swap" onClick={swapCities} aria-label={t('journey.swap')} disabled={sameCity(startCity, returnCity)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />
                  </svg>
                </button>
                <div className="jc-field" onFocusCapture={() => setPickTarget('end')}>
                  <CitySelect value={returnCity} onChange={(city) => { setEndCity(city); setSelectedId('') }} options={cities} label={t('journey.returnCity')} placeholder={t('hero.selectLocation')} />
                </div>
              </div>
              <div className="jc-field jc-field-dates">
                <DateRangePicker
                  layout="row"
                  startDate={startISO}
                  endDate={endISO}
                  onChange={({ startDate, endDate }) => {
                    setPickupDate(startDate)
                    setReturnDate(endDate)
                  }}
                />
              </div>
            </div>

            <div className="jc-row">
              <span className="jc-label" id="jc-travellers-label">{t('journey.travellers')}</span>
              <div className="jc-stepper" role="group" aria-labelledby="jc-travellers-label">
                <button type="button" onClick={() => setTravellers((n) => Math.max(1, n - 1))} disabled={travellers <= 1} aria-label={t('journey.fewer')}>−</button>
                <output aria-live="polite">{travellers}</output>
                <button type="button" onClick={() => setTravellers((n) => Math.min(MAX_TRAVELLERS, n + 1))} disabled={travellers >= MAX_TRAVELLERS} aria-label={t('journey.more')}>+</button>
              </div>
            </div>

            <fieldset className="jc-set">
              <legend className="jc-label">{t('journey.luggage')}</legend>
              <div className="jc-seg">
                {LUGGAGE_LEVELS.map((level) => (
                  <Choice key={level} name="jc-luggage" value={level} checked={luggage === level} onChange={setLuggage}>
                    <span className="jc-choice-title">{t(`journey.luggageLevel.${level}`)}</span>
                    <span className="jc-choice-sub">{t(`journey.luggageHint.${level}`)}</span>
                  </Choice>
                ))}
              </div>
            </fieldset>

            <fieldset className="jc-set">
              <legend className="jc-label">{t('journey.gearbox')}</legend>
              <div className="jc-seg">
                {GEARBOX_OPTIONS.map((option) => (
                  <Choice key={option} name="jc-gearbox" value={option} checked={gearbox === option} onChange={setGearbox}>
                    <span className="jc-choice-title">{t(`journey.gearboxOption.${option}`)}</span>
                  </Choice>
                ))}
              </div>
            </fieldset>

            <fieldset className="jc-set">
              <legend className="jc-label">{t('journey.style')}</legend>
              <div className="jc-seg is-styles">
                {TRIP_STYLES.map((option) => (
                  <Choice key={option} name="jc-style" value={option} checked={style === option} onChange={setStyle} className="is-style">
                    <StyleIcon name={option} />
                    <span className="jc-choice-title">{t(`journey.styleOption.${option}`)}</span>
                  </Choice>
                ))}
              </div>
            </fieldset>

            <button type="submit" className="jc-cta booking-tap" disabled={!canCheck}>
              <span>{liveLoading ? t('journey.checking') : t('journey.check')}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
            {!startISO || !endISO ? <p className="jc-cta-hint">{t('journey.addDates')}</p> : null}
          </form>
        </div>

        <div className="jc-results" aria-live="polite" aria-busy={liveLoading}>
          <div className="jc-results-head">
            <h3>{t('journey.resultsTitle')}</h3>
            <p className={`jc-status is-${status.tone}`}>
              <span className="jc-status-dot" aria-hidden="true" />
              {status.text}
              {liveError ? (
                <button type="button" className="jc-link" onClick={checkLive}>{t('journey.retry')}</button>
              ) : null}
            </p>
          </div>

          {!top ? renderEmpty() : (
            <div className="jc-matches">
              <article key={top.car._id} className="jc-top">
                <div className="jc-top-media">
                  <img
                    src={carImage(top.car)}
                    onError={(e) => { e.currentTarget.src = assets.car_image1 }}
                    alt=""
                    width={960}
                    height={600}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="jc-top-tag">{top === matches[0] ? t('journey.bestMatch') : t('journey.yourPick')}</span>
                </div>
                <div className="jc-top-body">
                  <div className="jc-top-title">
                    <ScoreRing score={top.score} label={t('journey.matchLabel', { score: top.score })} />
                    <div>
                      <p className="jc-top-meta">
                        {[top.car.category, top.car.year, top.car.transmission, top.car.fuel_type].filter(Boolean).join(' · ')}
                      </p>
                      <h4 className="jc-top-name">{carDisplayName(top.car)}</h4>
                    </div>
                  </div>
                  <ul className="jc-reasons">
                    {top.reasons.map((reason) => (
                      <li key={reason.key} className={`is-${reason.tone}`}>
                        <ReasonIcon tone={reason.tone} />
                        {reasonText(reason)}
                      </li>
                    ))}
                  </ul>
                  {renderPrice(top)}
                  <div className="jc-actions">
                    <button type="button" className="jc-btn jc-btn-primary booking-tap" onClick={() => reserve(top.car)}>
                      {t('journey.reserve')}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14" />
                        <path d="M13 6l6 6-6 6" />
                      </svg>
                    </button>
                    <a className="jc-btn jc-btn-ghost" href={whatsappUrl(top.car)} target="_blank" rel="noopener noreferrer" data-analytics-source="journey_composer">
                      {t('journey.planWhatsapp')}
                    </a>
                  </div>
                </div>
              </article>

              {others.length ? (
                <div className="jc-others">
                  <p className="jc-others-label">{t('journey.alsoFits')}</p>
                  <ul>
                    {others.map((match) => (
                      <li key={match.car._id}>
                        <button type="button" className="jc-alt booking-tap" onClick={() => setSelectedId(match.car._id)}>
                          <span className="jc-alt-media">
                            <img src={carImage(match.car)} onError={(e) => { e.currentTarget.src = assets.car_image1 }} alt="" width={320} height={200} loading="lazy" decoding="async" />
                          </span>
                          <span className="jc-alt-body">
                            <span className="jc-alt-name">{carDisplayName(match.car)}</span>
                            <span className="jc-alt-meta">{[match.car.category, match.car.transmission].filter(Boolean).join(' · ')}</span>
                            {renderPrice(match, true)}
                          </span>
                          <ScoreRing score={match.score} label={t('journey.matchLabel', { score: match.score })} size="sm" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <p className="jc-foot">{t('journey.footnote')}</p>
        </div>
      </div>
    </section>
  )
}

export default JourneyComposer

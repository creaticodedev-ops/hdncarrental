import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import HeroCarStage from './hero/HeroCarStage'
import { useHeroCamera } from './hero/useHeroCamera'
import { findDefaultCityName } from '../utils/defaultLocation'
import toast from 'react-hot-toast'
import { trackSearch } from '../analytics/ga4'
import { haptic } from '../utils/haptics'
import { BOOKING_PREFILL_EVENT } from '../utils/bookingPrefill'
import './hero/heroStage.css'

/** "Roulez avec distinction" → ["Roulez avec", "distinction"] for the italic accent word. */
const splitTitle = (title) => {
  const value = String(title || '').trim()
  const cut = value.lastIndexOf(' ')
  if (cut <= 0) return [value, '']
  return [value.slice(0, cut), value.slice(cut + 1)]
}

const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('')
  const { t } = useI18n()
  const { pickupDate, setPickupDate, returnDate, setReturnDate, navigate, pickupLocations } = useAppContext()
  const heroRef = useRef(null)
  useHeroCamera(heroRef)

  const cities = useMemo(() => {
    return [...new Set(pickupLocations.map((location) => location.city))].sort()
  }, [pickupLocations])

  useEffect(() => {
    if (pickupLocation) return
    const safi = findDefaultCityName(cities)
    if (safi) setPickupLocation(safi)
  }, [cities, pickupLocation])

  const startISO = typeof pickupDate === 'string' ? pickupDate.slice(0, 10) : ''
  const endISO = typeof returnDate === 'string' ? returnDate.slice(0, 10) : ''

  const formRef = useRef(null)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    let focusTimer = 0
    let flashTimer = 0
    const onPrefill = (event) => {
      const city = event.detail?.city
      if (city && cities.includes(city)) setPickupLocation(city)
      const form = formRef.current
      if (!form) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      setFlash(true)
      window.clearTimeout(flashTimer)
      flashTimer = window.setTimeout(() => setFlash(false), 1800)
      if (!window.matchMedia('(min-width: 768px)').matches) return
      window.clearTimeout(focusTimer)
      focusTimer = window.setTimeout(() => {
        const target = startISO && endISO
          ? form.querySelector('button[type="submit"]')
          : form.querySelector('.hx-field-dates input')
        target?.focus({ preventScroll: true })
      }, reduce ? 0 : 700)
    }
    window.addEventListener(BOOKING_PREFILL_EVENT, onPrefill)
    return () => {
      window.removeEventListener(BOOKING_PREFILL_EVENT, onPrefill)
      window.clearTimeout(focusTimer)
      window.clearTimeout(flashTimer)
    }
  }, [cities, startISO, endISO])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!pickupLocation) {
      toast.error(t('hero.selectLocation'))
      return
    }
    if (!startISO || !endISO) {
      toast.error(t('hero.selectDates'))
      return
    }
    if (endISO < startISO) {
      toast.error(t('hero.invalidRange'))
      return
    }
    trackSearch({
      location: pickupLocation,
      has_dates: true,
      source: 'hero',
    })
    haptic('success')
    navigate(`/cars?${new URLSearchParams({
      pickupLocation,
      pickupDate: startISO,
      returnDate: endISO,
    }).toString()}`)
  }

  const [titleLead, titleAccent] = splitTitle(t('hero.title'))

  return (
    <section ref={heroRef} className="hx" aria-labelledby="hero-title">
      <div className="hx-backdrop" aria-hidden="true">
        <span className="hx-glow" />
        <span className="hx-floor" />
      </div>

      <div className="hx-inner page-pad page-shell">
        <header className="hx-copy">
          <p className="hx-kicker">
            <span className="hx-kicker-rule" aria-hidden="true" />
            {t('hero.badge')}
          </p>
          <h1 id="hero-title" className="hx-title">
            <span className="hx-title-lead">{titleLead}</span>{' '}
            {titleAccent ? <em className="hx-title-accent">{titleAccent}</em> : null}
          </h1>
          <p className="hx-lead">{t('hero.lead')}</p>
        </header>

        <HeroCarStage />

        <form ref={formRef} onSubmit={handleSearch} className={`hx-book${flash ? ' is-flash' : ''}`} aria-label={t('hero.bookingLabel')}>
          <p className="hx-book-label">{t('hero.bookingLabel')}</p>
          <div className="hx-book-shell">
            <div className="hx-field hx-field-city">
              <CitySelect
                value={pickupLocation}
                onChange={setPickupLocation}
                options={cities}
                label={t('hero.pickupLocation')}
                placeholder={t('hero.selectLocation')}
              />
            </div>
            <div className="hx-field hx-field-dates">
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
            <button type="submit" className="hx-cta booking-tap">
              <span>{t('hero.search')}</span>
              <svg className="hx-cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p className="hx-trust">{t('hero.trustLine')}</p>
        </form>
      </div>
    </section>
  )
}

export default Hero

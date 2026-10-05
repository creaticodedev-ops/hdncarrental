import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import HeroCarStage from './hero/HeroCarStage'
import HeroWorld from './hero/HeroWorld'
import { useHeroCamera } from './hero/useHeroCamera'
import { BRAND_NAME } from '../constants/brand'
import { findDefaultCityName } from '../utils/defaultLocation'
import toast from 'react-hot-toast'
import { booking } from './ui/bookingUi'
import { trackSearch } from '../analytics/ga4'
import { haptic } from '../utils/haptics'
import './hero/heroStage.css'

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

  return (
    <section ref={heroRef} className="hero-2030">
      <HeroWorld />

      <div className="hero-frame page-pad page-shell">
        <p className="hero-geo" aria-hidden="true">{t('hero.region')}</p>

        <header className="hero-mast">
          <p className="hero-kicker">{t('hero.badge')}</p>
          <p className="hero-brand">{BRAND_NAME}</p>
          <h1 className="hero-title">{t('hero.title')}</h1>
          <p className="hero-lead">{t('hero.lead')}</p>
        </header>

        <HeroCarStage />

        <form onSubmit={handleSearch} className="hero-console">
          <p className="hero-console-kicker">{t('hero.bookingLabel')}</p>
          <div className="hero-booking">
            <div className="hero-booking-city">
              <CitySelect
                value={pickupLocation}
                onChange={setPickupLocation}
                options={cities}
                label={t('hero.pickupLocation')}
                placeholder={t('hero.selectLocation')}
              />
            </div>
            <div className="hero-booking-dates">
              <DateRangePicker
                startDate={startISO}
                endDate={endISO}
                onChange={({ startDate, endDate }) => {
                  setPickupDate(startDate)
                  setReturnDate(endDate)
                }}
              />
            </div>
            <div className="hero-booking-cta">
              <button type="submit" className={`${booking.btnPrimary} booking-tap hero-search-btn`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                {t('hero.search')}
              </button>
            </div>
          </div>
          <p className="hero-trust">{t('hero.trustLine')}</p>
        </form>
      </div>
    </section>
  )
}

export default Hero

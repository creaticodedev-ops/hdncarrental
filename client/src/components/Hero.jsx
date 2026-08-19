import React, { useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import HeroCarStage from './hero/HeroCarStage'
import { BRAND_NAME } from '../constants/brand'
import toast from 'react-hot-toast'
import { booking } from './ui/bookingUi'
import { trackSearch } from '../analytics/ga4'
import './hero/heroStage.css'

const CINEMA = [0.16, 1, 0.3, 1]

const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('')
  const { t } = useI18n()
  const { pickupDate, setPickupDate, returnDate, setReturnDate, navigate, pickupLocations } = useAppContext()
  const reduceMotion = useReducedMotion()
  const heroRef = useRef(null)

  const cities = useMemo(() => {
    return [...new Set(pickupLocations.map((location) => location.city))].sort()
  }, [pickupLocations])

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
    navigate(`/cars?${new URLSearchParams({
      pickupLocation,
      pickupDate: startISO,
      returnDate: endISO,
    }).toString()}`)
  }

  return (
    <section ref={heroRef} className="hero-showroom relative min-h-[100svh] overflow-x-clip bg-light">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-8%,rgba(143,31,31,0.13),transparent_58%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-sand/95 via-sand/40 to-transparent" />
        <div className="hero-floor-sheen" />
      </div>

      <Motion.aside
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: reduceMotion ? 0 : 1.82, ease: CINEMA }}
        className="hero-aside hidden xl:flex"
        aria-label={t('hero.callout')}
      >
        {[t('hero.asideInsured'), t('hero.asideRating'), t('hero.asideSupport')].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </Motion.aside>

      <div className="relative z-10 page-pad page-shell flex flex-col items-center pb-4 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] sm:pb-6 sm:pt-28 md:pb-8 md:pt-32">
        <Motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: reduceMotion ? 0 : 1.18, ease: CINEMA }}
          className="w-full max-w-3xl text-center"
        >
          <div className="mb-4 flex justify-center sm:mb-5 md:mb-6">
            <div
              className="inline-flex max-w-[min(100%,22rem)] items-center gap-2 rounded-full border border-borderColor/70 bg-white/80 px-3 py-1.5 shadow-[0_1px_2px_rgba(22,18,16,0.05)] backdrop-blur-md sm:max-w-none sm:gap-2.5 sm:px-3.5 sm:py-[0.4rem]"
              role="status"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted/70"
                aria-hidden="true"
              />
              <span className="min-w-0 truncate text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink sm:text-[11px] sm:tracking-[0.09em]">
                {t('hero.badge')}
              </span>
              <span
                className="inline-flex shrink-0 translate-y-[0.5px] items-center text-[11px] leading-none sm:text-[12px]"
                role="img"
                aria-label="Morocco"
              >
                🇲🇦
              </span>
            </div>
          </div>

          <p className="font-display text-5xl font-medium leading-none tracking-tight text-primary sm:text-6xl md:text-7xl">
            {BRAND_NAME}
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight text-ink sm:mt-4 sm:text-4xl md:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-light leading-relaxed text-muted sm:mt-4 sm:text-base md:text-lg">
            {t('hero.subtitle')}
          </p>
        </Motion.div>

        <Motion.form
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: reduceMotion ? 0 : 1.32, ease: CINEMA }}
          onSubmit={handleSearch}
          className="relative z-20 mt-8 w-full max-w-4xl sm:mt-10 md:mt-11"
        >
          <div className="hero-booking overflow-visible rounded-[1.25rem] border border-white/80 bg-white/92 shadow-[0_22px_60px_-32px_rgba(22,18,16,0.42)] backdrop-blur-md md:rounded-[1.6rem]">
            <div className="flex flex-col md:flex-row md:items-stretch">
              <div className="min-w-0 border-b border-borderColor/80 md:flex-[1.05] md:border-b-0 md:border-r">
                <CitySelect
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  options={cities}
                  label={t('hero.pickupLocation')}
                  placeholder={t('hero.selectLocation')}
                />
              </div>

              <div className="min-w-0 border-b border-borderColor/80 md:flex-[1.55] md:border-b-0 md:border-r">
                <DateRangePicker
                  startDate={startISO}
                  endDate={endISO}
                  onChange={({ startDate, endDate }) => {
                    setPickupDate(startDate)
                    setReturnDate(endDate)
                  }}
                />
              </div>

              <div className="flex items-stretch p-3 md:p-2.5 md:pl-2">
                <Motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  className={`${booking.btnPrimary} booking-tap w-full md:w-[9.75rem]`}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  {t('hero.search')}
                </Motion.button>
              </div>
            </div>
          </div>

          <p className="mt-3.5 px-2 text-center text-xs leading-relaxed tracking-wide text-muted sm:text-sm">
            {t('hero.trustLine')}
          </p>
        </Motion.form>

        <HeroCarStage heroRef={heroRef} />

        <Motion.ul
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: reduceMotion ? 0 : 1.92, ease: CINEMA }}
          className="hero-perks"
        >
          {[
            ['perkVehicles', 'perkVehiclesHint'],
            ['perkPricing', 'perkPricingHint'],
            ['perkBooking', 'perkBookingHint'],
            ['perkFlexible', 'perkFlexibleHint'],
            ['perkNationwide', 'perkNationwideHint'],
          ].map(([title, hint]) => (
            <li key={title}>
              <p>{t(`hero.${title}`)}</p>
              <span>{t(`hero.${hint}`)}</span>
            </li>
          ))}
        </Motion.ul>
      </div>
    </section>
  )
}

export default Hero

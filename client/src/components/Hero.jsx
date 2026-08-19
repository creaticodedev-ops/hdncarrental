import React, { useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import HeroCarStage from './hero/HeroCarStage'
import { useHeroCamera } from './hero/useHeroCamera'
import { BRAND_NAME } from '../constants/brand'
import toast from 'react-hot-toast'
import { booking } from './ui/bookingUi'
import { trackSearch } from '../analytics/ga4'
import './hero/heroStage.css'

const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('')
  const { t } = useI18n()
  const { pickupDate, setPickupDate, returnDate, setReturnDate, navigate, pickupLocations } = useAppContext()
  const heroRef = useRef(null)
  const camera = useHeroCamera(heroRef)
  const {
    annotateOpacity,
    atmosphereY,
    cameraScale,
    cameraY,
    coverOpacity,
    frameReady,
    hazeX,
    lightX,
    lightY,
    perkOpacity,
    reduceMotion,
    tracking,
    uiOpacity,
    uiY,
  } = camera

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

  const pullStyle = reduceMotion
    ? undefined
    : {
        scale: cameraScale,
        y: cameraY,
      }

  const copyExit = reduceMotion ? undefined : { opacity: uiOpacity, y: uiY }

  return (
    <section ref={heroRef} className="hero-showroom relative min-h-[100svh] overflow-hidden bg-light">
      <Motion.div
        className="pointer-events-none absolute inset-0"
        style={reduceMotion ? undefined : { y: atmosphereY, x: hazeX }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-8%,rgba(143,31,31,0.13),transparent_58%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-sand/95 via-sand/40 to-transparent" />
        <div className="hero-floor-sheen" />
        {!reduceMotion ? (
          <Motion.div
            className="hero-keylight"
            style={{ left: lightX, top: lightY, x: '-50%', y: '-50%' }}
          />
        ) : null}
        <div className="hero-arch hero-arch-a" />
        <div className="hero-arch hero-arch-b" />
        <div className="hero-haze" />
        <div className="hero-horizon" />
      </Motion.div>

      <Motion.aside
        className="hero-aside hidden xl:flex"
        style={reduceMotion ? undefined : { opacity: annotateOpacity }}
        aria-label={t('hero.callout')}
      >
        {[t('hero.asideInsured'), t('hero.asideRating'), t('hero.asideSupport')].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </Motion.aside>

      <Motion.div
        className="hero-camera relative z-10 page-pad page-shell flex flex-col items-center pb-4 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] sm:pb-6 sm:pt-28 md:pb-8 md:pt-32"
        style={pullStyle}
      >
        <Motion.div className="w-full max-w-3xl text-center" style={copyExit}>
          <Motion.div
            className="mb-4 flex justify-center sm:mb-5 md:mb-6"
            style={reduceMotion ? undefined : { opacity: coverOpacity }}
          >
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
          </Motion.div>

          <Motion.p
            className="font-display text-5xl font-medium leading-none tracking-tight text-primary sm:text-6xl md:text-7xl"
            style={reduceMotion ? undefined : { letterSpacing: tracking }}
          >
            {BRAND_NAME}
          </Motion.p>
          <Motion.h1
            className="mt-3 font-display text-3xl font-medium leading-tight text-ink sm:mt-4 sm:text-4xl md:text-5xl"
            style={reduceMotion ? undefined : { opacity: coverOpacity }}
          >
            {t('hero.title')}
          </Motion.h1>
          <Motion.p
            className="mx-auto mt-3 max-w-xl text-sm font-light leading-relaxed text-muted sm:mt-4 sm:text-base md:text-lg"
            style={reduceMotion ? undefined : { opacity: coverOpacity }}
          >
            {t('hero.subtitle')}
          </Motion.p>
        </Motion.div>

        <Motion.form
          onSubmit={handleSearch}
          className={`relative z-20 mt-8 w-full max-w-4xl sm:mt-10 md:mt-11 ${frameReady ? '' : 'pointer-events-none'}`}
          style={copyExit}
        >
          <div className="hero-booking overflow-visible rounded-[1.25rem] border border-white/80 bg-white/92 shadow-[0_18px_50px_-34px_rgba(22,18,16,0.38)] backdrop-blur-md md:rounded-[1.6rem]">
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
                <button
                  type="submit"
                  className={`${booking.btnPrimary} booking-tap w-full md:w-[9.75rem]`}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  {t('hero.search')}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-3.5 px-2 text-center text-xs leading-relaxed tracking-wide text-muted sm:text-sm">
            {t('hero.trustLine')}
          </p>
        </Motion.form>

        <HeroCarStage camera={camera} reduceMotion={reduceMotion} />

        <Motion.ul
          className="hero-perks"
          style={reduceMotion ? undefined : { opacity: perkOpacity }}
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
      </Motion.div>
    </section>
  )
}

export default Hero

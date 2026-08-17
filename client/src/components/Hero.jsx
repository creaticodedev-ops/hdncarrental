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
    <section ref={heroRef} className="relative min-h-[100svh] overflow-x-clip bg-light">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-8%,rgba(143,31,31,0.14),transparent_58%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-sand/90 via-sand/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-[12%] h-px bg-gradient-to-r from-transparent via-ink/[0.06] to-transparent" />
      </div>

      <div className="relative z-10 page-pad page-shell flex flex-col items-center pb-4 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] sm:pb-6 sm:pt-28 md:pb-8 md:pt-32">
        <Motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: reduceMotion ? 0 : 0.55, ease: CINEMA }}
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
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: reduceMotion ? 0 : 0.78, ease: CINEMA }}
          onSubmit={handleSearch}
          className="mt-8 w-full max-w-4xl sm:mt-10 md:mt-12"
        >
          <div className="overflow-visible rounded-[1.35rem] border border-borderColor/90 bg-white shadow-[0_18px_50px_-28px_rgba(22,18,16,0.35)] md:rounded-[1.75rem]">
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
      </div>
    </section>
  )
}

export default Hero

import React, { useMemo, useState } from 'react'
import { HERO_IMAGE } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import DateRangePicker from './DateRangePicker'
import CitySelect from './CitySelect'
import { BRAND_NAME } from '../constants/brand'
import toast from 'react-hot-toast'
import { booking } from './ui/bookingUi'

const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('')
  const { t } = useI18n()
  const { pickupDate, setPickupDate, returnDate, setReturnDate, navigate, pickupLocations } = useAppContext()

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
    navigate(`/cars?${new URLSearchParams({
      pickupLocation,
      pickupDate: startISO,
      returnDate: endISO,
    }).toString()}`)
  }

  return (
    <section className="relative min-h-[100svh] overflow-x-clip bg-light">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(143,31,31,0.12),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-sand/80 to-transparent" />
      </div>

      <div className="relative z-10 page-pad page-shell flex flex-col items-center pb-12 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] sm:pb-16 sm:pt-28 md:pb-20 md:pt-32">
        <Motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="w-full max-w-3xl text-center"
        >
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
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: 'easeOut' }}
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

        <Motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: 'easeOut' }}
          className="mt-8 flex w-full max-w-3xl justify-center px-2 sm:mt-10 md:mt-14"
        >
          <picture>
            <source srcSet={HERO_IMAGE.webp} type="image/webp" />
            <img
              src={HERO_IMAGE.webp}
              alt={`${BRAND_NAME} premium rental`}
              width={900}
              height={506}
              decoding="async"
              fetchPriority="high"
              className="max-h-[200px] w-full select-none object-contain drop-shadow-[0_30px_60px_rgba(22,18,16,0.18)] sm:max-h-[280px] md:max-h-[340px]"
            />
          </picture>
        </Motion.div>
      </div>
    </section>
  )
}

export default Hero

import React, { useMemo } from 'react'
import Title from './Title'
import { assets } from '../assets/assets'
import CarCard from './CarCard'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import { groupCarsByCategory } from '../utils/vehicleCategories'

const FeaturedSection = () => {
  const navigate = useNavigate()
  const { cars } = useAppContext()
  const { t } = useI18n()

  const sections = useMemo(() => {
    const grouped = groupCarsByCategory(cars)
    return grouped.slice(0, 3).map((s) => ({
      ...s,
      cars: s.cars.slice(0, 3),
    }))
  }, [cars])

  return (
    <section className="relative hidden bg-light page-pad page-shell py-28 md:block">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-sand/60 to-transparent" />

      <Motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <Title
          eyebrow={t('featured.eyebrow')}
          title={t('featured.title')}
          subTitle={t('featured.subtitle')}
        />
      </Motion.div>

      <div className="mt-14 md:mt-16 space-y-14 md:space-y-16">
        {sections.map((section) => (
          <div key={section.category}>
            <div className="flex items-end justify-between gap-3 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary/70 mb-1">
                  {t('cars.categoryLabel')}
                </p>
                <h3 className="font-display text-2xl sm:text-3xl text-ink">{section.category}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigate(`/cars?category=${encodeURIComponent(section.category)}`)
                  window.scrollTo(0, 0)
                }}
                className="booking-tap inline-flex h-10 shrink-0 items-center text-xs text-primary hover:underline sm:text-sm"
              >
                {t('featured.viewCategory')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {section.cars.map((car, index) => (
                <Motion.div
                  key={car._id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.08, 0.32), ease: 'easeOut' }}
                >
                  <CarCard car={car} />
                </Motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex justify-center mt-14 md:mt-16"
      >
        <button
          type="button"
          onClick={() => { navigate('/cars'); window.scrollTo(0, 0) }}
          className="group booking-tap inline-flex h-12 items-center gap-2 rounded-2xl border border-ink/15 px-7 text-[15px] font-medium tracking-wide transition-all duration-300 hover:border-primary hover:text-primary cursor-pointer"
        >
          {t('featured.exploreAll')}
          <img src={assets.arrow_icon} alt="" className="h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </Motion.div>
    </section>
  )
}

export default FeaturedSection

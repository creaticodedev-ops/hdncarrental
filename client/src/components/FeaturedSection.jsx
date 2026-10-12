import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { assets } from '../assets/assets'
import { groupCarsByCategory } from '../utils/vehicleCategories'
import { formatLocationsDisplay } from '../utils/carLocations'
import { getDisplayDailyPrices, getPromotionBadgeLabel } from '../utils/promotionDisplay'
import { carDisplayName } from '../utils/carDisplay'
import './featuredShowroom.css'

const RAIL_LIMIT = 10

const carImage = (car) => car?.image || car?.images?.[0] || assets.car_image1
const carName = carDisplayName
const pad2 = (n) => String(n).padStart(2, '0')

const priceOf = (car) => {
  const prices = car?.displayPromotion ? getDisplayDailyPrices(car) : null
  if (prices) return prices
  return { original: Number(car?.pricePerDay) || 0, final: Number(car?.pricePerDay) || 0, showStrike: false, caption: '' }
}

const Spec = ({ icon, children }) => (
  <li className="fs-spec">
    <img src={icon} alt="" width={14} height={14} aria-hidden="true" />
    <span>{children}</span>
  </li>
)

const FeaturedSection = () => {
  const navigate = useNavigate()
  const { cars, carsLoading } = useAppContext()
  const { t } = useI18n()
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '

  const groups = useMemo(() => groupCarsByCategory((cars || []).filter((car) => car?._id)), [cars])
  const [category, setCategory] = useState('')
  const [activeId, setActiveId] = useState('')
  const sectionRef = useRef(null)
  const spotRef = useRef(null)
  const railRef = useRef(null)
  const [inView, setInView] = useState(false)

  const group = groups.find((g) => g.category === category) || groups[0]
  const railCars = group ? group.cars.slice(0, RAIL_LIMIT) : []
  const active = group?.cars.find((car) => car._id === activeId) || group?.cars[0]
  const activeIndex = active ? group.cars.indexOf(active) : -1

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return undefined
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return undefined
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  const openDetails = (car) => {
    navigate(`/car-details/${car._id}`)
    window.scrollTo(0, 0)
  }

  const openCategory = (name) => {
    navigate(`/cars?category=${encodeURIComponent(name)}`)
    window.scrollTo(0, 0)
  }

  const selectCategory = (name) => {
    setCategory(name)
    setActiveId('')
    railRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
  }

  const selectCar = (car) => {
    setActiveId(car._id)
    const node = spotRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    if (rect.top < 64) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      node.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
  }

  const scrollRail = (dir) => {
    const node = railRef.current
    if (!node) return
    node.scrollBy({ left: dir * Math.max(node.clientWidth * 0.8, 240), behavior: 'smooth' })
  }

  const price = active ? priceOf(active) : null
  const promoBadge = active?.displayPromotion ? getPromotionBadgeLabel(active.displayPromotion) : ''
  const hiddenCount = group ? group.cars.length - railCars.length : 0

  return (
    <section
      ref={sectionRef}
      className={`fs${inView ? ' is-in' : ''}`}
      aria-labelledby="featured-title"
    >
      <div className="fs-inner page-pad page-shell">
        <header className="fs-head">
          <div>
            <p className="fs-eyebrow">
              <span aria-hidden="true" />
              {t('featured.eyebrow')}
            </p>
            <h2 id="featured-title" className="fs-title">{t('featured.title')}</h2>
          </div>
          <p className="fs-sub">{t('featured.subtitle')}</p>
        </header>

        {groups.length > 1 ? (
          <div className="fs-tabs" role="group" aria-label={t('cars.categoryLabel')}>
            {groups.map((g) => {
              const selected = g.category === group?.category
              return (
                <button
                  key={g.category}
                  type="button"
                  aria-pressed={selected}
                  className={`fs-tab booking-tap${selected ? ' is-active' : ''}`}
                  onClick={() => selectCategory(g.category)}
                >
                  <span>{g.category}</span>
                  <span className="fs-tab-count">{pad2(g.cars.length)}</span>
                </button>
              )
            })}
          </div>
        ) : null}

        {!active ? (
          carsLoading ? (
            <div className="fs-skeleton" aria-hidden="true" />
          ) : (
            <p className="fs-empty">{t('cars.noCars')}</p>
          )
        ) : (
          <>
            <article ref={spotRef} key={active._id} className="fs-spot">
              <button
                type="button"
                className="fs-spot-media"
                onClick={() => openDetails(active)}
                aria-label={`${t('featured.viewDetails')} — ${carName(active)}`}
              >
                <img
                  src={carImage(active)}
                  onError={(e) => { e.currentTarget.src = assets.car_image1 }}
                  alt=""
                  width={1280}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
                <span className="fs-spot-index" aria-hidden="true">
                  {pad2(activeIndex + 1)}
                  <span> / {pad2(group.cars.length)}</span>
                </span>
                {promoBadge ? <span className="fs-promo">{promoBadge}</span> : null}
              </button>

              <div className="fs-spot-info">
                <p className="fs-meta">
                  <span>{active.category}</span>
                  {active.year ? <span>{active.year}</span> : null}
                  {active.isAvaliable ? <span className="fs-live">{t('carCard.available')}</span> : null}
                </p>
                <h3 className="fs-name">{carName(active)}</h3>

                <div className="fs-price">
                  {price.showStrike ? (
                    <span className="fs-price-was">{currency}{price.original}</span>
                  ) : null}
                  <span className="fs-price-now">
                    <span className="fs-price-cur">{currency.trim()}</span>
                    {price.final}
                  </span>
                  <span className="fs-price-unit">{t('carCard.perDay')}</span>
                  {price.caption && price.showStrike ? <span className="fs-price-tag">{price.caption}</span> : null}
                </div>

                <ul className="fs-specs">
                  {active.seating_capacity ? (
                    <Spec icon={assets.users_icon}>{t('carDetails.seats', { count: active.seating_capacity })}</Spec>
                  ) : null}
                  {active.fuel_type ? <Spec icon={assets.fuel_icon}>{active.fuel_type}</Spec> : null}
                  {active.transmission ? <Spec icon={assets.car_icon}>{active.transmission}</Spec> : null}
                  <Spec icon={assets.location_icon}>{formatLocationsDisplay(active)}</Spec>
                </ul>

                <div className="fs-actions">
                  <button type="button" className="fs-btn fs-btn-primary booking-tap" onClick={() => openDetails(active)}>
                    {t('carDetails.bookingHeadline')}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </button>
                  <button type="button" className="fs-btn fs-btn-ghost booking-tap" onClick={() => openCategory(group.category)}>
                    {t('featured.viewCategory')}
                  </button>
                </div>
              </div>
            </article>

            {group.cars.length > 1 ? (
              <div className="fs-rail-wrap">
                <div className="fs-rail-head">
                  <p>{t('featured.railLabel', { category: group.category })}</p>
                  <div className="fs-rail-nav">
                    <button type="button" className="fs-arrow booking-tap" onClick={() => scrollRail(-1)} aria-label={t('featured.prev')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button type="button" className="fs-arrow booking-tap" onClick={() => scrollRail(1)} aria-label={t('featured.next')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </div>
                </div>

                <ul ref={railRef} className="fs-rail">
                  {railCars.map((car, index) => {
                    const selected = car._id === active._id
                    const p = priceOf(car)
                    return (
                      <li key={car._id}>
                        <button
                          type="button"
                          className={`fs-card booking-tap${selected ? ' is-active' : ''}`}
                          aria-pressed={selected}
                          onClick={() => selectCar(car)}
                        >
                          <span className="fs-card-media">
                            <img
                              src={carImage(car)}
                              onError={(e) => { e.currentTarget.src = assets.car_image1 }}
                              alt=""
                              width={480}
                              height={300}
                              loading="lazy"
                              decoding="async"
                            />
                            <span className="fs-card-index" aria-hidden="true">{pad2(index + 1)}</span>
                          </span>
                          <span className="fs-card-body">
                            <span className="fs-card-name">{carName(car)}</span>
                            <span className="fs-card-row">
                              <span className="fs-card-year">{car.year || car.category}</span>
                              <span className="fs-card-price">
                                {currency}{p.final}
                                <small>{t('carCard.perDay')}</small>
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  {hiddenCount > 0 ? (
                    <li>
                      <button type="button" className="fs-card fs-card-more booking-tap" onClick={() => openCategory(group.category)}>
                        <span className="fs-more-count">+{hiddenCount}</span>
                        <span>{t('featured.seeAll', { count: group.cars.length })}</span>
                      </button>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <div className="fs-foot">
          <button
            type="button"
            onClick={() => { navigate('/cars'); window.scrollTo(0, 0) }}
            className="fs-btn fs-btn-outline booking-tap"
          >
            {t('featured.exploreAll')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}

export default FeaturedSection

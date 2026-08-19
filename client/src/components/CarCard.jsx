import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { formatLocationsDisplay } from '../utils/carLocations'
import PromotionBadge, { PromotionPriceTag } from './PromotionBadge'

const CarCard = ({ car }) => {
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const navigate = useNavigate()
  const { t } = useI18n()
  const fallbackImage = assets.car_image1
  const promo = car?.displayPromotion || null

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => { navigate(`/car-details/${car._id}`); window.scrollTo(0, 0) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/car-details/${car._id}`)
          window.scrollTo(0, 0)
        }
      }}
      className="group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 rounded-[1.25rem]"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.25rem] bg-sand ring-1 ring-borderColor/60 shadow-[0_12px_36px_-24px_rgba(22,18,16,0.35)]">
        <img
          src={car.image || car.images?.[0] || fallbackImage}
          onError={(e) => { e.currentTarget.src = fallbackImage }}
          alt={`${car.brand} ${car.model}`}
          width={640}
          height={400}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent opacity-90" />

        {promo ? <PromotionBadge promotion={promo} currency={currency} /> : null}

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 sm:bottom-3.5 sm:left-3.5 sm:right-3.5">
          <div className="min-w-0">
            {car.isAvaliable && (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85">
                {t('carCard.available')}
              </p>
            )}
            <h3 className="truncate font-display text-xl font-medium leading-tight text-white sm:text-[1.35rem]">
              {car.brand} {car.model}
            </h3>
            <p className="mt-0.5 truncate text-xs text-white/70">{car.category} · {car.year}</p>
          </div>
          {promo ? (
            <PromotionPriceTag
              promotion={promo}
              currency={currency}
              perDayLabel={t('carCard.perDay')}
            />
          ) : (
            <div className="shrink-0 rounded-xl bg-white/95 px-2.5 py-2 text-right shadow-sm backdrop-blur-sm">
              <p className="text-sm font-semibold leading-none tabular-nums text-ink">{currency}{car.pricePerDay}</p>
              <p className="mt-1 text-[10px] text-muted">{t('carCard.perDay')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 px-0.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <img src={assets.users_icon} alt="" className="h-3.5 opacity-70" />
          {t('carDetails.seats', { count: car.seating_capacity })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <img src={assets.fuel_icon} alt="" className="h-3.5 opacity-70" />
          {car.fuel_type}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <img src={assets.car_icon} alt="" className="h-3.5 opacity-70" />
          {car.transmission}
        </span>
        <span className="hidden min-w-0 items-center gap-1.5 sm:inline-flex">
          <img src={assets.location_icon} alt="" className="h-3.5 shrink-0 opacity-70" />
          <span className="truncate">{formatLocationsDisplay(car)}</span>
        </span>
      </div>
    </article>
  )
}

export default CarCard

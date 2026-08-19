import React, { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { useAppContext } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { assets } from '../assets/assets'
import { haptic } from '../utils/haptics'
import './premiumShowcase.css'

const SPEED = 22
const RESUME_MS = 1400

/**
 * Mobile-only compact fleet ticker. Desktop FeaturedSection stays unchanged.
 */
export default function PremiumVehicleShowcase() {
  const { cars } = useAppContext()
  const { t } = useI18n()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const scrollerRef = useRef(null)
  const interactingRef = useRef(false)
  const offscreenRef = useRef(false)
  const hiddenRef = useRef(false)
  const dragRef = useRef({ active: false, moved: false, x: 0 })

  const fleet = useMemo(() => (cars || []).filter((car) => car?._id).slice(0, 8), [cars])
  const loop = useMemo(() => (fleet.length ? [...fleet, ...fleet] : []), [fleet])
  const currency = import.meta.env.VITE_CURRENCY || 'MAD '

  useEffect(() => {
    const node = scrollerRef.current
    if (!node || reduceMotion || fleet.length < 2) return undefined

    let frame = 0
    let last = performance.now()
    let resumeAt = 0

    const tick = (now) => {
      const dt = Math.min(32, now - last)
      last = now
      const idle = !interactingRef.current && !offscreenRef.current && !hiddenRef.current
      if (idle && now >= resumeAt) {
        node.scrollLeft += (SPEED * dt) / 1000
        const half = node.scrollWidth / 2
        if (half > 0 && node.scrollLeft >= half) node.scrollLeft -= half
      }
      frame = window.requestAnimationFrame(tick)
    }

    const pause = () => {
      interactingRef.current = true
    }
    const resume = () => {
      interactingRef.current = false
      resumeAt = performance.now() + RESUME_MS
    }

    node.addEventListener('pointerdown', pause)
    node.addEventListener('pointerup', resume)
    node.addEventListener('pointercancel', resume)
    node.addEventListener('pointerleave', resume)
    node.addEventListener('touchstart', pause, { passive: true })
    node.addEventListener('touchend', resume, { passive: true })

    const onHidden = () => {
      hiddenRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', onHidden)

    const observer = new IntersectionObserver(
      ([entry]) => {
        offscreenRef.current = !entry.isIntersecting
      },
      { threshold: 0.12 },
    )
    observer.observe(node)

    frame = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onHidden)
      node.removeEventListener('pointerdown', pause)
      node.removeEventListener('pointerup', resume)
      node.removeEventListener('pointercancel', resume)
      node.removeEventListener('pointerleave', resume)
      node.removeEventListener('touchstart', pause)
      node.removeEventListener('touchend', resume)
    }
  }, [fleet.length, reduceMotion])

  if (fleet.length === 0) return null

  const openCar = (id) => {
    haptic('light')
    navigate(`/car-details/${id}`)
    window.scrollTo(0, 0)
  }

  return (
    <div className="pv-showcase" role="region" aria-label={t('featured.showcaseLabel')}>
      <div className="pv-showcase-head">
        <span className="pv-showcase-pip" aria-hidden="true" />
        <p>{t('featured.showcaseLabel')}</p>
      </div>

      <div
        ref={scrollerRef}
        className="pv-showcase-scroller"
        onPointerDown={(event) => {
          dragRef.current = { active: true, moved: false, x: event.clientX }
        }}
        onPointerMove={(event) => {
          if (!dragRef.current.active) return
          if (Math.abs(event.clientX - dragRef.current.x) > 8) dragRef.current.moved = true
        }}
        onPointerUp={() => {
          dragRef.current.active = false
        }}
      >
        {loop.map((car, index) => (
          <button
            key={`${car._id}-${index}`}
            type="button"
            className="pv-chip"
            onClick={() => {
              if (dragRef.current.moved) return
              openCar(car._id)
            }}
          >
            <img
              src={car.image || car.images?.[0] || assets.car_image1}
              alt=""
              width={96}
              height={64}
              loading={index < 3 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
            <span className="pv-chip-copy">
              <span className="pv-chip-name">
                {car.brand} {car.model}
              </span>
              <span className="pv-chip-price">
                {currency}
                {car.pricePerDay}
                <em>{t('carCard.perDay')}</em>
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

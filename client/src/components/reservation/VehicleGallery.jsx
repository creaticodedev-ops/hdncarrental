import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n/I18nContext'
import PromotionBadge from '../PromotionBadge'

const pad = (n) => String(n).padStart(2, '0')

/**
 * Merge the legacy single `image` with `images[]`, dropping blanks and duplicates
 * while keeping source order. Always yields at least one entry so the frame never
 * collapses.
 */
const resolveGalleryImages = (car, fallback) => {
  const seen = new Set()
  const out = []
  for (const raw of [car?.image, ...(Array.isArray(car?.images) ? car.images : [])]) {
    const url = typeof raw === 'string' ? raw.trim() : ''
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out.length ? out : [fallback]
}

const Chevron = ({ back = false }) => (
  <svg
    className={`h-4 w-4 ${back ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)

/**
 * Vehicle photo viewer: arrows, position counter, thumbnail rail, swipe and
 * arrow-key navigation. Falls back to a single frame when the car has one photo.
 */
export default function VehicleGallery({ car, fallbackImage, currency, alt }) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const images = useMemo(() => resolveGalleryImages(car, fallbackImage), [car, fallbackImage])
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [failed, setFailed] = useState(() => new Set())
  const swipeStart = useRef(null)

  const count = images.length
  const multiple = count > 1

  // A new vehicle (or a shorter image list) must not leave the index dangling.
  useEffect(() => {
    setIndex(0)
    setDirection(1)
    setFailed(new Set())
  }, [car?._id])

  const go = useCallback(
    (delta) => {
      if (count < 2) return
      setDirection(delta > 0 ? 1 : -1)
      setIndex((prev) => (prev + delta + count) % count)
    },
    [count],
  )

  const jumpTo = useCallback(
    (next) => {
      setDirection(next > index ? 1 : -1)
      setIndex(next)
    },
    [index],
  )

  const srcFor = useCallback(
    (url) => (failed.has(url) ? fallbackImage : url),
    [failed, fallbackImage],
  )

  const markFailed = useCallback((url) => {
    setFailed((prev) => (prev.has(url) ? prev : new Set(prev).add(url)))
  }, [])

  // Warm the neighbouring frames so arrow clicks feel instant.
  useEffect(() => {
    if (!multiple) return
    for (const offset of [1, -1]) {
      const img = new Image()
      img.src = srcFor(images[(index + offset + count) % count])
    }
  }, [images, index, count, multiple, srcFor])

  const onKeyDown = (event) => {
    if (!multiple) return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(-1)
    }
  }

  const onPointerDown = (event) => {
    if (!multiple || event.pointerType === 'mouse') return
    swipeStart.current = { x: event.clientX, y: event.clientY }
  }

  const onPointerUp = (event) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = event.clientX - start.x
    // Ignore mostly-vertical gestures so page scrolling still wins.
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(event.clientY - start.y)) return
    go(dx < 0 ? 1 : -1)
  }

  const current = images[index]
  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: direction * 36 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: direction * -36 },
      }

  return (
    <div>
      <div
        className="group relative overflow-hidden bg-gradient-to-b from-light to-sand/50 select-none"
        role={multiple ? 'group' : undefined}
        aria-roledescription={multiple ? 'carousel' : undefined}
        aria-label={multiple ? alt : undefined}
        tabIndex={multiple ? 0 : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="relative aspect-[16/10] w-full sm:aspect-[16/9] lg:aspect-[16/10]">
          <AnimatePresence initial={false} mode="popLayout">
            <Motion.img
              key={`${current}-${index}`}
              src={srcFor(current)}
              onError={() => markFailed(current)}
              alt={count > 1 ? `${alt} — ${index + 1}/${count}` : alt}
              width={1280}
              height={720}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              initial={slide.initial}
              animate={slide.animate}
              exit={slide.exit}
              transition={{ duration: reduceMotion ? 0.15 : 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.02]"
            />
          </AnimatePresence>

          {/* Keeps the counter legible over bright bodywork. */}
          {multiple ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/35 to-transparent"
              aria-hidden
            />
          ) : null}
        </div>

        {car?.displayPromotion ? (
          <PromotionBadge promotion={car.displayPromotion} currency={currency} />
        ) : null}

        {multiple ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('carDetails.galleryPrev')}
              className="booking-tap absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-ink shadow-[0_10px_30px_-12px_rgba(22,18,16,0.45)] ring-1 ring-black/5 backdrop-blur-md transition duration-200 hover:bg-white hover:text-primary active:scale-95 cursor-pointer sm:left-5"
            >
              <Chevron back />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('carDetails.galleryNext')}
              className="booking-tap absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-ink shadow-[0_10px_30px_-12px_rgba(22,18,16,0.45)] ring-1 ring-black/5 backdrop-blur-md transition duration-200 hover:bg-white hover:text-primary active:scale-95 cursor-pointer sm:right-5"
            >
              <Chevron />
            </button>

            <div
              className="absolute inset-x-0 bottom-3.5 flex justify-center sm:bottom-4"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="rounded-full bg-ink/70 px-3 py-1 text-[11px] font-semibold tabular-nums tracking-[0.08em] text-white backdrop-blur-md">
                {pad(index + 1)} <span className="text-white/55">/</span> {pad(count)}
              </span>
            </div>
          </>
        ) : null}
      </div>

      {multiple ? (
        <ul className="flex gap-2 overflow-x-auto px-4 pt-3.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          {images.map((url, i) => (
            <li key={`${url}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={t('carDetails.galleryGoTo', { index: i + 1 })}
                aria-current={i === index ? 'true' : undefined}
                className={`relative block h-14 w-20 overflow-hidden rounded-xl ring-1 transition duration-200 cursor-pointer sm:h-16 sm:w-24 ${
                  i === index
                    ? 'ring-2 ring-primary'
                    : 'ring-borderColor/70 opacity-65 hover:opacity-100 hover:ring-ink/25'
                }`}
              >
                <img
                  src={srcFor(url)}
                  onError={() => markFailed(url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

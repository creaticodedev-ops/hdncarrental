import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {back ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
  </svg>
)

/**
 * Vehicle photo stage: crossfading frames, counter, arrows, filmstrip, swipe and
 * arrow-key navigation. Falls back to a single frame when the car has one photo.
 */
export default function VehicleGallery({ car, fallbackImage, currency, alt }) {
  const { t } = useI18n()
  const images = useMemo(() => resolveGalleryImages(car, fallbackImage), [car, fallbackImage])
  const [index, setIndex] = useState(0)
  const [prev, setPrev] = useState(null)
  const [direction, setDirection] = useState(1)
  const [failed, setFailed] = useState(() => new Set())
  const swipeStart = useRef(null)
  const stripRef = useRef(null)

  const count = images.length
  const multiple = count > 1

  useEffect(() => {
    setIndex(0)
    setPrev(null)
    setDirection(1)
    setFailed(new Set())
  }, [car?._id])

  const show = useCallback(
    (next, dir) => {
      if (next === index) return
      setDirection(dir)
      setPrev(index)
      setIndex(next)
    },
    [index],
  )

  const go = useCallback(
    (delta) => {
      if (count < 2) return
      show((index + delta + count) % count, delta > 0 ? 1 : -1)
    },
    [count, index, show],
  )

  const srcFor = useCallback(
    (url) => (failed.has(url) ? fallbackImage : url),
    [failed, fallbackImage],
  )

  const markFailed = useCallback((url) => {
    setFailed((p) => (p.has(url) ? p : new Set(p).add(url)))
  }, [])

  // Warm the neighbouring frames so arrow clicks feel instant.
  useEffect(() => {
    if (!multiple) return
    for (const offset of [1, -1]) {
      const img = new Image()
      img.src = srcFor(images[(index + offset + count) % count])
    }
  }, [images, index, count, multiple, srcFor])

  useEffect(() => {
    const strip = stripRef.current
    const thumb = strip?.children[index]
    if (!strip || !thumb) return
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2
    strip.scrollTo({ left, behavior: 'smooth' })
  }, [index])

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

  return (
    <div className="cd-gallery">
      <div
        className="cd-stage"
        role={multiple ? 'group' : undefined}
        aria-roledescription={multiple ? 'carousel' : undefined}
        aria-label={multiple ? alt : undefined}
        tabIndex={multiple ? 0 : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ '--cd-dir': direction }}
      >
        {prev != null && prev !== index ? (
          <img
            key={`prev-${prev}`}
            src={srcFor(images[prev])}
            alt=""
            aria-hidden="true"
            className="cd-stage-img is-under"
            draggable={false}
          />
        ) : null}
        <img
          key={`${current}-${index}`}
          src={srcFor(current)}
          onError={() => markFailed(current)}
          alt={multiple ? `${alt} — ${index + 1}/${count}` : alt}
          width={1280}
          height={800}
          fetchPriority={index === 0 ? 'high' : 'auto'}
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          className={`cd-stage-img${prev != null ? ' is-swap' : ''}`}
          onAnimationEnd={() => setPrev(null)}
        />

        {car?.displayPromotion ? (
          <PromotionBadge promotion={car.displayPromotion} currency={currency} />
        ) : null}

        {multiple ? (
          <div className="cd-stage-bar">
            <p className="cd-stage-count" aria-live="polite" aria-atomic="true">
              {pad(index + 1)}
              <span> / {pad(count)}</span>
            </p>
            <div className="cd-stage-nav">
              <button type="button" onClick={() => go(-1)} aria-label={t('carDetails.galleryPrev')} className="cd-round booking-tap">
                <Chevron back />
              </button>
              <button type="button" onClick={() => go(1)} aria-label={t('carDetails.galleryNext')} className="cd-round booking-tap">
                <Chevron />
              </button>
            </div>
            <span className="cd-stage-progress" aria-hidden="true">
              <span style={{ width: `${((index + 1) / count) * 100}%` }} />
            </span>
          </div>
        ) : null}
      </div>

      {multiple ? (
        <ul ref={stripRef} className="cd-strip">
          {images.map((url, i) => (
            <li key={`${url}-${i}`}>
              <button
                type="button"
                onClick={() => show(i, i > index ? 1 : -1)}
                aria-label={t('carDetails.galleryGoTo', { index: i + 1 })}
                aria-current={i === index ? 'true' : undefined}
                className={`cd-thumb booking-tap${i === index ? ' is-active' : ''}`}
              >
                <img
                  src={srcFor(url)}
                  onError={() => markFailed(url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

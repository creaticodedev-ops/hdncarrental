import React, { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useHeroLiveStatus } from './useHeroLiveStatus'

const CX = 60
const CY = 60
const SPEEDO_START = 225
const SPEEDO_SPAN = 270
const TEMP_TICKS = 11

const SECOND_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Casablanca',
  second: '2-digit',
  hourCycle: 'h23',
})

const moroccoSecond = (date) => {
  const part = SECOND_FMT.formatToParts(date).find((item) => item.type === 'second')
  return Number(part?.value || 0)
}

const polar = (angleDeg, radius) => {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)]
}

const SPEEDO_MARKS = Array.from({ length: 37 }, (_, i) => {
  const angle = SPEEDO_START + (SPEEDO_SPAN * i) / 36
  const major = i % 3 === 0
  const [x1, y1] = polar(angle, major ? 47.5 : 49.2)
  const [x2, y2] = polar(angle, 53)
  return { x1, y1, x2, y2, major }
})

const CHRONO_MARKS = Array.from({ length: 60 }, (_, i) => {
  const angle = i * 6
  const major = i % 5 === 0
  const [x1, y1] = polar(angle, major ? 38.5 : 40.2)
  const [x2, y2] = polar(angle, 42.5)
  return { x1, y1, x2, y2, major }
})

/**
 * Luxury instrument cluster — time lives in a speedo-like gauge.
 * Seconds sweep is real Morocco time. No fake vehicle speed.
 */
export default function HeroLiveBadge() {
  const { hourMinute, period, city, temperatureC, tempRatio, aria } = useHeroLiveStatus()
  const reduceMotion = useReducedMotion()
  const needleRef = useRef(null)

  useEffect(() => {
    const apply = (smooth) => {
      const node = needleRef.current
      if (!node) return
      const now = new Date()
      const seconds = moroccoSecond(now) + (smooth ? now.getMilliseconds() / 1000 : 0)
      node.setAttribute('transform', `rotate(${seconds * 6} ${CX} ${CY})`)
    }

    apply(!reduceMotion && !window.matchMedia('(max-width: 767px)').matches)
    if (reduceMotion || window.matchMedia('(max-width: 767px)').matches) return undefined

    let frame = 0
    const loop = () => {
      apply(true)
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [reduceMotion])

  const tempIndex =
    tempRatio == null ? -1 : Math.round(tempRatio * (TEMP_TICKS - 1))

  return (
    <div className="hero-live" aria-label={aria}>
      <div className="hero-live-rail">
        <span className={`hero-live-pip${reduceMotion ? '' : ' is-live'}`} aria-hidden="true" />
        <span className="hero-live-rail-time">{hourMinute}{period ? ` ${period}` : ''}</span>
        <span className="hero-live-rail-rule" aria-hidden="true" />
        <span className="hero-live-rail-temp">
          {temperatureC != null ? `${temperatureC}°` : '—'}
        </span>
        <span className="hero-live-rail-rule" aria-hidden="true" />
        <span className="hero-live-rail-city">{city.toUpperCase()}</span>
      </div>

      <div className="hero-live-cluster-wrap">
        <div className="hero-live-head">
          <span className={`hero-live-pip${reduceMotion ? '' : ' is-live'}`} aria-hidden="true" />
          <span>LIVE</span>
          <span className="hero-live-dot" aria-hidden="true" />
          <span>{city.toUpperCase()}</span>
        </div>

        <div className="hero-live-cluster">
          <div className="hero-live-disc">
            <svg className="hero-live-gauge" viewBox="0 0 120 120" aria-hidden="true">
              <path
                className="hero-live-arc"
                d="M26.1 93.9 A 48 48 0 1 1 93.9 93.9"
                fill="none"
              />
              {SPEEDO_MARKS.map((mark) => (
                <line
                  key={`s-${mark.x1}-${mark.y1}`}
                  x1={mark.x1}
                  y1={mark.y1}
                  x2={mark.x2}
                  y2={mark.y2}
                  className={mark.major ? 'is-major' : ''}
                />
              ))}
              {CHRONO_MARKS.map((mark) => (
                <line
                  key={`c-${mark.x1}-${mark.y1}`}
                  x1={mark.x1}
                  y1={mark.y1}
                  x2={mark.x2}
                  y2={mark.y2}
                  className={mark.major ? 'is-major is-chrono' : 'is-chrono'}
                />
              ))}
              {!reduceMotion ? (
                <g className="hero-live-scan">
                  <circle cx="60" cy="8.5" r="1.35" />
                </g>
              ) : null}
              <g ref={needleRef}>
                <line className="hero-live-needle" x1="60" y1="60" x2="60" y2="24" />
                <circle className="hero-live-hub" cx="60" cy="60" r="1.6" />
              </g>
            </svg>

            <div className="hero-live-readout">
              <span className="hero-live-time">{hourMinute}</span>
              {period ? <span className="hero-live-period">{period}</span> : null}
            </div>
          </div>

          <div className="hero-live-temp" aria-hidden="true">
            {Array.from({ length: TEMP_TICKS }, (_, i) => (
              <span
                key={i}
                className={i === TEMP_TICKS - 1 - tempIndex ? 'is-active' : ''}
              />
            ))}
          </div>
        </div>

        <div className="hero-live-course" aria-hidden="true">
          <span className="hero-live-streak" />
          <span className="hero-live-diamond" />
          <span className="hero-live-streak" />
        </div>

        <div className="hero-live-foot">
          <span>{temperatureC != null ? `${temperatureC}°C` : '—'}</span>
          <span>ROAD</span>
          <span>LOCAL</span>
        </div>
      </div>
    </div>
  )
}

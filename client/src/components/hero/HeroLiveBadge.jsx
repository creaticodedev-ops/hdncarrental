import React from 'react'
import { useHeroLiveStatus } from './useHeroLiveStatus'

/**
 * Ambient showroom conditions. Revealed by the hero camera — no entrance animation.
 */
export default function HeroLiveBadge() {
  const { time, city, temperatureC, aria } = useHeroLiveStatus()

  return (
    <div className="hero-live" aria-label={aria}>
      <div className="hero-live-row">
        <span className="hero-live-pip" aria-hidden="true" />
        <span className="hero-live-time">{time}</span>
      </div>
      <p className="hero-live-meta">
        {temperatureC != null ? `${temperatureC}°C · ${city}` : city}
      </p>
    </div>
  )
}

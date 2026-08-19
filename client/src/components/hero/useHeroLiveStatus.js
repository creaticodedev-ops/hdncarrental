import { useEffect, useState } from 'react'
import { NAP } from '../../seo/constants'
import { useI18n } from '../../i18n/I18nContext'

/** Showroom conditions — HQ locality, agency timezone. No browser geolocation. */
export const HERO_LIVE = {
  city: NAP.addressLocality,
  latitude: 32.2994,
  longitude: -9.2372,
  timezone: 'Africa/Casablanca',
}

const CACHE_KEY = 'hdn-hero-wx-v1'
const CACHE_MS = 20 * 60 * 1000
const LOCALES = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' }

const readCache = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '')
    if (!parsed || Date.now() - parsed.at > CACHE_MS) return null
    if (typeof parsed.temperatureC !== 'number' || Number.isNaN(parsed.temperatureC)) return null
    return parsed.temperatureC
  } catch {
    return null
  }
}

const writeCache = (temperatureC) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), temperatureC }))
  } catch {
    /* private mode */
  }
}

const formatTime = (date, language) =>
  new Intl.DateTimeFormat(LOCALES[language] || 'en-US', {
    timeZone: HERO_LIVE.timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: language === 'en',
  }).format(date)

export function useHeroLiveStatus() {
  const { language, t } = useI18n()
  const [now, setNow] = useState(() => new Date())
  const [temperatureC, setTemperatureC] = useState(null)

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    const cached = readCache()
    if (cached != null) {
      setTemperatureC(cached)
      return undefined
    }

    const ctrl = new AbortController()
    const params = new URLSearchParams({
      latitude: String(HERO_LIVE.latitude),
      longitude: String(HERO_LIVE.longitude),
      current: 'temperature_2m',
      timezone: HERO_LIVE.timezone,
    })

    fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('weather'))))
      .then((data) => {
        const value = data?.current?.temperature_2m
        if (typeof value !== 'number' || Number.isNaN(value)) return
        const rounded = Math.round(value)
        setTemperatureC(rounded)
        writeCache(rounded)
      })
      .catch(() => {})

    return () => ctrl.abort()
  }, [])

  const time = formatTime(now, language)
  const city = HERO_LIVE.city
  const aria =
    temperatureC == null
      ? t('hero.liveAriaTime', { time, city })
      : t('hero.liveAria', { time, city, temp: String(temperatureC) })

  return { time, city, temperatureC, aria }
}

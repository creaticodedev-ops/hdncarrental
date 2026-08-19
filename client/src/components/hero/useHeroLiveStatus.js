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

const clockParts = (date, language) => {
  const fmt = new Intl.DateTimeFormat(LOCALES[language] || 'en-US', {
    timeZone: HERO_LIVE.timezone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: language === 'en',
  })
  const map = {}
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  const hour = map.hour || '0'
  const minute = map.minute || '00'
  const second = Number(map.second || 0)
  const period = map.dayPeriod || ''
  return {
    hourMinute: `${hour}:${minute}`,
    period,
    second,
    time: period ? `${hour}:${minute} ${period}` : `${hour}:${minute}`,
  }
}

export function useHeroLiveStatus() {
  const { language, t } = useI18n()
  const [now, setNow] = useState(() => new Date())
  const [temperatureC, setTemperatureC] = useState(null)

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000)
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

  const clock = clockParts(now, language)
  const city = HERO_LIVE.city
  const tempRatio =
    temperatureC == null ? null : Math.min(1, Math.max(0, (temperatureC - 6) / 36))
  const aria =
    temperatureC == null
      ? t('hero.liveAriaTime', { time: clock.time, city })
      : t('hero.liveAria', { time: clock.time, city, temp: String(temperatureC) })

  return {
    ...clock,
    city,
    temperatureC,
    tempRatio,
    aria,
  }
}

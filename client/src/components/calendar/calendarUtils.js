export const WEEKDAYS = {
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
}

export const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
}

export const pad = (n) => String(n).padStart(2, '0')

export const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const addMonths = (date, count) => new Date(date.getFullYear(), date.getMonth() + count, 1)

export const sameDay = (a, b) =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate())

export const isBeforeDay = (a, b) => a.getTime() < b.getTime()
export const isAfterDay = (a, b) => a.getTime() > b.getTime()

export const toISODate = (date) => {
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const parseISODate = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return null
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setHours(0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Parse date (`YYYY-MM-DD`), datetime-local (`YYYY-MM-DDTHH:mm`), or time (`HH:mm`). */
export const parseFieldValue = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return { date: null, hours: 10, minutes: 0 }
  if (/^\d{2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(':').map(Number)
    return { date: null, hours: Number.isFinite(h) ? h : 10, minutes: Number.isFinite(m) ? m : 0 }
  }
  const date = parseISODate(raw)
  const timePart = raw.includes('T') ? raw.slice(11, 16) : ''
  const [h, m] = timePart.split(':').map(Number)
  return {
    date,
    hours: Number.isFinite(h) ? h : 10,
    minutes: Number.isFinite(m) ? m : 0,
  }
}

export const toDateValue = (date) => toISODate(date)

export const toDateTimeValue = (date, hours, minutes) => {
  if (!date) return ''
  return `${toISODate(date)}T${pad(hours)}:${pad(minutes)}`
}

export const toTimeValue = (hours, minutes) => `${pad(hours)}:${pad(minutes)}`

export const parseBound = (value, asEnd = false) => {
  if (!value) return null
  const raw = String(value).trim()
  if (raw.includes('T')) {
    const { date, hours, minutes } = parseFieldValue(raw)
    if (!date) return null
    const d = new Date(date)
    d.setHours(hours, minutes, asEnd ? 59 : 0, asEnd ? 999 : 0)
    return d
  }
  const date = parseISODate(raw)
  if (!date) return null
  if (asEnd) date.setHours(23, 59, 59, 999)
  return date
}

export const buildMonthCells = (year, month) => {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - startOffset)
  start.setHours(0, 0, 0, 0)
  const cells = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    date.setHours(0, 0, 0, 0)
    cells.push({ date, inMonth: date.getMonth() === month })
  }
  return cells
}

export const minuteOptions = (current) => {
  const set = new Set()
  for (let m = 0; m < 60; m += 5) set.add(m)
  if (Number.isFinite(current)) set.add(current)
  return [...set].sort((a, b) => a - b)
}

export const formatDisplay = (value, language, mode) => {
  const { date, hours, minutes } = parseFieldValue(value)
  if (mode === 'time') {
    if (!String(value || '').trim()) return ''
    return `${pad(hours)}:${pad(minutes)}`
  }
  if (!date) return ''
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'
  const day = date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  if (mode !== 'datetime') return day
  return `${day} · ${pad(hours)}:${pad(minutes)}`
}

export const dateLocale = (language) => (language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB')

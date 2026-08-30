import { pad, parseISODate, parseFieldValue, toDateValue, toDateTimeValue, toTimeValue } from './calendarUtils'

export const DATE_PLACEHOLDER = {
  en: 'DD/MM/YYYY',
  fr: 'JJ/MM/AAAA',
  es: 'DD/MM/AAAA',
  ar: 'DD/MM/YYYY',
}

export const DATETIME_PLACEHOLDER = {
  en: 'DD/MM/YYYY HH:mm',
  fr: 'JJ/MM/AAAA HH:mm',
  es: 'DD/MM/AAAA HH:mm',
  ar: 'DD/MM/YYYY HH:mm',
}

export const TIME_PLACEHOLDER = {
  en: 'HH:mm',
  fr: 'HH:mm',
  es: 'HH:mm',
  ar: 'HH:mm',
}

export const digitsOnly = (value) => String(value || '').replace(/\D/g, '')

export const maskPlaceholder = (language, mode) => {
  const lang = DATE_PLACEHOLDER[language] ? language : 'en'
  if (mode === 'time') return TIME_PLACEHOLDER[lang]
  if (mode === 'datetime') return DATETIME_PLACEHOLDER[lang]
  return DATE_PLACEHOLDER[lang]
}

export const formatDateFromDigits = (digits) => {
  const d = digitsOnly(digits).slice(0, 8)
  if (d.length <= 2) return d.length === 2 ? `${d}/` : d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}${d.length === 4 ? '/' : ''}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

export const formatTimeFromDigits = (digits) => {
  const d = digitsOnly(digits).slice(0, 4)
  if (d.length <= 2) return d.length === 2 ? `${d}:` : d
  return `${d.slice(0, 2)}:${d.slice(2)}`
}

export const formatDateTimeFromDigits = (digits) => {
  const d = digitsOnly(digits).slice(0, 12)
  const date = formatDateFromDigits(d.slice(0, 8))
  if (d.length <= 8) return d.length === 8 ? `${date} ` : date
  return `${formatDateFromDigits(d.slice(0, 8))} ${formatTimeFromDigits(d.slice(8))}`
}

export const formatDate = (date) => {
  if (!date) return ''
  return formatDateFromDigits(`${pad(date.getDate())}${pad(date.getMonth() + 1)}${date.getFullYear()}`)
}

export const formatMaskFromValue = (value, mode) => {
  const { date, hours, minutes } = parseFieldValue(value)
  if (mode === 'time') {
    if (!String(value || '').trim()) return ''
    return formatTimeFromDigits(`${pad(hours)}${pad(minutes)}`)
  }
  if (!date) return ''
  const datePart = formatDate(date)
  if (mode !== 'datetime') return datePart
  return `${datePart} ${formatTimeFromDigits(`${pad(hours)}${pad(minutes)}`)}`
}

export const appendDateDigit = (existing, ch) => {
  if (!/^\d$/.test(ch)) return existing
  const n = existing.length
  if (n >= 8) return existing
  if (n === 0) return ch > '3' ? `0${ch}` : ch
  if (n === 1) {
    if (existing[0] === '0' && ch === '0') return existing
    if (existing[0] === '3' && ch > '1') return existing
    return existing + ch
  }
  if (n === 2) return ch > '1' ? `${existing}0${ch}` : existing + ch
  if (n === 3) {
    if (existing[2] === '0' && ch === '0') return existing
    if (existing[2] === '1' && ch > '2') return existing
    return existing + ch
  }
  return existing + ch
}

export const appendTimeDigit = (existing, ch) => {
  if (!/^\d$/.test(ch)) return existing
  const n = existing.length
  if (n >= 4) return existing
  if (n === 0) return ch > '2' ? `0${ch}` : ch
  if (n === 1) {
    if (existing[0] === '2' && ch > '3') return existing
    return existing + ch
  }
  if (n === 2) return ch > '5' ? existing : existing + ch
  return existing + ch
}

export const appendDateTimeDigit = (existing, ch) => {
  if (!/^\d$/.test(ch)) return existing
  if (existing.length >= 12) return existing
  if (existing.length < 8) return appendDateDigit(existing, ch)
  return existing.slice(0, 8) + appendTimeDigit(existing.slice(8), ch)
}

const ingestIsoDateDigits = (raw) => {
  const iso = parseISODate(raw)
  if (!iso) return ''
  return `${pad(iso.getDate())}${pad(iso.getMonth() + 1)}${iso.getFullYear()}`
}

export const ingestDateDigits = (raw) => {
  const text = String(raw || '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return ingestIsoDateDigits(text)
  return digitsOnly(text).slice(0, 8)
}

export const ingestTimeDigits = (raw) => digitsOnly(raw).slice(0, 4)

export const ingestDateTimeDigits = (raw) => {
  const text = String(raw || '').trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    const { date, hours, minutes } = parseFieldValue(text)
    if (!date) return ''
    return `${pad(date.getDate())}${pad(date.getMonth() + 1)}${date.getFullYear()}${pad(hours)}${pad(minutes)}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return ingestIsoDateDigits(text)
  return digitsOnly(text).slice(0, 12)
}

const applySegment = (prevDigits, nextRaw, max, append, ingest) => {
  const incoming = ingest(nextRaw)
  if (incoming.length < prevDigits.length) return incoming.slice(0, max)
  if (incoming.length === prevDigits.length + 1 && incoming.startsWith(prevDigits)) {
    return append(prevDigits, incoming.slice(-1))
  }
  if (incoming.length === prevDigits.length) return incoming
  return incoming.slice(0, max)
}

export const applyDateInput = (prevDigits, nextRaw) =>
  applySegment(prevDigits, nextRaw, 8, appendDateDigit, ingestDateDigits)

export const applyTimeInput = (prevDigits, nextRaw) =>
  applySegment(prevDigits, nextRaw, 4, appendTimeDigit, ingestTimeDigits)

export const applyDateTimeInput = (prevDigits, nextRaw) =>
  applySegment(prevDigits, nextRaw, 12, appendDateTimeDigit, ingestDateTimeDigits)

export const parseDateDigits = (digits) => {
  const d = digitsOnly(digits)
  if (d.length !== 8) return { complete: false, valid: false, date: null }
  const day = Number(d.slice(0, 2))
  const month = Number(d.slice(2, 4))
  const year = Number(d.slice(4, 8))
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return { complete: true, valid: false, date: null }
  }
  const lastDay = new Date(year, month, 0).getDate()
  if (day > lastDay) return { complete: true, valid: false, date: null }
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { complete: true, valid: false, date: null }
  }
  return { complete: true, valid: true, date }
}

export const parseTimeDigits = (digits) => {
  const d = digitsOnly(digits)
  if (d.length !== 4) return { complete: false, valid: false, hours: 0, minutes: 0 }
  const hours = Number(d.slice(0, 2))
  const minutes = Number(d.slice(2, 4))
  if (hours > 23 || minutes > 59) return { complete: true, valid: false, hours, minutes }
  return { complete: true, valid: true, hours, minutes }
}

export const isDateInBounds = (date, minDay, maxDay) => {
  if (!date) return false
  if (minDay && date.getTime() < minDay.getTime()) return false
  if (maxDay && date.getTime() > maxDay.getTime()) return false
  return true
}

export const caretFromDigitIndex = (formatted, digitIndex) => {
  if (digitIndex <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1
      if (seen >= digitIndex) return i + 1
    }
  }
  return formatted.length
}

export const digitIndexFromCaret = (formatted, caret) =>
  digitsOnly(String(formatted || '').slice(0, Math.max(0, caret))).length

export const formatFromDigits = (digits, mode) => {
  if (mode === 'time') return formatTimeFromDigits(digits)
  if (mode === 'datetime') return formatDateTimeFromDigits(digits)
  return formatDateFromDigits(digits)
}

export const applyMaskInput = (prevDigits, nextRaw, mode) => {
  if (mode === 'time') return applyTimeInput(prevDigits, nextRaw)
  if (mode === 'datetime') return applyDateTimeInput(prevDigits, nextRaw)
  return applyDateInput(prevDigits, nextRaw)
}

export const parseMaskDigits = (digits, mode) => {
  if (mode === 'time') return parseTimeDigits(digits)
  if (mode === 'datetime') {
    const datePart = parseDateDigits(digits.slice(0, 8))
    const timePart = digits.length > 8 ? parseTimeDigits(digits.slice(8, 12)) : { complete: false, valid: false, hours: 0, minutes: 0 }
    return { datePart, timePart }
  }
  return parseDateDigits(digits)
}

export const commitMaskValue = (digits, mode, fallbackHours = 10, fallbackMinutes = 0) => {
  if (mode === 'time') {
    const parsed = parseTimeDigits(digits)
    if (!parsed.complete) return { ready: false, valid: false, value: '' }
    if (!parsed.valid) return { ready: true, valid: false, value: '' }
    return { ready: true, valid: true, value: toTimeValue(parsed.hours, parsed.minutes), hours: parsed.hours, minutes: parsed.minutes }
  }
  if (mode === 'datetime') {
    const datePart = parseDateDigits(digits.slice(0, 8))
    if (!datePart.complete) return { ready: false, valid: false, value: '', date: null }
    if (!datePart.valid) return { ready: true, valid: false, value: '', date: null }
    const timeDigits = digits.slice(8, 12)
    let hours = fallbackHours
    let minutes = fallbackMinutes
    if (timeDigits.length === 4) {
      const timePart = parseTimeDigits(timeDigits)
      if (!timePart.valid) return { ready: true, valid: false, value: '', date: datePart.date }
      hours = timePart.hours
      minutes = timePart.minutes
    } else if (timeDigits.length > 0) {
      return { ready: false, valid: false, value: '', date: datePart.date }
    }
    return {
      ready: true,
      valid: true,
      value: toDateTimeValue(datePart.date, hours, minutes),
      date: datePart.date,
      hours,
      minutes,
    }
  }
  const parsed = parseDateDigits(digits)
  if (!parsed.complete) return { ready: false, valid: false, value: '', date: null }
  if (!parsed.valid) return { ready: true, valid: false, value: '', date: null }
  return { ready: true, valid: true, value: toDateValue(parsed.date), date: parsed.date }
}

/** Drop the digit before a separator when Backspace hits `/`, `:` or a space. */
export const backspaceThroughSeparator = (formatted, caret) => {
  if (caret <= 0) return null
  const ch = formatted[caret - 1]
  if (ch !== '/' && ch !== ':' && ch !== ' ') return null
  const digits = digitsOnly(formatted.slice(0, caret - 1) + formatted.slice(caret))
  return digits.slice(0, Math.max(0, digits.length - 1))
}

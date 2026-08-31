import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext'
import CalendarGrid, { monthLabel } from './calendar/CalendarGrid'
import {
  addMonths,
  isAfterDay,
  isBeforeDay,
  parseISODate,
  startOfDay,
  toISODate,
} from './calendar/calendarUtils'
import {
  applyDateInput,
  backspaceThroughSeparator,
  caretFromDigitIndex,
  digitIndexFromCaret,
  digitsOnly,
  formatDate,
  formatDateFromDigits,
  isDateInBounds,
  parseDateDigits,
} from './calendar/dateMask'
import { calcRentalDays } from '../utils/pricing'

export { toISODate, parseISODate } from './calendar/calendarUtils'

const CalendarGlyph = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V6a.75.75 0 01.75-.75z" />
  </svg>
)

const formatShort = (iso, language) => {
  const d = parseISODate(iso)
  if (!d) return ''
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

const isoToDraft = (iso) => {
  const date = parseISODate(iso)
  return date ? formatDate(date) : ''
}

const TypedRangeInput = ({
  id,
  label,
  draft,
  active,
  placeholder,
  invalid,
  onDraft,
  onFocusField,
  onBlurField,
  onOpen,
}) => {
  const inputRef = useRef(null)
  const caretRef = useRef(null)

  useLayoutEffect(() => {
    if (caretRef.current == null || !inputRef.current) return
    const pos = Math.min(caretRef.current, inputRef.current.value.length)
    inputRef.current.setSelectionRange(pos, pos)
    caretRef.current = null
  }, [draft])

  const applyDigits = (nextDigits, caretDigits) => {
    const formatted = formatDateFromDigits(nextDigits)
    caretRef.current = caretFromDigitIndex(formatted, caretDigits ?? nextDigits.length)
    onDraft(formatted, nextDigits)
  }

  const onChange = (e) => {
    const nextRaw = e.target.value
    const prevDigits = digitsOnly(draft)
    let nextDigits = applyDateInput(prevDigits, nextRaw)
    if (nextRaw.length < draft.length && digitsOnly(nextRaw) === prevDigits && /[/: ]$/.test(draft)) {
      nextDigits = prevDigits.slice(0, -1)
    }
    const extra = Math.max(0, nextDigits.length - digitsOnly(nextRaw).length)
    applyDigits(nextDigits, digitIndexFromCaret(nextRaw, e.target.selectionStart) + extra)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Tab') return
    if (e.key === 'Backspace' && e.target.selectionStart === e.target.selectionEnd) {
      const next = backspaceThroughSeparator(draft, e.target.selectionStart)
      if (next !== null) {
        e.preventDefault()
        applyDigits(next, next.length)
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <div className={`hdn-cal-range-field${active ? ' is-active' : ''}${invalid ? ' is-invalid' : ''}`}>
      {label ? <label htmlFor={id} className="hdn-cal-range-label">{label}</label> : null}
      <div className="hdn-cal-type-wrap">
        <input
          ref={inputRef}
          id={id}
          className="hdn-cal-type"
          value={draft}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={invalid}
          aria-label={label || placeholder}
          placeholder={placeholder}
          onChange={onChange}
          onFocus={onFocusField}
          onBlur={onBlurField}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  )
}

const addDays = (date, count) => {
  const d = new Date(date)
  d.setDate(d.getDate() + count)
  d.setHours(0, 0, 0, 0)
  return d
}

const MonthBlock = ({ monthDate, language, ...gridProps }) => (
  <div className="hdn-cal">
    <div className="hdn-cal-kicker">
      <span className="hdn-cal-month">{monthLabel(monthDate, language)}</span>
      <span className="hdn-cal-year">{monthDate.getFullYear()}</span>
    </div>
    <CalendarGrid viewMonth={monthDate} language={language} {...gridProps} />
  </div>
)

/**
 * Premium dual-field date range picker with portaled calendar (never clipped).
 */
const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  minDate,
  /** Latest selectable pickup/return calendar day (advance booking limit). */
  maxDate = null,
  /** Minimum rental duration in days (from Booking Settings). */
  minSpanDays = 1,
  /** Maximum rental duration in days (from Booking Settings). */
  maxSpanDays = 0,
  /** Inclusive unavailable periods: [{ startDate, endDate }] ISO dates. */
  unavailablePeriods = [],
  pickupLabel,
  returnLabel,
  className = '',
  hint = '',
  /** `joined` = hero search bar. `split` = two independent reservation fields. */
  variant = 'joined',
}) => {
  const { t, language } = useI18n()
  const [open, setOpen] = useState(false)
  const [activeField, setActiveField] = useState('start') // start | end
  const [viewMonth, setViewMonth] = useState(() => parseISODate(startDate) || startOfDay(new Date()))
  const [hover, setHover] = useState(null)
  const [panelStyle, setPanelStyle] = useState({})
  const [isMobile, setIsMobile] = useState(false)
  const [startDraft, setStartDraft] = useState(() => isoToDraft(startDate))
  const [endDraft, setEndDraft] = useState(() => isoToDraft(endDate))
  const [startInvalid, setStartInvalid] = useState(false)
  const [endInvalid, setEndInvalid] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const dateHint = t('calendar.placeholderDate')

  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const openRef = useRef(false)
  const ignoreBlurRef = useRef(false)

  const min = useMemo(() => {
    if (minDate === null) return null
    return startOfDay(minDate || new Date())
  }, [minDate])
  const max = useMemo(() => (maxDate ? startOfDay(maxDate) : null), [maxDate])
  const start = useMemo(() => parseISODate(startDate), [startDate])
  const end = useMemo(() => parseISODate(endDate), [endDate])

  useEffect(() => {
    if (focusedField !== 'start') {
      setStartDraft(isoToDraft(startDate))
      setStartInvalid(false)
    }
  }, [startDate, focusedField])

  useEffect(() => {
    if (focusedField !== 'end') {
      setEndDraft(isoToDraft(endDate))
      setEndInvalid(false)
    }
  }, [endDate, focusedField])
  const span = Math.max(1, Math.round(Number(minSpanDays) || 1))
  const maxSpan = Math.max(0, Math.round(Number(maxSpanDays) || 0))
  const periods = useMemo(
    () =>
      (unavailablePeriods || [])
        .map((p) => ({
          startDate: String(p.startDate || p.start || '').slice(0, 10),
          endDate: String(p.endDate || p.end || '').slice(0, 10),
        }))
        .filter((p) => p.startDate && p.endDate),
    [unavailablePeriods],
  )

  const isDateBlocked = (date) => {
    const iso = toISODate(date)
    return periods.some((p) => iso >= p.startDate && iso <= p.endDate)
  }

  const endMin = useMemo(() => {
    if (!start) return min
    const offset = span > 1 ? span : 0
    const candidate = addDays(start, offset)
    if (!min) return candidate
    return candidate.getTime() > min.getTime() ? candidate : min
  }, [start, span, min])

  const endMax = useMemo(() => {
    if (!start || maxSpan <= 0) return max
    const candidate = addDays(start, Math.max(0, maxSpan))
    if (!max) return candidate
    return candidate.getTime() < max.getTime() ? candidate : max
  }, [start, maxSpan, max])

  const gridMin = activeField === 'end' && start ? endMin : min
  const gridMax = activeField === 'end' && start ? endMax : max

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!open || !isMobile) return
    document.body.classList.add('nav-open')
    return () => document.body.classList.remove('nav-open')
  }, [open, isMobile])

  const updatePosition = () => {
    if (!wrapRef.current || isMobile) {
      setPanelStyle({})
      return
    }
    const rect = wrapRef.current.getBoundingClientRect()
    const gutter = 16
    const dualMonth = window.innerWidth >= 768
    const width = Math.min(dualMonth ? 680 : 360, Math.max(320, window.innerWidth - gutter * 2))
    let left = rect.left + rect.width / 2 - width / 2
    left = Math.max(gutter, Math.min(left, window.innerWidth - width - gutter))
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 420 && rect.top > spaceBelow

    setPanelStyle({
      position: 'fixed',
      left,
      width,
      maxWidth: `calc(100vw - ${gutter * 2}px)`,
      top: openUp ? undefined : rect.bottom + 10,
      bottom: openUp ? window.innerHeight - rect.top + 10 : undefined,
      zIndex: 520,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
      setHover(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setHover(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openCalendar = (field) => {
    setActiveField(field)
    setViewMonth(start || startOfDay(new Date()))
    setOpen(true)
  }

  const rangeCrossesUnavailable = (from, to) => {
    if (!from || !to) return false
    let cursor = new Date(from)
    while (cursor.getTime() <= to.getTime()) {
      if (isDateBlocked(cursor)) return true
      cursor = addDays(cursor, 1)
    }
    return false
  }

  const handleSelect = (date) => {
    if (min && isBeforeDay(date, min)) return
    if (max && isAfterDay(date, max)) return
    if (isDateBlocked(date)) return

    if (activeField === 'start' || !start || (start && end)) {
      onChange({ startDate: toISODate(date), endDate: '' })
      setStartDraft(formatDate(date))
      setEndDraft('')
      setStartInvalid(false)
      setEndInvalid(false)
      setActiveField('end')
      setHover(null)
      return
    }

    if (isBeforeDay(date, start)) {
      onChange({ startDate: toISODate(date), endDate: '' })
      setStartDraft(formatDate(date))
      setEndDraft('')
      setActiveField('end')
      return
    }

    if (endMin && isBeforeDay(date, endMin)) return
    if (endMax && isAfterDay(date, endMax)) return
    if (rangeCrossesUnavailable(start, date)) return

    onChange({ startDate: toISODate(start), endDate: toISODate(date) })
    setEndDraft(formatDate(date))
    setEndInvalid(false)
    setHover(null)
    setTimeout(() => setOpen(false), 160)
  }

  const commitTypedDate = (field, date) => {
    if (!isDateInBounds(date, min, max) || isDateBlocked(date)) {
      if (field === 'start') setStartInvalid(true)
      else setEndInvalid(true)
      return
    }

    if (field === 'start') {
      onChange({ startDate: toISODate(date), endDate: '' })
      setStartDraft(formatDate(date))
      setEndDraft('')
      setStartInvalid(false)
      setEndInvalid(false)
      setActiveField('end')
      setHover(null)
      setViewMonth(date)
      return
    }

    if (!start) {
      commitTypedDate('start', date)
      return
    }

    if (isBeforeDay(date, start)) {
      onChange({ startDate: toISODate(date), endDate: '' })
      setStartDraft(formatDate(date))
      setEndDraft('')
      setEndInvalid(false)
      setActiveField('end')
      return
    }

    if (isBeforeDay(date, endMin) || (endMax && isAfterDay(date, endMax)) || rangeCrossesUnavailable(start, date)) {
      setEndInvalid(true)
      return
    }

    onChange({ startDate: toISODate(start), endDate: toISODate(date) })
    setEndDraft(formatDate(date))
    setEndInvalid(false)
    setHover(null)
    setViewMonth(date)
  }

  const onTypedDraft = (field, formatted, digits) => {
    if (field === 'start') setStartDraft(formatted)
    else setEndDraft(formatted)
    if (!digits) {
      if (field === 'start') {
        setStartInvalid(false)
        onChange({ startDate: '', endDate: '' })
        setEndDraft('')
      } else {
        setEndInvalid(false)
        onChange({ startDate: startDate || '', endDate: '' })
      }
      return
    }
    const parsed = parseDateDigits(digits)
    if (!parsed.complete) {
      if (field === 'start') setStartInvalid(false)
      else setEndInvalid(false)
      return
    }
    if (!parsed.valid) {
      if (field === 'start') setStartInvalid(true)
      else setEndInvalid(true)
      return
    }
    commitTypedDate(field, parsed.date)
  }

  const onBlurTyped = (field) => {
    setFocusedField((current) => (current === field ? null : current))
    window.requestAnimationFrame(() => {
      if (ignoreBlurRef.current) {
        ignoreBlurRef.current = false
        return
      }
      if (openRef.current) return
      if (wrapRef.current?.contains(document.activeElement)) return
      if (panelRef.current?.contains(document.activeElement)) return
      if (field === 'start') {
        const parsed = parseDateDigits(digitsOnly(startDraft))
        if (!startDraft) {
          setStartInvalid(false)
          return
        }
        if (!parsed.complete || !parsed.valid) {
          setStartDraft(isoToDraft(startDate))
          setStartInvalid(false)
        }
      } else {
        const parsed = parseDateDigits(digitsOnly(endDraft))
        if (!endDraft) {
          setEndInvalid(false)
          return
        }
        if (!parsed.complete || !parsed.valid) {
          setEndDraft(isoToDraft(endDate))
          setEndInvalid(false)
        }
      }
    })
  }

  const clearDates = (e) => {
    e.stopPropagation()
    onChange({ startDate: '', endDate: '' })
    setStartDraft('')
    setEndDraft('')
    setStartInvalid(false)
    setEndInvalid(false)
    setActiveField('start')
    setHover(null)
  }

  const nights = start && end ? calcRentalDays(start, end) : 0

  const fieldBase =
    'booking-tap flex-1 min-w-0 h-[3.75rem] px-4 text-left transition-colors duration-200 rounded-2xl md:rounded-none flex items-center gap-3'

  const renderRangeField = (field, label, joined) => {
    const active = open && activeField === field
    const invalid = field === 'start' ? startInvalid : endInvalid
    const draft = field === 'start' ? startDraft : endDraft
    const shell = joined
      ? `${fieldBase} ${active ? 'bg-sand/50' : 'hover:bg-sand/30'} ${invalid ? 'hdn-cal-trigger is-invalid' : ''}`
      : `booking-tap flex min-h-12 w-full items-center gap-3 rounded-[0.9rem] border bg-white px-3.5 text-left transition duration-200 ${
          invalid
            ? 'border-red-400 shadow-[0_0_0_4px_rgba(180,35,24,0.08)]'
            : active
              ? 'border-primary/40 shadow-[0_0_0_4px_rgba(143,31,31,0.08)]'
              : 'border-borderColor/80 hover:border-ink/15'
        }`

    return (
      <div className={shell}>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-light text-muted ring-1 ring-borderColor/60 cursor-pointer"
          aria-label={t('calendar.open')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => openCalendar(field === 'end' && !start ? 'start' : field)}
        >
          <CalendarGlyph />
        </button>
        <TypedRangeInput
          label={label}
          draft={draft}
          active={active}
          placeholder={dateHint}
          invalid={invalid}
          onDraft={(formatted, digits) => onTypedDraft(field, formatted, digits)}
          onFocusField={() => {
            setFocusedField(field)
            if (!isMobile) openCalendar(field === 'end' && !start ? 'start' : field)
          }}
          onBlurField={() => onBlurTyped(field)}
          onOpen={() => openCalendar(field === 'end' && !start ? 'start' : field)}
        />
      </div>
    )
  }

  const monthProps = {
    minDate: gridMin,
    maxDate: gridMax,
    rangeStart: start,
    rangeEnd: end,
    hover: activeField === 'end' ? hover : null,
    onSelect: handleSelect,
    onHover: setHover,
    isDateBlocked,
  }

  const calendarPanel = open && (
    <div
      ref={panelRef}
      style={isMobile ? undefined : panelStyle}
      className={
        isMobile
          ? 'fixed inset-0 z-[520] flex flex-col justify-end bg-ink/40 backdrop-blur-[2px]'
          : 'date-range-popover'
      }
      onClick={isMobile ? () => setOpen(false) : undefined}
    >
      <div
        className={
          isMobile
            ? 'hdn-cal bg-white rounded-t-3xl p-4 sm:p-5 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[88svh] overflow-y-auto shadow-2xl'
            : 'hdn-cal rounded-2xl border border-borderColor bg-white p-4 sm:p-5 shadow-[0_24px_60px_-20px_rgba(22,18,16,0.35)] max-h-[min(560px,calc(100vh-24px))] overflow-y-auto'
        }
        onMouseDown={() => { ignoreBlurRef.current = true }}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile && (
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borderColor" />
        )}

        <div className="hdn-cal-range-ticket">
          <div className="min-w-0">
            <p className="hdn-cal-range-kicker">
              {activeField === 'end' ? t('hero.selectReturn') : t('hero.selectPickup')}
            </p>
            <p className="hdn-cal-range-title">
              {start
                ? `${formatShort(startDate, language)}${end ? ` → ${formatShort(endDate, language)}` : ' → —'}`
                : t('hero.selectPickup')}
            </p>
            {span > 1 ? (
              <p className="mt-1 text-[11px] leading-snug text-white/70">
                {hint || t('carDetails.minRentalGuide', { days: span })}
              </p>
            ) : null}
            {periods.length > 0 ? (
              <p className="mt-1 text-[11px] leading-snug text-white/70">{t('carDetails.unavailableLegend')}</p>
            ) : null}
          </div>
          {nights > 0 ? (
            <span className="hdn-cal-range-nights">{t('hero.nights', { count: nights })}</span>
          ) : null}
        </div>

        <div className="mb-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            className="hdn-cal-icon-btn"
            aria-label={t('calendar.prevMonth')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="hdn-cal-icon-btn"
            aria-label={t('calendar.nextMonth')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <MonthBlock monthDate={viewMonth} language={language} {...monthProps} />
          <div className="hidden md:block">
            <MonthBlock monthDate={addMonths(viewMonth, 1)} language={language} {...monthProps} />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-borderColor flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearDates}
            className="booking-tap inline-flex h-12 items-center px-2 text-sm text-muted hover:text-ink transition-colors cursor-pointer"
          >
            {t('hero.clear')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="booking-tap inline-flex h-12 items-center rounded-2xl bg-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary-dull cursor-pointer"
          >
            {t('hero.done')}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      {variant === 'split' ? (
        <div className="grid grid-cols-2 gap-3 min-w-0">
          {renderRangeField('start', pickupLabel || t('hero.pickupDate'), false)}
          {renderRangeField('end', returnLabel || t('hero.returnDate'), false)}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-borderColor/80 md:flex-row md:items-stretch md:divide-x md:divide-y-0">
          {renderRangeField('start', pickupLabel || t('hero.pickupDate'), true)}
          {renderRangeField('end', returnLabel || t('hero.returnDate'), true)}
        </div>
      )}

      {open && createPortal(calendarPanel, document.body)}
    </div>
  )
}

export default DateRangePicker

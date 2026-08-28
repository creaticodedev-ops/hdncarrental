import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/I18nContext'
import CalendarGrid, { monthLabel } from './CalendarGrid'
import {
  MONTHS,
  TIME_PRESETS,
  addMonths,
  formatDisplay,
  formatTicketParts,
  minuteOptions,
  pad,
  parseBound,
  parseFieldValue,
  startOfDay,
  toDateTimeValue,
  toDateValue,
  toTimeValue,
} from './calendarUtils'
import './calendar.css'

const MOBILE_MQ = '(max-width: 639px)'

const CalIcon = () => (
  <svg className="hdn-cal-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path strokeLinecap="round" d="M8 3.5V7M16 3.5V7M3.5 10h17" />
  </svg>
)

const ClockIcon = () => (
  <svg className="hdn-cal-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <circle cx="12" cy="12" r="8.25" />
    <path strokeLinecap="round" d="M12 8.5V12l2.5 2" />
  </svg>
)

const Chevron = ({ dir }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
  </svg>
)

const TimeColumn = ({ label, values, selected, disabledAt, onPick, listRef }) => (
  <div className="hdn-cal-time-col">
    <p className="hdn-cal-time-label">{label}</p>
    <div className="hdn-cal-time-list" ref={listRef}>
      <div className="hdn-cal-time-spacer" aria-hidden />
      {values.map((n) => {
        const disabled = disabledAt?.(n)
        return (
          <button
            key={n}
            type="button"
            data-selected={n === selected ? '1' : undefined}
            className={`hdn-cal-time-item${n === selected ? ' is-selected' : ''}`}
            disabled={disabled}
            onClick={() => !disabled && onPick(n)}
          >
            {pad(n)}
          </button>
        )
      })}
      <div className="hdn-cal-time-spacer" aria-hidden />
    </div>
  </div>
)

const DateField = ({
  value = '',
  onChange,
  mode = 'date',
  min,
  max,
  required = false,
  disabled = false,
  className = '',
  id,
  name,
  placeholder,
}) => {
  const { t, language } = useI18n()
  const uid = useId()
  const triggerId = id || uid
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const hourListRef = useRef(null)
  const minuteListRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [panelStyle, setPanelStyle] = useState({})
  const [view, setView] = useState('days')
  const parsed = parseFieldValue(value)
  const [viewMonth, setViewMonth] = useState(() => parsed.date || startOfDay(new Date()))
  const [hours, setHours] = useState(parsed.hours)
  const [minutes, setMinutes] = useState(parsed.minutes)

  const minBound = useMemo(() => parseBound(min, false), [min])
  const maxBound = useMemo(() => parseBound(max, true), [max])
  const minDay = minBound ? startOfDay(minBound) : null
  const maxDay = maxBound ? startOfDay(maxBound) : null
  const months = MONTHS[language] || MONTHS.en
  const hasTime = mode === 'datetime' || mode === 'time'
  const ticket = formatTicketParts(parsed.date, language)

  useEffect(() => {
    const next = parseFieldValue(value)
    if (next.date) setViewMonth(next.date)
    setHours(next.hours)
    setMinutes(next.minutes)
  }, [value])

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const emit = (date, h = hours, m = minutes) => {
    if (mode === 'time') {
      onChange?.(toTimeValue(h, m))
      return
    }
    if (!date) {
      onChange?.('')
      return
    }
    onChange?.(mode === 'datetime' ? toDateTimeValue(date, h, m) : toDateValue(date))
  }

  const selected = parsed.date

  const timeDisabled = (h, m) => {
    if (!hasTime) return false
    if (mode === 'time') {
      const stamp = h * 60 + m
      if (min && /^\d{2}:\d{2}$/.test(min)) {
        const [mh, mm] = min.split(':').map(Number)
        if (stamp < mh * 60 + mm) return true
      }
      if (max && /^\d{2}:\d{2}$/.test(max)) {
        const [xh, xm] = max.split(':').map(Number)
        if (stamp > xh * 60 + xm) return true
      }
      return false
    }
    if (!selected) return false
    const stamp = new Date(selected)
    stamp.setHours(h, m, 0, 0)
    if (minBound && stamp.getTime() < minBound.getTime()) return true
    if (maxBound && stamp.getTime() > maxBound.getTime()) return true
    return false
  }

  const panelWidth = mode === 'datetime' ? 428 : mode === 'time' ? 220 : 308

  const updatePosition = () => {
    if (!wrapRef.current || isMobile) {
      setPanelStyle({})
      return
    }
    const rect = wrapRef.current.getBoundingClientRect()
    const gutter = 12
    let left = rect.left
    if (left + panelWidth > window.innerWidth - gutter) left = window.innerWidth - panelWidth - gutter
    left = Math.max(gutter, left)
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 420 && rect.top > spaceBelow
    setPanelStyle({
      position: 'fixed',
      left,
      width: panelWidth,
      top: openUp ? undefined : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, isMobile, mode])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
      setView('days')
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setView('days')
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const scrollSelected = (node) => {
      const item = node?.querySelector('[data-selected="1"]')
      item?.scrollIntoView({ block: 'center' })
    }
    const id = window.requestAnimationFrame(() => {
      scrollSelected(hourListRef.current)
      scrollSelected(minuteListRef.current)
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, hours, minutes])

  const closePanel = () => {
    setOpen(false)
    setView('days')
  }

  const openPanel = () => {
    if (disabled) return
    setView('days')
    setViewMonth(selected || minDay || startOfDay(new Date()))
    setOpen(true)
  }

  const pickDay = (date) => {
    emit(date, hours, minutes)
    if (mode === 'date') closePanel()
  }

  const pickTime = (h, m) => {
    setHours(h)
    setMinutes(m)
    if (mode === 'time' || selected) emit(selected, h, m)
  }

  const pickToday = () => {
    const now = new Date()
    if (mode === 'time') {
      pickTime(now.getHours(), now.getMinutes())
      return
    }
    const today = startOfDay(now)
    if (minDay && today < minDay) return
    if (maxDay && today > maxDay) return
    const h = mode === 'datetime' ? now.getHours() : hours
    const m = mode === 'datetime' ? now.getMinutes() : minutes
    setHours(h)
    setMinutes(m)
    setViewMonth(today)
    emit(today, h, m)
    if (mode === 'date') closePanel()
  }

  const shiftView = (delta) => {
    if (view === 'days') setViewMonth((d) => addMonths(d, delta))
    else if (view === 'months') setViewMonth((d) => new Date(d.getFullYear() + delta, d.getMonth(), 1))
    else setViewMonth((d) => new Date(d.getFullYear() + delta * 12, d.getMonth(), 1))
  }

  const yearStart = Math.floor(viewMonth.getFullYear() / 12) * 12
  const display = formatDisplay(value, language, mode)
  const emptyLabel = placeholder || (
    mode === 'datetime' ? t('calendar.pickDateTime') : mode === 'time' ? t('calendar.pickTime') : t('calendar.pickDate')
  )
  const todayDisabled = mode !== 'time' && Boolean(
    (minDay && startOfDay(new Date()) < minDay) || (maxDay && startOfDay(new Date()) > maxDay),
  )

  const panel = open ? (
    <div
      className={`hdn-cal-layer${isMobile ? ' is-sheet' : ''}`}
      data-theme-layer="calendar"
      onClick={isMobile ? closePanel : undefined}
    >
      <div
        ref={panelRef}
        className={`hdn-cal hdn-cal-panel is-${mode}`}
        style={isMobile ? undefined : panelStyle}
        role="dialog"
        aria-label={emptyLabel}
        onClick={isMobile ? (e) => e.stopPropagation() : undefined}
      >
        {isMobile ? <div className="hdn-cal-sheet-handle" /> : null}

        <header className="hdn-cal-ticket">
          {mode !== 'time' ? (
            <div className="hdn-cal-ticket-date">
              <span className="hdn-cal-ticket-num">{ticket.day}</span>
              <div className="hdn-cal-ticket-meta">
                <p className="hdn-cal-ticket-weekday">{ticket.weekday || t('calendar.chooseDate')}</p>
                <p className="hdn-cal-ticket-monthyear">{ticket.monthYear || monthLabel(viewMonth, language)}</p>
              </div>
            </div>
          ) : (
            <p className="hdn-cal-ticket-weekday">{t('calendar.pickTime')}</p>
          )}
          {hasTime ? (
            <p className="hdn-cal-ticket-clock" aria-hidden>
              <span>{pad(hours)}</span>
              <span className="hdn-cal-ticket-colon">:</span>
              <span>{pad(minutes)}</span>
            </p>
          ) : null}
        </header>

        <div className="hdn-cal-main">
          {mode !== 'time' ? (
            <div className="hdn-cal-cal">
              <div className="hdn-cal-nav">
                <button
                  type="button"
                  className="hdn-cal-nav-title"
                  onClick={() => setView((v) => (v === 'days' ? 'months' : v === 'months' ? 'years' : 'days'))}
                >
                  <span className="hdn-cal-month">{monthLabel(viewMonth, language)}</span>
                  <span className="hdn-cal-year">{viewMonth.getFullYear()}</span>
                  <svg className="hdn-cal-nav-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className="hdn-cal-nav-btns">
                  <button type="button" className="hdn-cal-icon-btn" onClick={() => shiftView(-1)} aria-label={t('calendar.prevMonth')}>
                    <Chevron dir="prev" />
                  </button>
                  <button type="button" className="hdn-cal-icon-btn" onClick={() => shiftView(1)} aria-label={t('calendar.nextMonth')}>
                    <Chevron dir="next" />
                  </button>
                </div>
              </div>

              {view === 'days' ? (
                <CalendarGrid
                  viewMonth={viewMonth}
                  language={language}
                  selected={selected}
                  minDate={minDay}
                  maxDate={maxDay}
                  onSelect={pickDay}
                />
              ) : null}

              {view === 'months' ? (
                <div className="hdn-cal-month-grid">
                  {months.map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      className={`hdn-cal-chip${idx === viewMonth.getMonth() ? ' is-selected' : ''}`}
                      onClick={() => {
                        setViewMonth(new Date(viewMonth.getFullYear(), idx, 1))
                        setView('days')
                      }}
                    >
                      {label.slice(0, 3)}
                    </button>
                  ))}
                </div>
              ) : null}

              {view === 'years' ? (
                <div className="hdn-cal-year-grid">
                  {Array.from({ length: 12 }, (_, i) => yearStart + i).map((year) => (
                    <button
                      key={year}
                      type="button"
                      className={`hdn-cal-chip${year === viewMonth.getFullYear() ? ' is-selected' : ''}`}
                      onClick={() => {
                        setViewMonth(new Date(year, viewMonth.getMonth(), 1))
                        setView('months')
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {hasTime ? (
            <div className="hdn-cal-time">
              <div className="hdn-cal-time-window" aria-hidden />
              <TimeColumn
                label={t('calendar.hour')}
                values={[...Array(24).keys()]}
                selected={hours}
                disabledAt={(h) => timeDisabled(h, minutes)}
                onPick={(h) => pickTime(h, minutes)}
                listRef={hourListRef}
              />
              <TimeColumn
                label={t('calendar.minute')}
                values={minuteOptions(minutes)}
                selected={minutes}
                disabledAt={(m) => timeDisabled(hours, m)}
                onPick={(m) => pickTime(hours, m)}
                listRef={minuteListRef}
              />
            </div>
          ) : null}
        </div>

        {hasTime ? (
          <div className="hdn-cal-presets">
            <p className="hdn-cal-presets-label">{t('calendar.suggested')}</p>
            <div className="hdn-cal-presets-row">
              {TIME_PRESETS.map((h) => {
                const disabled = timeDisabled(h, 0)
                const active = hours === h && minutes === 0
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={disabled}
                    className={`hdn-cal-preset${active ? ' is-selected' : ''}`}
                    onClick={() => !disabled && pickTime(h, 0)}
                  >
                    {pad(h)}:00
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="hdn-cal-foot">
          <div className="hdn-cal-foot-links">
            {!required ? (
              <button type="button" className="hdn-cal-link" onClick={() => { onChange?.(''); closePanel() }}>
                {t('calendar.clear')}
              </button>
            ) : null}
            <button type="button" className="hdn-cal-link" disabled={todayDisabled} onClick={pickToday}>
              {mode === 'time' ? t('calendar.now') : t('calendar.today')}
            </button>
          </div>
          <button type="button" className="hdn-cal-done" onClick={closePanel}>
            {t('calendar.done')}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="hdn-cal-field" ref={wrapRef}>
      <button
        type="button"
        id={triggerId}
        className={`hdn-cal-trigger ${className}${open ? ' is-open' : ''}`}
        disabled={disabled}
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {mode === 'time' ? (
          <ClockIcon />
        ) : selected ? (
          <span className="hdn-cal-trigger-badge" aria-hidden>
            <span className="hdn-cal-trigger-badge-mo">{ticket.monthShort}</span>
            <span className="hdn-cal-trigger-badge-dy">{ticket.day}</span>
          </span>
        ) : (
          <CalIcon />
        )}
        <span className={`hdn-cal-trigger-value${display ? '' : ' is-empty'}`}>
          {display || emptyLabel}
        </span>
      </button>
      <input
        className="hdn-cal-sr"
        tabIndex={-1}
        name={name}
        value={value || ''}
        required={required}
        onChange={() => {}}
        onFocus={openPanel}
      />
      {open && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  )
}

export default DateField

import React from 'react'
import {
  WEEKDAYS,
  MONTHS,
  buildMonthCells,
  sameDay,
  startOfDay,
  isBeforeDay,
  isAfterDay,
  toISODate,
} from './calendarUtils'

const CalendarGrid = ({
  viewMonth,
  language = 'en',
  selected = null,
  rangeStart = null,
  rangeEnd = null,
  hover = null,
  minDate = null,
  maxDate = null,
  onSelect,
  onHover,
  isDateBlocked,
}) => {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const weekdays = WEEKDAYS[language] || WEEKDAYS.en
  const cells = buildMonthCells(year, month)
  const today = startOfDay(new Date())
  const rangeStop = rangeEnd || hover

  return (
    <div className="hdn-cal-month-body">
      <div className="hdn-cal-week">
        {weekdays.map((d) => (
          <span key={d} className="hdn-cal-weekday">{d}</span>
        ))}
      </div>
      <div className="hdn-cal-grid">
        {cells.map(({ date, inMonth }) => {
          const beforeMin = minDate ? isBeforeDay(date, startOfDay(minDate)) : false
          const afterMax = maxDate ? isAfterDay(date, startOfDay(maxDate)) : false
          const blocked = Boolean(isDateBlocked?.(date))
          const disabled = beforeMin || afterMax || blocked
          const isSelected = sameDay(date, selected)
          const isStart = sameDay(date, rangeStart)
          const isEnd = Boolean(rangeStop && sameDay(date, rangeStop) && rangeStart)
          const inRange =
            rangeStart &&
            rangeStop &&
            !sameDay(rangeStart, rangeStop) &&
            isAfterDay(date, rangeStart) &&
            isBeforeDay(date, rangeStop)
          const solo = isStart && (!rangeStop || sameDay(rangeStart, rangeStop))
          const isToday = sameDay(date, today)

          let extra = ''
          if (solo && (isStart || isSelected)) extra = ' is-range-solo is-selected'
          else if (isStart && rangeStop && !sameDay(rangeStart, rangeStop)) extra = ' is-range-start'
          else if (isEnd && rangeStart && !sameDay(rangeStart, rangeStop)) extra = ' is-range-end'
          else if (inRange) extra = ' is-range'
          else if (isSelected) extra = ' is-selected'

          return (
            <div key={toISODate(date)} className="hdn-cal-cell">
              <button
                type="button"
                disabled={disabled}
                title={blocked ? 'Unavailable' : undefined}
                className={[
                  'hdn-cal-day',
                  inMonth ? '' : ' is-outside',
                  isToday ? ' is-today' : '',
                  (date.getDay() === 0 || date.getDay() === 6) ? ' is-weekend' : '',
                  extra,
                ].join('')}
                onClick={() => !disabled && onSelect?.(date)}
                onMouseEnter={() => !disabled && onHover?.(date)}
              >
                {date.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const monthLabel = (date, language) => (MONTHS[language] || MONTHS.en)[date.getMonth()]

export default CalendarGrid

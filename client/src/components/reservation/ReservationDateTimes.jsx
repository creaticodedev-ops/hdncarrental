import React, { useMemo } from 'react'
import DateRangePicker, { toISODate, parseISODate } from '../DateRangePicker'
import DateField from '../calendar/DateField'
import { useI18n } from '../../i18n/I18nContext'
import { booking } from '../ui/bookingUi'
import { earliestReturnIsoDate } from '../../utils/bookingDuration'
import {
  filterTimeOptions,
  maxPickupDateFromAdvance,
} from '../../utils/vehicleAvailability'

const splitDateTime = (value) => {
  if (!value) return { date: '', time: '10:00' }
  const local = String(value).slice(0, 16)
  if (local.includes('T')) {
    const [date, time] = local.split('T')
    return { date, time: time || '10:00' }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(local)) return { date: local, time: '10:00' }
  return { date: '', time: '10:00' }
}

const mergeDateTime = (date, time) => (date ? `${date}T${time || '10:00'}` : '')

const ALL_TIME_OPTIONS = (() => {
  const out = []
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return out
})()

const timeInWindow = (time, start, end) => {
  if (!time || !start || !end) return true
  const toM = (hm) => {
    const [h, m] = String(hm).split(':').map(Number)
    return h * 60 + m
  }
  const mins = toM(time)
  const a = toM(start)
  const b = toM(end)
  if ([mins, a, b].some((n) => Number.isNaN(n))) return true
  return a <= b ? mins >= a && mins <= b : mins >= a || mins <= b
}

const TimeField = ({ label, value, onChange, id, min, max }) => (
  <div>
    <label htmlFor={id} className={`mb-2 block ${booking.label}`}>
      {label}
    </label>
    <DateField
      id={id}
      mode="time"
      value={value}
      min={min}
      max={max}
      onChange={onChange}
      className={booking.fieldShell}
    />
  </div>
)

/** Premium date range (calendar) + pickup/return time selectors */
export default function ReservationDateTimes({
  pickupDate,
  returnDate,
  setPickupDate,
  setReturnDate,
  minDate,
  minRentalDays = null,
  maxRentalDays = null,
  advanceBookingDays = 365,
  pickupHoursStart = '08:00',
  pickupHoursEnd = '20:00',
  returnHoursStart = '08:00',
  returnHoursEnd = '20:00',
  unavailablePeriods = [],
  rulesLoading = false,
  dateError = '',
}) {
  const { t } = useI18n()
  const pickup = useMemo(() => splitDateTime(pickupDate), [pickupDate])
  const ret = useMemo(() => splitDateTime(returnDate), [returnDate])
  const minDays = minRentalDays == null ? null : Math.max(1, Math.round(Number(minRentalDays) || 1))
  const maxDays = maxRentalDays == null ? null : Math.max(minDays || 1, Math.round(Number(maxRentalDays) || 365))
  const spanReady = !rulesLoading && minDays != null

  const startISO = pickup.date
  const endISO = ret.date

  const pickupTimes = useMemo(
    () => filterTimeOptions(ALL_TIME_OPTIONS, pickupHoursStart, pickupHoursEnd),
    [pickupHoursStart, pickupHoursEnd],
  )
  const returnTimes = useMemo(
    () => filterTimeOptions(ALL_TIME_OPTIONS, returnHoursStart, returnHoursEnd),
    [returnHoursStart, returnHoursEnd],
  )

  const maxDate = useMemo(
    () => maxPickupDateFromAdvance(advanceBookingDays),
    [advanceBookingDays],
  )

  // Keep selected times inside allowed hour windows when settings load/change.
  React.useEffect(() => {
    if (!spanReady) return
    if (pickup.date && pickup.time && !timeInWindow(pickup.time, pickupHoursStart, pickupHoursEnd) && pickupTimes[0]) {
      setPickupDate(mergeDateTime(pickup.date, pickupTimes[0]))
    }
    if (ret.date && ret.time && !timeInWindow(ret.time, returnHoursStart, returnHoursEnd) && returnTimes[0]) {
      setReturnDate(mergeDateTime(ret.date, returnTimes[0]))
    }
  }, [
    spanReady,
    pickup.date,
    pickup.time,
    ret.date,
    ret.time,
    pickupHoursStart,
    pickupHoursEnd,
    returnHoursStart,
    returnHoursEnd,
    pickupTimes,
    returnTimes,
    setPickupDate,
    setReturnDate,
  ])

  const handleRangeChange = ({ startDate, endDate }) => {
    if (startDate) {
      const time = pickupTimes.includes(pickup.time) ? pickup.time : (pickupTimes[0] || pickup.time)
      setPickupDate(mergeDateTime(startDate, time))
    } else {
      setPickupDate('')
    }
    if (endDate) {
      const earliest = spanReady ? earliestReturnIsoDate(startDate || startISO, minDays) : ''
      const safeEnd = earliest && endDate < earliest ? earliest : endDate
      const time = returnTimes.includes(ret.time) ? ret.time : (returnTimes[0] || ret.time)
      setReturnDate(mergeDateTime(safeEnd, time))
    } else if (startDate && !endDate) {
      setReturnDate('')
    }
  }

  return (
    <div className="space-y-4">
      {rulesLoading ? (
        <p className={`${booking.notice} ${booking.noticeQuiet}`}>{t('carDetails.rulesLoading')}</p>
      ) : null}
      {spanReady && minDays > 1 ? (
        <p className={`${booking.notice} border-primary/15 bg-primary/[0.06] text-ink/80`}>
          <svg className="mt-px h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V6a.75.75 0 01.75-.75z" />
          </svg>
          <span className="min-w-0 font-medium">{t('carDetails.minRentalNotice', { days: minDays })}</span>
        </p>
      ) : null}
      {spanReady ? (
        <DateRangePicker
          startDate={startISO}
          endDate={endISO}
          onChange={handleRangeChange}
          minDate={minDate}
          maxDate={maxDate}
          minSpanDays={minDays}
          maxSpanDays={maxDays || 0}
          unavailablePeriods={unavailablePeriods}
          pickupLabel={t('carDetails.pickupDate')}
          returnLabel={t('carDetails.returnDate')}
          className="w-full"
          hint={minDays > 1 ? t('carDetails.minRentalGuide', { days: minDays }) : ''}
          variant="split"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3" aria-busy="true">
          <div className={`${booking.fieldShell} text-sm text-muted`}>{t('carDetails.rulesLoading')}</div>
          <div className={`${booking.fieldShell} text-sm text-muted`}>{t('carDetails.rulesLoading')}</div>
        </div>
      )}
      {dateError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs leading-relaxed text-red-700 sm:text-[13px]" role="alert">
          {dateError}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <TimeField
          id="pickup-time"
          label={t('carDetails.pickupTime')}
          value={pickup.time}
          min={pickupHoursStart}
          max={pickupHoursEnd}
          onChange={(time) => {
            if (pickup.date) setPickupDate(mergeDateTime(pickup.date, time))
          }}
        />
        <TimeField
          id="return-time"
          label={t('carDetails.returnTime')}
          value={ret.time}
          min={returnHoursStart}
          max={returnHoursEnd}
          onChange={(time) => {
            if (ret.date) setReturnDate(mergeDateTime(ret.date, time))
          }}
        />
      </div>
    </div>
  )
}

export { splitDateTime, mergeDateTime, parseISODate, toISODate }

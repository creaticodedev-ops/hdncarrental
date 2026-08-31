import { FOLLOW_UP_TO_TEMPLATE, formatClock, formatDay, hoursUntil, daysSince } from './crmPresentation'

const FOLLOW_UP_PRIORITY = [
  'return_reminder',
  'during_rental',
  'signed_contract',
  'thank_you',
  'review',
  'winback',
]

/**
 * One recommended next step for the agent — derived from live 360 data.
 */
export const buildAgentInsight = (detail, { now = new Date(), t, language = 'en' } = {}) => {
  const customer = detail?.customer || {}
  const care = detail?.care || {}
  const kpis = detail?.kpis || {}
  const active = care.activeRental
  const followUps = detail?.followUps || []
  const reviews = detail?.reviews || []
  const openIssue = (detail?.issues || []).find((i) => i.status !== 'resolved')
  const lastContact = care.lastContactAt || customer.lastContactAt
  const completed = kpis.completedRentals ?? customer.completedReservations ?? 0

  const wa = (templateId, bookingId, extra = {}) => ({
    type: 'whatsapp',
    templateId,
    bookingId: bookingId || active?._id || '',
    ...extra,
  })
  const vehicleOf = (car) => `${car?.brand || ''} ${car?.model || ''}`.trim()
  const detailLine = (...parts) => parts.filter(Boolean).join(' · ')
  const notReached = !care.contacted ? t('admin.customers.insight.notContacted') : ''

  if (openIssue) {
    return {
      id: 'issue',
      tone: 'danger',
      eyebrow: t('admin.customers.insight.now'),
      headline: openIssue.reportedIssue,
      detail: t('admin.customers.insight.resolveIssue'),
      actionLabel: t('admin.customers.insight.resolveIssue'),
      action: { type: 'tab', tab: 'care' },
    }
  }

  if (active) {
    const until = hoursUntil(active.returnDate, now)
    const car = vehicleOf(active.car)
    if (until < 0) {
      return {
        id: 'overdue',
        tone: 'danger',
        eyebrow: t('admin.customers.insight.now'),
        headline: t('admin.customers.insight.overdue', {
          time: formatClock(active.returnDate, language),
        }),
        detail: detailLine(car, notReached),
        actionLabel: t('admin.customers.insight.callReturn'),
        action: wa('return_reminder', active._id),
      }
    }
    if (until <= 36) {
      const when = until <= 24
        ? t('admin.customers.insight.returnToday', { time: formatClock(active.returnDate, language) })
        : t('admin.customers.insight.returnTomorrow', { time: formatClock(active.returnDate, language) })
      return {
        id: 'return_soon',
        tone: 'warn',
        eyebrow: t('admin.customers.insight.now'),
        headline: when,
        detail: detailLine(car, notReached),
        actionLabel: t('admin.customers.followUp.return_reminder'),
        action: wa('return_reminder', active._id),
      }
    }
    if (!care.contacted) {
      return {
        id: 'checkin',
        tone: 'info',
        eyebrow: t('admin.customers.insight.onRent'),
        headline: t('admin.customers.insight.noCheckin', {
          vehicle: car || t('admin.customers.vehicle'),
        }),
        detail: t('admin.customers.insight.notContacted'),
        actionLabel: t('admin.customers.followUp.during_rental'),
        action: wa('during_rental', active._id),
      }
    }
  }

  const sortedDue = [...followUps].sort(
    (a, b) => FOLLOW_UP_PRIORITY.indexOf(a.kind) - FOLLOW_UP_PRIORITY.indexOf(b.kind),
  )
  const due = sortedDue[0]
  if (due) {
    return {
      id: `followup-${due.kind}`,
      tone: due.kind === 'winback' ? 'warn' : 'info',
      eyebrow: t('admin.customers.insight.next'),
      headline: t(`admin.customers.followUp.${due.kind}`),
      detail: active ? vehicleOf(active.car) : '',
      actionLabel: t('admin.customers.send'),
      action: wa(FOLLOW_UP_TO_TEMPLATE[due.kind], due.booking),
    }
  }

  const upcoming = (detail?.bookings || []).find((b) => ['confirmed', 'ready_for_pickup'].includes(b.status))
  if (upcoming && hoursUntil(upcoming.pickupDate, now) <= 24 && hoursUntil(upcoming.pickupDate, now) > -2) {
    return {
      id: 'pickup',
      tone: 'info',
      eyebrow: t('admin.customers.insight.next'),
      headline: t('admin.customers.insight.pickupSoon', {
        time: formatClock(upcoming.pickupDate, language),
        vehicle: `${upcoming.car?.brand || ''} ${upcoming.car?.model || ''}`.trim(),
      }),
      detail: t('admin.customers.insight.next'),
      actionLabel: t('admin.customers.wa.pickup_reminder'),
      action: wa('pickup_reminder', upcoming._id),
    }
  }

  const last = kpis.lastRental
  if (last?.status === 'completed' && !reviews.length && daysSince(last.returnDate || last.pickupDate, now) <= 14) {
    return {
      id: 'review',
      tone: 'neutral',
      eyebrow: t('admin.customers.insight.next'),
      headline: t('admin.customers.insight.askReview'),
      detail: last.vehicle || '',
      actionLabel: t('admin.customers.followUp.review'),
      action: wa('review_request', last._id),
    }
  }

  if (completed >= 5) {
    return {
      id: 'loyalty',
      tone: 'vip',
      eyebrow: t('admin.customers.insight.relationship'),
      headline: t('admin.customers.insight.fiveRentals', { count: completed }),
      detail: t('admin.customers.insight.offerBenefit'),
      actionLabel: t('admin.customers.insight.offerBenefit'),
      action: wa('loyalty', last?._id),
    }
  }

  if (daysSince(lastContact, now) >= 24 && !active) {
    const days = Math.round(daysSince(lastContact, now))
    return {
      id: 'winback',
      tone: 'warn',
      eyebrow: t('admin.customers.insight.quiet'),
      headline: Number.isFinite(days) && days < 400
        ? t('admin.customers.insight.noContactDays', { days })
        : t('admin.customers.insight.noContact'),
      detail: last?.vehicle || '',
      actionLabel: t('admin.customers.followUp.winback'),
      action: wa('winback', last?._id),
    }
  }

  return {
    id: 'idle',
    tone: 'neutral',
    eyebrow: t('admin.customers.insight.relationship'),
    headline: t('admin.customers.insight.idle', {
      count: kpis.totalReservations ?? customer.totalReservations ?? 0,
      date: last ? formatDay(last.pickupDate, language) : '—',
    }),
    detail: '',
    actionLabel: t('admin.customers.whatsapp'),
    action: wa(active ? 'during_rental' : 'booking_confirmation', active?._id || last?._id),
  }
}

export default buildAgentInsight

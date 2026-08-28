import React from 'react'
import { EmptyState, SkeletonBlock } from '../../../admin/ui'
import ActionMenu from './ActionMenu'
import { BookingStatusBadge } from './ReservationBadges'
import {
  bookingPaymentFigures,
  formatRelativeWhen,
  getNextDeskAction,
  getOpsFlags,
  money,
  nextDeskActionLabel,
  reservationRef,
  vehicleLabel,
} from './reservationHelpers'

const rowMenuItems = (booking, t, handlers) => [
  { key: 'edit', label: t('admin.bookings.edit'), icon: 'edit', onClick: () => handlers.onEdit(booking) },
  { key: 'wa', label: t('admin.bookings.whatsapp'), icon: 'whatsapp', onClick: () => handlers.onWhatsApp(booking) },
  { key: 'print', label: t('admin.bookings.print'), icon: 'print', onClick: () => handlers.onPrint(booking) },
  booking?.completion?.contractPdfUrl
    ? { key: 'viewcontract', label: t('admin.bookings.viewContract'), icon: 'contract', onClick: () => handlers.onViewContract(booking) }
    : null,
  { key: 'sep1', separator: true },
  { key: 'lic', label: t('admin.bookings.downloadLicense'), icon: 'download', onClick: () => handlers.onDownloadLicense(booking) },
  { key: 'id', label: t('admin.bookings.downloadId'), icon: 'download', onClick: () => handlers.onDownloadId(booking) },
  { key: 'pass', label: t('admin.bookings.downloadPassport'), icon: 'download', onClick: () => handlers.onDownloadPassport(booking) },
  { key: 'sep2', separator: true },
  { key: 'del', label: t('admin.bookings.delete'), icon: 'trash', tone: 'danger', onClick: () => handlers.onDelete(booking) },
].filter(Boolean)

const ReservationList = ({
  t,
  language,
  currency,
  bookings,
  loading,
  selectedId,
  onSelect,
  onNextAction,
  onEdit,
  onPrint,
  onViewContract,
  onWhatsApp,
  onDelete,
  onDownloadLicense,
  onDownloadId,
  onDownloadPassport,
  pagination,
  onPrev,
  onNext,
  onPageSize,
  emptyTitle,
  emptyDescription,
}) => {
  const handlers = {
    onEdit,
    onPrint,
    onViewContract,
    onWhatsApp,
    onDelete,
    onDownloadLicense,
    onDownloadId,
    onDownloadPassport,
  }

  if (loading) {
    return (
      <div className="space-y-2.5 lg:flex lg:flex-col">
        <SkeletonBlock className="h-[4.75rem] lg:hidden" />
        <SkeletonBlock className="h-[4.75rem] lg:hidden" />
        <SkeletonBlock className="hidden lg:block lg:flex-1 h-72" />
      </div>
    )
  }

  if (!bookings.length) {
    return (
      <EmptyState
        title={emptyTitle || t('admin.bookings.emptyTitle')}
        description={emptyDescription || t('admin.bookings.emptyDescription')}
      />
    )
  }

  const from = pagination?.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0
  const to = pagination?.total
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : 0

  return (
    <div className="res-list-body min-w-0">
      <div className="space-y-2 lg:hidden">
        {bookings.map((booking) => (
          <MobileCard
            key={booking._id}
            booking={booking}
            t={t}
            language={language}
            currency={currency}
            selected={selectedId === booking._id}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="res-work hidden lg:flex">
        <div className="res-work-scroll">
          <div className="res-work-head">
            <span>{t('admin.bookings.customer')}</span>
            <span className="res-hide-md">{t('admin.bookings.vehicle')}</span>
            <span>{t('admin.bookings.dates')}</span>
            <span>{t('admin.bookings.total')}</span>
            <span>{t('admin.bookings.actions')}</span>
            <span />
          </div>
          {bookings.map((booking) => {
            const selected = selectedId === booking._id
            const figures = bookingPaymentFigures(booking)
            const flags = getOpsFlags(booking)
            const action = getNextDeskAction(booking)
            const walkIn = String(booking.channel || '').toLowerCase().includes('walk')
            return (
              <div
                key={booking._id}
                role="button"
                tabIndex={0}
                className={`res-work-row${selected ? ' is-selected' : ''}${flags.due ? ' is-due' : ''}`}
                onClick={() => onSelect(booking)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(booking)
                  }
                }}
              >
                <div className="min-w-0">
                  <p className="res-work-name">{booking.customerName || t('admin.common.guest')}</p>
                  <p className="res-work-meta">
                    {reservationRef(booking)}
                    {' · '}
                    {walkIn ? 'Walk-in' : 'Online'}
                    {' · '}
                    {t(`admin.bookings.statuses.${booking.status}`)}
                  </p>
                </div>
                <div className="res-hide-md min-w-0">
                  <p className="res-work-name">{vehicleLabel(booking.car)}</p>
                  <p className="res-work-meta">{booking.car?.licensePlate || '—'}</p>
                </div>
                <div className="res-work-when">
                  <strong className={flags.departingToday ? 'is-today' : ''}>
                    {formatRelativeWhen(booking.pickupDate, language, t)}
                    {' → '}
                    {formatRelativeWhen(booking.returnDate, language, t)}
                  </strong>
                  {flags.departingToday ? (
                    <span className="res-moment is-out">{t('admin.bookings.departing')}</span>
                  ) : flags.returningToday ? (
                    <span className="res-moment is-in">{t('admin.bookings.returning')}</span>
                  ) : null}
                </div>
                <div className={`res-work-money${flags.due ? ' is-due' : ''}`}>
                  {flags.due ? money(currency, figures.remaining) : money(currency, figures.total)}
                  {flags.due ? (
                    <span className="res-muted-amt">{t('admin.bookings.remaining')}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`res-work-cta${action.id === 'collect' ? ' is-due' : ''}${action.id === 'sign' ? ' is-sign' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onNextAction?.(booking, action)
                  }}
                >
                  {nextDeskActionLabel(action, t, currency)}
                </button>
                <div onClick={(e) => e.stopPropagation()}>
                  <ActionMenu
                    label={t('admin.bookings.more')}
                    iconOnly
                    items={rowMenuItems(booking, t, handlers)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {pagination ? (
        <div className="res-pager">
          <p className="res-pager-meta">
            {pagination.total
              ? t('admin.bookings.showingRange', { from, to, total: pagination.total })
              : null}
          </p>
          <div className="res-pager-controls">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={onPrev}
              className="admin-btn admin-btn-secondary res-btn disabled:opacity-40"
            >
              {t('admin.bookings.previous')}
            </button>
            <span>{t('admin.bookings.pageOf', { page: pagination.page, total: pagination.totalPages })}</span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={onNext}
              className="admin-btn admin-btn-secondary res-btn disabled:opacity-40"
            >
              {t('admin.bookings.next')}
            </button>
            {onPageSize ? (
              <select
                className="res-inline-select"
                value={pagination.limit}
                onChange={(e) => onPageSize(Number(e.target.value))}
                aria-label={t('admin.bookings.perPage')}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{t('admin.bookings.perPageOption', { count: n })}</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const MobileCard = ({ booking, t, language, currency, selected, onSelect }) => {
  const figures = bookingPaymentFigures(booking)
  const flags = getOpsFlags(booking)
  const action = getNextDeskAction(booking)
  return (
    <button
      type="button"
      className={`res-card${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(booking)}
    >
      <div className="res-card-top">
        <div className="min-w-0">
          <p className="res-work-name">{booking.customerName || t('admin.common.guest')}</p>
          <p className="res-work-meta">{reservationRef(booking)}</p>
        </div>
        <span className={`res-total${flags.due ? ' res-due-line' : ''}`}>
          {flags.due ? money(currency, figures.remaining) : money(currency, figures.total)}
        </span>
      </div>
      <div className="res-card-body">
        <p className="res-id-secondary">{vehicleLabel(booking.car)}</p>
        <p className="res-id-secondary">
          {formatRelativeWhen(booking.pickupDate, language, t)}
          {' → '}
          {formatRelativeWhen(booking.returnDate, language, t)}
        </p>
        {flags.departingToday ? (
          <span className="res-moment is-out">{t('admin.bookings.departing')}</span>
        ) : flags.returningToday ? (
          <span className="res-moment is-in">{t('admin.bookings.returning')}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <BookingStatusBadge status={booking.status} t={t} />
        <span className={`res-card-cta${action.id === 'collect' ? ' is-due' : ''}`}>
          {nextDeskActionLabel(action, t, currency)}
        </span>
      </div>
    </button>
  )
}

export default ReservationList

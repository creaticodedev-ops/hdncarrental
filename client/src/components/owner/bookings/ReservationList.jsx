import React from 'react'
import { EmptyState, SkeletonBlock } from '../../../admin/ui'
import ActionMenu from './ActionMenu'
import {
  BookingStatusBadge,
  ChannelChip,
  PaymentBadge,
} from './ReservationBadges'
import {
  bookingPaymentFigures,
  customerEmail,
  customerInitials,
  formatCompactDate,
  formatDay,
  formatTime,
  money,
  rentalDayCount,
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
      <EmptyState title={t('admin.bookings.emptyTitle')} description={t('admin.bookings.emptyDescription')} />
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

      <div className="res-table-shell hidden lg:block">
        <div className="table-scroll">
          <table className="res-ops-table">
            <thead>
              <tr>
                <th>{t('admin.bookings.reservation')}</th>
                <th>{t('admin.bookings.customer')}</th>
                <th className="res-hide-md">{t('admin.bookings.vehicle')}</th>
                <th>{t('admin.bookings.dates')}</th>
                <th>{t('admin.bookings.status')}</th>
                <th>{t('admin.bookings.payment')}</th>
                <th>{t('admin.bookings.total')}</th>
                <th className="text-right">{t('admin.bookings.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const selected = selectedId === booking._id
                const days = rentalDayCount(booking.pickupDate, booking.returnDate)
                const figures = bookingPaymentFigures(booking)
                return (
                  <tr
                    key={booking._id}
                    className={selected ? 'is-selected' : ''}
                    onClick={() => onSelect(booking)}
                  >
                    <td>
                      <p className="res-ref-cell">{reservationRef(booking)}</p>
                      <ChannelChip channel={booking.channel} />
                    </td>
                    <td>
                      <div className="res-identity">
                        <span className="res-avatar" aria-hidden>
                          {customerInitials(booking.customerName)}
                        </span>
                        <div className="min-w-0">
                          <p className="res-id-primary">
                            {booking.customerName || t('admin.common.guest')}
                          </p>
                          <p className="res-id-secondary">
                            {booking.customerPhone || customerEmail(booking) || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="res-hide-md">
                      <p className="res-id-primary">{vehicleLabel(booking.car)}</p>
                      {booking.car?.year ? (
                        <p className="res-id-secondary">({booking.car.year})</p>
                      ) : null}
                      {booking.car?.licensePlate ? (
                        <p className="res-id-secondary">{booking.car.licensePlate}</p>
                      ) : null}
                    </td>
                    <td>
                      <p className="res-id-primary">
                        {formatDay(booking.pickupDate, language)}
                        {' '}
                        <span className="res-time">{formatTime(booking.pickupDate, language)}</span>
                      </p>
                      <p className="res-id-primary">
                        {formatDay(booking.returnDate, language)}
                        {' '}
                        <span className="res-time">{formatTime(booking.returnDate, language)}</span>
                      </p>
                      <p className="res-id-secondary">
                        {t('admin.bookings.daysCount', { count: days })}
                      </p>
                    </td>
                    <td>
                      <BookingStatusBadge status={booking.status} t={t} />
                    </td>
                    <td>
                      <PaymentBadge booking={booking} t={t} />
                    </td>
                    <td>
                      <p className="res-total">{money(currency, figures.total)}</p>
                      {figures.remaining > 0 ? (
                        <p className="res-due-line">{t('admin.bookings.remainingAmount', { amount: money(currency, figures.remaining) })}</p>
                      ) : null}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="res-row-actions">
                        <button
                          type="button"
                          className="res-link-btn"
                          onClick={() => onSelect(booking)}
                        >
                          {t('admin.bookings.view')}
                        </button>
                        <ActionMenu
                          label={t('admin.bookings.more')}
                          iconOnly
                          items={rowMenuItems(booking, t, handlers)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
  return (
  <button
    type="button"
    className={`res-card${selected ? ' is-selected' : ''}`}
    onClick={() => onSelect(booking)}
  >
    <div className="res-card-top">
      <div className="min-w-0">
        <p className="res-ref-cell">{reservationRef(booking)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <ChannelChip channel={booking.channel} />
          <BookingStatusBadge status={booking.status} t={t} />
        </div>
      </div>
      <span className="res-total">{money(currency, figures.total)}</span>
    </div>
    <div className="res-card-body">
      <p className="res-id-primary">{booking.customerName || t('admin.common.guest')}</p>
      <p className="res-id-secondary">{vehicleLabel(booking.car)}</p>
      <p className="res-id-secondary">
        {formatCompactDate(booking.pickupDate, language)} → {formatCompactDate(booking.returnDate, language)}
      </p>
      {figures.remaining > 0 ? (
        <p className="res-due-line mt-1">
          {t('admin.bookings.remainingAmount', { amount: money(currency, figures.remaining) })}
        </p>
      ) : null}
    </div>
    <PaymentBadge booking={booking} t={t} />
  </button>
  )
}

export default ReservationList

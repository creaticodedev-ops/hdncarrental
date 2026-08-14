import React from 'react'
import { EmptyState, SkeletonBlock } from '../../../admin/ui'
import ActionMenu from './ActionMenu'
import { BookingStatusBadge, ChannelChip, PaymentBadge, SignatureBadge } from './ReservationBadges'
import {
  customerInitials,
  dateRangeLabel,
  formatTime,
  getPaymentDisplay,
  getSignatureStatus,
  money,
  reservationRef,
  vehicleLabel,
} from './reservationHelpers'

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
  onWhatsApp,
  onDelete,
  onDownloadLicense,
  onDownloadId,
  onDownloadPassport,
  pagination,
  onPrev,
  onNext,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-28 lg:hidden" />
        <SkeletonBlock className="h-28 lg:hidden" />
        <SkeletonBlock className="hidden lg:block h-64" />
      </div>
    )
  }

  if (!bookings.length) {
    return (
      <EmptyState title={t('admin.bookings.emptyTitle')} description={t('admin.bookings.emptyDescription')} />
    )
  }

  return (
    <div className="min-w-0">
      <div className="space-y-3 lg:hidden">
        {bookings.map((booking) => (
          <MobileCard
            key={booking._id}
            booking={booking}
            t={t}
            language={language}
            currency={currency}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="admin-card hidden overflow-hidden lg:block">
        <div className="table-scroll">
          <table className="res-ops-table">
            <thead>
              <tr>
                <th>{t('admin.bookings.reservation')}</th>
                <th>{t('admin.bookings.customer')}</th>
                <th className="max-xl:hidden">{t('admin.bookings.vehicle')}</th>
                <th>{t('admin.bookings.dates')}</th>
                <th>{t('admin.bookings.status')}</th>
                <th className="max-xl:hidden">{t('admin.bookings.payment')}</th>
                <th>{t('admin.bookings.signature')}</th>
                <th>{t('admin.bookings.total')}</th>
                <th className="text-right">{t('admin.bookings.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const selected = selectedId === booking._id
                const sig = getSignatureStatus(booking)
                const pay = getPaymentDisplay(booking)
                return (
                  <tr
                    key={booking._id}
                    className={selected ? 'is-selected' : ''}
                    onClick={() => onSelect(booking)}
                  >
                    <td>
                      <p className="font-semibold text-[var(--admin-ink)]">{reservationRef(booking)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <ChannelChip channel={booking.channel} />
                        {pay === 'unpaid' || pay === 'partial' ? (
                          <span className="text-[10px] text-[var(--admin-warn)]">
                            {t('admin.bookings.alertsUnpaid')}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="res-avatar">{customerInitials(booking.customerName)}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--admin-ink)] truncate">
                            {booking.customerName || t('admin.common.guest')}
                          </p>
                          <p className="text-[11px] text-[var(--admin-muted)] truncate">
                            {booking.customerPhone || booking.customerEmail || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-xl:hidden">
                      <p className="font-medium text-[var(--admin-ink)]">{vehicleLabel(booking.car)}</p>
                      {booking.car?.licensePlate ? (
                        <p className="text-[11px] text-[var(--admin-muted)]">{booking.car.licensePlate}</p>
                      ) : null}
                    </td>
                    <td>
                      <p className="text-[var(--admin-ink)]">{dateRangeLabel(booking.pickupDate, booking.returnDate, language)}</p>
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        {formatTime(booking.pickupDate, language)} → {formatTime(booking.returnDate, language)}
                      </p>
                    </td>
                    <td>
                      <BookingStatusBadge status={booking.status} t={t} />
                    </td>
                    <td className="max-xl:hidden">
                      <PaymentBadge booking={booking} t={t} />
                    </td>
                    <td>
                      <SignatureBadge booking={booking} t={t} />
                      {sig === 'pending' ? (
                        <p className="mt-1 text-[10px] text-[var(--admin-warn)]">
                          {t('admin.bookings.alertsSignaturePending')}
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <p className="font-semibold text-[var(--admin-ink)]">{money(currency, booking.price)}</p>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary admin-btn-sm"
                          onClick={() => onSelect(booking)}
                        >
                          {t('admin.bookings.view')}
                        </button>
                        <ActionMenu
                          label={t('admin.bookings.more')}
                          items={[
                            { key: 'edit', label: t('admin.bookings.edit'), onClick: () => onEdit(booking) },
                            { key: 'wa', label: t('admin.bookings.whatsapp'), onClick: () => onWhatsApp(booking) },
                            { key: 'print', label: t('admin.bookings.print'), onClick: () => onPrint(booking) },
                            { key: 'sep1', separator: true },
                            { key: 'lic', label: t('admin.bookings.downloadLicense'), onClick: () => onDownloadLicense(booking) },
                            { key: 'id', label: t('admin.bookings.downloadId'), onClick: () => onDownloadId(booking) },
                            { key: 'pass', label: t('admin.bookings.downloadPassport'), onClick: () => onDownloadPassport(booking) },
                            { key: 'sep2', separator: true },
                            { key: 'del', label: t('admin.bookings.delete'), tone: 'danger', onClick: () => onDelete(booking) },
                          ]}
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

      {pagination?.totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-[var(--admin-muted)]">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={onPrev}
            className="admin-btn admin-btn-secondary admin-btn-sm disabled:opacity-40"
          >
            {t('admin.bookings.previous')}
          </button>
          <span>{t('admin.bookings.pageOf', { page: pagination.page, total: pagination.totalPages })}</span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={onNext}
            className="admin-btn admin-btn-secondary admin-btn-sm disabled:opacity-40"
          >
            {t('admin.bookings.next')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

const MobileCard = ({ booking, t, language, currency, onSelect }) => (
  <button type="button" className="res-card" onClick={() => onSelect(booking)}>
    <div className="flex items-start justify-between gap-3">
      <p className="font-semibold text-[var(--admin-ink)]">{reservationRef(booking)}</p>
      <BookingStatusBadge status={booking.status} t={t} />
    </div>
    <div>
      <p className="text-sm font-medium text-[var(--admin-ink)]">{booking.customerName || t('admin.common.guest')}</p>
      <p className="text-sm text-[var(--admin-muted)]">{vehicleLabel(booking.car)}</p>
    </div>
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-[var(--admin-ink-secondary)]">
        {dateRangeLabel(booking.pickupDate, booking.returnDate, language)}
      </span>
      <span className="font-semibold text-[var(--admin-ink)]">{money(currency, booking.price)}</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      <SignatureBadge booking={booking} t={t} />
      <PaymentBadge booking={booking} t={t} />
    </div>
    <p className="text-sm font-semibold text-[var(--admin-primary)]">
      {t('admin.bookings.viewReservation')} →
    </p>
  </button>
)

export default ReservationList

import React from 'react'
import { EmptyState, SkeletonBlock } from '../../../admin/ui'
import ActionMenu from './ActionMenu'
import { BookingStatusBadge } from './ReservationBadges'
import {
  contractTone,
  customerInitials,
  dateRangeLabel,
  formatTime,
  getContractStatus,
  getPaymentDisplay,
  getSignatureStatus,
  money,
  paymentTone,
  reservationRef,
  signatureTone,
  vehicleLabel,
} from './reservationHelpers'

/** Compact ops signals — payment / signature / contract under the reservation ref */
const OpsSignals = ({ booking, t }) => {
  const pay = getPaymentDisplay(booking)
  const sig = getSignatureStatus(booking)
  const contract = getContractStatus(booking)
  const walkIn = String(booking.channel || '').toLowerCase().includes('walk')

  const signals = [
    {
      key: 'ch',
      tone: walkIn ? 'warn' : 'info',
      label: walkIn ? 'Walk-in' : 'Online',
      active: true,
    },
    {
      key: 'pay',
      tone: paymentTone(pay),
      label: t(`admin.bookings.paymentLabels.${pay}`),
      active: pay !== 'paid',
    },
    {
      key: 'sig',
      tone: signatureTone(sig),
      label: t(`admin.bookings.requestStatuses.${sig}`),
      active: sig === 'pending' || sig === 'expired' || sig === 'none',
    },
    {
      key: 'ctr',
      tone: contractTone(contract),
      label: t(`admin.bookings.contractLabels.${contract}`),
      active: contract === 'none',
    },
  ]

  return (
    <div className="res-signals" aria-label={t('admin.bookings.operational')}>
      {signals.map((s) => (
        <span
          key={s.key}
          className={`res-signal res-signal-${s.tone}${s.active ? ' is-alert' : ''}`}
          title={s.label}
        >
          <i className="res-dot" aria-hidden />
          <span className="res-signal-label">{s.label}</span>
        </span>
      ))}
    </div>
  )
}

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
      <div className="space-y-2.5">
        <SkeletonBlock className="h-[4.5rem] lg:hidden" />
        <SkeletonBlock className="h-[4.5rem] lg:hidden" />
        <SkeletonBlock className="h-[4.5rem] lg:hidden" />
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
            <colgroup>
              <col className="res-col-ref" />
              <col className="res-col-customer" />
              <col className="res-col-vehicle" />
              <col className="res-col-dates" />
              <col className="res-col-status" />
              <col className="res-col-total" />
              <col className="res-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>{t('admin.bookings.reservation')}</th>
                <th>{t('admin.bookings.customer')}</th>
                <th>{t('admin.bookings.vehicle')}</th>
                <th>{t('admin.bookings.dates')}</th>
                <th>{t('admin.bookings.status')}</th>
                <th>{t('admin.bookings.total')}</th>
                <th className="text-right">
                  <span className="sr-only">{t('admin.bookings.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const selected = selectedId === booking._id
                return (
                  <tr
                    key={booking._id}
                    className={selected ? 'is-selected' : ''}
                    onClick={() => onSelect(booking)}
                  >
                    <td>
                      <p className="res-ref-cell">{reservationRef(booking)}</p>
                      <OpsSignals booking={booking} t={t} />
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
                            {booking.customerPhone || booking.customerEmail || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="res-id-primary">{vehicleLabel(booking.car)}</p>
                      {booking.car?.licensePlate ? (
                        <p className="res-id-secondary">{booking.car.licensePlate}</p>
                      ) : null}
                    </td>
                    <td>
                      <p className="res-id-primary">
                        {dateRangeLabel(booking.pickupDate, booking.returnDate, language)}
                      </p>
                      <p className="res-id-secondary">
                        {formatTime(booking.pickupDate, language)}
                        {' – '}
                        {formatTime(booking.returnDate, language)}
                      </p>
                    </td>
                    <td>
                      <BookingStatusBadge status={booking.status} t={t} />
                    </td>
                    <td>
                      <p className="res-total">{money(currency, booking.price)}</p>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="res-row-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary res-btn"
                          onClick={() => onSelect(booking)}
                        >
                          {t('admin.bookings.view')}
                        </button>
                        <ActionMenu
                          label={t('admin.bookings.more')}
                          iconOnly
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
        <div className="res-pager">
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
        </div>
      ) : null}
    </div>
  )
}

const MobileCard = ({ booking, t, language, currency, selected, onSelect }) => (
  <button
    type="button"
    className={`res-card${selected ? ' is-selected' : ''}`}
    onClick={() => onSelect(booking)}
  >
    <div className="res-card-top">
      <div className="min-w-0">
        <p className="res-ref-cell">{reservationRef(booking)}</p>
        <OpsSignals booking={booking} t={t} />
      </div>
      <BookingStatusBadge status={booking.status} t={t} />
    </div>
    <div className="res-card-body">
      <p className="res-id-primary">{booking.customerName || t('admin.common.guest')}</p>
      <p className="res-id-secondary">{vehicleLabel(booking.car)}</p>
    </div>
    <div className="res-card-meta">
      <span>{dateRangeLabel(booking.pickupDate, booking.returnDate, language)}</span>
      <span className="res-total">{money(currency, booking.price)}</span>
    </div>
  </button>
)

export default ReservationList

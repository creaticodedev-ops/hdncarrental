import React from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../../admin/ui'
import ActionMenu from './ActionMenu'
import {
  BookingStatusBadge,
  ChannelChip,
  ContractBadge,
  PaymentBadge,
  SignatureBadge,
} from './ReservationBadges'
import {
  canExtend,
  canRequestSignature,
  customerInitials,
  entityName,
  formatCompactDate,
  formatDateTime,
  getSignatureStatus,
  money,
  reservationRef,
  vehicleLabel,
  vehicleMeta,
} from './reservationHelpers'

const Kv = ({ label, children }) => (
  <div className="res-kv">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
)

const Section = ({ title, children }) => (
  <section className="res-section">
    {title ? (
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-muted)]">
        {title}
      </h3>
    ) : null}
    {children}
  </section>
)

const ReservationDetail = ({
  t,
  language,
  currency,
  booking,
  completionUrl,
  compatibleVehicles = [],
  assigningVehicle,
  uploadingDoc,
  identityType,
  setIdentityType,
  hasPermission,
  onBack,
  onRequestSignature,
  onExtend,
  onEdit,
  onChangeStatus,
  onChangePayment,
  onAssignVehicle,
  onWhatsApp,
  onPrint,
  onDelete,
  onCancelReservation,
  onGenerateInvoice,
  onDownloadLicense,
  onDownloadId,
  onDownloadPassport,
  onUpload,
}) => {
  if (!booking) {
    return (
      <div className="hidden xl:block">
        <EmptyState title={t('admin.bookings.details')} description={t('admin.bookings.selectHint')} />
      </div>
    )
  }

  const sig = getSignatureStatus(booking)
  const showSignatureCta = canRequestSignature(booking)
  const signatureLabel =
    sig === 'none' || sig === 'cancelled' || sig === 'expired'
      ? t('admin.bookings.requestSignature')
      : t('admin.bookings.secureLink')
  const carBits = vehicleMeta(booking.car)
  const samsar = entityName(booking.samsar)
  const chauffeur = entityName(booking.chauffeur)
  const partner = entityName(booking.partnerCompany)

  const moreItems = [
    { key: 'edit', label: t('admin.bookings.edit'), onClick: onEdit },
    { key: 'wa', label: t('admin.bookings.whatsapp'), onClick: onWhatsApp },
    { key: 'print', label: t('admin.bookings.print'), onClick: onPrint },
    canExtend(booking)
      ? { key: 'extend', label: t('admin.bookings.extendRental'), onClick: onExtend }
      : null,
    { key: 'sep1', separator: true },
    hasPermission('contracts')
      ? { key: 'inv', label: t('admin.bookings.generateInvoice'), onClick: onGenerateInvoice }
      : null,
    { key: 'sep2', separator: true },
    booking.status !== 'cancelled'
      ? { key: 'cancel', label: t('admin.bookings.cancelReservation'), tone: 'danger', onClick: onCancelReservation }
      : null,
    { key: 'del', label: t('admin.bookings.delete'), tone: 'danger', onClick: onDelete },
  ].filter(Boolean)

  return (
    <div className="res-detail min-w-0 pb-4">
      <header className="res-detail-header">
        <button type="button" className="res-detail-back mb-2 text-sm font-medium text-[var(--admin-primary)]" onClick={onBack}>
          ← {t('admin.bookings.backToList')}
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-[var(--admin-ink)] break-all">
              {reservationRef(booking)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <BookingStatusBadge status={booking.status} t={t} />
              <ChannelChip channel={booking.channel} />
            </div>
            <p className="mt-2 text-sm font-medium text-[var(--admin-ink)]">
              {booking.customerName || t('admin.common.guest')}
            </p>
            <p className="text-sm text-[var(--admin-muted)]">{vehicleLabel(booking.car)}</p>
          </div>
          <div className="hidden xl:flex shrink-0 flex-wrap justify-end gap-2">
            {showSignatureCta ? (
              <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={onRequestSignature}>
                {signatureLabel}
              </button>
            ) : null}
            {canExtend(booking) ? (
              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onExtend}>
                {t('admin.bookings.extendRental')}
              </button>
            ) : null}
            <ActionMenu label={t('admin.bookings.more')} items={moreItems} />
          </div>
        </div>
      </header>

      <Section title={t('admin.bookings.overview')}>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              {t('admin.bookings.rentalPeriod')}
            </p>
            <p className="mt-1 text-sm text-[var(--admin-ink)]">
              {t('admin.bookings.pickup')}: {formatCompactDate(booking.pickupDate, language)}
            </p>
            <p className="text-sm text-[var(--admin-ink)]">
              {t('admin.bookings.dropoff')}: {formatCompactDate(booking.returnDate, language)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              {t('admin.bookings.vehicle')}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--admin-ink)]">{vehicleLabel(booking.car)}</p>
            {carBits ? <p className="text-xs text-[var(--admin-muted)]">{carBits}</p> : null}
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-[var(--admin-border)] pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              {t('admin.bookings.pricing')}
            </span>
            <span className="text-lg font-semibold text-[var(--admin-ink)]">{money(currency, booking.price)}</span>
          </div>
        </div>
      </Section>

      <Section title={t('admin.bookings.operational')}>
        <div className="space-y-3">
          <Kv label={t('admin.bookings.payment')}>
            <PaymentBadge booking={booking} t={t} />
          </Kv>
          <Kv label={t('admin.bookings.contract')}>
            <ContractBadge booking={booking} t={t} />
          </Kv>
          <Kv label={t('admin.bookings.signature')}>
            <button type="button" className="text-right" onClick={onRequestSignature}>
              <SignatureBadge booking={booking} t={t} />
            </button>
          </Kv>
          {samsar ? <Kv label={t('admin.bookings.samsar')}>{samsar}</Kv> : null}
          {partner ? <Kv label={t('admin.bookings.partner')}>{partner}</Kv> : null}
          {chauffeur ? <Kv label={t('admin.bookings.chauffeur')}>{chauffeur}</Kv> : null}
        </div>
      </Section>

      <Section title={t('admin.bookings.customer')}>
        <div className="mb-3 flex items-center gap-2">
          <span className="res-avatar">{customerInitials(booking.customerName)}</span>
          <p className="font-medium text-[var(--admin-ink)]">{booking.customerName || t('admin.common.guest')}</p>
        </div>
        <div className="space-y-2">
          <Kv label={t('admin.bookings.phone')}>{booking.customerPhone || '—'}</Kv>
          <Kv label={t('admin.bookings.email')}>{booking.customerEmail || '—'}</Kv>
        </div>
      </Section>

      <Section title={t('admin.bookings.vehicle')}>
        <div className="space-y-2">
          <Kv label={t('admin.bookings.vehicle')}>{vehicleLabel(booking.car)}</Kv>
          {booking.car?.licensePlate ? (
            <Kv label={t('admin.bookings.licensePlate')}>{booking.car.licensePlate}</Kv>
          ) : null}
          <Kv label={t('admin.bookings.pickupLocation')}>{booking.pickupLocation || '—'}</Kv>
          <Kv label={t('admin.bookings.dropoffLocation')}>{booking.returnLocation || '—'}</Kv>
        </div>
        {compatibleVehicles.length > 0 ? (
          <div className="mt-3">
            <label className="admin-label">{t('admin.bookings.assignVehicle')}</label>
            <select
              className="admin-input"
              disabled={assigningVehicle}
              value={booking.car?._id || ''}
              onChange={(e) => onAssignVehicle(e.target.value)}
            >
              {compatibleVehicles.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.licensePlate || c.fleetId || String(c._id).slice(-6)} — {c.brand} {c.model}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[var(--admin-muted)]">{t('admin.bookings.sameModelHint')}</p>
          </div>
        ) : null}
      </Section>

      <Section title={t('admin.bookings.pricing')}>
        {booking.priceBreakdown ? (
          <div className="space-y-1.5 text-sm">
            <Kv label={t('admin.bookings.rentalPrice')}>{money(currency, booking.priceBreakdown.rentalPrice)}</Kv>
            <Kv label={t('admin.bookings.pickupFee')}>
              {(booking.priceBreakdown.pickupDeliveryFee || 0) <= 0
                ? t('admin.bookings.free')
                : money(currency, booking.priceBreakdown.pickupDeliveryFee)}
            </Kv>
            <Kv label={t('admin.bookings.dropoffFee')}>
              {(booking.priceBreakdown.dropoffDeliveryFee || 0) <= 0
                ? t('admin.bookings.free')
                : money(currency, booking.priceBreakdown.dropoffDeliveryFee)}
            </Kv>
            {(booking.priceBreakdown.discountTotal || 0) > 0 ? (
              <Kv label={t('admin.bookings.discounts')}>−{money(currency, booking.priceBreakdown.discountTotal)}</Kv>
            ) : null}
            <div className="border-t border-[var(--admin-border)] pt-2">
              <Kv label={t('admin.bookings.total')}>
                <strong>{money(currency, booking.price)}</strong>
              </Kv>
            </div>
          </div>
        ) : (
          <Kv label={t('admin.bookings.total')}>
            <strong>{money(currency, booking.price)}</strong>
          </Kv>
        )}
      </Section>

      <Section title={t('admin.bookings.payment')}>
        <label className="admin-label">{t('admin.bookings.paymentStatus')}</label>
        <select
          className="admin-input"
          value={booking.paymentStatus || 'pending'}
          onChange={(e) => onChangePayment(e.target.value)}
        >
          <option value="pending">{t('admin.bookings.paymentLabels.unpaid')}</option>
          <option value="paid">{t('admin.bookings.paymentLabels.paid')}</option>
          <option value="failed">{t('admin.bookings.paymentLabels.failed')}</option>
          <option value="refunded">{t('admin.bookings.paymentLabels.refunded')}</option>
        </select>
      </Section>

      <Section title={`${t('admin.bookings.contract')} & ${t('admin.bookings.signature')}`}>
        <div className="space-y-2">
          <Kv label={t('admin.bookings.contract')}>
            <ContractBadge booking={booking} t={t} />
          </Kv>
          <Kv label={t('admin.bookings.signature')}>
            <SignatureBadge booking={booking} t={t} />
          </Kv>
          {booking.completion ? (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-lg bg-[var(--admin-surface-2)] px-2 py-2">
                <p className="text-[var(--admin-muted)]">{t('admin.bookings.docs')}</p>
                <p className="mt-0.5 font-semibold">{booking.completion.documentsComplete ? '✓' : '—'}</p>
              </div>
              <div className="rounded-lg bg-[var(--admin-surface-2)] px-2 py-2">
                <p className="text-[var(--admin-muted)]">{t('admin.bookings.pay')}</p>
                <p className="mt-0.5 font-semibold">{booking.completion.paymentComplete ? '✓' : '—'}</p>
              </div>
              <div className="rounded-lg bg-[var(--admin-surface-2)] px-2 py-2">
                <p className="text-[var(--admin-muted)]">{t('admin.bookings.sign')}</p>
                <p className="mt-0.5 font-semibold">{booking.completion.signatureComplete ? '✓' : '—'}</p>
              </div>
            </div>
          ) : null}
          {completionUrl ? (
            <p className="mt-2 truncate text-[11px] text-[var(--admin-muted)]" title={completionUrl}>
              {completionUrl}
            </p>
          ) : null}
        </div>
        {hasPermission('contracts') && booking.status !== 'cancelled' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onGenerateInvoice}>
              {t('admin.bookings.generateInvoice')}
            </button>
            <Link
              to={`/owner/contracts?bookingId=${booking._id}`}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              {t('admin.bookings.generateContract')}
            </Link>
          </div>
        ) : null}
      </Section>

      <Section title={t('admin.bookings.partners')}>
        <div className="space-y-2">
          <Kv label={t('admin.bookings.samsar')}>{samsar || t('admin.bookings.notAssigned')}</Kv>
          <Kv label={t('admin.bookings.partner')}>{partner || t('admin.bookings.notAssigned')}</Kv>
          <Kv label={t('admin.bookings.chauffeur')}>{chauffeur || t('admin.bookings.notAssigned')}</Kv>
        </div>
      </Section>

      <Section title={t('admin.bookings.updateStatus')}>
        <select
          className="admin-input"
          value={booking.status}
          onChange={(e) => onChangeStatus(e.target.value)}
        >
          <option value="pending">{t('admin.bookings.statuses.pending')}</option>
          <option value="confirmed">{t('admin.bookings.statuses.confirmed')}</option>
          <option value="ready_for_pickup">{t('admin.bookings.statuses.ready_for_pickup')}</option>
          <option value="active">{t('admin.bookings.statuses.active')}</option>
          <option value="completed">{t('admin.bookings.statuses.completed')}</option>
          <option value="cancelled">{t('admin.bookings.statuses.cancelled')}</option>
        </select>
      </Section>

      <Section title={t('admin.bookings.uploadDocuments')}>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onDownloadLicense}>
            {t('admin.bookings.downloadLicense')}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onDownloadId}>
            {t('admin.bookings.downloadId')}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onDownloadPassport}>
            {t('admin.bookings.downloadPassport')}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          <label className="text-xs text-[var(--admin-muted)]">{t('admin.bookings.uploadLicense')}</label>
          <input
            type="file"
            accept="image/*"
            disabled={uploadingDoc === 'driving_license'}
            className="block w-full text-xs"
            onChange={(e) => {
              onUpload(e.target.files?.[0], 'driving_license')
              e.target.value = ''
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="admin-input max-w-[10rem]"
              value={identityType}
              onChange={(e) => setIdentityType(e.target.value)}
            >
              <option value="national_id">{t('admin.bookings.nationalId')}</option>
              <option value="passport">{t('admin.bookings.passport')}</option>
            </select>
          </div>
          <input
            type="file"
            accept="image/*"
            disabled={uploadingDoc === 'identity'}
            className="block w-full text-xs"
            onChange={(e) => {
              onUpload(e.target.files?.[0], 'identity')
              e.target.value = ''
            }}
          />
          <label className="text-xs text-[var(--admin-muted)]">{t('admin.bookings.downloadPassport')}</label>
          <input
            type="file"
            accept="image/*"
            disabled={uploadingDoc === 'passport'}
            className="block w-full text-xs"
            onChange={(e) => {
              onUpload(e.target.files?.[0], 'passport')
              e.target.value = ''
            }}
          />
        </div>
      </Section>

      {Array.isArray(booking.extensionHistory) && booking.extensionHistory.length > 0 ? (
        <Section title={t('admin.bookings.extensionHistory')}>
          <div className="space-y-2 text-xs text-[var(--admin-muted)]">
            {[...booking.extensionHistory].reverse().map((ext, idx) => (
              <div key={idx} className="border-t border-[var(--admin-border)] pt-2 first:border-0 first:pt-0">
                <p>
                  {formatDateTime(ext.previousReturnDate, language)} → {formatDateTime(ext.newReturnDate, language)}
                  {' '}(+{ext.deltaDays}d)
                </p>
                <p>
                  {money(currency, ext.previousPrice)} → {money(currency, ext.newPrice)}
                  {' '}(+{money(currency, ext.deltaAmount)})
                </p>
                {ext.notes ? <p>{ext.notes}</p> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title={t('admin.bookings.activity')}>
        <div className="space-y-2">
          <Kv label={t('admin.bookings.notes')}>{booking.notes || t('admin.bookings.noNotes')}</Kv>
          {booking.createdAt ? (
            <Kv label={t('admin.bookings.createdAt')}>{formatDateTime(booking.createdAt, language)}</Kv>
          ) : null}
          {booking.updatedAt ? (
            <Kv label={t('admin.bookings.updatedAt')}>{formatDateTime(booking.updatedAt, language)}</Kv>
          ) : null}
        </div>
      </Section>

      <div className="res-sticky-bar xl:hidden">
        {showSignatureCta ? (
          <button type="button" className="admin-btn admin-btn-primary flex-1" onClick={onRequestSignature}>
            {t('admin.bookings.requestSignature')}
          </button>
        ) : canExtend(booking) ? (
          <button type="button" className="admin-btn admin-btn-primary flex-1" onClick={onExtend}>
            {t('admin.bookings.extendRental')}
          </button>
        ) : (
          <button type="button" className="admin-btn admin-btn-secondary flex-1" onClick={onEdit}>
            {t('admin.bookings.edit')}
          </button>
        )}
        <ActionMenu label={t('admin.bookings.more')} items={moreItems} />
      </div>
    </div>
  )
}

export default ReservationDetail

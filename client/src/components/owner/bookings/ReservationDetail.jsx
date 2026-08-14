import React, { useRef } from 'react'
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
  entityName,
  formatCompactDate,
  formatDateTime,
  getSignatureStatus,
  money,
  reservationRef,
  vehicleLabel,
  vehicleMeta,
} from './reservationHelpers'

const PenIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L8.25 18.002H5.25v-3L16.862 4.487z" />
  </svg>
)
const CalendarIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path strokeLinecap="round" d="M8 3.5V7M16 3.5V7M3.5 10h17" />
  </svg>
)
const PencilIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
  </svg>
)

const Line = ({ label, children }) => (
  <div className="res-line">
    <span>{label}</span>
    <strong>{children}</strong>
  </div>
)

const Block = ({ id, title, children, className = '' }) => (
  <section id={id} className={`res-block ${className}`}>
    {title ? <h3>{title}</h3> : null}
    {children}
  </section>
)

const Fold = ({ title, children }) => (
  <details className="res-fold">
    <summary>{title}</summary>
    <div className="res-fold-body">{children}</div>
  </details>
)

const ActionRow = ({
  bar,
  t,
  showSignatureCta,
  extendable,
  onRequestSignature,
  onExtend,
  onEdit,
  moreItems,
}) => (
  <div className={bar ? 'res-fixed-bar' : 'res-action-row'}>
    {showSignatureCta ? (
      <button type="button" className="admin-btn admin-btn-primary res-btn" onClick={onRequestSignature}>
        <PenIcon />
        {t('admin.bookings.requestSignature')}
      </button>
    ) : null}
    {!bar && extendable ? (
      <button type="button" className="admin-btn admin-btn-secondary res-btn" onClick={onExtend}>
        <CalendarIcon />
        {t('admin.bookings.extendShort')}
      </button>
    ) : null}
    {!bar ? (
      <button type="button" className="admin-btn admin-btn-secondary res-btn" onClick={onEdit}>
        <PencilIcon />
        {t('admin.bookings.edit')}
      </button>
    ) : null}
    {bar && !showSignatureCta && extendable ? (
      <button type="button" className="admin-btn admin-btn-primary res-btn" onClick={onExtend}>
        <CalendarIcon />
        {t('admin.bookings.extendShort')}
      </button>
    ) : null}
    <ActionMenu label={t('admin.bookings.more')} iconOnly items={moreItems} />
  </div>
)

const ReservationDetail = ({
  t,
  language,
  currency,
  booking,
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
  onResendSignature,
  onCancelSignature,
  onDownloadLicense,
  onDownloadId,
  onDownloadPassport,
  onUpload,
}) => {
  const assignmentRef = useRef(null)

  if (!booking) {
    return (
      <div className="hidden xl:block">
        <EmptyState title={t('admin.bookings.details')} description={t('admin.bookings.selectHint')} />
      </div>
    )
  }

  const sig = getSignatureStatus(booking)
  const showSignatureCta = canRequestSignature(booking)
  const extendable = canExtend(booking)
  const carBits = vehicleMeta(booking.car)
  const samsar = entityName(booking.samsar) || t('admin.bookings.notAssigned')
  const chauffeur = entityName(booking.chauffeur) || t('admin.bookings.notAssigned')
  const partner = entityName(booking.partnerCompany) || t('admin.bookings.notAssigned')

  const focusAssignment = () => {
    assignmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const moreItems = [
    { key: 'samsar', label: t('admin.bookings.assignSamsar'), onClick: focusAssignment },
    { key: 'chauffeur', label: t('admin.bookings.assignChauffeur'), onClick: focusAssignment },
    { key: 'partner', label: t('admin.bookings.assignPartner'), onClick: focusAssignment },
    { key: 'sep1', separator: true },
    sig === 'pending' || sig === 'expired' || sig === 'cancelled'
      ? { key: 'resend', label: t('admin.bookings.resendSignature'), onClick: onResendSignature }
      : null,
    sig === 'pending'
      ? { key: 'cancelsig', label: t('admin.bookings.cancelLink'), tone: 'danger', onClick: onCancelSignature }
      : null,
    { key: 'sep2', separator: true },
    { key: 'wa', label: t('admin.bookings.whatsapp'), onClick: onWhatsApp },
    { key: 'print', label: t('admin.bookings.print'), onClick: onPrint },
    hasPermission('contracts')
      ? { key: 'inv', label: t('admin.bookings.generateInvoice'), onClick: onGenerateInvoice }
      : null,
    hasPermission('contracts') && booking.status !== 'cancelled'
      ? { key: 'contract', label: t('admin.bookings.generateContract'), href: `/owner/contracts?bookingId=${booking._id}` }
      : null,
    { key: 'sep3', separator: true },
    booking.status !== 'cancelled'
      ? { key: 'cancel', label: t('admin.bookings.cancelReservation'), tone: 'danger', onClick: onCancelReservation }
      : null,
    { key: 'del', label: t('admin.bookings.delete'), tone: 'danger', onClick: onDelete },
  ].filter(Boolean)

  const barMoreItems = [
    extendable ? { key: 'extend', label: t('admin.bookings.extendRental'), onClick: onExtend } : null,
    { key: 'edit', label: t('admin.bookings.edit'), onClick: onEdit },
    { key: 'sep0', separator: true },
    ...moreItems,
  ].filter(Boolean)

  return (
    <div className="res-workspace">
      <div className="res-summary">
        <button type="button" className="res-detail-back" onClick={onBack}>
          ← {t('admin.bookings.backToList')}
        </button>

        <div className="res-summary-top">
          <p className="res-ref">{reservationRef(booking)}</p>
          <div className="flex flex-wrap items-center gap-1">
            <BookingStatusBadge status={booking.status} t={t} />
            <ChannelChip channel={booking.channel} />
          </div>
        </div>

        <div className="res-who">
          <p className="res-who-name">{booking.customerName || t('admin.common.guest')}</p>
          <p className="res-who-car">{vehicleLabel(booking.car)}</p>
        </div>

        <p className="res-dates">
          {formatCompactDate(booking.pickupDate, language)} → {formatCompactDate(booking.returnDate, language)}
        </p>

        <div className="res-money">
          <span className="res-price">{money(currency, booking.price)}</span>
          <PaymentBadge booking={booking} t={t} />
        </div>

        <div className="res-flags">
          <span>
            {t('admin.bookings.signature')}: <SignatureBadge booking={booking} t={t} />
          </span>
          <span>
            {t('admin.bookings.contract')}: <ContractBadge booking={booking} t={t} />
          </span>
        </div>

        <ActionRow
          t={t}
          showSignatureCta={showSignatureCta}
          extendable={extendable}
          onRequestSignature={onRequestSignature}
          onExtend={onExtend}
          onEdit={onEdit}
          moreItems={moreItems}
        />
      </div>

      <div className="res-secondary">
        <Block className="res-block-rental" title={t('admin.bookings.rentalPeriod')}>
          <Line label={t('admin.bookings.pickup')}>{formatCompactDate(booking.pickupDate, language)}</Line>
          <Line label={t('admin.bookings.dropoff')}>{formatCompactDate(booking.returnDate, language)}</Line>
          <Line label={t('admin.bookings.pickupLocation')}>{booking.pickupLocation || '—'}</Line>
          <Line label={t('admin.bookings.dropoffLocation')}>{booking.returnLocation || '—'}</Line>
        </Block>

        <Block className="res-block-customer" title={t('admin.bookings.customer')}>
          <Line label={t('admin.bookings.customerShort')}>{booking.customerName || t('admin.common.guest')}</Line>
          <Line label={t('admin.bookings.phone')}>{booking.customerPhone || '—'}</Line>
          <Line label={t('admin.bookings.email')}>{booking.customerEmail || '—'}</Line>
        </Block>

        <Block className="res-block-vehicle" title={t('admin.bookings.vehicle')}>
          <Line label={t('admin.bookings.vehicle')}>{vehicleLabel(booking.car)}</Line>
          {carBits ? <p className="res-muted">{carBits}</p> : null}
          {compatibleVehicles.length > 0 ? (
            <select
              className="admin-input res-input-sm mt-1.5"
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
          ) : null}
        </Block>

        <Block className="res-block-ops" title={t('admin.bookings.operational')}>
          <Line label={t('admin.bookings.updateStatus')}>
            <select
              className="res-inline-select"
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
          </Line>
          <Line label={t('admin.bookings.payment')}>
            <select
              className="res-inline-select"
              value={booking.paymentStatus || 'pending'}
              onChange={(e) => onChangePayment(e.target.value)}
            >
              <option value="pending">{t('admin.bookings.paymentLabels.unpaid')}</option>
              <option value="paid">{t('admin.bookings.paymentLabels.paid')}</option>
              <option value="failed">{t('admin.bookings.paymentLabels.failed')}</option>
              <option value="refunded">{t('admin.bookings.paymentLabels.refunded')}</option>
            </select>
          </Line>
          {booking.priceBreakdown ? (
            <>
              <Line label={t('admin.bookings.rentalPrice')}>{money(currency, booking.priceBreakdown.rentalPrice)}</Line>
              {(booking.priceBreakdown.discountTotal || 0) > 0 ? (
                <Line label={t('admin.bookings.discounts')}>−{money(currency, booking.priceBreakdown.discountTotal)}</Line>
              ) : null}
            </>
          ) : null}
        </Block>

        <Block id="res-assignment" className="res-block-assign" title={t('admin.bookings.assignment')}>
          <div ref={assignmentRef}>
            <Line label={t('admin.bookings.samsar')}>{samsar}</Line>
            <Line label={t('admin.bookings.chauffeur')}>{chauffeur}</Line>
            <Line label={t('admin.bookings.partner')}>{partner}</Line>
            <p className="res-muted mt-1">{t('admin.bookings.assignmentHint')}</p>
          </div>
        </Block>

        <Fold title={t('admin.bookings.uploadDocuments')}>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="admin-btn admin-btn-secondary res-btn" onClick={onDownloadLicense}>
              {t('admin.bookings.downloadLicense')}
            </button>
            <button type="button" className="admin-btn admin-btn-secondary res-btn" onClick={onDownloadId}>
              {t('admin.bookings.downloadId')}
            </button>
            <button type="button" className="admin-btn admin-btn-secondary res-btn" onClick={onDownloadPassport}>
              {t('admin.bookings.downloadPassport')}
            </button>
          </div>
          <label className="res-muted mt-2 block">{t('admin.bookings.uploadLicense')}</label>
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
          <div className="mt-2 flex items-center gap-2">
            <select className="res-inline-select" value={identityType} onChange={(e) => setIdentityType(e.target.value)}>
              <option value="national_id">{t('admin.bookings.nationalId')}</option>
              <option value="passport">{t('admin.bookings.passport')}</option>
            </select>
          </div>
          <input
            type="file"
            accept="image/*"
            disabled={uploadingDoc === 'identity'}
            className="mt-1 block w-full text-xs"
            onChange={(e) => {
              onUpload(e.target.files?.[0], 'identity')
              e.target.value = ''
            }}
          />
        </Fold>

        <Fold title={t('admin.bookings.activity')}>
          <Line label={t('admin.bookings.notes')}>{booking.notes || t('admin.bookings.noNotes')}</Line>
          {booking.createdAt ? (
            <Line label={t('admin.bookings.createdAt')}>{formatDateTime(booking.createdAt, language)}</Line>
          ) : null}
          {Array.isArray(booking.extensionHistory) && booking.extensionHistory.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              <p className="res-muted">{t('admin.bookings.extensionHistory')}</p>
              {[...booking.extensionHistory].reverse().slice(0, 4).map((ext, idx) => (
                <p key={idx} className="text-xs text-[var(--admin-ink-secondary)]">
                  {formatCompactDate(ext.previousReturnDate, language)} → {formatCompactDate(ext.newReturnDate, language)}
                  {' '}(+{ext.deltaDays}d · {money(currency, ext.deltaAmount)})
                </p>
              ))}
            </div>
          ) : null}
        </Fold>
      </div>

      <ActionRow
        bar
        t={t}
        showSignatureCta={showSignatureCta}
        extendable={extendable}
        onRequestSignature={onRequestSignature}
        onExtend={onExtend}
        onEdit={onEdit}
        moreItems={barMoreItems}
      />
    </div>
  )
}

export default ReservationDetail

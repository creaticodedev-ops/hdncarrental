import React from 'react'
import { AdminDrawer, DrawerSection, FormField } from '../../../admin/ui'
import { SignatureBadge } from './ReservationBadges'
import {
  formatDateTime,
  getSignatureStatus,
  reservationRef,
  vehicleLabel,
} from './reservationHelpers'

const SignatureRequestDrawer = ({
  open,
  onClose,
  booking,
  t,
  language,
  linkUrl,
  busy,
  onGenerate,
  onCopy,
  onResend,
  onShare,
  onCancelRequest,
}) => {
  if (!booking) return null
  const status = getSignatureStatus(booking)
  const signed = status === 'signed'
  const pending = status === 'pending'
  const showLinkActions = Boolean(linkUrl) || pending
  const canGenerate = !signed && !showLinkActions

  return (
    <AdminDrawer
      open={open}
      onClose={() => !busy && onClose()}
      title={t('admin.bookings.signatureDrawerTitle')}
      description={`${reservationRef(booking)} · ${booking.customerName || ''}`}
      size="md"
      closeLabel={t('admin.ui.close')}
      footer={
        signed ? (
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            {t('admin.ui.close')}
          </button>
        ) : canGenerate ? (
          <button type="button" disabled={busy} className="admin-btn admin-btn-primary w-full sm:w-auto" onClick={onGenerate}>
            {busy ? t('admin.bookings.generatingLink') : t('admin.bookings.generateLink')}
          </button>
        ) : (
          <>
            <button type="button" disabled={busy || !linkUrl} className="admin-btn admin-btn-secondary" onClick={onCopy}>
              {t('admin.bookings.copy')}
            </button>
            <button type="button" disabled={busy} className="admin-btn admin-btn-primary" onClick={onShare}>
              {t('admin.bookings.shareWhatsApp')}
            </button>
          </>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            {t('admin.bookings.requestStatus')}
          </span>
          <SignatureBadge booking={booking} t={t} />
        </div>

        <DrawerSection title={t('admin.bookings.customer')}>
          <FormField label={t('admin.bookings.customerName')} className="sm:col-span-2">
            <p className="text-sm font-medium text-[var(--admin-ink)]">{booking.customerName || '—'}</p>
          </FormField>
          <FormField label={t('admin.bookings.phone')}>
            <p className="text-sm text-[var(--admin-ink)]">{booking.customerPhone || '—'}</p>
          </FormField>
          <FormField label={t('admin.bookings.email')}>
            <p className="text-sm text-[var(--admin-ink)] break-all">{booking.customerEmail || '—'}</p>
          </FormField>
        </DrawerSection>

        <DrawerSection title={t('admin.bookings.confirmDocument')} description={t('admin.bookings.confirmDocumentHint')}>
          <FormField label={t('admin.bookings.reservation')} className="sm:col-span-2">
            <p className="text-sm font-medium text-[var(--admin-ink)]">{reservationRef(booking)}</p>
          </FormField>
          <FormField label={t('admin.bookings.vehicle')}>
            <p className="text-sm text-[var(--admin-ink)]">{vehicleLabel(booking.car)}</p>
          </FormField>
          <FormField label={t('admin.bookings.dates')}>
            <p className="text-sm text-[var(--admin-ink)]">
              {formatDateTime(booking.pickupDate, language)} → {formatDateTime(booking.returnDate, language)}
            </p>
          </FormField>
        </DrawerSection>

        {signed ? (
          <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-success-soft)] px-4 py-3 text-sm text-[var(--admin-success)]">
            {t('admin.bookings.signatureDrawerSigned')}
          </div>
        ) : null}

        {(linkUrl || pending) && !signed ? (
          <DrawerSection title={t('admin.bookings.secureLink')} description={t('admin.bookings.linkHint')}>
            <div className="sm:col-span-2 space-y-3">
              {linkUrl ? (
                <div className="res-link-box">
                  <input readOnly className="admin-input" value={linkUrl} />
                  <button type="button" className="admin-btn admin-btn-secondary shrink-0" onClick={onCopy}>
                    {t('admin.bookings.copy')}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[var(--admin-muted)]">{t('admin.bookings.signaturePendingHint')}</p>
              )}
              {booking.completion?.tokenExpiresAt ? (
                <p className="text-xs text-[var(--admin-muted)]">
                  {t('admin.bookings.expiresAt')}: {formatDateTime(booking.completion.tokenExpiresAt, language)}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onResend}>
                  {t('admin.bookings.regenerateLink')}
                </button>
                {pending ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="admin-btn admin-btn-ghost admin-btn-sm text-[var(--admin-danger)]"
                    onClick={onCancelRequest}
                  >
                    {t('admin.bookings.cancelLink')}
                  </button>
                ) : null}
              </div>
            </div>
          </DrawerSection>
        ) : null}

        {!linkUrl && canGenerate ? (
          <p className="text-sm text-[var(--admin-muted)] leading-relaxed">{t('admin.bookings.linkHint')}</p>
        ) : null}
      </div>
    </AdminDrawer>
  )
}

export default SignatureRequestDrawer

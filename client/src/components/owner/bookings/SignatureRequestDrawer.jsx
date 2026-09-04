import React from 'react'
import { AdminDrawer, DrawerSection, FormField } from '../../../admin/ui'
import { SignatureBadge } from './ReservationBadges'
import {
  customerEmail,
  formatDateTime,
  getCompletionMode,
  getMissingContractFields,
  getSignatureStatus,
  canShareSignedContract,
  reservationRef,
  vehicleLabel,
} from './reservationHelpers'
import WhatsAppGlyph from '../../WhatsAppGlyph'

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
  onShareSigned,
  sharingSigned = false,
  onCancelRequest,
  onEditReservation,
}) => {
  if (!booking) return null
  const status = getSignatureStatus(booking)
  const signed = status === 'signed'
  const canShareSigned = canShareSignedContract(booking) && Boolean(onShareSigned)
  const pending = status === 'pending'
  const showLinkActions = Boolean(linkUrl) || pending
  const canGenerate = !signed && !showLinkActions
  const signatureOnly = getCompletionMode(booking) === 'signature_only'
  // Blanks are worth flagging on a desk booking — they print as "—" on the contract —
  // but they never downgrade the link.
  const missingFields = getMissingContractFields(booking)

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
          <>
            {canShareSigned ? (
              <button
                type="button"
                className="admin-btn admin-btn-whatsapp w-full sm:w-auto"
                disabled={busy || sharingSigned}
                onClick={onShareSigned}
              >
                <WhatsAppGlyph className="h-3.5 w-3.5 shrink-0" />
                {sharingSigned
                  ? t('admin.bookings.shareSignedContractOpening')
                  : t('admin.bookings.shareSignedContract')}
              </button>
            ) : null}
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              {t('admin.ui.close')}
            </button>
          </>
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
            <p className="text-sm text-[var(--admin-ink)] break-all">{customerEmail(booking) || '—'}</p>
          </FormField>
        </DrawerSection>

        {booking.secondDriver?.enabled ? (
          <DrawerSection
            title={t('admin.contracts.secondDriverName')}
            description={t('admin.bookings.bothDriversMustSign')}
          >
            <FormField label={t('admin.contracts.secondDriverName')} className="sm:col-span-2">
              <p className="text-sm font-medium text-[var(--admin-ink)]">
                {booking.secondDriver.fullName || '—'}
              </p>
            </FormField>
            {booking.secondDriver.phone ? (
              <FormField label={t('admin.contracts.secondDriverPhone')}>
                <p className="text-sm text-[var(--admin-ink)]">{booking.secondDriver.phone}</p>
              </FormField>
            ) : null}
            {booking.secondDriver.driverLicenseNumber ? (
              <FormField label={t('admin.contracts.driverLicense')}>
                <p className="text-sm text-[var(--admin-ink)]">{booking.secondDriver.driverLicenseNumber}</p>
              </FormField>
            ) : null}
          </DrawerSection>
        ) : null}

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
            <p className="font-semibold">{t('admin.bookings.signatureDrawerSigned')}</p>
            {canShareSigned ? (
              <p className="mt-1 text-xs leading-relaxed text-[var(--admin-muted)]">
                {t('admin.bookings.shareSignedContractHint')}
              </p>
            ) : null}
          </div>
        ) : signatureOnly ? (
          <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-success-soft)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--admin-success)]">
              {t('admin.bookings.linkModeSignatureOnly')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--admin-muted)]">
              {t('admin.bookings.linkModeSignatureOnlyHint')}
            </p>
            {missingFields.length ? (
              <>
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--admin-muted)]">
                  {t('admin.bookings.linkModeBlanksHint')}
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {missingFields.map((key) => (
                    <li
                      key={key}
                      className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-0.5 text-[11px] text-[var(--admin-muted)]"
                    >
                      {t(`admin.contracts.${key}`)}
                    </li>
                  ))}
                </ul>
                {onEditReservation ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm mt-2"
                    onClick={onEditReservation}
                  >
                    {t('admin.bookings.completeReservation')}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-warn-soft)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--admin-warn)]">
              {t('admin.bookings.linkModeFull')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--admin-muted)]">
              {t('admin.bookings.linkModeFullHint')}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {missingFields.map((key) => (
                <li
                  key={key}
                  className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-0.5 text-[11px] text-[var(--admin-ink)]"
                >
                  {t(`admin.contracts.${key}`)}
                </li>
              ))}
            </ul>
            {onEditReservation ? (
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm mt-3"
                onClick={onEditReservation}
              >
                {t('admin.bookings.completeReservation')}
              </button>
            ) : null}
          </div>
        )}

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

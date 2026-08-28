import React from 'react'
import ActionMenu from './ActionMenu'
import {
  canRequestSignature,
  getContractLifecycle,
  getSignatureStatus,
  hasSignedContractArchive,
} from './reservationHelpers'

const FileIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8a2 2 0 012 2v14l-3-1.5L12 20l-3-1.5L6 20V6a2 2 0 012-2z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
  </svg>
)

const EyeIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.4" />
  </svg>
)

const ContractActions = ({
  t,
  booking,
  contract = null,
  loading = false,
  busy = false,
  canManage = false,
  onGenerate,
  onView,
  onDownload,
  onEdit,
  onRegenerate,
  onRequestSignature,
  onViewSigned,
  hideLead = false,
}) => {
  if (!booking) return null

  const lifecycle = getContractLifecycle(booking, contract)
  const number = contract?.contractNumber || ''
  const archivedSigned = hasSignedContractArchive(contract)
  const currentIsSigned = getSignatureStatus(booking) === 'signed' && !archivedSigned
  const hasRecord = Boolean(contract?._id)
  const hasPdf = Boolean(hasRecord || booking?.completion?.contractPdfUrl)
  const canView = hasPdf && !loading
  const cancelled = booking.status === 'cancelled'
  const showGenerate = canManage && !hasRecord && !cancelled && lifecycle !== 'cancelled'
  const showManage = canManage && hasRecord && !cancelled
  const leadSignature = canRequestSignature(booking) && Boolean(onRequestSignature)

  const items = showManage
    ? [
        { key: 'edit', label: t('admin.bookings.editContract'), icon: 'edit', onClick: onEdit },
        {
          key: 'regen',
          label: currentIsSigned
            ? t('admin.bookings.createContractVersion')
            : t('admin.bookings.regenerateContract'),
          icon: 'refresh',
          onClick: onRegenerate,
        },
        { key: 'download', label: t('admin.bookings.downloadContract'), icon: 'download', onClick: onDownload },
        archivedSigned
          ? { key: 'signed', label: t('admin.bookings.viewSignedContract'), icon: 'eye', onClick: onViewSigned }
          : null,
      ].filter(Boolean)
    : []

  const manage = items.length ? (
    <ActionMenu
      label={t('admin.bookings.manageContract')}
      trigger="button"
      caret
      align="right"
      className="res-contract-manage"
      items={items}
    />
  ) : null

  return (
    <section className="res-contract-plain" aria-label={t('admin.bookings.contract')}>
      {number ? (
        <p className="res-contract-caption">
          {number}
          {lifecycle === 'signed' ? ` · ${t('admin.bookings.contractLabels.signed')}` : ''}
        </p>
      ) : null}

      {leadSignature && !hideLead ? (
        <>
          <button
            type="button"
            className="admin-btn admin-btn-primary res-btn-block"
            onClick={onRequestSignature}
            disabled={busy}
          >
            {t('admin.bookings.requestSignature')}
          </button>
          {canView || manage ? (
            <div className={`res-cta-row${canView && manage ? '' : ' is-single'}`}>
              {canView ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary res-btn-block"
                  onClick={onView}
                  disabled={busy}
                >
                  <EyeIcon />
                  {t('admin.bookings.viewContract')}
                </button>
              ) : null}
              {manage}
            </div>
          ) : null}
        </>
      ) : showGenerate ? (
        <button
          type="button"
          className="admin-btn admin-btn-primary res-btn-block"
          onClick={onGenerate}
          disabled={busy}
        >
          <PlusIcon />
          {busy ? t('admin.bookings.contractGenerating') : t('admin.bookings.generateContract')}
        </button>
      ) : canView || manage ? (
        <div className={`res-cta-row${manage || (!canManage && canView) ? '' : ' is-single'}`}>
          <button
            type="button"
            className="admin-btn admin-btn-primary res-btn-block"
            onClick={onView}
            disabled={!canView || busy}
          >
            <EyeIcon />
            {t('admin.bookings.viewContract')}
          </button>
          {manage}
          {!canManage && canView && !manage ? (
            <button
              type="button"
              className="admin-btn admin-btn-secondary res-btn-block"
              onClick={onDownload}
              disabled={busy}
            >
              <FileIcon />
              {t('admin.bookings.downloadContract')}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default ContractActions

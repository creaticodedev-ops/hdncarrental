import React from 'react'
import { StatusBadge } from '../../../admin/ui'
import ActionMenu from './ActionMenu'
import {
  canRequestSignature,
  contractTone,
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
}) => {
  if (!booking) return null

  const lifecycle = getContractLifecycle(booking, contract)
  const number = contract?.contractNumber || ''
  const version = Number(contract?.version) || 1
  const signedVersion = Number(contract?.signedVersion) || 0
  const archivedSigned = hasSignedContractArchive(contract)
  const currentIsSigned = getSignatureStatus(booking) === 'signed' && !archivedSigned
  const hasRecord = Boolean(contract?._id)
  const hasPdf = Boolean(hasRecord || booking?.completion?.contractPdfUrl)
  const canView = hasPdf && !loading
  const cancelled = booking.status === 'cancelled'
  const showGenerate = canManage && !hasRecord && !cancelled && lifecycle !== 'cancelled'
  const showManage = canManage && hasRecord && !cancelled
  const requestSig = canRequestSignature(booking) && Boolean(onRequestSignature)

  const items = showManage
    ? [
        {
          key: 'edit',
          label: t('admin.bookings.editContract'),
          icon: 'edit',
          onClick: onEdit,
        },
        {
          key: 'regen',
          label: currentIsSigned
            ? t('admin.bookings.createContractVersion')
            : t('admin.bookings.regenerateContract'),
          icon: 'refresh',
          onClick: onRegenerate,
        },
        requestSig
          ? {
              key: 'sign',
              label: t('admin.bookings.requestSignature'),
              icon: 'signature',
              onClick: onRequestSignature,
            }
          : null,
        {
          key: 'download',
          label: t('admin.bookings.downloadContract'),
          icon: 'download',
          onClick: onDownload,
        },
        archivedSigned
          ? {
              key: 'signed',
              label: t('admin.bookings.viewSignedContract'),
              icon: 'eye',
              onClick: onViewSigned,
            }
          : null,
      ].filter(Boolean)
    : []

  return (
    <section className="res-contract-card" aria-label={t('admin.bookings.contract')}>
      <div className="res-contract-meta">
        <p className="res-contract-kicker">{t('admin.bookings.contract')}</p>
        <div className="res-contract-id-row">
          {loading ? (
            <span className="res-contract-number is-muted">—</span>
          ) : number ? (
            <span className="res-contract-number">{number}</span>
          ) : (
            <span className="res-contract-number is-muted">{t('admin.bookings.contractLabels.none')}</span>
          )}
          <StatusBadge tone={contractTone(lifecycle)}>
            {t(`admin.bookings.contractLabels.${lifecycle}`)}
          </StatusBadge>
        </div>
        {number && version > 1 ? (
          <p className="res-contract-hint">
            {t('admin.bookings.contractActiveVersion', { version })}
            {archivedSigned
              ? ` · ${t('admin.bookings.contractSignedKept', { version: signedVersion })}`
              : ''}
          </p>
        ) : currentIsSigned ? (
          <p className="res-contract-hint">{t('admin.bookings.contractSignedHint')}</p>
        ) : null}
      </div>

      {showGenerate ? (
        <div className="res-contract-generate">
          <button
            type="button"
            className="admin-btn admin-btn-primary res-btn-block"
            onClick={onGenerate}
            disabled={busy}
          >
            <PlusIcon />
            {busy ? t('admin.bookings.contractGenerating') : t('admin.bookings.generateContract')}
          </button>
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
        </div>
      ) : canView || items.length ? (
        <div className={`res-contract-actions${items.length || (!canManage && canView) ? '' : ' is-single'}`}>
          <button
            type="button"
            className="admin-btn admin-btn-primary res-btn-block"
            onClick={onView}
            disabled={!canView || busy}
          >
            <EyeIcon />
            {t('admin.bookings.viewContract')}
          </button>
          {items.length ? (
            <ActionMenu
              label={t('admin.bookings.manageContract')}
              trigger="button"
              caret
              align="right"
              className="res-contract-manage"
              items={items}
            />
          ) : !canManage && canView ? (
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

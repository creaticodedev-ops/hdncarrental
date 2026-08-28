import React from 'react'
import ActionMenu from './ActionMenu'

const Ico = ({ children }) => (
  <svg className="res-dock-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    {children}
  </svg>
)

const WhatsAppIco = () => (
  <svg className="res-dock-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.82c0 1.96.52 3.8 1.43 5.4L2 22l4.95-1.52a9.9 9.9 0 004.99 1.34h.01c5.46 0 9.89-4.4 9.89-9.82C21.84 6.4 17.5 2 12.04 2zm5.75 14.15c-.24.68-1.4 1.25-1.93 1.33-.5.07-1.12.1-1.81-.11-.42-.13-.95-.3-1.64-.59-2.88-1.25-4.76-4.15-4.9-4.34-.15-.2-1.18-1.57-1.18-3 0-1.42.74-2.12 1.01-2.41.26-.28.58-.35.77-.35.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.2-.15.32-.3.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.3.15.47.12.64-.07.18-.2.74-.86.94-1.15.2-.3.4-.24.67-.14.27.1 1.72.81 2.02.96.3.15.5.22.57.34.08.13.08.74-.16 1.42z" />
  </svg>
)

const Tile = ({ label, title, onClick, disabled, tone, children }) => (
  <button
    type="button"
    className={`res-dock-tile${tone ? ` is-${tone}` : ''}${disabled ? ' is-disabled' : ''}`}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    title={title || label}
  >
    <span className="res-dock-icon">{children}</span>
    <span className="res-dock-caption">{label}</span>
  </button>
)

const InspectorDock = ({
  t,
  remaining = 0,
  hasEmail,
  hasContract,
  extendable,
  onWhatsApp,
  onEmail,
  onCopyLink,
  onAddPayment,
  onEdit,
  onExtend,
  onDownloadContract,
  moreItems,
}) => (
  <section className="res-dock" aria-label={t('admin.bookings.quickActions')}>
    <p className="res-dock-kicker">{t('admin.bookings.quickActions')}</p>
    <div className="res-dock-grid">
      <Tile label={t('admin.bookings.whatsapp')} onClick={onWhatsApp} tone="wa">
        <WhatsAppIco />
      </Tile>
      <Tile
        label={t('admin.bookings.emailAction')}
        title={hasEmail ? t('admin.bookings.emailActionHint') : t('admin.walkInReady.emailMissing')}
        onClick={onEmail}
        disabled={!hasEmail}
      >
        <Ico>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" />
        </Ico>
      </Tile>
      <Tile label={t('admin.bookings.copySignatureLink')} onClick={onCopyLink}>
        <Ico>
          <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
          <path strokeLinecap="round" d="M6.5 15.5H6a2 2 0 01-2-2V6a2 2 0 012-2h7.5a2 2 0 012 2v.5" />
        </Ico>
      </Tile>
      <Tile
        label={t('admin.bookings.recordPayment')}
        title={t('admin.bookings.recordPaymentHint')}
        onClick={onAddPayment}
        tone={remaining > 0 ? 'due' : undefined}
      >
        <Ico>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M8 8.5h5.2a2.3 2.3 0 010 4.6H9.5m0 0H14a2.2 2.2 0 010 4.4H8" />
        </Ico>
      </Tile>
      <Tile label={t('admin.bookings.edit')} onClick={onEdit}>
        <Ico>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L8.25 18.002H5.25v-3L16.862 4.487z" />
        </Ico>
      </Tile>
      {extendable ? (
        <Tile label={t('admin.bookings.extendShort')} onClick={onExtend}>
          <Ico>
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path strokeLinecap="round" d="M8 3.5V7M16 3.5V7M3.5 10h17" />
          </Ico>
        </Tile>
      ) : null}
      {hasContract ? (
        <Tile label={t('admin.bookings.downloadContract')} onClick={onDownloadContract}>
          <Ico>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 18h14" />
          </Ico>
        </Tile>
      ) : null}
    </div>
    <div className="res-dock-overflow">
      <ActionMenu
        label={t('admin.bookings.otherActions')}
        trigger="button"
        caret
        align="right"
        className="res-dock-more"
        items={moreItems}
      />
    </div>
  </section>
)

export default InspectorDock

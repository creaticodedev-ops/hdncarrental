import React from 'react'
import { useI18n } from '../../../i18n/I18nContext'
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from '../../../constants/brand'
import TopbarPopover from './TopbarPopover'
import { ExternalIcon, HelpIcon, MailIcon } from './icons'

const WhatsAppIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.3L4 20.2l1.3-4a8.4 8.4 0 1 1 15.2-4.6Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M9.3 8.6c.3-.6 1-.5 1.2 0l.5 1.1c.1.3 0 .6-.2.8l-.3.3c.4.9 1.1 1.6 2 2l.3-.3c.2-.2.5-.3.8-.2l1.1.5c.5.2.6.9 0 1.2-1.6.9-3.6-.3-4.6-1.3-1-1-2.2-3-1.3-4.6Z"
      fill="currentColor"
    />
  </svg>
)

/** Support entry points. Everything here opens a channel that actually exists. */
const HelpMenu = () => {
  const { t } = useI18n()

  const supportMessage = encodeURIComponent(t('admin.shell.help.whatsappMessage'))

  return (
    <TopbarPopover
      ariaLabel={t('admin.shell.help.label')}
      title={t('admin.shell.help.label')}
      width="16rem"
      renderTrigger={() => <HelpIcon />}
    >
      {({ close }) => (
        <div className="admin-pop-scroll">
          <p className="admin-pop-section">{t('admin.shell.help.label')}</p>
          <a
            href="/guide"
            target="_blank"
            rel="noreferrer"
            data-pop-item
            className="admin-pop-item"
            onClick={() => close({ restoreFocus: false })}
          >
            <ExternalIcon />
            <span className="admin-pop-item-label">{t('admin.shell.help.guides')}</span>
          </a>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${supportMessage}`}
            target="_blank"
            rel="noreferrer"
            data-pop-item
            className="admin-pop-item"
            onClick={() => close({ restoreFocus: false })}
          >
            <WhatsAppIcon />
            <span className="admin-pop-item-label">{t('admin.shell.help.whatsapp')}</span>
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('admin.shell.help.emailSubject'))}`}
            data-pop-item
            className="admin-pop-item"
            onClick={() => close({ restoreFocus: false })}
          >
            <MailIcon />
            <span className="admin-pop-item-label">{t('admin.shell.help.email')}</span>
          </a>
        </div>
      )}
    </TopbarPopover>
  )
}

export default HelpMenu

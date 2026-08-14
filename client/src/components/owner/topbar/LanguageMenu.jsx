import React from 'react'
import { useI18n } from '../../../i18n/I18nContext'
import TopbarPopover from './TopbarPopover'
import { CheckIcon } from './icons'

/** Admin-themed language switcher (the public one is styled for the marketing site). */
const LanguageMenu = () => {
  const { language, setLanguage, languages, t } = useI18n()

  return (
    <TopbarPopover
      ariaLabel={t('admin.shell.languageLabel')}
      title={t('admin.shell.languageLabel')}
      width="13rem"
      renderTrigger={() => <span className="admin-icon-btn-text">{language.toUpperCase()}</span>}
    >
      {({ close }) => (
        <div className="admin-pop-scroll">
          <p className="admin-pop-section">{t('admin.shell.languageLabel')}</p>
          {languages.map((code) => (
            <button
              key={code}
              type="button"
              data-pop-item
              className="admin-pop-item"
              aria-current={language === code}
              onClick={() => {
                setLanguage(code)
                close()
              }}
            >
              <span className="w-6 text-[11px] font-semibold tracking-wide">{code.toUpperCase()}</span>
              <span className="admin-pop-item-label">{t(`languages.${code}`)}</span>
              {language === code ? <CheckIcon size={15} /> : null}
            </button>
          ))}
        </div>
      )}
    </TopbarPopover>
  )
}

export default LanguageMenu

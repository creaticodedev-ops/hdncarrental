import React from 'react'
import { useAdminTheme } from '../../../admin/AdminThemeContext'
import { useI18n } from '../../../i18n/I18nContext'
import TopbarPopover from './TopbarPopover'
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from './icons'

export const THEME_OPTIONS = [
  { value: 'light', labelKey: 'admin.shell.themeLight', Icon: SunIcon },
  { value: 'dark', labelKey: 'admin.shell.themeDark', Icon: MoonIcon },
  { value: 'system', labelKey: 'admin.shell.themeSystem', Icon: MonitorIcon },
]

export const ThemeIcon = ({ preference, size }) => {
  const { Icon } = THEME_OPTIONS.find((item) => item.value === preference) || THEME_OPTIONS[2]
  return <Icon size={size} />
}

/** Explicit light / dark / system choice — no guessing what a single toggle does. */
const ThemeMenu = () => {
  const { preference, setPreference } = useAdminTheme()
  const { t } = useI18n()

  return (
    <TopbarPopover
      ariaLabel={t('admin.shell.themeLabel')}
      title={t('admin.shell.themeLabel')}
      width="13rem"
      renderTrigger={() => <ThemeIcon preference={preference} />}
    >
      {({ close }) => (
        <div className="admin-pop-scroll">
          <p className="admin-pop-section">{t('admin.shell.themeLabel')}</p>
          {THEME_OPTIONS.map(({ value, labelKey, Icon }) => (
            <button
              key={value}
              type="button"
              data-pop-item
              className="admin-pop-item"
              aria-current={preference === value}
              onClick={() => {
                setPreference(value)
                close()
              }}
            >
              <Icon />
              <span className="admin-pop-item-label">{t(labelKey)}</span>
              {preference === value ? <CheckIcon size={15} /> : null}
            </button>
          ))}
        </div>
      )}
    </TopbarPopover>
  )
}

export default ThemeMenu

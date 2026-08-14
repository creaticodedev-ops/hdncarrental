import React from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { useAdminTheme } from '../../../admin/AdminThemeContext'
import TopbarPopover from './TopbarPopover'
import { THEME_OPTIONS } from './ThemeMenu'
import { ChevronDownIcon, LogoutIcon, SettingsIcon, ShieldIcon, UserIcon } from './icons'

export const initialsOf = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'A'
}

const Avatar = ({ user, className = 'admin-user-avatar' }) =>
  user?.image ? (
    <img src={user.image} alt="" className={className} />
  ) : (
    <span className={className} aria-hidden>
      {initialsOf(user?.name)}
    </span>
  )

/**
 * Profile menu: identity, account links, appearance/language for narrow screens
 * (where the dedicated top-bar controls are hidden), and sign out.
 */
const AccountMenu = () => {
  const { user, logout } = useAppContext()
  const { t, language, setLanguage, languages } = useI18n()
  const { preference, setPreference } = useAdminTheme()

  return (
    <TopbarPopover
      ariaLabel={t('admin.shell.accountMenu')}
      title={t('admin.shell.accountMenu')}
      width="17rem"
      triggerClassName="admin-user-btn"
      renderTrigger={() => (
        <>
          <Avatar user={user} />
          <span className="hidden max-w-[9rem] truncate text-[13px] font-semibold lg:block">
            {user?.name || 'Admin'}
          </span>
          <ChevronDownIcon size={14} />
        </>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] px-3 py-3">
            <Avatar user={user} className="admin-user-avatar is-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--admin-ink)]">
                {user?.name || 'Admin'}
              </p>
              <p className="truncate text-xs text-[var(--admin-muted)]">{user?.email}</p>
              <p className="mt-1 truncate text-[11px] text-[var(--admin-muted)]">
                {user?.agencyName || t('admin.shell.roleOwner')}
              </p>
            </div>
          </div>

          <div className="admin-pop-scroll">
            <Link to="/owner/account" data-pop-item className="admin-pop-item" onClick={() => close({ restoreFocus: false })}>
              <UserIcon />
              <span className="admin-pop-item-label">{t('admin.account.title')}</span>
            </Link>
            <Link
              to="/owner/account?tab=security"
              data-pop-item
              className="admin-pop-item"
              onClick={() => close({ restoreFocus: false })}
            >
              <ShieldIcon />
              <span className="admin-pop-item-label">{t('admin.account.security')}</span>
            </Link>
            <Link to="/owner/settings" data-pop-item className="admin-pop-item" onClick={() => close({ restoreFocus: false })}>
              <SettingsIcon />
              <span className="admin-pop-item-label">{t('admin.menu.settings')}</span>
            </Link>

            <div className="admin-pop-sep sm:hidden" />
            <div className="sm:hidden">
              <p className="admin-pop-section">{t('admin.shell.themeLabel')}</p>
              {THEME_OPTIONS.map(({ value, labelKey, Icon }) => (
                <button
                  key={value}
                  type="button"
                  data-pop-item
                  className="admin-pop-item"
                  aria-current={preference === value}
                  onClick={() => setPreference(value)}
                >
                  <Icon />
                  <span className="admin-pop-item-label">{t(labelKey)}</span>
                </button>
              ))}
              <p className="admin-pop-section">{t('admin.shell.languageLabel')}</p>
              {languages.map((code) => (
                <button
                  key={code}
                  type="button"
                  data-pop-item
                  className="admin-pop-item"
                  aria-current={language === code}
                  onClick={() => setLanguage(code)}
                >
                  <span className="w-6 text-[11px] font-semibold tracking-wide">{code.toUpperCase()}</span>
                  <span className="admin-pop-item-label">{t(`languages.${code}`)}</span>
                </button>
              ))}
            </div>

            <div className="admin-pop-sep" />
            <button
              type="button"
              data-pop-item
              className="admin-pop-item is-danger"
              onClick={() => {
                close({ restoreFocus: false })
                logout()
              }}
            >
              <LogoutIcon />
              <span className="admin-pop-item-label">{t('admin.shell.logout')}</span>
            </button>
          </div>
        </>
      )}
    </TopbarPopover>
  )
}

export default AccountMenu

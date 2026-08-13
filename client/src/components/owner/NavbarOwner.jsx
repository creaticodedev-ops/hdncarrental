import React from 'react'
import { assets } from '../../assets/assets'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { BRAND_NAME } from '../../constants/brand'
import { useI18n } from '../../i18n/I18nContext'
import { useAdminTheme } from '../../admin/AdminThemeContext'
import LanguageSwitcher from '../LanguageSwitcher'
import NotificationBell from './NotificationBell'
import GlobalSearch from './GlobalSearch'

const ThemeIcon = ({ mode }) => {
  if (mode === 'dark') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    )
  }
  if (mode === 'system') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 20h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

const NavbarOwner = ({
  mobileNavOpen = false,
  onToggleMobileNav,
  sidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const { user, logout, license, licenseLocked } = useAppContext()
  const { t } = useI18n()
  const { preference, cyclePreference } = useAdminTheme()

  const showTrialBadge =
    !licenseLocked &&
    license?.licenseStatus === 'trial' &&
    typeof license?.daysRemaining === 'number'

  const themeLabel =
    preference === 'dark'
      ? t('admin.shell.themeDark')
      : preference === 'light'
        ? t('admin.shell.themeLight')
        : t('admin.shell.themeSystem')

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-6 lg:px-8 py-2.5 min-h-[57px] border-b border-[var(--admin-border)] bg-[var(--admin-navbar)] backdrop-blur-md text-[var(--admin-muted)]">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {!licenseLocked && onToggleMobileNav && (
          <button
            type="button"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-[var(--admin-radius)] border border-[var(--admin-border)] text-[var(--admin-ink)] hover:bg-[var(--admin-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
            onClick={onToggleMobileNav}
            aria-label={mobileNavOpen ? t('admin.shell.closeMenu') : t('admin.shell.openMenu')}
            aria-expanded={mobileNavOpen}
            aria-controls="owner-sidebar"
          >
            <img
              src={mobileNavOpen ? assets.close_icon : assets.menu_icon}
              alt=""
              className="h-4 w-4 opacity-80"
            />
          </button>
        )}
        {!licenseLocked && onToggleSidebarCollapse && (
          <button
            type="button"
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-[var(--admin-radius)] border border-[var(--admin-border)] text-[var(--admin-ink)] hover:bg-[var(--admin-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
            onClick={onToggleSidebarCollapse}
            aria-label={sidebarCollapsed ? t('admin.shell.expandSidebar') : t('admin.shell.collapseSidebar')}
            aria-pressed={sidebarCollapsed}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d={sidebarCollapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <Link to="/" className="shrink-0">
          <img src={assets.logo} alt={BRAND_NAME} className="block h-8 sm:h-9 w-auto max-h-9 object-contain" />
        </Link>
      </div>

      {!licenseLocked && (
        <div className="hidden md:flex min-w-0 flex-1 justify-center px-2 lg:px-6">
          <GlobalSearch />
        </div>
      )}

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
        {showTrialBadge && (
          <span className="hidden sm:inline-flex text-[11px] px-2.5 py-1 rounded-lg bg-[var(--admin-warn-soft)] text-[var(--admin-warn)] border border-[color-mix(in_srgb,var(--admin-warn)_25%,transparent)] whitespace-nowrap">
            {license.daysRemaining === 1
              ? t('admin.trial.daysLeft', { count: 1 })
              : t('admin.trial.daysLeft_plural', { count: license.daysRemaining })}
          </span>
        )}
        {!licenseLocked && <NotificationBell />}
        <button
          type="button"
          onClick={cyclePreference}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--admin-radius)] border border-[var(--admin-border)] text-[var(--admin-ink)] hover:bg-[var(--admin-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
          aria-label={t('admin.shell.themeToggle', { mode: themeLabel })}
          title={themeLabel}
        >
          <ThemeIcon mode={preference} />
        </button>
        <LanguageSwitcher />
        <p className="hidden xl:block text-sm truncate max-w-[12rem] text-[var(--admin-ink-secondary)]">
          {t('admin.shell.welcome', { name: user?.name || 'Admin' })}
        </p>
        <button type="button" onClick={logout} className="admin-btn admin-btn-primary min-h-10 px-3 sm:px-4 text-sm">
          {t('admin.shell.logout')}
        </button>
      </div>
    </div>
  )
}

export default NavbarOwner

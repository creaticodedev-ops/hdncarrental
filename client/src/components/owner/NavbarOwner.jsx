import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { BRAND_NAME } from '../../constants/brand'
import { useI18n } from '../../i18n/I18nContext'
import GlobalSearch from './GlobalSearch'
import AccountMenu from './topbar/AccountMenu'
import HelpMenu from './topbar/HelpMenu'
import LanguageMenu from './topbar/LanguageMenu'
import NotificationCenter from './topbar/NotificationCenter'
import QuickActionsMenu from './topbar/QuickActionsMenu'
import ThemeMenu from './topbar/ThemeMenu'
import TopbarPopover from './topbar/TopbarPopover'
import { CloseIcon, MenuIcon, PanelIcon, SearchIcon } from './topbar/icons'

/**
 * Admin top bar.
 *
 * Desktop keeps every control one click away: search in the middle, then create
 * shortcuts, help, notifications, appearance, language and the profile menu.
 * Below `sm` the secondary controls collapse into the profile menu and search
 * moves behind an icon, so the bar stays uncluttered on a phone.
 */
const NavbarOwner = ({
  mobileNavOpen = false,
  onToggleMobileNav,
  sidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const { license, licenseLocked } = useAppContext()
  const { t } = useI18n()

  const showTrialBadge =
    !licenseLocked &&
    license?.licenseStatus === 'trial' &&
    typeof license?.daysRemaining === 'number'

  return (
    <header className="admin-topbar">
      <div className="flex shrink-0 items-center gap-1">
        {!licenseLocked && onToggleMobileNav ? (
          <button
            type="button"
            className="admin-icon-btn md:hidden"
            onClick={onToggleMobileNav}
            aria-label={mobileNavOpen ? t('admin.shell.closeMenu') : t('admin.shell.openMenu')}
            aria-expanded={mobileNavOpen}
            aria-controls="owner-sidebar"
          >
            {mobileNavOpen ? <CloseIcon size={19} /> : <MenuIcon size={19} />}
          </button>
        ) : null}
        {!licenseLocked && onToggleSidebarCollapse ? (
          <button
            type="button"
            className="admin-icon-btn hidden md:inline-flex"
            onClick={onToggleSidebarCollapse}
            aria-label={sidebarCollapsed ? t('admin.shell.expandSidebar') : t('admin.shell.collapseSidebar')}
            aria-pressed={sidebarCollapsed}
          >
            <PanelIcon collapsed={sidebarCollapsed} size={18} />
          </button>
        ) : null}
        <Link to="/" className="ml-0.5 shrink-0" aria-label={BRAND_NAME}>
          <img src={assets.logo} alt={BRAND_NAME} className="block h-7 w-auto object-contain sm:h-8" />
        </Link>
      </div>

      {!licenseLocked ? (
        <div className="hidden min-w-0 flex-1 justify-center px-3 md:flex lg:px-6">
          <GlobalSearch shortcut />
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        {showTrialBadge ? (
          <span className="admin-badge admin-badge-warn mr-1 hidden whitespace-nowrap lg:inline-flex">
            {license.daysRemaining === 1
              ? t('admin.trial.daysLeft', { count: 1 })
              : t('admin.trial.daysLeft_plural', { count: license.daysRemaining })}
          </span>
        ) : null}

        {!licenseLocked ? (
          <>
            <div className="md:hidden">
              <TopbarPopover
                ariaLabel={t('admin.shell.searchPlaceholder')}
                title={t('admin.shell.searchPlaceholder')}
                width="min(24rem, calc(100vw - 1rem))"
                renderTrigger={(open) => (open ? <CloseIcon /> : <SearchIcon />)}
              >
                <div className="p-2">
                  <GlobalSearch inline autoFocus />
                </div>
              </TopbarPopover>
            </div>
            <div className="hidden sm:block">
              <QuickActionsMenu />
            </div>
            <div className="hidden sm:block">
              <HelpMenu />
            </div>
            <NotificationCenter />
            <div className="hidden sm:block">
              <ThemeMenu />
            </div>
            <div className="hidden sm:block">
              <LanguageMenu />
            </div>
            <span className="admin-topbar-sep hidden sm:block" aria-hidden />
          </>
        ) : null}

        <AccountMenu />
      </div>
    </header>
  )
}

export default NavbarOwner

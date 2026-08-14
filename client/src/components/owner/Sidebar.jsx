import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { assets, ownerNavGroups } from '../../assets/assets'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { NavIcon } from '../../admin/navIcons'
import { initialsOf as initials } from './topbar/AccountMenu'

const STORAGE_KEY = 'hdn.owner.sidebar.groups'
const MOBILE_MQ = '(max-width: 767px)'

const isLinkActive = (pathname, path) => {
  if (path === '/owner') return pathname === '/owner'
  return pathname === path || pathname.startsWith(`${path}/`)
}

const readStoredGroups = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const Chevron = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={`shrink-0 text-[var(--admin-muted)] transition-transform duration-150 ${open ? 'rotate-0' : '-rotate-90'}`}
  >
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const NavItem = ({ link, active, railCollapsed, label, onNavigate }) => (
  <li className="relative">
    <NavLink
      to={link.path}
      end={link.path === '/owner'}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={[
        'admin-nav-link',
        railCollapsed ? 'is-collapsed' : '',
        active ? 'is-active' : '',
      ].join(' ')}
    >
      {!railCollapsed && <span className="admin-nav-rail" aria-hidden="true" />}
      <NavIcon id={link.iconId} className="admin-nav-icon" />
      {!railCollapsed && <span className="admin-nav-label">{label}</span>}
    </NavLink>
    {railCollapsed ? (
      <span className="admin-nav-tooltip" role="tooltip">
        {label}
      </span>
    ) : null}
  </li>
)

/**
 * Admin sidebar — grouped SaaS navigation.
 * Desktop: sticky rail (optionally icon-collapsed). Mobile: drawer.
 */
const Sidebar = ({ mobileOpen = false, onMobileClose, collapsed = false }) => {
  const { user, hasPermission } = useAppContext()
  const { t } = useI18n()
  const location = useLocation()
  const [navQuery, setNavQuery] = useState('')
  const baseId = useId()
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const visibleGroups = useMemo(
    () =>
      ownerNavGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((link) => !link.permission || hasPermission(link.permission)),
        }))
        .filter((group) => group.items.length > 0),
    [hasPermission],
  )

  const filteredGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase()
    if (!q) return visibleGroups
    return visibleGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((link) => t(link.nameKey).toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0)
  }, [visibleGroups, navQuery, t])

  const mainGroups = useMemo(() => filteredGroups.filter((g) => !g.pinBottom), [filteredGroups])
  const bottomGroups = useMemo(() => filteredGroups.filter((g) => g.pinBottom), [filteredGroups])

  const activeGroupId = useMemo(() => {
    for (const group of visibleGroups) {
      if (group.items.some((link) => isLinkActive(location.pathname, link.path))) {
        return group.id
      }
    }
    return null
  }, [visibleGroups, location.pathname])

  const [openGroups, setOpenGroups] = useState(() => {
    const defaults = Object.fromEntries(ownerNavGroups.map((g) => [g.id, true]))
    const stored = readStoredGroups()
    return stored ? { ...defaults, ...stored } : defaults
  })

  useEffect(() => {
    if (!activeGroupId) return
    setOpenGroups((prev) => {
      if (prev[activeGroupId]) return prev
      const next = { ...prev, [activeGroupId]: true }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [activeGroupId])

  useEffect(() => {
    if (!mobileOpen) return undefined
    document.body.classList.add('nav-open')
    return () => document.body.classList.remove('nav-open')
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onMobileClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, onMobileClose])

  const persistOpenGroups = useCallback((next) => {
    setOpenGroups(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const toggleGroup = useCallback(
    (id) => {
      persistOpenGroups({ ...openGroups, [id]: !openGroups[id] })
    },
    [openGroups, persistOpenGroups],
  )

  const railCollapsed = collapsed && !isMobile
  const searching = Boolean(navQuery.trim())

  const renderGroup = (group, groupIndex) => {
    const open = railCollapsed || searching ? true : openGroups[group.id] !== false
    const panelId = `${baseId}-panel-${group.id}`
    const headerId = `${baseId}-header-${group.id}`
    const groupHasActive = group.items.some((link) => isLinkActive(location.pathname, link.path))

    return (
      <li key={group.id} className={groupIndex > 0 ? 'pt-2' : ''}>
        {!railCollapsed && (
          <button
            type="button"
            id={headerId}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => !searching && toggleGroup(group.id)}
            className={[
              'admin-nav-group',
              groupHasActive ? 'has-active' : '',
              searching ? 'pointer-events-none' : '',
            ].join(' ')}
          >
            <span>{t(group.labelKey)}</span>
            {!searching ? <Chevron open={open} /> : null}
          </button>
        )}

        <div id={panelId} role="region" aria-labelledby={railCollapsed ? undefined : headerId} hidden={!open}>
          <ul className="admin-nav-list">
            {group.items.map((link) => (
              <NavItem
                key={link.path}
                link={link}
                active={isLinkActive(location.pathname, link.path)}
                railCollapsed={railCollapsed}
                label={t(link.nameKey)}
                onNavigate={() => onMobileClose?.()}
              />
            ))}
          </ul>
        </div>
      </li>
    )
  }

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 top-[var(--admin-topbar-h)] z-30 bg-[var(--admin-overlay)] backdrop-blur-[2px] transition-opacity duration-200 md:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!mobileOpen}
        onClick={onMobileClose}
      />

      <aside
        id="owner-sidebar"
        aria-label={t('admin.shell.navigation')}
        aria-hidden={isMobile && !mobileOpen ? true : undefined}
        className={[
          'admin-sidebar flex flex-col',
          'fixed md:sticky top-[var(--admin-topbar-h)] left-0 z-40 md:z-auto',
          'h-[calc(100svh-var(--admin-topbar-h))] shrink-0',
          railCollapsed ? 'md:w-[4.25rem]' : 'w-[min(17.5rem,88vw)] md:w-[15.5rem] xl:w-64',
          'transition-[width,transform] duration-200 ease-out md:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-[var(--admin-shadow-lg)]' : '-translate-x-full md:translate-x-0',
          isMobile && !mobileOpen ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        <div className={`admin-sidebar-head ${railCollapsed ? 'is-collapsed' : ''}`}>
          <div className={`flex items-center ${railCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            <NavLink
              to="/owner/account"
              onClick={() => onMobileClose?.()}
              title={t('admin.account.title')}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 -m-1 hover:bg-[var(--admin-hover)] focus-visible:outline-none focus-visible:shadow-[var(--admin-focus)]"
            >
              {user?.image ? (
                <img src={user.image} alt="" className="admin-user-avatar is-md" />
              ) : (
                <span className="admin-user-avatar is-md" aria-hidden>
                  {initials(user?.name)}
                </span>
              )}
              {!railCollapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold leading-tight text-[var(--admin-ink)]">
                    {user?.name || 'Admin'}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--admin-muted)]">
                    {t('admin.account.viewProfile')}
                  </span>
                </span>
              )}
            </NavLink>
            {!railCollapsed && (
              <button
                type="button"
                className="md:hidden -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-hover)]"
                onClick={onMobileClose}
                aria-label={t('admin.shell.closeMenu')}
              >
                <img src={assets.close_icon} alt="" className="h-3.5 w-3.5 opacity-70" />
              </button>
            )}
          </div>
          {!railCollapsed && (
            <div className="admin-nav-search mt-3">
              <input
                type="search"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder={t('admin.shell.navSearch')}
                className="admin-nav-search-input"
                aria-label={t('admin.shell.navSearch')}
              />
            </div>
          )}
        </div>

        <nav className="admin-sidebar-nav" aria-label={t('admin.shell.navigation')}>
          <ul className="space-y-0.5">
            {mainGroups.map((group, i) => renderGroup(group, i))}
            {mainGroups.length === 0 && searching ? (
              <li className="px-3 py-4 text-xs text-[var(--admin-muted)]">{t('admin.shell.noResults')}</li>
            ) : null}
          </ul>
        </nav>

        {bottomGroups.length > 0 ? (
          <div className="admin-sidebar-foot">
            <ul>{bottomGroups.map((group, i) => renderGroup(group, i))}</ul>
          </div>
        ) : null}
      </aside>
    </>
  )
}

export default Sidebar

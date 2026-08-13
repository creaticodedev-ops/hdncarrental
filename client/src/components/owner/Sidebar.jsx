import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { assets, ownerNavGroups } from '../../assets/assets'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

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
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={`shrink-0 text-[var(--admin-muted)] transition-transform duration-200 ease-out ${open ? 'rotate-0' : '-rotate-90'}`}
  >
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Admin sidebar — grouped, collapsible, permission-aware navigation.
 * Desktop: sticky rail (optionally icon-collapsed). Mobile: drawer.
 */
const Sidebar = ({ mobileOpen = false, onMobileClose, collapsed = false }) => {
  const { user, axios, fetchUser, hasPermission } = useAppContext()
  const { t } = useI18n()
  const location = useLocation()
  const [image, setImage] = useState('')
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
          items: group.items.filter((link) => hasPermission(link.permission)),
        }))
        .filter((group) => group.items.length > 0),
    [hasPermission],
  )

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

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

  const updateImage = async () => {
    try {
      const formData = new FormData()
      formData.append('image', image)
      const { data } = await axios.post('/api/owner/update-image', formData)
      if (data.success) {
        fetchUser()
        toast.success(data.message)
        setImage('')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const railCollapsed = collapsed && !isMobile

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 top-[57px] z-30 bg-[var(--admin-overlay)] backdrop-blur-[2px] transition-opacity duration-200 md:hidden ${
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
          'flex flex-col border-r text-[13px]',
          'bg-[var(--admin-sidebar)] border-[var(--admin-border)] text-[var(--admin-ink)]',
          'fixed md:sticky top-[57px] md:top-0 left-0 z-40 md:z-auto',
          'h-[calc(100svh-57px)] shrink-0',
          railCollapsed ? 'md:w-[4.25rem]' : 'w-[min(18.5rem,88vw)] md:w-60 xl:w-64',
          'transition-[width,transform] duration-200 ease-out md:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-[var(--admin-shadow-lg)]' : '-translate-x-full md:translate-x-0',
          isMobile && !mobileOpen ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        <div className={`relative shrink-0 border-b border-[var(--admin-border)] ${railCollapsed ? 'px-2 pt-4 pb-3' : 'px-4 pt-5 pb-4'}`}>
          <div className={`flex items-center ${railCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="group relative shrink-0">
              <label htmlFor={`${baseId}-avatar`} className="block cursor-pointer" title={user?.name || 'Admin'}>
                <img
                  src={previewUrl || user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300'}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-[var(--admin-border)]"
                />
                <input
                  type="file"
                  id={`${baseId}-avatar`}
                  accept="image/*"
                  hidden
                  onChange={(e) => setImage(e.target.files?.[0] || '')}
                />
              </label>
            </div>
            {!railCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{user?.name || 'Admin'}</p>
                  <p className="truncate text-[11px] text-[var(--admin-muted)] mt-0.5">{t('admin.shell.roleOwner')}</p>
                </div>
                <button
                  type="button"
                  className="md:hidden -mr-1 inline-flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius)] text-[var(--admin-muted)] hover:bg-[var(--admin-hover)]"
                  onClick={onMobileClose}
                  aria-label={t('admin.shell.closeMenu')}
                >
                  <img src={assets.close_icon} alt="" className="h-3.5 w-3.5 opacity-70" />
                </button>
              </>
            )}
          </div>
          {image && !railCollapsed && (
            <button
              type="button"
              className="admin-btn admin-btn-primary mt-3 min-h-9 text-xs w-full"
              onClick={updateImage}
            >
              {t('admin.shell.save')}
            </button>
          )}
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-3" aria-label={t('admin.shell.navigation')}>
          <ul className="space-y-1">
            {visibleGroups.map((group, groupIndex) => {
              const open = railCollapsed ? true : openGroups[group.id] !== false
              const panelId = `${baseId}-panel-${group.id}`
              const headerId = `${baseId}-header-${group.id}`
              const groupHasActive = group.items.some((link) => isLinkActive(location.pathname, link.path))

              return (
                <li key={group.id} className={groupIndex > 0 ? 'pt-1' : ''}>
                  {groupIndex > 0 && !railCollapsed && (
                    <div className="mx-2 mb-2 border-t border-[var(--admin-border)]" aria-hidden="true" />
                  )}

                  {!railCollapsed && (
                    <button
                      type="button"
                      id={headerId}
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => toggleGroup(group.id)}
                      className={[
                        'flex w-full items-center justify-between gap-2 rounded-[var(--admin-radius)] px-2.5 py-1.5',
                        'text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]',
                        'hover:bg-[var(--admin-hover)] transition-colors',
                        groupHasActive ? 'text-[var(--admin-ink)]' : 'text-[var(--admin-muted)]',
                      ].join(' ')}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">
                        {t(group.labelKey)}
                      </span>
                      <Chevron open={open} />
                    </button>
                  )}

                  <div id={panelId} role="region" aria-labelledby={railCollapsed ? undefined : headerId} hidden={!open}>
                    <ul className="space-y-0.5 mt-0.5">
                      {group.items.map((link) => {
                        const active = isLinkActive(location.pathname, link.path)
                        return (
                          <li key={link.path}>
                            <NavLink
                              to={link.path}
                              end={link.path === '/owner'}
                              title={t(link.nameKey)}
                              onClick={() => onMobileClose?.()}
                              aria-current={active ? 'page' : undefined}
                              className={[
                                'group relative flex items-center rounded-[var(--admin-radius)] transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]',
                                railCollapsed ? 'justify-center py-2.5 px-2' : 'gap-2.5 py-2 pl-2.5 pr-2',
                                active
                                  ? 'bg-[var(--admin-primary-soft)] text-[var(--admin-primary)] font-semibold'
                                  : 'text-[var(--admin-ink-secondary)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-ink)]',
                              ].join(' ')}
                            >
                              {!railCollapsed && (
                                <span
                                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full ${
                                    active ? 'bg-[var(--admin-primary)] opacity-100' : 'opacity-0'
                                  }`}
                                  aria-hidden="true"
                                />
                              )}
                              <img
                                src={active ? link.coloredIcon : link.icon}
                                alt=""
                                className="h-[17px] w-[17px] shrink-0 opacity-90"
                              />
                              {!railCollapsed && (
                                <span className="min-w-0 truncate leading-snug">{t(link.nameKey)}</span>
                              )}
                            </NavLink>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar

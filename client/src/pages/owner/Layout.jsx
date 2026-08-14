import React, { useEffect, useState } from 'react'
import '../../admin/adminTheme.css'
import '../../admin/reservationsTheme.css'
import { AdminThemeProvider, useAdminTheme } from '../../admin/AdminThemeContext'
import NavbarOwner from '../../components/owner/NavbarOwner'
import Sidebar from '../../components/owner/Sidebar'
import TrialExpired from '../../components/owner/TrialExpired'
import { Outlet, useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'

const OwnerShell = () => {
  const { isOwner, navigate, authReady, setShowLogin, licenseLocked } = useAppContext()
  const { t } = useI18n()
  const { resolved } = useAdminTheme()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('hdn.admin.sidebar.collapsed') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (authReady && !isOwner) {
      sessionStorage.setItem('ownerReturnTo', window.location.pathname)
      setShowLogin(true)
      navigate('/')
    }
  }, [isOwner, authReady, navigate, setShowLogin])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('hdn.admin.sidebar.collapsed', next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  if (!authReady) {
    return (
      <div className="admin-shell min-h-svh flex items-center justify-center text-[var(--admin-muted)] px-4" data-theme={resolved}>
        {t('admin.shell.loading')}
      </div>
    )
  }

  if (!isOwner) return null

  if (licenseLocked) {
    return (
      <div className="admin-shell flex flex-col min-h-svh" data-theme={resolved}>
        <NavbarOwner />
        <TrialExpired />
      </div>
    )
  }

  return (
    <div className="admin-shell flex flex-col min-h-svh" data-theme={resolved}>
      <NavbarOwner
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebarCollapse={toggleCollapsed}
      />
      <div className="flex flex-1 min-w-0">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleCollapsed}
        />
        <main className="flex-1 min-w-0 admin-page pb-8 bg-[var(--admin-bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const Layout = () => (
  <AdminThemeProvider>
    <OwnerShell />
  </AdminThemeProvider>
)

export default Layout

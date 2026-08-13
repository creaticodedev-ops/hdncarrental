import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'hdn.admin.theme'
const AdminThemeContext = createContext(null)

const getSystemDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

const resolveTheme = (preference) => {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  return getSystemDark() ? 'dark' : 'light'
}

export const AdminThemeProvider = ({ children }) => {
  const [preference, setPreferenceState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {
      /* ignore */
    }
    return 'system'
  })
  const [resolved, setResolved] = useState(() => resolveTheme(preference))

  useEffect(() => {
    const apply = () => setResolved(resolveTheme(preference))
    apply()
    if (preference !== 'system') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [preference])

  const setPreference = (next) => {
    const value = next === 'light' || next === 'dark' || next === 'system' ? next : 'system'
    setPreferenceState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
  }

  const cyclePreference = () => {
    const order = ['light', 'dark', 'system']
    const idx = order.indexOf(preference)
    setPreference(order[(idx + 1) % order.length])
  }

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
      cyclePreference,
      isDark: resolved === 'dark',
    }),
    [preference, resolved],
  )

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export const useAdminTheme = () => {
  const ctx = useContext(AdminThemeContext)
  if (!ctx) {
    return {
      preference: 'system',
      resolved: 'light',
      setPreference: () => {},
      cyclePreference: () => {},
      isDark: false,
    }
  }
  return ctx
}

export default AdminThemeProvider

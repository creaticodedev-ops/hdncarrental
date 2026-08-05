import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { en as baseEn, fr as baseFr, es as baseEs } from './translations'
import { adminEn, adminFr, adminEs } from './adminTranslations'

const en = { ...baseEn, admin: adminEn }
const fr = { ...baseFr, admin: adminFr }
const es = { ...baseEs, admin: adminEs }

const dictionaries = { en, fr, es }

const I18nContext = createContext(null)

const getNested = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)

export const I18nProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('language') || 'en'
  })

  const setLanguage = (lang) => {
    if (!dictionaries[lang]) return
    setLanguageState(lang)
    localStorage.setItem('language', lang)
    document.documentElement.lang = lang
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = useMemo(() => {
    const dict = dictionaries[language] || en
    return (key, vars = {}) => {
      let value = getNested(dict, key)
      if (value === undefined) value = getNested(en, key)
      if (typeof value !== 'string') return key
      return Object.keys(vars).reduce(
        (str, k) => str.replace(new RegExp(`{{${k}}}`, 'g'), String(vars[k])),
        value
      )
    }
  }, [language])

  const getArray = (key) => {
    const dict = dictionaries[language] || en
    const value = getNested(dict, key)
    if (Array.isArray(value)) return value
    const fallback = getNested(en, key)
    return Array.isArray(fallback) ? fallback : []
  }

  const value = { language, setLanguage, t, getArray, languages: ['en', 'fr', 'es'] }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

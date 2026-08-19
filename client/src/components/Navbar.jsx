import React, { useEffect, useState } from 'react'
import { assets, menuLinks } from '../assets/assets'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import LanguageSwitcher from './LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'
import { BRAND_NAME, INSTAGRAM_URL } from '../constants/brand'
import { haptic } from '../utils/haptics'

/** Thin monochrome Instagram glyph — matches HDN header line weight */
const InstagramGlyph = ({ className = 'h-[21px] w-[21px]' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="3.25"
      y="3.25"
      width="17.5"
      height="17.5"
      rx="5"
      stroke="currentColor"
      strokeWidth="1.35"
    />
    <circle cx="12" cy="12" r="4.15" stroke="currentColor" strokeWidth="1.35" />
    <circle cx="17.15" cy="6.85" r="0.95" fill="currentColor" />
  </svg>
)

const SHEET = {
  overlay: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  panel: { duration: 0.45, ease: [0.16, 1, 0.28, 1] },
}

const Navbar = () => {
  const { logout, isOwner } = useAppContext()
  const { t } = useI18n()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  const navLabels = {
    Home: t('nav.home'),
    Cars: t('nav.cars'),
  }

  const toggleMenu = () => {
    setOpen((v) => {
      const next = !v
      haptic(next ? 'open' : 'light')
      return next
    })
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 640) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open) return
    document.body.classList.add('nav-open')
    return () => document.body.classList.remove('nav-open')
  }, [open])

  const solid = !isHome || scrolled || open

  return (
    <Motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 inset-x-0 z-40 border-b transition-all duration-300 pt-[env(safe-area-inset-top)] ${
        solid
          ? 'bg-white/95 backdrop-blur-md border-borderColor text-ink'
          : 'bg-transparent border-transparent text-ink'
      }`}
    >
      <div className="page-pad page-shell relative flex items-center justify-between sm:hidden min-h-14 py-1.5">
        <button
          type="button"
          className="booking-tap relative z-10 -ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center text-ink"
          aria-label="Menu"
          aria-expanded={open}
          onClick={toggleMenu}
        >
          <span className={`nav-burger${open ? ' is-open' : ''}`} aria-hidden="true" />
        </button>

        <Link
          to="/"
          className="pointer-events-auto absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 flex items-center"
          aria-label={BRAND_NAME}
        >
          <img
            src={assets.logo}
            alt={BRAND_NAME}
            width={140}
            height={36}
            decoding="async"
            className="block h-8 w-auto max-h-8 object-contain"
          />
        </Link>

        <div className="relative z-10 -mr-1.5">
          <LanguageSwitcher variant="bare" className="shrink-0" />
        </div>
      </div>

      <div className="page-pad page-shell hidden sm:flex items-center justify-between gap-4 py-3.5 sm:py-4">
        <Link to="/" className="relative z-10 shrink-0 flex items-center">
          <Motion.img
            whileHover={{ scale: 1.03 }}
            src={assets.logo}
            alt={BRAND_NAME}
            width={160}
            height={40}
            decoding="async"
            className="block h-8 sm:h-9 lg:h-10 w-auto max-h-9 lg:max-h-10 object-contain"
          />
        </Link>

        <nav className="flex items-center gap-5 lg:gap-7 shrink-0">
          {menuLinks.map((link, index) => (
            <Link
              key={index}
              to={link.path}
              className="text-sm tracking-wide text-muted hover:text-ink transition-colors whitespace-nowrap"
            >
              {navLabels[link.name] || link.name}
            </Link>
          ))}
          <LanguageSwitcher />
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/owner')}
                className="cursor-pointer text-sm text-muted hover:text-ink whitespace-nowrap"
              >
                {t('nav.dashboard')}
              </button>
              <button
                type="button"
                onClick={logout}
                className="cursor-pointer px-5 py-2.5 bg-primary hover:bg-primary-dull transition-all text-white rounded-xl text-sm whitespace-nowrap"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : null}
        </nav>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <Motion.button
              key="nav-overlay"
              type="button"
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SHEET.overlay}
              className="fixed inset-0 z-40 bg-ink/35 sm:hidden"
              onClick={() => setOpen(false)}
            />
            <Motion.nav
              key="nav-sheet"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={SHEET.panel}
              className="fixed inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-50 flex h-[calc(100svh-3.75rem-env(safe-area-inset-top))] flex-col bg-light px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-8 sm:hidden"
            >
              <div className="flex flex-col gap-1">
                {menuLinks.map((link, index) => (
                  <Link
                    key={index}
                    to={link.path}
                    onClick={() => setOpen(false)}
                    className="booking-tap font-display text-[2.35rem] font-medium leading-tight text-ink"
                  >
                    {navLabels[link.name] || link.name}
                  </Link>
                ))}
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/owner')
                      setOpen(false)
                    }}
                    className="booking-tap mt-4 text-left font-display text-[2.35rem] font-medium leading-tight text-ink"
                  >
                    {t('nav.dashboard')}
                  </button>
                ) : null}
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-10">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="booking-tap inline-flex min-h-12 items-center gap-3 text-sm tracking-wide text-muted"
                >
                  <InstagramGlyph className="h-5 w-5" />
                  Instagram
                </a>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      setOpen(false)
                    }}
                    className="booking-tap min-h-12 text-left text-sm text-muted"
                  >
                    {t('nav.logout')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    haptic('success')
                    setOpen(false)
                    navigate('/cars')
                  }}
                  className="booking-tap inline-flex h-12 w-full items-center justify-center rounded-[0.9rem] bg-primary text-[15px] font-semibold text-white"
                >
                  {t('hero.search')}
                </button>
              </div>
            </Motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </Motion.header>
  )
}

export default Navbar

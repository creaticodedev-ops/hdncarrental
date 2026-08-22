import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'
import './brandPreloader.css'

const INTRO_KEY = 'hdn-brand-intro'
const SURGE_AT = 1120
const EXIT_AT = 1480
const DONE_AT = 1860

let decided = null

function computeShouldPlay() {
  if (typeof window === 'undefined') return false
  try {
    if (window.location.pathname !== '/') return false
    if (sessionStorage.getItem(INTRO_KEY) === '1') return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    const ua = navigator.userAgent || ''
    if (
      /bot|crawl|spider|slurp|bingpreview|prerender|lighthouse|chrome-lighthouse|facebookexternalhit|twitterbot/i.test(
        ua,
      )
    ) {
      return false
    }
  } catch {
    return false
  }
  return true
}

function shouldPlayBrandIntro() {
  if (decided !== null) return decided
  decided = computeShouldPlay()
  return decided
}

const BrandPreloader = () => {
  const { pathname } = useLocation()
  const [mounted, setMounted] = useState(shouldPlayBrandIntro)
  const [phase, setPhase] = useState('play')

  useEffect(() => {
    if (!mounted) return

    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* private mode */
    }

    document.documentElement.classList.add('hdn-intro-lock')

    const surge = window.setTimeout(() => setPhase('surge'), SURGE_AT)
    const exit = window.setTimeout(() => setPhase('exit'), EXIT_AT)
    const done = window.setTimeout(() => {
      document.documentElement.classList.remove('hdn-intro-lock')
      setMounted(false)
    }, DONE_AT)

    return () => {
      window.clearTimeout(surge)
      window.clearTimeout(exit)
      window.clearTimeout(done)
      document.documentElement.classList.remove('hdn-intro-lock')
    }
  }, [mounted])

  useEffect(() => {
    if (pathname === '/' || !mounted) return
    document.documentElement.classList.remove('hdn-intro-lock')
    setMounted(false)
  }, [pathname, mounted])

  if (!mounted) return null

  const classes = [
    'hdn-preloader',
    phase === 'surge' || phase === 'exit' ? 'is-surge' : '',
    phase === 'exit' ? 'is-exit' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} role="presentation" aria-hidden="true">
      <div className="hdn-preloader__grain" />
      <div className="hdn-preloader__horizon" />
      <svg className="hdn-preloader__nav" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path className="hdn-preloader__chevron" d="M14 36 L50 9 L86 36" />
        <line className="hdn-preloader__lane" x1="50" y1="11" x2="50" y2="40" />
      </svg>
      <div className="hdn-preloader__stage">
        <div className="hdn-preloader__bloom" />
        <div className="hdn-preloader__assemble">
          <div className="hdn-preloader__surge">
            <img
              className="hdn-preloader__logo"
              src={assets.logo}
              alt=""
              width={320}
              height={80}
              decoding="sync"
              fetchPriority="high"
            />
            <div className="hdn-preloader__sweep" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandPreloader

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

const MENU_WIDTH = 248
const MOBILE_MQ = '(max-width: 639px)'

const MoreIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
)

const ICONS = {
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L8.25 18.002H5.25v-3L16.862 4.487z" />
    </svg>
  ),
  print: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5M6 14H4a1 1 0 01-1-1v-3a2 2 0 012-2h14a2 2 0 012 2v3a1 1 0 01-1 1h-2M6 14h12v6H6v-6z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5c1.5 2.5 3.5 3.5 3.5 3.5l2-1 2.5 1.5a1 1 0 001.2-.3l1-1.5a1 1 0 00-.2-1.3L16 11.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 11.5a8 8 0 10-3.2 6.4L20 20l-1.1-3.2A8 8 0 0020 11.5z" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 18h14" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2m-1 0v11a1 1 0 01-1 1H9a1 1 0 01-1-1V7" />
    </svg>
  ),
  signature: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19c2.5-4 5-6 8-6s5.5 2 8 6M8 8l2 2 5-5" />
    </svg>
  ),
  cancel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="3" />
      <path strokeLinecap="round" d="M5 19c1.2-3 3.5-4.5 7-4.5S17.8 16 19 19" />
    </svg>
  ),
  invoice: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v16l-2-1.2L13 20l-2-1.2L9 20l-2-1.2V4zM9 8h6M9 12h6" />
    </svg>
  ),
  contract: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8a2 2 0 012 2v14l-3-1.5L12 20l-3-1.5L6 20V6a2 2 0 012-2z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path strokeLinecap="round" d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </svg>
  ),
  car: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 15.5h16M5.2 15.5l1.4-5.1A2 2 0 0 1 8.5 9h7a2 2 0 0 1 1.9 1.4l1.4 5.1" />
      <path d="M7 12h10M7.8 18.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM16.2 18.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0112.4-5.7L19 8.5M19.5 12a7.5 7.5 0 01-12.4 5.7L5 15.5M19 4.5v4h-4M5 19.5v-4h4" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  ),
}

const CaretIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
)

const getPortalRoot = () =>
  (typeof document !== 'undefined' && document.querySelector('.admin-shell')) ||
  (typeof document !== 'undefined' ? document.body : null)

/**
 * Compact SaaS overflow menu.
 * items: { key, label, onClick?, href?, tone?, icon?, separator?, hidden? }
 * Portaled into `.admin-shell` so theme tokens stay applied (opaque surface).
 */
const ActionMenu = ({
  label,
  items = [],
  align = 'right',
  iconOnly = false,
  trigger = 'icon',
  caret = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  )
  const [pos, setPos] = useState({ top: 8, left: 8, maxHeight: 320, placement: 'bottom' })
  const [focusIdx, setFocusIdx] = useState(-1)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const visible = items.filter((item) => item && !item.hidden)
  const actionable = visible.filter((item) => !item.separator)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return undefined
    const place = () => {
      const rect = btnRef.current.getBoundingClientRect()
      const mobile = window.matchMedia(MOBILE_MQ).matches
      const vw = window.innerWidth
      const vh = window.innerHeight
      const gap = 6
      const pad = 10
      if (mobile) {
        setPos({
          top: 0,
          left: 0,
          maxHeight: Math.round(vh * 0.72),
          placement: 'sheet',
        })
        return
      }
      const measured = menuRef.current?.offsetHeight
      const menuHeight = Math.min(measured || 280, vh - pad * 2)
      let left = align === 'left' ? rect.left : rect.right - MENU_WIDTH
      left = Math.max(pad, Math.min(left, vw - MENU_WIDTH - pad))
      const spaceBelow = vh - rect.bottom - pad
      const spaceAbove = rect.top - pad
      let placement = 'bottom'
      let top = rect.bottom + gap
      if (spaceBelow < Math.min(menuHeight, 220) && spaceAbove > spaceBelow) {
        placement = 'top'
        top = Math.max(pad, rect.top - (measured || menuHeight) - gap)
      } else {
        top = Math.min(top, vh - menuHeight - pad)
      }
      setPos({
        top,
        left,
        maxHeight: placement === 'bottom' ? Math.max(160, spaceBelow - gap) : Math.max(160, spaceAbove - gap),
        placement,
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, align, visible.length, isMobile])

  useEffect(() => {
    if (!open) {
      setFocusIdx(-1)
      return undefined
    }
    const onPointerDown = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        btnRef.current?.focus()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIdx((prev) => {
          if (!actionable.length) return -1
          if (prev < 0) return e.key === 'ArrowDown' ? 0 : actionable.length - 1
          return e.key === 'ArrowDown'
            ? (prev + 1) % actionable.length
            : (prev - 1 + actionable.length) % actionable.length
        })
      }
      if (e.key === 'Enter' && focusIdx >= 0) {
        const item = actionable[focusIdx]
        if (!item) return
        e.preventDefault()
        setOpen(false)
        if (item.href) window.location.assign(item.href)
        else item.onClick?.()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, actionable, focusIdx])

  useEffect(() => {
    if (!open || focusIdx < 0 || !menuRef.current) return
    const nodes = menuRef.current.querySelectorAll('[data-menu-action="1"]')
    nodes[focusIdx]?.focus()
  }, [focusIdx, open])

  useEffect(() => {
    if (!open || !isMobile) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isMobile])

  if (!visible.length) return null

  const portalRoot = getPortalRoot()
  let actionCounter = -1

  const renderItems = () =>
    visible.map((item) => {
      if (item.separator) {
        return <div key={item.key} className="res-menu-sep" role="separator" />
      }
      actionCounter += 1
      const idx = actionCounter
      const icon = item.icon ? ICONS[item.icon] : null
      const danger = item.tone === 'danger'
      const shared = {
        key: item.key,
        role: 'menuitem',
        'data-menu-action': '1',
        className: `res-menu-item${danger ? ' is-danger' : ''}${focusIdx === idx ? ' is-focused' : ''}`,
        onMouseEnter: () => setFocusIdx(idx),
      }
      if (item.href) {
        return (
          <Link {...shared} to={item.href} onClick={() => setOpen(false)}>
            {icon ? <span className="res-menu-icon">{icon}</span> : <span className="res-menu-icon" />}
            <span className="res-menu-label">{item.label}</span>
          </Link>
        )
      }
      return (
        <button
          {...shared}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
            item.onClick?.()
          }}
        >
          {icon ? <span className="res-menu-icon">{icon}</span> : <span className="res-menu-icon" />}
          <span className="res-menu-label">{item.label}</span>
        </button>
      )
    })

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={
          trigger === 'button'
            ? `admin-btn admin-btn-secondary res-btn res-menu-trigger-btn ${className} ${open ? 'is-open' : ''}`
            : `res-menu-trigger ${className} ${open ? 'is-open' : ''}`
        }
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        {caret ? null : <MoreIcon />}
        {trigger === 'button' || !iconOnly ? <span>{label}</span> : null}
        {caret ? <CaretIcon /> : null}
      </button>
      {open && portalRoot
        ? createPortal(
            <div className={`res-menu-layer${isMobile ? ' is-sheet' : ''}`} data-theme-layer="menu">
              <button
                type="button"
                className="res-menu-scrim"
                aria-label={label}
                tabIndex={-1}
                onClick={() => setOpen(false)}
              />
              <div
                ref={menuRef}
                id={menuId}
                role="menu"
                className={`res-menu${isMobile ? ' is-sheet' : ` res-menu-${pos.placement}`}`}
                style={
                  isMobile
                    ? { maxHeight: pos.maxHeight }
                    : {
                        top: pos.top,
                        left: pos.left,
                        width: MENU_WIDTH,
                        maxHeight: pos.maxHeight,
                      }
                }
              >
                {isMobile ? <div className="res-menu-handle" aria-hidden /> : null}
                {isMobile ? <p className="res-menu-title">{label}</p> : null}
                <div className="res-menu-list">{renderItems()}</div>
              </div>
            </div>,
            portalRoot,
          )
        : null}
    </>
  )
}

export default ActionMenu

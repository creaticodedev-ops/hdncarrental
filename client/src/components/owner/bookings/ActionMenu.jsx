import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MoreIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="19" cy="12" r="1.75" />
  </svg>
)

/**
 * Compact overflow menu. Items: { key, label, onClick, tone?: 'danger' | 'default', hidden?: boolean }
 */
const ActionMenu = ({ label, items = [], align = 'right' }) => {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const visible = items.filter((item) => item && !item.hidden)

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return undefined
    const place = () => {
      const rect = btnRef.current.getBoundingClientRect()
      const menuWidth = 220
      const gap = 6
      let left = align === 'left' ? rect.left : rect.right - menuWidth
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8))
      let top = rect.bottom + gap
      if (top + 280 > window.innerHeight - 8) {
        top = Math.max(8, rect.top - 280 - gap)
      }
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!visible.length) return null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`admin-btn admin-btn-secondary admin-btn-sm px-2.5 ${open ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <MoreIcon />
        <span className="hidden sm:inline">{label}</span>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={{ position: 'fixed', top: pos.top, left: pos.left }}
              className="z-[80] w-[220px] overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-1 shadow-[var(--admin-shadow-lg)]"
            >
              {visible.map((item) =>
                item.separator ? (
                  <div key={item.key} className="my-1 border-t border-[var(--admin-border)]" role="separator" />
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    className={`flex w-full px-3 py-2.5 text-left text-sm cursor-pointer hover:bg-[var(--admin-hover)] ${
                      item.tone === 'danger' ? 'text-[var(--admin-danger)]' : 'text-[var(--admin-ink)]'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      item.onClick?.()
                    }}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export default ActionMenu

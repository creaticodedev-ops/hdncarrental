import React, { useCallback, useEffect, useId, useRef, useState } from 'react'

/**
 * Themed top-bar popover: click-outside and Escape close it, focus returns to the
 * trigger, and arrow keys walk the items. Below `sm` the panel anchors to the
 * viewport instead of the trigger so it can never render off-screen.
 */
const TopbarPopover = ({
  ariaLabel,
  title,
  align = 'end',
  width = '15rem',
  badge = 0,
  triggerClassName = 'admin-icon-btn',
  renderTrigger,
  onOpen,
  children,
}) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()

  const close = useCallback(
    ({ restoreFocus = true } = {}) => {
      setOpen(false)
      if (restoreFocus) triggerRef.current?.focus?.()
    },
    [],
  )

  const toggle = () => {
    setOpen((prev) => {
      if (!prev) onOpen?.()
      return !prev
    })
  }

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = panelRef.current?.querySelectorAll('[data-pop-item]:not([disabled])')
      if (!items?.length) return
      event.preventDefault()
      const list = Array.from(items)
      const current = list.indexOf(document.activeElement)
      const next =
        event.key === 'ArrowDown'
          ? (current + 1) % list.length
          : (current - 1 + list.length) % list.length
      list[next]?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  return (
    <div className="admin-pop" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className={triggerClassName}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={ariaLabel}
        onClick={toggle}
      >
        {renderTrigger?.(open)}
        {badge > 0 ? (
          <span className="admin-count-badge" aria-hidden>
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          ref={panelRef}
          role="menu"
          aria-label={title || ariaLabel}
          data-align={align}
          className="admin-pop-panel"
          style={{ '--admin-pop-w': width }}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      ) : null}
    </div>
  )
}

export default TopbarPopover

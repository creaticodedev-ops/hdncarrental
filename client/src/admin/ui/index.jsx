import React, { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/** Consistent page chrome for Owner/Admin modules. */
export const AdminPage = ({ children, className = '' }) => (
  <div className={`admin-page admin-page-pad min-w-0 flex-1 ${className}`}>{children}</div>
)

export const PageHeader = ({
  title,
  description,
  breadcrumb,
  primaryAction,
  secondaryAction,
  children,
}) => (
  <header className="mb-6 md:mb-8">
    {breadcrumb?.length ? (
      <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--admin-muted)]" aria-label="Breadcrumb">
        {breadcrumb.map((item, i) => (
          <React.Fragment key={item.to || item.label}>
            {i > 0 ? <span aria-hidden>/</span> : null}
            {item.to ? (
              <Link to={item.to} className="hover:text-[var(--admin-ink)]">
                {item.label}
              </Link>
            ) : (
              <span className="text-[var(--admin-ink-secondary)]">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    ) : null}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight text-[var(--admin-ink)] break-words">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--admin-muted)]">{description}</p>
        ) : null}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </div>
    {children}
  </header>
)

export const StatCard = ({ label, value, hint, tone = 'default', to, onClick }) => {
  const tones = {
    default: '',
    success: 'ring-1 ring-[color-mix(in_srgb,var(--admin-success)_35%,transparent)]',
    warn: 'ring-1 ring-[color-mix(in_srgb,var(--admin-warn)_35%,transparent)]',
    danger: 'ring-1 ring-[color-mix(in_srgb,var(--admin-danger)_35%,transparent)]',
    primary: 'ring-1 ring-[color-mix(in_srgb,var(--admin-primary)_35%,transparent)]',
  }
  const inner = (
    <div className={`admin-card p-4 md:p-5 min-w-0 transition hover:border-[var(--admin-border-strong)] ${tones[tone] || ''}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)] truncate">{label}</p>
      <p className="mt-2 text-xl md:text-2xl font-semibold text-[var(--admin-ink)] break-words">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--admin-muted)] leading-snug">{hint}</p> : null}
    </div>
  )
  if (to) {
    return (
      <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)] rounded-[var(--admin-radius-lg)]">
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {inner}
      </button>
    )
  }
  return inner
}

export const FormSection = ({ title, description, children, className = '', columns = 2 }) => (
  <section className={`admin-card p-4 md:p-5 space-y-4 ${className}`}>
    <div>
      <h2 className="text-sm font-semibold text-[var(--admin-ink)]">{title}</h2>
      {description ? <p className="mt-1 text-xs text-[var(--admin-muted)] leading-relaxed">{description}</p> : null}
    </div>
    <div className={`grid gap-4 ${columns === 1 ? '' : 'sm:grid-cols-2'}`}>{children}</div>
  </section>
)

export const DrawerSection = ({ title, description, children, className = '' }) => (
  <section className={`space-y-3 ${className}`}>
    {(title || description) && (
      <div className="border-b border-[var(--admin-border)] pb-2">
        {title ? <h3 className="text-sm font-semibold text-[var(--admin-ink)]">{title}</h3> : null}
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-[var(--admin-muted)]">{description}</p> : null}
      </div>
    )}
    <div className="grid gap-3.5 sm:grid-cols-2">{children}</div>
  </section>
)

export const FormField = ({ label, htmlFor, hint, error, required, children, className = '' }) => (
  <label className={`block text-sm min-w-0 ${className}`} htmlFor={htmlFor}>
    <span className="admin-label">
      {label}
      {required ? <span className="text-[var(--admin-danger)]"> *</span> : null}
    </span>
    {children}
    {hint && !error ? <span className="mt-1 block text-xs text-[var(--admin-muted)]">{hint}</span> : null}
    {error ? <span className="mt-1 block text-xs text-[var(--admin-danger)]">{error}</span> : null}
  </label>
)

export const StatusBadge = ({ tone = 'neutral', children }) => {
  const map = {
    neutral: 'admin-badge-neutral',
    success: 'admin-badge-success',
    warn: 'admin-badge-warn',
    danger: 'admin-badge-danger',
    info: 'admin-badge-info',
  }
  return <span className={`admin-badge ${map[tone] || map.neutral}`}>{children}</span>
}

export const EmptyState = ({ title, description, action }) => (
  <div className="admin-card px-6 py-12 text-center">
    <p className="text-base font-semibold text-[var(--admin-ink)]">{title}</p>
    {description ? <p className="mt-2 text-sm text-[var(--admin-muted)] max-w-md mx-auto">{description}</p> : null}
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </div>
)

export const ErrorState = ({ title, description, onRetry, retryLabel = 'Retry' }) => (
  <div className="admin-card px-6 py-10 text-center">
    <p className="text-base font-semibold text-[var(--admin-ink)]">{title}</p>
    {description ? <p className="mt-2 text-sm text-[var(--admin-muted)]">{description}</p> : null}
    {onRetry ? (
      <button type="button" onClick={onRetry} className="admin-btn admin-btn-secondary mt-5">
        {retryLabel}
      </button>
    ) : null}
  </div>
)

export const SkeletonBlock = ({ className = 'h-24' }) => <div className={`admin-skeleton ${className}`} aria-hidden />

export const FilterBar = ({ children, onClear, clearLabel = 'Clear filters' }) => (
  <div className="mb-4 flex flex-col gap-3">
    <div className="admin-filter-bar">{children}</div>
    {onClear ? (
      <button type="button" onClick={onClear} className="admin-btn admin-btn-ghost self-start min-h-9 px-2 text-xs">
        {clearLabel}
      </button>
    ) : null}
  </div>
)

export const StickyFormFooter = ({ children }) => (
  <div className="sticky bottom-0 z-10 -mx-4 md:-mx-0 mt-6 border-t border-[var(--admin-border)] bg-[var(--admin-navbar)] backdrop-blur-md px-4 md:px-0 py-3">
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{children}</div>
  </div>
)

export const SegmentedControl = ({ options = [], value, onChange, ariaLabel }) => (
  <div className="admin-segmented w-full sm:w-auto" role="group" aria-label={ariaLabel}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        aria-pressed={value === opt.value}
        onClick={() => onChange?.(opt.value)}
        className="flex-1 sm:flex-none"
      >
        {opt.label}
      </button>
    ))}
  </div>
)

export const AdminSwitch = ({ checked, onChange, label, description, id }) => {
  const autoId = useId()
  const switchId = id || autoId
  return (
    <div className="flex items-start justify-between gap-3 sm:col-span-2">
      <div className="min-w-0">
        {label ? (
          <label htmlFor={switchId} className="text-sm font-medium text-[var(--admin-ink)] cursor-pointer">
            {label}
          </label>
        ) : null}
        {description ? <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{description}</p> : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        className="admin-switch"
        onClick={() => onChange?.(!checked)}
      />
    </div>
  )
}

export const CurrencyInput = ({ currency = 'MAD', value, onChange, required, min = '0', step = '0.01', id, name }) => (
  <div className="admin-affix">
    <span>{currency}</span>
    <input
      id={id}
      name={name}
      type="number"
      min={min}
      step={step}
      required={required}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="admin-input"
    />
  </div>
)

export const PercentInput = ({ value, onChange, required, min = '0', max = '100', step = '0.01', id, name }) => (
  <div className="admin-affix">
    <input
      id={id}
      name={name}
      type="number"
      min={min}
      max={max}
      step={step}
      required={required}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="admin-input"
    />
    <span className="suffix">%</span>
  </div>
)

export const SearchSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Search…',
  emptyLabel = 'No results',
  required,
  id,
}) => {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef(null)
  const selected = options.find((o) => String(o.value) === String(value))
  const filtered = options.filter((o) => {
    const hay = `${o.label || ''} ${o.hint || ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="admin-combobox" ref={wrapRef}>
      <input type="hidden" value={value || ''} required={required} readOnly />
      <button
        id={id}
        type="button"
        className="admin-input flex items-center justify-between gap-2 text-left"
        aria-expanded={open}
        onClick={() => {
          setQ('')
          setOpen((v) => !v)
        }}
      >
        <span className={`min-w-0 truncate ${selected ? 'text-[var(--admin-ink)]' : 'text-[var(--admin-muted)]'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-[var(--admin-muted)] shrink-0" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="admin-combobox-panel" role="listbox">
          <div className="p-2 border-b border-[var(--admin-border)]">
            <input
              type="search"
              autoFocus
              className="admin-input min-h-10"
              placeholder={placeholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[var(--admin-muted)]">{emptyLabel}</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={String(o.value) === String(value)}
                className="admin-combobox-option"
                onClick={() => {
                  onChange?.(o.value)
                  setOpen(false)
                }}
              >
                <span className="block text-sm font-medium">{o.label}</span>
                {o.hint ? <span className="block text-xs text-[var(--admin-muted)] mt-0.5">{o.hint}</span> : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export const AdminDrawer = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dirty = false,
  unsavedTitle = 'Unsaved changes',
  unsavedMessage = 'You have unsaved changes. Discard them?',
  discardLabel = 'Discard',
  keepEditingLabel = 'Keep editing',
  closeLabel = 'Close',
  widthClass = '',
}) => {
  const titleId = useId()
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const dirtyRef = useRef(dirty)
  const askLeaveRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  const [askLeave, setAskLeave] = useState(false)

  onCloseRef.current = onClose
  dirtyRef.current = dirty
  askLeaveRef.current = askLeave

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
    setAskLeave(false)
    const t = setTimeout(() => setMounted(false), 220)
    return () => clearTimeout(t)
  }, [open])

  const requestClose = () => {
    if (dirtyRef.current) {
      setAskLeave(true)
      return
    }
    onCloseRef.current?.()
  }

  // Lock scroll + Escape while open. Do not depend on dirty/onClose — those change
  // on every keystroke in parent forms and would remount this effect.
  useEffect(() => {
    if (!mounted) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (askLeaveRef.current) {
        setAskLeave(false)
        return
      }
      if (dirtyRef.current) {
        setAskLeave(true)
        return
      }
      onCloseRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mounted])

  // Focus the dialog once when it opens — never after form dirty updates.
  useEffect(() => {
    if (!mounted) return
    panelRef.current?.focus?.()
  }, [mounted])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        className={`admin-drawer-backdrop border-0 cursor-default ${entered ? 'is-open' : ''}`}
        aria-label={closeLabel}
        onClick={requestClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-size={size}
        className={`admin-drawer outline-none ${entered ? 'is-open' : ''} ${widthClass}`}
      >
        <header className="shrink-0 border-b border-[var(--admin-border)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-[1.15rem] font-semibold tracking-tight text-[var(--admin-ink)]">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm leading-relaxed text-[var(--admin-muted)]">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="admin-btn admin-btn-ghost min-h-10 w-10 px-0 text-lg"
              aria-label={closeLabel}
            >
              ×
            </button>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-3.5">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{footer}</div>
          </footer>
        ) : null}
      </aside>

      {askLeave ? (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" className="admin-modal-backdrop is-open border-0" aria-hidden onClick={() => setAskLeave(false)} />
          <div
            role="alertdialog"
            aria-labelledby={`${titleId}-unsaved`}
            className="admin-modal relative z-[71] w-full max-w-md p-5"
          >
            <h3 id={`${titleId}-unsaved`} className="text-base font-semibold text-[var(--admin-ink)]">
              {unsavedTitle}
            </h3>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">{unsavedMessage}</p>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setAskLeave(false)}>
                {keepEditingLabel}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => {
                  setAskLeave(false)
                  onClose?.()
                }}
              >
                {discardLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export const AdminModal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  const titleId = useId()
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="presentation">
      <button type="button" className="admin-modal-backdrop border-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`admin-modal w-full ${widths[size] || widths.md} rounded-t-[var(--admin-radius-xl)] sm:rounded-[var(--admin-radius-xl)] max-h-[92svh] flex flex-col`}
      >
        <header className="shrink-0 flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3.5 sm:px-5">
          <h2 id={titleId} className="text-base font-semibold text-[var(--admin-ink)]">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="admin-btn admin-btn-ghost min-h-9 w-9 px-0" aria-label="Close">
            ×
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-[var(--admin-border)] px-4 py-3 sm:px-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

export default AdminPage

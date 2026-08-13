import React, { useEffect, useId, useRef } from 'react'
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

export const FormSection = ({ title, description, children, className = '' }) => (
  <section className={`admin-card p-4 md:p-5 space-y-4 ${className}`}>
    <div>
      <h2 className="text-sm font-semibold text-[var(--admin-ink)]">{title}</h2>
      {description ? <p className="mt-1 text-xs text-[var(--admin-muted)] leading-relaxed">{description}</p> : null}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
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
  <div className="admin-segmented" role="group" aria-label={ariaLabel}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        aria-pressed={value === opt.value}
        onClick={() => onChange?.(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
)

export const AdminDrawer = ({ open, onClose, title, description, children, footer, widthClass = '' }) => {
  const titleId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus?.()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button type="button" className="admin-drawer-backdrop border-0 cursor-default" aria-label="Close" onClick={onClose} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`admin-drawer outline-none ${widthClass}`}
      >
        <header className="shrink-0 border-b border-[var(--admin-border)] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-[var(--admin-ink)]">
                {title}
              </h2>
              {description ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="admin-btn admin-btn-ghost min-h-9 w-9 px-0" aria-label="Close">
              ×
            </button>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </aside>
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

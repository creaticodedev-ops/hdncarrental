import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

const optionSearchText = (option) =>
  `${option.label || ''} ${option.hint || ''} ${option.meta || ''} ${option.detail || ''} ${option.badge || ''} ${option.keywords || ''}`.toLowerCase()

const resolveAdminShell = (node) => node?.closest?.('.admin-shell') || null

const IconCar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M4 15.5h16M5.2 15.5l1.4-5.1A2 2 0 0 1 8.5 9h7a2 2 0 0 1 1.9 1.4l1.4 5.1" />
    <path d="M7 12h10M7.8 18.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM16.2 18.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" />
  </svg>
)

const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M12 21s7-6.1 7-11.2A7 7 0 1 0 5 9.8C5 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.8" r="2.2" />
  </svg>
)

const IconPlane = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M21 12.5 14 13l-3.2 6.4-.9-.5L11.2 13H7.6L6 15.2l-.8-.3L6.2 12 5.2 9.1l.8-.3L7.6 11h3.6L9.9 5.1l.9-.5L14 11.5l7 .5v.5Z" />
  </svg>
)

const IconHotel = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M4 20V8.5A1.5 1.5 0 0 1 5.5 7H14a1.5 1.5 0 0 1 1.5 1.5V20M4 20h16M15.5 20v-6.5A1.5 1.5 0 0 1 17 12h2.5A1.5 1.5 0 0 1 21 13.5V20" />
    <path d="M7.5 10.5h2M7.5 13.5h2M7.5 16.5h2" />
  </svg>
)

const IconFuelGauge = ({ eighths = 8 }) => {
  const inner = 11.2
  const fill = Math.max(0, Math.min(8, Number(eighths) || 0)) * (inner / 8)
  const y = 17.6 - fill
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="10.4" y="3.1" width="3.2" height="2" rx="0.6" fill="currentColor" stroke="none" />
      <rect x="8" y="4.6" width="8" height="15.2" rx="2" />
      {fill > 0.4 ? <rect x="9.7" y={y} width="4.6" height={fill} rx="0.7" fill="currentColor" stroke="none" /> : null}
    </svg>
  )
}

const IconAvailCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.2 16.5 19 7.5" />
  </svg>
)

const IconAvailBusy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path strokeLinecap="round" d="M8 3.5V7M16 3.5V7M3.5 10h17M9 14.5l6 0M12 11.5v6" />
  </svg>
)

const IconAvailOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="8" />
    <path strokeLinecap="round" d="M7.2 7.2l9.6 9.6" />
  </svg>
)

const IconAvailDates = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path strokeLinecap="round" d="M8 3.5V7M16 3.5V7M3.5 10h17" />
  </svg>
)

const ComboMark = ({ mark }) => {
  if (!mark) return null
  if (String(mark).startsWith('status-')) {
    return <span className={`admin-combobox-dot is-${String(mark).slice(7)}`} />
  }
  if (String(mark).startsWith('fuel-')) {
    return (
      <span className="admin-combobox-mark is-fuel">
        <IconFuelGauge eighths={Number(String(mark).slice(5))} />
      </span>
    )
  }
  if (String(mark).startsWith('avail-')) {
    const tone = String(mark).slice(6)
    const Icon = tone === 'available'
      ? IconAvailCheck
      : tone === 'reserved'
        ? IconAvailBusy
        : tone === 'unavailable'
          ? IconAvailOff
          : IconAvailDates
    return (
      <span className={`admin-combobox-mark is-avail is-${tone}`}>
        <Icon />
      </span>
    )
  }
  const Icon = mark === 'vehicle' ? IconCar : mark === 'airport' ? IconPlane : mark === 'hotel' ? IconHotel : IconPin
  return (
    <span className={`admin-combobox-mark is-${mark}`}>
      <Icon />
    </span>
  )
}

const ComboThumb = ({ src, mark }) => {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return (
      <span className="admin-combobox-thumb">
        <img src={src} alt="" onError={() => setBroken(true)} />
      </span>
    )
  }
  return <ComboMark mark={mark} />
}

const ComboBadge = ({ tone, children }) => {
  if (!children) return null
  return (
    <span className={`admin-combobox-badge is-${tone || 'pending'}`}>
      <span className="admin-combobox-badge-dot" aria-hidden />
      {children}
    </span>
  )
}

export const SearchSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Search…',
  searchPlaceholder,
  emptyLabel = 'No results',
  searchable,
  required,
  id,
  disabled = false,
  legend = null,
  rich = false,
}) => {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(-1)
  const [coords, setCoords] = useState(null)
  const [theme, setTheme] = useState('light')
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)
  const selected = options.find((o) => String(o.value) === String(value))
  const canSearch = searchable ?? options.length > 6
  const query = q.trim().toLowerCase()
  const filtered = useMemo(
    () => (canSearch && query ? options.filter((o) => optionSearchText(o).includes(query)) : options),
    [options, query, canSearch],
  )

  const firstEnabled = (list) => list.findIndex((o) => !o.disabled)

  const stepEnabled = (from, delta) => {
    if (!filtered.length) return from
    let i = from
    for (let n = 0; n < filtered.length; n += 1) {
      i += delta
      if (i < 0 || i >= filtered.length) return from
      if (!filtered[i]?.disabled) return i
    }
    return from
  }

  const close = () => {
    setOpen(false)
    setQ('')
    setActive(-1)
  }

  const pick = (option) => {
    if (!option || option.disabled) return
    onChange?.(option.value)
    close()
  }

  const updateCoords = () => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gutter = 8
    const spaceBelow = window.innerHeight - rect.bottom - gutter
    const spaceAbove = rect.top - gutter
    const placeAbove = spaceBelow < 240 && spaceAbove > spaceBelow
    const available = placeAbove ? spaceAbove : spaceBelow
    const cap = rich ? 420 : 280
    const floor = rich ? 220 : 168
    const maxH = Math.min(cap, Math.max(floor, available))
    setCoords({
      top: placeAbove ? undefined : rect.bottom + 4,
      bottom: placeAbove ? window.innerHeight - rect.top + 4 : undefined,
      left: Math.max(gutter, Math.min(rect.left, window.innerWidth - rect.width - gutter)),
      width: rect.width,
      maxHeight: maxH,
    })
    const shell = resolveAdminShell(el)
    if (shell) setTheme(shell.getAttribute('data-theme') || 'light')
  }

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return
      close()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    updateCoords()
    const onMove = () => updateCoords()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, rich])

  useEffect(() => {
    if (!open) return undefined
    const selectedIdx = filtered.findIndex((o) => String(o.value) === String(value) && !o.disabled)
    const fallback = firstEnabled(filtered)
    setActive(selectedIdx >= 0 ? selectedIdx : fallback)
    const frame = requestAnimationFrame(() => (canSearch ? searchRef.current : panelRef.current)?.focus?.())
    return () => cancelAnimationFrame(frame)
  }, [open, canSearch])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  useEffect(() => {
    if (!open || active < 0) return
    const node = listRef.current?.querySelector(`[data-combo-index="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => {
        const start = i < 0 ? firstEnabled(filtered) - 1 : i
        const next = stepEnabled(start, 1)
        return next < 0 ? i : next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => {
        if (i < 0) {
          for (let n = filtered.length - 1; n >= 0; n -= 1) {
            if (!filtered[n]?.disabled) return n
          }
          return i
        }
        return stepEnabled(i, -1)
      })
    } else if (e.key === 'Home') {
      e.preventDefault()
      const idx = firstEnabled(filtered)
      if (idx >= 0) setActive(idx)
    } else if (e.key === 'End') {
      e.preventDefault()
      for (let n = filtered.length - 1; n >= 0; n -= 1) {
        if (!filtered[n]?.disabled) {
          setActive(n)
          break
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && filtered[active] && !filtered[active].disabled) pick(filtered[active])
    }
  }

  const portalHost = typeof document !== 'undefined'
    ? resolveAdminShell(wrapRef.current) || document.body
    : null

  const panel = open && coords && portalHost
    ? createPortal(
        <div
          ref={panelRef}
          className={`admin-combobox-panel is-ported${canSearch ? '' : ' is-simple'}${rich ? ' is-rich' : ''}`}
          data-theme={theme}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onSearchKeyDown}
          style={{
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight,
          }}
        >
          {canSearch ? (
            <div className="admin-combobox-search">
              <label className="admin-combobox-search-field">
                <svg className="admin-combobox-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  ref={searchRef}
                  type="search"
                  className="admin-combobox-search-input"
                  placeholder={searchPlaceholder || placeholder}
                  value={q}
                  onChange={(e) => {
                    const next = e.target.value
                    setQ(next)
                    const needle = next.trim().toLowerCase()
                    const list = needle
                      ? options.filter((o) => optionSearchText(o).includes(needle))
                      : options
                    const idx = list.findIndex((o) => !o.disabled)
                    setActive(idx)
                  }}
                  onKeyDown={onSearchKeyDown}
                  autoComplete="off"
                  aria-autocomplete="list"
                />
              </label>
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <p className="admin-combobox-empty">{emptyLabel}</p>
          ) : (
            <div ref={listRef} className="admin-combobox-list">
              {filtered.map((o, index) => {
                const isSelected = String(o.value) === String(value)
                const isOff = Boolean(o.disabled)
                return (
                  <button
                    key={String(o.value) || index}
                    type="button"
                    role="option"
                    data-combo-index={index}
                    aria-selected={isSelected}
                    aria-disabled={isOff}
                    className={`admin-combobox-option${isSelected ? ' is-selected' : ''}${index === active ? ' is-active' : ''}${isOff ? ' is-off' : ''}${rich ? ' is-fleet' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(o)}
                  >
                    <ComboThumb src={o.thumb} mark={o.mark} />
                    <span className="admin-combobox-option-body">
                      <span className="admin-combobox-option-label">{o.label}</span>
                      {o.hint ? (
                        <span className={`admin-combobox-option-hint${o.hintKind === 'code' ? ' is-code' : ''}`}>{o.hint}</span>
                      ) : null}
                      {o.detail ? <span className="admin-combobox-option-detail">{o.detail}</span> : null}
                    </span>
                    {o.badge ? <ComboBadge tone={o.badgeTone}>{o.badge}</ComboBadge> : null}
                    {!o.badge && o.meta ? <span className="admin-combobox-option-meta">{o.meta}</span> : null}
                    {isSelected && !isOff ? (
                      <svg className="admin-combobox-check" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path d="M4.5 10.5 8 14l7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
          {legend ? <div className="admin-combobox-legend">{legend}</div> : null}
        </div>,
        portalHost,
      )
    : null

  return (
    <div className={`admin-combobox${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${rich ? ' is-rich' : ''}`} ref={wrapRef}>
      <input type="hidden" value={value || ''} required={required} readOnly />
      <button
        id={id}
        type="button"
        className="admin-input admin-combobox-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          if (open) {
            close()
            return
          }
          setQ('')
          updateCoords()
          setOpen(true)
        }}
      >
        {selected ? (
          <>
            <ComboThumb src={selected.thumb} mark={selected.mark} />
            <span className="admin-combobox-trigger-copy">
              <span className="admin-combobox-trigger-label">{selected.label}</span>
              {selected.hint ? (
                <span className={`admin-combobox-trigger-hint${selected.hintKind === 'code' ? ' is-code' : ''}`}>{selected.hint}</span>
              ) : null}
            </span>
            {selected.badge ? <ComboBadge tone={selected.badgeTone}>{selected.badge}</ComboBadge> : null}
          </>
        ) : (
          <span className="admin-combobox-trigger-copy">
            <span className="admin-combobox-trigger-placeholder">{placeholder}</span>
          </span>
        )}
        <svg className="admin-combobox-caret" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {panel}
    </div>
  )
}

const AVAIL_RANK = { available: 0, pending: 1, reserved: 2, unavailable: 3 }

export const toVehicleOption = (car, extras = {}) => {
  if (!car) return null
  const model = String(car.model || '').trim()
  const brand = String(car.brand || '').trim()
  const plate = String(car.licensePlate || '').trim()
  const fleetId = String(car.fleetId || '').trim()
  const availability = car.availability || extras.availability || ''
  const showStatus = Boolean(extras.showStatus && availability)
  const labels = extras.statusLabels || {}
  const rate = extras.showRate && car.pricePerDay != null
    ? `${extras.currency || ''}${car.pricePerDay}`
    : ''
  const disabled = showStatus && (availability === 'reserved' || availability === 'unavailable' || car.selectable === false)
  const thumb = car.image || (Array.isArray(car.images) ? car.images[0] : '')
  return {
    value: car._id,
    label: [brand, model].filter(Boolean).join(' ') || model || brand || '—',
    hint: plate,
    hintKind: 'code',
    detail: showStatus ? rate : '',
    meta: showStatus ? '' : rate,
    badge: showStatus ? (labels[availability] || availability) : '',
    badgeTone: availability || undefined,
    disabled,
    thumb: thumb || '',
    mark: showStatus ? `avail-${availability}` : 'vehicle',
    keywords: [brand, model, plate, fleetId, car.vin, availability, labels[availability]].filter(Boolean).join(' '),
  }
}

export const toLocationOption = (loc, typeLabel) => {
  if (!loc) return null
  const city = String(loc.city || '').trim()
  const name = String(loc.name || '').trim()
  const type = String(loc.locationType || '').trim()
  const same = city && name && city.toLowerCase() === name.toLowerCase()
  const hintParts = []
  if (!same && city) hintParts.push(city)
  if (typeLabel) hintParts.push(typeLabel)
  return {
    value: loc._id,
    label: same ? city : (name || city || '—'),
    hint: hintParts.join(' · '),
    mark: type === 'airport' || type === 'hotel' ? type : 'place',
    keywords: [city, name, loc.address, type].filter(Boolean).join(' '),
  }
}

export const VehicleSelect = ({
  cars = [],
  value,
  onChange,
  placeholder = 'Select a vehicle…',
  searchPlaceholder = 'Search model or plate…',
  emptyLabel = 'No results',
  emptyOptionLabel,
  includeEmpty = false,
  required,
  id,
  disabled = false,
  currency,
  showRate = false,
  showStatus = false,
  statusLabels = {},
  legend = null,
}) => {
  const options = useMemo(() => {
    const mapped = cars
      .map((car) => toVehicleOption(car, { currency, showRate, showStatus, statusLabels }))
      .filter(Boolean)
    const list = showStatus
      ? [...mapped].sort((a, b) => {
          const rank = (AVAIL_RANK[a.badgeTone] ?? 9) - (AVAIL_RANK[b.badgeTone] ?? 9)
          if (rank !== 0) return rank
          return String(a.label).localeCompare(String(b.label))
        })
      : mapped
    if (!includeEmpty) return list
    return [{ value: '', label: emptyOptionLabel || 'All', hint: '' }, ...list]
  }, [cars, includeEmpty, emptyOptionLabel, currency, showRate, showStatus, statusLabels])

  return (
    <SearchSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyLabel={emptyLabel}
      searchable
      required={required}
      disabled={disabled}
      rich={showStatus}
      legend={legend}
    />
  )
}

const DocIconLicense = () => (
  <svg viewBox="0 0 40 28" aria-hidden>
    <rect x="1.25" y="1.25" width="37.5" height="25.5" rx="4" fill="currentColor" opacity="0.08" />
    <rect x="1.25" y="1.25" width="37.5" height="25.5" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="4.5" y="5.5" width="11" height="13" rx="2" fill="currentColor" opacity="0.14" />
    <circle cx="10" cy="11.6" r="3.35" fill="none" stroke="currentColor" strokeWidth="1.35" />
    <circle cx="10" cy="11.6" r="1.05" fill="currentColor" />
    <path d="M7.4 11.6h5.2M10 8.25v6.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <rect x="18.5" y="6.2" width="16" height="2.2" rx="1.1" fill="currentColor" />
    <rect x="18.5" y="10.6" width="11.5" height="1.8" rx="0.9" fill="currentColor" opacity="0.45" />
    <rect x="18.5" y="14.4" width="13.5" height="1.8" rx="0.9" fill="currentColor" opacity="0.28" />
    <rect x="4.5" y="21.2" width="31" height="2.4" rx="1.2" fill="currentColor" opacity="0.18" />
  </svg>
)

const DocIconCin = () => (
  <svg viewBox="0 0 40 28" aria-hidden>
    <rect x="1.25" y="1.25" width="37.5" height="25.5" rx="4" fill="currentColor" opacity="0.08" />
    <rect x="1.25" y="1.25" width="37.5" height="25.5" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="4.6" y="5.2" width="9.4" height="11.4" rx="1.6" fill="currentColor" opacity="0.16" />
    <circle cx="9.3" cy="9.1" r="2.05" fill="currentColor" opacity="0.55" />
    <path d="M6.3 14.6c.7-1.5 2-2.3 3-2.3s2.3.8 3 2.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <rect x="16.4" y="5.6" width="6.2" height="4.6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.25" />
    <rect x="17.7" y="6.8" width="3.6" height="2.2" rx="0.4" fill="currentColor" opacity="0.35" />
    <rect x="24.2" y="6" width="11.2" height="1.7" rx="0.85" fill="currentColor" />
    <rect x="24.2" y="9.4" width="8.4" height="1.5" rx="0.75" fill="currentColor" opacity="0.4" />
    <path d="M5 19.4h30M5 21.6h30M5 23.8h22" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeDasharray="1.6 1.5" opacity="0.55" />
  </svg>
)

const DocIconPassport = () => (
  <svg viewBox="0 0 40 28" aria-hidden>
    <rect x="5.5" y="2.4" width="31" height="23.2" rx="3.2" fill="currentColor" opacity="0.1" />
    <rect x="3.2" y="1.3" width="31.2" height="23.6" rx="3.2" fill="currentColor" opacity="0.08" />
    <rect x="3.2" y="1.3" width="31.2" height="23.6" rx="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3.2" y="10.4" width="31.2" height="4.2" fill="currentColor" opacity="0.2" />
    <circle cx="18.8" cy="12.5" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <ellipse cx="18.8" cy="12.5" rx="2.15" ry="5.1" fill="none" stroke="currentColor" strokeWidth="1.05" />
    <path d="M13.7 12.5h10.2M15.1 9.4h7.4M15.1 15.6h7.4" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" />
  </svg>
)

const DOC_ICONS = {
  license: DocIconLicense,
  cin: DocIconCin,
  passport: DocIconPassport,
}

const shortDocName = (file) => {
  const name = typeof file === 'string' ? file : file?.name
  if (!name) return ''
  if (name.length <= 24) return name
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot) : ''
  return `${name.slice(0, Math.max(10, 22 - ext.length))}…${ext}`
}

const DocumentUploadTile = ({
  kind = 'license',
  title,
  hint,
  required = false,
  file,
  uploading = false,
  disabled = false,
  accept = 'image/*',
  addLabel,
  replaceLabel,
  clearLabel,
  uploadingLabel,
  onChange,
  onClear,
}) => {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const filled = Boolean(file) && !uploading
  const Icon = DOC_ICONS[kind] || DocIconLicense
  const busy = Boolean(uploading || disabled)

  const takeFile = (next) => {
    if (!next || busy) return
    onChange?.(next)
  }

  return (
    <div
      className={`admin-doc-tile is-${kind}${filled ? ' is-filled' : ''}${required ? ' is-required' : ''}${dragOver ? ' is-drop' : ''}${uploading ? ' is-busy' : ''}${disabled ? ' is-disabled' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        if (!busy) setDragOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!busy) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        takeFile(e.dataTransfer.files?.[0])
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={busy}
        className="admin-sr-only"
        onChange={(e) => {
          takeFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <label
        htmlFor={inputId}
        className="admin-doc-tile-hit"
        aria-label={`${title}. ${uploading ? uploadingLabel : filled ? replaceLabel : addLabel}`}
      >
        <span className="admin-doc-mark">
          <Icon />
          {filled ? (
            <span className="admin-doc-check" aria-hidden>
              <svg viewBox="0 0 16 16" fill="none">
                <path d="M3.2 8.3 6.4 11.4 12.8 4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : null}
        </span>
        <span className="admin-doc-copy">
          <span className="admin-doc-title">{title}</span>
          <span className="admin-doc-hint">{filled ? shortDocName(file) : hint}</span>
        </span>
        <span className="admin-doc-action">
          {uploading ? (
            <>
              <span className="admin-doc-spin" aria-hidden />
              {uploadingLabel}
            </>
          ) : filled ? (
            replaceLabel
          ) : (
            <>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {addLabel}
            </>
          )}
        </span>
      </label>
      {filled && onClear && !disabled ? (
        <button
          type="button"
          className="admin-doc-clear"
          aria-label={`${clearLabel} — ${title}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClear()
            if (inputRef.current) inputRef.current.value = ''
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

export const DocumentUploadGroup = ({
  items = [],
  addLabel = 'Add photo',
  replaceLabel = 'Replace',
  clearLabel = 'Remove',
  uploadingLabel = 'Uploading…',
  accept = 'image/*',
  disabled = false,
}) => (
  <div className="admin-doc-group" role="group">
    {items.map((item) => (
      <DocumentUploadTile
        key={item.id}
        {...item}
        addLabel={addLabel}
        replaceLabel={replaceLabel}
        clearLabel={clearLabel}
        uploadingLabel={uploadingLabel}
        accept={item.accept || accept}
        disabled={disabled || item.disabled}
      />
    ))}
  </div>
)

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

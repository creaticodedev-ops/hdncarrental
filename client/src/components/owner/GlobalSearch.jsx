import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { customerEmail } from '../../utils/customerEmail'
import { SearchIcon } from './topbar/icons'

const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/**
 * Cross-entity admin search.
 *
 * @param {boolean} inline   Render results in flow (used inside the mobile sheet)
 * @param {boolean} shortcut Bind ⌘K / Ctrl+K to focus this instance
 */
const GlobalSearch = ({ inline = false, autoFocus = false, shortcut = false }) => {
  const { axios } = useAppContext()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const inputRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    if (inline) return undefined
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [inline])

  useEffect(() => {
    if (!shortcut) return undefined
    const onKey = (e) => {
      if (e.key?.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcut])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) {
      setResults(null)
      return undefined
    }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/api/owner/search?q=${encodeURIComponent(q.trim())}`)
        if (data.success) {
          setResults(data.results)
          setOpen(true)
        }
      } catch (error) {
        console.error(getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [q, axios])

  const go = useCallback(
    (path) => {
      setOpen(false)
      setQ('')
      navigate(path)
    },
    [navigate],
  )

  const hasResults =
    results && (results.bookings?.length || results.cars?.length || results.customers?.length)
  const showPanel = inline ? q.trim().length >= 2 : open

  const groupClass = 'p-2'
  const labelClass =
    'px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]'
  const itemClass =
    'w-full cursor-pointer rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--admin-hover)] focus-visible:bg-[var(--admin-hover)] focus-visible:outline-none'

  return (
    <div className={`relative w-full ${inline ? '' : 'max-w-xl'}`} ref={ref}>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]">
          <SearchIcon size={15} />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (hasResults) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              e.currentTarget.blur()
            }
          }}
          placeholder={t('admin.shell.searchPlaceholder')}
          aria-label={t('admin.shell.searchPlaceholder')}
          className="w-full min-h-9 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input-bg)] pl-8 pr-14 py-1.5 text-sm text-[var(--admin-ink)] outline-none focus:shadow-[var(--admin-focus)]"
        />
        {shortcut && !q ? (
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--admin-muted)] lg:block">
            {isMac() ? '⌘K' : 'Ctrl K'}
          </kbd>
        ) : null}
      </div>

      {showPanel ? (
        <div
          className={
            inline
              ? 'mt-2 max-h-[60svh] overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]'
              : 'absolute left-0 z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)]'
          }
        >
          {loading ? <p className="p-3 text-xs text-[var(--admin-muted)]">{t('admin.shell.searching')}</p> : null}
          {!loading && !hasResults && q.trim().length >= 2 ? (
            <p className="p-3 text-xs text-[var(--admin-muted)]">{t('admin.shell.noResults')}</p>
          ) : null}

          {results?.bookings?.length > 0 ? (
            <div className={groupClass}>
              <p className={labelClass}>{t('admin.menu.reservations')}</p>
              {results.bookings.map((b) => (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => go(`/owner/manage-bookings?bookingId=${b._id}`)}
                  className={itemClass}
                >
                  <span className="font-medium text-[var(--admin-primary)]">{b.reservationId || 'RES'}</span>
                  <span className="text-[var(--admin-ink-secondary)]"> · {b.customerName}</span>
                  <span className="block text-xs text-[var(--admin-muted)]">
                    {b.car?.brand} {b.car?.model}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {results?.cars?.length > 0 ? (
            <div className={`${groupClass} border-t border-[var(--admin-border)]`}>
              <p className={labelClass}>{t('admin.menu.fleet')}</p>
              {results.cars.map((c) => (
                <button key={c._id} type="button" onClick={() => go(`/owner/edit-car/${c._id}`)} className={itemClass}>
                  {c.brand} {c.model}
                  <span className="text-xs text-[var(--admin-muted)]"> · {c.licensePlate || c.location}</span>
                </button>
              ))}
            </div>
          ) : null}

          {results?.customers?.length > 0 ? (
            <div className={`${groupClass} border-t border-[var(--admin-border)]`}>
              <p className={labelClass}>{t('admin.menu.customers')}</p>
              {results.customers.map((c) => (
                <button key={c._id} type="button" onClick={() => go('/owner/customers')} className={itemClass}>
                  {c.name}
                  <span className="block text-xs text-[var(--admin-muted)]">
                    {[customerEmail(c), c.status].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default GlobalSearch

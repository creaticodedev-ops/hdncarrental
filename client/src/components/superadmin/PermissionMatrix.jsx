import React, { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import {
  ALL_ACTION_TYPES,
  countGranted,
  diffPermissions,
  hasSensitiveChange,
  isFullAccess,
  modulesForCatalog,
  resolveCatalog,
  samePermissions,
  summarizeAccess,
} from '../../utils/permissionMeta'

const chipClass = (on) =>
  `inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
    on ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30' : 'bg-white/5 text-slate-600 ring-1 ring-white/5'
  }`

/**
 * Enterprise RBAC matrix for a single owner-admin.
 * Speaks the existing permission contract: [] = full access; non-empty = allow-list.
 */
const PermissionMatrix = ({
  catalog: catalogProp,
  value,
  baseline,
  onChange,
  peerAdmins = [],
  currentAdminId = '',
  currentAdminName = '',
  saving = false,
  onSave,
  onCancel,
  updatedAt = null,
  className = '',
}) => {
  const { t } = useI18n()
  const catalog = useMemo(() => resolveCatalog(catalogProp), [catalogProp])
  const modules = useMemo(() => modulesForCatalog(catalog), [catalog])

  const [expanded, setExpanded] = useState(() => Object.fromEntries(modules.map((m) => [m.id, true])))
  const [permQuery, setPermQuery] = useState('')
  const [copyFromId, setCopyFromId] = useState('')
  const [compareId, setCompareId] = useState('')

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev }
      modules.forEach((m) => {
        if (next[m.id] === undefined) next[m.id] = true
      })
      return next
    })
  }, [modules])

  const dirty = !samePermissions(value, baseline)
  const summary = summarizeAccess(value, catalog)
  const full = isFullAccess(value)
  const granted = useMemo(() => {
    if (full) return new Set(catalog)
    return new Set((value || []).filter((p) => catalog.includes(p)))
  }, [value, catalog, full])

  const comparePeer = peerAdmins.find((a) => a._id === compareId)
  const compareDiff = useMemo(() => {
    if (!comparePeer) return null
    return diffPermissions(value, comparePeer.permissions || [], catalog)
  }, [comparePeer, value, catalog])

  const q = permQuery.trim().toLowerCase()
  const filteredModules = useMemo(() => {
    if (!q) return modules
    return modules
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter((p) => {
          const label = t(p.labelKey).toLowerCase()
          const desc = t(p.descKey).toLowerCase()
          const groupLabel = t(group.labelKey).toLowerCase()
          return (
            p.key.includes(q)
            || label.includes(q)
            || desc.includes(q)
            || groupLabel.includes(q)
          )
        }),
      }))
      .filter((g) => g.permissions.length > 0)
  }, [modules, q, t])

  const setRestrictedList = (keys) => {
    const unique = [...new Set(keys.filter((k) => catalog.includes(k)))]
    onChange(unique)
  }

  const enableFullAccess = () => onChange([])

  const enableRestricted = (seedKeys = catalog) => {
    const seed = seedKeys.filter((k) => catalog.includes(k))
    onChange(seed.length ? seed : [...catalog])
  }

  const toggleKey = (key) => {
    if (full) {
      // Leaving full access: start restricted with all except keep this one? 
      // Better UX: start with all modules, then uncheck this one... 
      // Actually if full and user clicks to "turn off" a module, restrict to all except that.
      // If they click to ensure a module is on while full, stay full (no-op).
      // Checkbox when full is checked for all — unchecking one → restricted without that key.
      enableRestricted(catalog.filter((k) => k !== key))
      return
    }
    const next = granted.has(key)
      ? (value || []).filter((k) => k !== key)
      : [...(value || []), key]
    // If user removed everything, keep empty as "no modules" would be full access —
    // force at least empty means full. To represent "no access" isn't supported by API.
    // Empty = full. So if next is empty after removing last, that's full access.
    setRestrictedList(next)
  }

  const setModuleKeys = (moduleKeys, on) => {
    if (full) {
      if (on) return // already has them
      enableRestricted(catalog.filter((k) => !moduleKeys.includes(k)))
      return
    }
    const set = new Set(value || [])
    moduleKeys.forEach((k) => {
      if (on) set.add(k)
      else set.delete(k)
    })
    setRestrictedList([...set])
  }

  const selectAll = () => enableRestricted([...catalog])
  const clearToFull = () => enableFullAccess()
  const resetBaseline = () => onChange(Array.isArray(baseline) ? [...baseline] : [])
  const resetModule = (moduleKeys) => {
    if (isFullAccess(baseline)) {
      // Baseline full → restricted without changing other modules from full means all on;
      // resetting module to "default full" while restricted: add module keys back
      const set = new Set(full ? catalog : value || [])
      moduleKeys.forEach((k) => set.add(k))
      if (set.size === catalog.length) enableFullAccess()
      else setRestrictedList([...set])
      return
    }
    const baseSet = new Set(baseline || [])
    const set = new Set(full ? catalog : value || [])
    moduleKeys.forEach((k) => {
      if (baseSet.has(k)) set.add(k)
      else set.delete(k)
    })
    if (set.size === catalog.length && isFullAccess(baseline)) enableFullAccess()
    else setRestrictedList([...set])
  }

  const copyFromPeer = () => {
    const peer = peerAdmins.find((a) => a._id === copyFromId)
    if (!peer) return
    onChange(Array.isArray(peer.permissions) ? [...peer.permissions] : [])
  }

  const handleSave = () => {
    if (!onSave || !dirty) return
    if (hasSensitiveChange(baseline, value)) {
      const ok = window.confirm(t('superadmin.perms.confirmSensitive'))
      if (!ok) return
    } else {
      const ok = window.confirm(t('superadmin.perms.confirmSave'))
      if (!ok) return
    }
    onSave(value)
  }

  const peers = peerAdmins.filter((a) => a._id !== currentAdminId)

  return (
    <div className={`border border-white/10 bg-white/[0.02] ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm uppercase tracking-wider text-slate-400">
              {t('superadmin.perms.title')}
            </h2>
            {dirty && (
              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/30">
                {t('superadmin.perms.unsaved')}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {t('superadmin.perms.subtitle')}
          </p>
          {currentAdminName && (
            <p className="mt-2 text-xs text-slate-400">
              {t('superadmin.perms.editing', { name: currentAdminName })}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>
            {summary.mode === 'full'
              ? t('superadmin.perms.summaryFull')
              : t('superadmin.perms.summaryRestricted', {
                  granted: summary.granted,
                  total: summary.total,
                })}
          </p>
          {updatedAt && (
            <p className="mt-1">
              {t('superadmin.perms.lastUpdated', {
                date: new Date(updatedAt).toLocaleString(),
              })}
            </p>
          )}
        </div>
      </div>

      {/* Mode + tools */}
      <div className="space-y-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearToFull}
            className={`px-3 py-1.5 text-xs transition-colors ${
              full
                ? 'bg-emerald-700/80 text-white'
                : 'border border-white/15 text-slate-300 hover:border-white/30'
            }`}
          >
            {t('superadmin.perms.modeFull')}
          </button>
          <button
            type="button"
            onClick={() => enableRestricted(full ? catalog : value?.length ? value : catalog)}
            className={`px-3 py-1.5 text-xs transition-colors ${
              !full
                ? 'bg-cyan-700/80 text-white'
                : 'border border-white/15 text-slate-300 hover:border-white/30'
            }`}
          >
            {t('superadmin.perms.modeRestricted')}
          </button>
          <span className="mx-1 hidden h-6 w-px bg-white/10 sm:inline-block" />
          <button
            type="button"
            onClick={selectAll}
            className="border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:border-white/30"
          >
            {t('superadmin.perms.selectAll')}
          </button>
          <button
            type="button"
            onClick={clearToFull}
            className="border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:border-white/30"
          >
            {t('superadmin.perms.clearFull')}
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={resetBaseline}
            className="border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:border-white/30 disabled:opacity-40"
          >
            {t('superadmin.perms.revert')}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
              {t('superadmin.perms.searchPerms')}
            </span>
            <input
              value={permQuery}
              onChange={(e) => setPermQuery(e.target.value)}
              placeholder={t('superadmin.perms.searchPermsPlaceholder')}
              className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
              {t('superadmin.perms.copyFrom')}
            </span>
            <div className="flex gap-2">
              <select
                value={copyFromId}
                onChange={(e) => setCopyFromId(e.target.value)}
                className="min-w-0 flex-1 bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
              >
                <option value="">{t('superadmin.perms.copyFromPlaceholder')}</option>
                {peers.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name || a.email}
                    {isFullAccess(a.permissions) ? ` (${t('superadmin.perms.badgeFull')})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!copyFromId}
                onClick={copyFromPeer}
                className="shrink-0 border border-white/15 px-3 py-2 text-xs text-slate-200 hover:border-white/30 disabled:opacity-40"
              >
                {t('superadmin.perms.copy')}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
              {t('superadmin.perms.compareWith')}
            </span>
            <select
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
              className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
            >
              <option value="">{t('superadmin.perms.comparePlaceholder')}</option>
              {peers.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name || a.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        {comparePeer && compareDiff && (
          <div className="border border-white/10 bg-[#0a0f14]/80 px-3 py-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300">
              {t('superadmin.perms.compareTitle', { name: comparePeer.name || comparePeer.email })}
            </p>
            <p className="mt-1">
              {t('superadmin.perms.comparePeerSummary', {
                summary: isFullAccess(comparePeer.permissions)
                  ? t('superadmin.perms.badgeFull')
                  : t('superadmin.perms.summaryRestricted', {
                      granted: countGranted(comparePeer.permissions, catalog),
                      total: catalog.length,
                    }),
              })}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <span className="text-emerald-400">
                +{compareDiff.added.length}{' '}
                {compareDiff.added.length
                  ? compareDiff.added.map((k) => t(`superadmin.perms.keys.${k}`)).join(', ')
                  : '—'}
              </span>
              <span className="text-rose-300">
                −{compareDiff.removed.length}{' '}
                {compareDiff.removed.length
                  ? compareDiff.removed.map((k) => t(`superadmin.perms.keys.${k}`)).join(', ')
                  : '—'}
              </span>
            </div>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-slate-500">
          {t('superadmin.perms.sessionNote')}
        </p>
      </div>

      {/* Matrix */}
      <div className="divide-y divide-white/5">
        {filteredModules.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">
            {t('superadmin.perms.noMatch')}
          </p>
        )}
        {filteredModules.map((group) => {
          const moduleKeys = group.permissions.map((p) => p.key)
          const allOn = moduleKeys.every((k) => granted.has(k))
          const someOn = moduleKeys.some((k) => granted.has(k))
          const open = expanded[group.id] !== false

          return (
            <div key={group.id}>
              <div className="flex flex-wrap items-center gap-2 bg-white/[0.02] px-4 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [group.id]: !open }))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={open}
                >
                  <span className="text-slate-500">{open ? '▾' : '▸'}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {t(group.labelKey)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {moduleKeys.filter((k) => granted.has(k)).length}/{moduleKeys.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModuleKeys(moduleKeys, !allOn)}
                  className="border border-white/15 px-2.5 py-1 text-[11px] text-slate-300 hover:border-white/30"
                >
                  {allOn ? t('superadmin.perms.clearModule') : t('superadmin.perms.selectModule')}
                </button>
                <button
                  type="button"
                  onClick={() => resetModule(moduleKeys)}
                  className="border border-white/10 px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-300"
                >
                  {t('superadmin.perms.resetModule')}
                </button>
                {!allOn && someOn && (
                  <span className="text-[10px] text-amber-400/80">{t('superadmin.perms.partial')}</span>
                )}
              </div>

              {open && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-2 font-medium sm:px-6">{t('superadmin.perms.colModule')}</th>
                        <th className="px-2 py-2 font-medium text-center w-24">{t('superadmin.perms.colAccess')}</th>
                        {ALL_ACTION_TYPES.map((action) => (
                          <th key={action} className="px-1 py-2 font-medium text-center w-16">
                            {t(`superadmin.perms.actions.${action}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.permissions.map((perm) => {
                        const on = granted.has(perm.key)
                        return (
                          <tr
                            key={perm.key}
                            className="border-b border-white/5 hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-3 sm:px-6">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-100">{t(perm.labelKey)}</span>
                                {perm.sensitive && (
                                  <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300 ring-1 ring-rose-500/30">
                                    {t('superadmin.perms.sensitive')}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">{t(perm.descKey)}</p>
                              <p className="mt-0.5 font-mono text-[10px] text-slate-600">{perm.key}</p>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggleKey(perm.key)}
                                className="h-4 w-4 accent-cyan-600"
                                aria-label={t(perm.labelKey)}
                              />
                            </td>
                            {ALL_ACTION_TYPES.map((action) => {
                              const applies = perm.actions.includes(action)
                              return (
                                <td key={action} className="px-1 py-3 text-center">
                                  {applies ? (
                                    <span className={chipClass(on)} title={t(`superadmin.perms.actions.${action}`)}>
                                      {on ? '●' : '○'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-700">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:px-6">
        <p className="text-xs text-slate-500">
          {dirty ? t('superadmin.perms.dirtyHint') : t('superadmin.perms.cleanHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => {
              resetBaseline()
              onCancel?.()
            }}
            className="border border-white/15 px-4 py-2 text-sm text-slate-200 hover:border-white/30 disabled:opacity-40"
          >
            {t('superadmin.perms.cancel')}
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
            className="bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600 disabled:opacity-60"
          >
            {saving ? t('superadmin.perms.saving') : t('superadmin.perms.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PermissionMatrix

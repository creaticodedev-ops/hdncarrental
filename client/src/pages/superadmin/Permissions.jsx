import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'
import { useI18n } from '../../i18n/I18nContext'
import PermissionMatrix from '../../components/superadmin/PermissionMatrix'
import {
  countGranted,
  isFullAccess,
  resolveCatalog,
  summarizeAccess,
} from '../../utils/permissionMeta'

const SuperAdminPermissions = () => {
  const { axios } = useSuperAdmin()
  const { t } = useI18n()
  const [admins, setAdmins] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [accessFilter, setAccessFilter] = useState('all') // all | full | restricted
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState([])
  const [baseline, setBaseline] = useState([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get('/api/super-admin/admins?limit=100')
      if (!data.success) throw new Error(data.message)
      const list = data.admins || []
      setAdmins(list)
      setCatalog(resolveCatalog(data.permissionCatalog))
      setSelectedId((prev) => {
        if (prev && list.some((a) => a._id === prev)) return prev
        return list[0]?._id || ''
      })
    } catch (err) {
      setError(saError(err))
      toast.error(saError(err))
    } finally {
      setLoading(false)
    }
  }, [axios])

  useEffect(() => {
    load()
  }, [load])

  const selected = useMemo(
    () => admins.find((a) => a._id === selectedId) || null,
    [admins, selectedId],
  )

  useEffect(() => {
    if (!selected) {
      setDraft([])
      setBaseline([])
      return
    }
    const perms = Array.isArray(selected.permissions) ? [...selected.permissions] : []
    setDraft(perms)
    setBaseline(perms)
  }, [selected?._id]) // eslint-disable-line react-hooks/exhaustive-deps -- sync when selection changes

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return admins.filter((a) => {
      if (statusFilter !== 'all' && a.accountStatus !== statusFilter) return false
      const full = isFullAccess(a.permissions)
      if (accessFilter === 'full' && !full) return false
      if (accessFilter === 'restricted' && full) return false
      if (!q) return true
      const hay = `${a.name || ''} ${a.email || ''} ${a.agencyName || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [admins, search, accessFilter, statusFilter])

  const save = async (permissions) => {
    if (!selected) return
    setSaving(true)
    try {
      const { data } = await axios.patch(`/api/super-admin/admins/${selected._id}/permissions`, {
        permissions,
      })
      if (!data.success) throw new Error(data.message)
      toast.success(t('superadmin.perms.saveSuccess'))
      const nextPerms = Array.isArray(data.admin?.permissions) ? data.admin.permissions : permissions
      setAdmins((prev) =>
        prev.map((a) =>
          a._id === selected._id
            ? { ...a, permissions: nextPerms, updatedAt: data.admin?.updatedAt || a.updatedAt }
            : a,
        ),
      )
      setDraft([...nextPerms])
      setBaseline([...nextPerms])
    } catch (err) {
      toast.error(saError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl text-white sm:text-4xl">{t('superadmin.perms.hubTitle')}</h1>
        <p className="text-sm text-slate-500">{t('superadmin.perms.loading')}</p>
      </div>
    )
  }

  if (error && !admins.length) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl text-white sm:text-4xl">{t('superadmin.perms.hubTitle')}</h1>
        <div className="border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
          {error}
        </div>
        <button
          type="button"
          onClick={load}
          className="bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600"
        >
          {t('superadmin.perms.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-white sm:text-4xl">{t('superadmin.perms.hubTitle')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('superadmin.perms.hubSubtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        {/* Admin list */}
        <aside className="border border-white/10 bg-white/[0.02]">
          <div className="space-y-2 border-b border-white/10 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('superadmin.perms.searchAdmins')}
              className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={accessFilter}
                onChange={(e) => setAccessFilter(e.target.value)}
                className="bg-[#0a0f14] border border-white/10 px-2 py-2 text-xs outline-none focus:border-cyan-600/60"
              >
                <option value="all">{t('superadmin.perms.filterAccessAll')}</option>
                <option value="full">{t('superadmin.perms.filterAccessFull')}</option>
                <option value="restricted">{t('superadmin.perms.filterAccessRestricted')}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0a0f14] border border-white/10 px-2 py-2 text-xs outline-none focus:border-cyan-600/60"
              >
                <option value="all">{t('superadmin.perms.filterStatusAll')}</option>
                <option value="active">{t('superadmin.perms.filterStatusActive')}</option>
                <option value="suspended">{t('superadmin.perms.filterStatusSuspended')}</option>
                <option value="disabled">{t('superadmin.perms.filterStatusDisabled')}</option>
              </select>
            </div>
          </div>
          <ul className="max-h-[28rem] overflow-y-auto divide-y divide-white/5">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-500">
                {t('superadmin.perms.noAdmins')}
              </li>
            )}
            {filtered.map((admin) => {
              const summary = summarizeAccess(admin.permissions, catalog)
              const active = admin._id === selectedId
              return (
                <li key={admin._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(admin._id)}
                    className={`w-full px-3 py-3 text-left transition-colors ${
                      active ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-white">{admin.name}</p>
                    <p className="truncate text-xs text-slate-500">{admin.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] uppercase tracking-wide ${
                          summary.mode === 'full' ? 'text-emerald-400' : 'text-cyan-400'
                        }`}
                      >
                        {summary.mode === 'full'
                          ? t('superadmin.perms.badgeFull')
                          : t('superadmin.perms.badgeCount', {
                              granted: summary.granted,
                              total: summary.total,
                            })}
                      </span>
                      <span className="text-[10px] capitalize text-slate-600">
                        {admin.accountStatus}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-white/10 px-3 py-2 text-[10px] text-slate-600">
            {t('superadmin.perms.adminCount', { count: filtered.length, total: admins.length })}
          </div>
        </aside>

        {/* Matrix */}
        <div className="min-w-0 space-y-3">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <Link
                  to={`/superadmin/admins/${selected._id}`}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  {t('superadmin.perms.openProfile')}
                </Link>
                <span>
                  {isFullAccess(selected.permissions)
                    ? t('superadmin.perms.badgeFull')
                    : t('superadmin.perms.badgeCount', {
                        granted: countGranted(selected.permissions, catalog),
                        total: catalog.length,
                      })}
                </span>
              </div>
              <PermissionMatrix
                catalog={catalog}
                value={draft}
                baseline={baseline}
                onChange={setDraft}
                peerAdmins={admins}
                currentAdminId={selected._id}
                currentAdminName={selected.name || selected.email}
                saving={saving}
                onSave={save}
                updatedAt={selected.updatedAt}
              />
            </>
          ) : (
            <div className="border border-white/10 px-4 py-12 text-center text-sm text-slate-500">
              {t('superadmin.perms.selectAdmin')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SuperAdminPermissions

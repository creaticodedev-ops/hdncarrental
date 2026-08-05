import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'

const SuperAdminAdminDetail = () => {
  const { id } = useParams()
  const { axios, navigate } = useSuperAdmin()
  const [admin, setAdmin] = useState(null)
  const [stats, setStats] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState({ name: '', email: '', agencyName: '', notes: '' })
  const [permissions, setPermissions] = useState([])
  const [newPassword, setNewPassword] = useState('')
  const [extendDays, setExtendDays] = useState(7)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/super-admin/admins/${id}`)
      if (data.success) {
        setAdmin(data.admin)
        setStats(data.stats)
        setCatalog(data.permissionCatalog || [])
        setEdit({
          name: data.admin.name || '',
          email: data.admin.email || '',
          agencyName: data.admin.agencyName || '',
          notes: data.admin.notes || '',
        })
        setPermissions(data.admin.permissions || [])
      }
    } catch (error) {
      toast.error(saError(error))
      navigate('/superadmin/admins')
    } finally {
      setLoading(false)
    }
  }, [axios, id, navigate])

  useEffect(() => {
    load()
  }, [load])

  const run = async (key, fn) => {
    setBusy(key)
    try {
      await fn()
      await load()
    } catch (error) {
      toast.error(saError(error))
    } finally {
      setBusy('')
    }
  }

  if (loading || !admin) {
    return <p className="text-slate-500 text-sm">Loading admin…</p>
  }

  const lic = admin.license || {}

  return (
    <div className="space-y-8">
      <div>
        <Link to="/superadmin/admins" className="text-xs text-slate-500 hover:text-cyan-400">
          ← All admins
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl text-white mt-2">{admin.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{admin.email}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="border border-white/10 p-4">
          <p className="text-[11px] uppercase text-slate-500">Account</p>
          <p className="mt-1 capitalize text-lg text-white">{admin.accountStatus}</p>
        </div>
        <div className="border border-white/10 p-4">
          <p className="text-[11px] uppercase text-slate-500">License</p>
          <p className="mt-1 capitalize text-lg text-white">{lic.licenseStatus}</p>
          {lic.licenseStatus === 'trial' && (
            <p className="text-xs text-slate-500 mt-1">{lic.daysRemaining} days remaining</p>
          )}
        </div>
        <div className="border border-white/10 p-4">
          <p className="text-[11px] uppercase text-slate-500">Usage</p>
          <p className="mt-1 text-sm text-slate-300">
            {stats?.cars ?? 0} cars · {stats?.bookings ?? 0} bookings · {stats?.customers ?? 0} customers
          </p>
        </div>
      </div>

      {/* Profile */}
      <section className="border border-white/10 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-400">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {['name', 'email', 'agencyName'].map((key) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-1">{key === 'agencyName' ? 'Agency' : key}</label>
              <input
                value={edit[key]}
                onChange={(e) => setEdit((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea
              rows={2}
              value={edit.notes}
              onChange={(e) => setEdit((f) => ({ ...f, notes: e.target.value }))}
              className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy === 'profile'}
          onClick={() =>
            run('profile', async () => {
              const { data } = await axios.patch(`/api/super-admin/admins/${id}`, edit)
              if (!data.success) throw new Error(data.message)
              toast.success('Profile updated')
            })
          }
          className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-sm px-4 py-2 text-white"
        >
          Save profile
        </button>
      </section>

      {/* Account status */}
      <section className="border border-white/10 p-4 sm:p-6 space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-slate-400">Lock / unlock</h2>
        <p className="text-sm text-slate-500">
          Suspend temporarily, disable permanently, or restore access. Does not delete business data.
        </p>
        <div className="flex flex-wrap gap-2">
          {['active', 'suspended', 'disabled'].map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy === `status-${status}` || admin.accountStatus === status}
              onClick={() =>
                run(`status-${status}`, async () => {
                  const { data } = await axios.patch(`/api/super-admin/admins/${id}/status`, { status })
                  if (!data.success) throw new Error(data.message)
                  toast.success(`Account ${status}`)
                })
              }
              className={`text-sm px-4 py-2 border capitalize transition-colors disabled:opacity-40 ${
                admin.accountStatus === status
                  ? 'border-cyan-600/50 text-cyan-400'
                  : 'border-white/15 hover:border-white/30 text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {/* License */}
      <section className="border border-white/10 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-400">License & trial</h2>
        <p className="text-xs text-slate-500">
          Trial ends: {lic.trialEndsAt ? new Date(lic.trialEndsAt).toLocaleString() : '—'}
          {lic.licensedAt ? ` · Licensed: ${new Date(lic.licensedAt).toLocaleString()}` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              run('activate', async () => {
                const { data } = await axios.post(`/api/super-admin/admins/${id}/license`, { action: 'activate' })
                if (!data.success) throw new Error(data.message)
                toast.success('Full license activated')
              })
            }
            className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-sm px-4 py-2 text-white"
          >
            Activate full license
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              run('trial', async () => {
                const { data } = await axios.post(`/api/super-admin/admins/${id}/license`, {
                  action: 'trial',
                  days: extendDays,
                })
                if (!data.success) throw new Error(data.message)
                toast.success('Fresh trial started')
              })
            }
            className="border border-white/15 hover:border-white/30 text-sm px-4 py-2"
          >
            Start / renew trial
          </button>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value) || 7)}
              className="w-16 bg-[#0a0f14] border border-white/10 px-2 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                run('extend', async () => {
                  const { data } = await axios.post(`/api/super-admin/admins/${id}/license`, {
                    action: 'extend',
                    days: extendDays,
                  })
                  if (!data.success) throw new Error(data.message)
                  toast.success(`Extended by ${extendDays} days`)
                })
              }
              className="border border-white/15 hover:border-white/30 text-sm px-4 py-2"
            >
              Extend
            </button>
          </div>
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              run('expire', async () => {
                const { data } = await axios.post(`/api/super-admin/admins/${id}/license`, { action: 'expire' })
                if (!data.success) throw new Error(data.message)
                toast.success('License expired — dashboard locked')
              })
            }
            className="border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-sm px-4 py-2"
          >
            Expire now
          </button>
        </div>
      </section>

      {/* Permissions */}
      <section className="border border-white/10 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-400">Permissions</h2>
        <p className="text-sm text-slate-500">
          Leave all unchecked for full access. Checking any box restricts the admin to those areas only.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {catalog.map((perm) => {
            const checked = permissions.includes(perm)
            return (
              <label
                key={perm}
                className={`flex items-center gap-2 text-sm border px-3 py-2 cursor-pointer ${
                  checked ? 'border-cyan-600/40 text-cyan-300' : 'border-white/10 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setPermissions((prev) =>
                      checked ? prev.filter((p) => p !== perm) : [...prev, perm]
                    )
                  }
                  className="accent-cyan-600"
                />
                {perm}
              </label>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPermissions([])}
            className="text-xs text-slate-400 hover:text-white"
          >
            Clear → full access
          </button>
          <button
            type="button"
            onClick={() => setPermissions([...catalog])}
            className="text-xs text-slate-400 hover:text-white"
          >
            Select all
          </button>
        </div>
        <button
          type="button"
          disabled={busy === 'perms'}
          onClick={() =>
            run('perms', async () => {
              const { data } = await axios.patch(`/api/super-admin/admins/${id}/permissions`, {
                permissions,
              })
              if (!data.success) throw new Error(data.message)
              toast.success('Permissions updated')
            })
          }
          className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-sm px-4 py-2 text-white"
        >
          Save permissions
        </button>
      </section>

      {/* Password */}
      <section className="border border-white/10 p-4 sm:p-6 space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-slate-400">Reset password</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            minLength={8}
            placeholder="New password (min 8)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 min-w-[12rem] bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
          />
          <button
            type="button"
            disabled={busy === 'password' || newPassword.length < 8}
            onClick={() =>
              run('password', async () => {
                const { data } = await axios.post(`/api/super-admin/admins/${id}/password`, {
                  password: newPassword,
                })
                if (!data.success) throw new Error(data.message)
                toast.success('Password reset')
                setNewPassword('')
              })
            }
            className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-sm px-4 py-2 text-white"
          >
            Reset
          </button>
        </div>
      </section>

      {/* Delete / disable */}
      <section className="border border-rose-500/20 p-4 sm:p-6 space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-rose-400/80">Danger zone</h2>
        <p className="text-sm text-slate-500">
          If the admin has cars or bookings, the account is disabled instead of deleted so data stays intact.
        </p>
        <button
          type="button"
          disabled={busy === 'delete'}
          onClick={() => {
            if (!window.confirm(`Delete or disable ${admin.email}?`)) return
            run('delete', async () => {
              const { data } = await axios.delete(`/api/super-admin/admins/${id}`)
              if (!data.success) throw new Error(data.message)
              toast.success(data.message)
              if (!data.softDeleted) navigate('/superadmin/admins')
            })
          }}
          className="border border-rose-500/50 text-rose-300 hover:bg-rose-500/10 text-sm px-4 py-2"
        >
          Delete / disable account
        </button>
      </section>
    </div>
  )
}

export default SuperAdminAdminDetail

import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  agencyName: '',
  notes: '',
  startTrial: true,
}

const tone = (s) => {
  if (s === 'active') return 'text-emerald-400'
  if (s === 'trial') return 'text-cyan-400'
  if (s === 'expired') return 'text-amber-400'
  if (s === 'suspended' || s === 'disabled') return 'text-rose-400'
  return 'text-slate-400'
}

const SuperAdminAdmins = () => {
  const { axios } = useSuperAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [admins, setAdmins] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [license, setLicense] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === '1')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/super-admin/admins', {
        params: { search: debouncedSearch, status, license, page, limit: 20 },
      })
      if (data.success) {
        setAdmins(data.admins)
        setPagination(data.pagination)
      }
    } catch (error) {
      toast.error(saError(error))
    } finally {
      setLoading(false)
    }
  }, [axios, debouncedSearch, status, license])

  useEffect(() => {
    load(1)
  }, [load])

  useEffect(() => {
    if (searchParams.get('create') === '1') setShowCreate(true)
  }, [searchParams])

  const createAdmin = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await axios.post('/api/super-admin/admins', form)
      if (data.success) {
        toast.success('Admin created')
        setForm(emptyForm)
        setShowCreate(false)
        setSearchParams({})
        load(1)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(saError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-white">Admin accounts</h1>
          <p className="mt-1 text-sm text-slate-500">Create, lock, and license every agency admin.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="bg-cyan-700 hover:bg-cyan-600 text-white text-sm px-4 py-2.5 transition-colors"
        >
          {showCreate ? 'Close form' : 'Create admin'}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={createAdmin}
          className="border border-white/10 bg-white/[0.03] p-4 sm:p-6 grid sm:grid-cols-2 gap-4"
        >
          <h2 className="sm:col-span-2 text-sm uppercase tracking-wider text-slate-400">New admin</h2>
          {[
            ['name', 'Full name', 'text'],
            ['email', 'Email', 'email'],
            ['password', 'Temporary password', 'password'],
            ['agencyName', 'Agency name', 'text'],
          ].map(([key, label, type]) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
              <input
                required={key !== 'agencyName'}
                type={type}
                minLength={key === 'password' ? 8 : undefined}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5">Internal notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.startTrial}
              onChange={(e) => setForm((f) => ({ ...f, startTrial: e.target.checked }))}
              className="accent-cyan-600"
            />
            Start 7-day trial immediately
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-white text-sm px-5 py-2.5"
            >
              {saving ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, agency…"
          className="flex-1 min-w-[12rem] bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>
        <select
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          className="bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm"
        >
          <option value="">All licenses</option>
          <option value="trial">Trial</option>
          <option value="active">Licensed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="border border-white/10 overflow-x-auto table-scroll">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full text-sm text-left min-w-[720px]">
            <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Agency</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">License</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="text-white">{admin.name}</p>
                    <p className="text-xs text-slate-500">{admin.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{admin.agencyName || '—'}</td>
                  <td className={`px-4 py-3 capitalize ${tone(admin.accountStatus)}`}>
                    {admin.accountStatus || 'active'}
                  </td>
                  <td className={`px-4 py-3 capitalize ${tone(admin.license?.licenseStatus)}`}>
                    {admin.license?.licenseStatus}
                    {admin.license?.licenseStatus === 'trial' && admin.license?.daysRemaining != null && (
                      <span className="text-slate-500"> · {admin.license.daysRemaining}d left</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/superadmin/admins/${admin._id}`}
                      className="text-cyan-500 hover:text-cyan-400 text-xs"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {!admins.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No admins match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => load(pagination.page - 1)}
            className="disabled:opacity-40 hover:text-white"
          >
            Previous
          </button>
          <span>
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => load(pagination.page + 1)}
            className="disabled:opacity-40 hover:text-white"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default SuperAdminAdmins

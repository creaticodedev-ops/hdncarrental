import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'

const SuperAdminAudit = () => {
  const { axios } = useSuperAdmin()
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/super-admin/audit-logs', {
        params: { search, page, limit: 30 },
      })
      if (data.success) {
        setLogs(data.logs)
        setPagination(data.pagination)
      }
    } catch (error) {
      toast.error(saError(error))
    } finally {
      setLoading(false)
    }
  }, [axios, search])

  useEffect(() => {
    const t = setTimeout(() => load(1), 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-white">Audit logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every important admin and Super Admin action across the platform.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by action or details…"
        className="w-full max-w-md bg-[#0a0f14] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-600/60"
      />

      <div className="border border-white/10 overflow-x-auto table-scroll">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Target admin</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-white/5 align-top">
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-cyan-400/90 text-xs font-mono">{log.action}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {log.actor?.email || '—'}
                    {log.actor?.role === 'superadmin' && (
                      <span className="block text-cyan-600">superadmin</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {log.owner?.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">{log.details || '—'}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No audit entries yet.
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
            className="disabled:opacity-40"
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
            className="disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default SuperAdminAudit

import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'

const SuperAdminActivity = () => {
  const { axios } = useSuperAdmin()
  const [bookings, setBookings] = useState([])
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await axios.get('/api/super-admin/activity')
        if (!cancelled && data.success) {
          setBookings(data.recentBookings || [])
          setCars(data.recentCars || [])
        }
      } catch (error) {
        toast.error(saError(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [axios])

  if (loading) return <p className="text-slate-500 text-sm">Loading activity…</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-white">System activity</h1>
        <p className="mt-1 text-sm text-slate-500">Recent bookings and fleet changes across all admins.</p>
      </div>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Recent bookings</h2>
        <div className="border border-white/10 overflow-x-auto table-scroll">
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Reservation</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">{b.reservationId || b._id?.slice(-6)}</td>
                  <td className="px-4 py-3 text-slate-300">{b.customerName || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {b.owner?.agencyName || b.owner?.name || '—'}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-300">{b.status}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {!bookings.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No bookings yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Recent vehicles</h2>
        <div className="border border-white/10 overflow-x-auto table-scroll">
          <table className="w-full text-sm text-left min-w-[600px]">
            <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Available</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((c) => (
                <tr key={c._id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">
                    {c.brand} {c.model}
                    <span className="text-xs text-slate-500 ml-2">{c.category}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {c.owner?.agencyName || c.owner?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.isAvaliable ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {!cars.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No vehicles yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default SuperAdminActivity

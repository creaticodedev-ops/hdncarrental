import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'

const inputClass =
  'min-h-11 rounded-xl border border-borderColor bg-white px-3.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40'

const statusTone = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  signed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  expired: 'bg-sand/80 text-muted ring-borderColor',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
  none: 'bg-sand/80 text-muted ring-borderColor',
}

const formatDt = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

const carLabel = (car) => {
  if (!car) return '—'
  const plate = car.licensePlate ? ` · ${car.licensePlate}` : ''
  return `${car.brand || ''} ${car.model || ''}${plate}`.trim() || '—'
}

const SignatureRequests = () => {
  const { axios } = useAppContext()
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('active')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 20,
        status: status === 'all' ? undefined : status,
        ...(q.trim() ? { q: q.trim() } : {}),
      }
      const { data } = await axios.get('/api/booking-completion/owner/signature-requests', { params })
      if (!data.success) {
        toast.error(data.message || t('admin.signatureRequests.loadError'))
        return
      }
      setItems(data.requests || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [axios, page, q, status, t])

  useEffect(() => {
    load()
  }, [load])

  const copyLink = async (row) => {
    setBusyId(row._id)
    try {
      const { data } = await axios.post('/api/booking-completion/owner/ensure-link', {
        bookingId: row._id,
      })
      const url = data.shareableCompletionUrl || data.completionUrl
      if (!data.success || !url) {
        toast.error(data.message || t('admin.signatureRequests.actionError'))
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success(t('admin.bookings.linkCopied'))
      load()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  const resend = async (row) => {
    setBusyId(row._id)
    try {
      const { data } = await axios.post('/api/booking-completion/owner/resend-link', {
        bookingId: row._id,
      })
      if (data.completionUrl) {
        try {
          await navigator.clipboard.writeText(data.completionUrl)
        } catch {
          /* ignore */
        }
      }
      toast.success(data.message || t('admin.signatureRequests.resent'))
      load()
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 8000 })
    } finally {
      setBusyId(null)
    }
  }

  const cancel = async (row) => {
    if (!window.confirm(t('admin.signatureRequests.cancelConfirm'))) return
    setBusyId(row._id)
    try {
      const { data } = await axios.post('/api/booking-completion/owner/cancel-link', {
        bookingId: row._id,
      })
      if (!data.success) {
        toast.error(data.message || t('admin.signatureRequests.actionError'))
        return
      }
      toast.success(t('admin.signatureRequests.cancelled'))
      load()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page-pad">
      <Title
        title={t('admin.signatureRequests.title')}
        subTitle={t('admin.signatureRequests.subtitle')}
      />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('admin.signatureRequests.filterStatus')}
          </span>
          <select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
            className={inputClass}
          >
            <option value="active">{t('admin.signatureRequests.statusActive')}</option>
            <option value="all">{t('admin.signatureRequests.statusAll')}</option>
            <option value="pending">{t('admin.signatureRequests.statuses.pending')}</option>
            <option value="signed">{t('admin.signatureRequests.statuses.signed')}</option>
            <option value="expired">{t('admin.signatureRequests.statuses.expired')}</option>
            <option value="cancelled">{t('admin.signatureRequests.statuses.cancelled')}</option>
          </select>
        </label>
        <label className="min-w-[14rem] flex-1 text-sm">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('admin.signatureRequests.search')}
          </span>
          <input
            value={q}
            onChange={(e) => {
              setPage(1)
              setQ(e.target.value)
            }}
            placeholder={t('admin.signatureRequests.searchPlaceholder')}
            className={`w-full ${inputClass}`}
          />
        </label>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-borderColor bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-borderColor bg-sand/40 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('admin.signatureRequests.colReservation')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.signatureRequests.colCustomer')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.signatureRequests.colVehicle')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.signatureRequests.colStatus')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.signatureRequests.colExpires')}</th>
              <th className="px-4 py-3 font-semibold">{t('admin.signatureRequests.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-muted">
                  {t('admin.signatureRequests.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-muted">
                  {t('admin.signatureRequests.empty')}
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const sr = row.signatureRequest || {}
                const rs = sr.requestStatus || 'none'
                return (
                  <tr key={row._id} className="border-b border-borderColor/70 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/owner/manage-bookings?bookingId=${row._id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.reservationId || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      <div>{row.customerName || '—'}</div>
                      <div className="text-xs text-muted">{row.customerEmail || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-ink">{carLabel(row.car)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusTone[rs] || statusTone.none}`}
                      >
                        {t(`admin.signatureRequests.statuses.${rs}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink text-xs">{formatDt(sr.tokenExpiresAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(rs === 'pending' || rs === 'expired' || rs === 'cancelled' || rs === 'none') && (
                          <button
                            type="button"
                            disabled={busyId === row._id}
                            onClick={() => copyLink(row)}
                            className="text-xs font-medium text-primary disabled:opacity-50"
                          >
                            {t('admin.signatureRequests.copyLink')}
                          </button>
                        )}
                        {(rs === 'pending' || rs === 'expired' || rs === 'cancelled') && (
                          <button
                            type="button"
                            disabled={busyId === row._id}
                            onClick={() => resend(row)}
                            className="text-xs font-medium text-amber-800 disabled:opacity-50"
                          >
                            {t('admin.signatureRequests.resend')}
                          </button>
                        )}
                        {rs === 'pending' && (
                          <button
                            type="button"
                            disabled={busyId === row._id}
                            onClick={() => cancel(row)}
                            className="text-xs font-medium text-red-600 disabled:opacity-50"
                          >
                            {t('admin.signatureRequests.cancel')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            {t('admin.signatureRequests.pageOf', {
              page: pagination.page,
              total: pagination.totalPages,
            })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-borderColor px-3 py-1.5 disabled:opacity-40"
            >
              {t('admin.signatureRequests.prev')}
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-borderColor px-3 py-1.5 disabled:opacity-40"
            >
              {t('admin.signatureRequests.next')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SignatureRequests

import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { EmptyState, SkeletonBlock, StatusBadge } from '../../admin/ui'
import { signatureTone } from '../../components/owner/bookings/reservationHelpers'

const formatDt = (v, language) => {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'
  return d.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const carLabel = (car) => {
  if (!car) return '—'
  const plate = car.licensePlate ? ` · ${car.licensePlate}` : ''
  return `${car.brand || ''} ${car.model || ''}${plate}`.trim() || '—'
}

const SignatureRequests = () => {
  const { axios } = useAppContext()
  const { t, language } = useI18n()
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

  const rowActions = (row, rs) => (
    <div className="flex flex-wrap gap-2">
      {(rs === 'pending' || rs === 'expired' || rs === 'cancelled' || rs === 'none') && (
        <button
          type="button"
          disabled={busyId === row._id}
          onClick={() => copyLink(row)}
          className="text-xs font-semibold text-[var(--admin-primary)] disabled:opacity-50"
        >
          {t('admin.signatureRequests.copyLink')}
        </button>
      )}
      {(rs === 'pending' || rs === 'expired' || rs === 'cancelled') && (
        <button
          type="button"
          disabled={busyId === row._id}
          onClick={() => resend(row)}
          className="text-xs font-semibold text-[var(--admin-warn)] disabled:opacity-50"
        >
          {t('admin.signatureRequests.resend')}
        </button>
      )}
      {rs === 'pending' && (
        <button
          type="button"
          disabled={busyId === row._id}
          onClick={() => cancel(row)}
          className="text-xs font-semibold text-[var(--admin-danger)] disabled:opacity-50"
        >
          {t('admin.signatureRequests.cancel')}
        </button>
      )}
    </div>
  )

  return (
    <div className="admin-page-pad min-w-0">
      <Title
        title={t('admin.signatureRequests.title')}
        subTitle={t('admin.signatureRequests.subtitle')}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="text-sm min-w-0">
          <span className="admin-label">{t('admin.signatureRequests.filterStatus')}</span>
          <select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
            className="admin-input"
          >
            <option value="active">{t('admin.signatureRequests.statusActive')}</option>
            <option value="all">{t('admin.signatureRequests.statusAll')}</option>
            <option value="pending">{t('admin.signatureRequests.statuses.pending')}</option>
            <option value="signed">{t('admin.signatureRequests.statuses.signed')}</option>
            <option value="expired">{t('admin.signatureRequests.statuses.expired')}</option>
            <option value="cancelled">{t('admin.signatureRequests.statuses.cancelled')}</option>
          </select>
        </label>
        <label className="min-w-0 flex-1 text-sm">
          <span className="admin-label">{t('admin.signatureRequests.search')}</span>
          <input
            value={q}
            onChange={(e) => {
              setPage(1)
              setQ(e.target.value)
            }}
            placeholder={t('admin.signatureRequests.searchPlaceholder')}
            className="admin-input w-full"
          />
        </label>
      </div>

      <div className="mt-6 space-y-3 lg:hidden">
        {loading ? (
          <SkeletonBlock className="h-28" />
        ) : items.length === 0 ? (
          <EmptyState title={t('admin.signatureRequests.empty')} />
        ) : (
          items.map((row) => {
            const sr = row.signatureRequest || {}
            const rs = sr.requestStatus || 'none'
            return (
              <article key={row._id} className="res-card cursor-default">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/owner/manage-bookings?bookingId=${row._id}`}
                    className="font-semibold text-[var(--admin-primary)]"
                  >
                    {row.reservationId || '—'}
                  </Link>
                  <StatusBadge tone={signatureTone(rs)}>
                    {t(`admin.signatureRequests.statuses.${rs}`)}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--admin-ink)]">{row.customerName || '—'}</p>
                  <p className="text-sm text-[var(--admin-muted)]">{carLabel(row.car)}</p>
                </div>
                <p className="text-xs text-[var(--admin-muted)]">
                  {t('admin.signatureRequests.colExpires')}: {formatDt(sr.tokenExpiresAt, language)}
                </p>
                {rowActions(row, rs)}
                <Link
                  to={`/owner/manage-bookings?bookingId=${row._id}`}
                  className="text-sm font-semibold text-[var(--admin-primary)]"
                >
                  {t('admin.signatureRequests.openReservation')} →
                </Link>
              </article>
            )
          })
        )}
      </div>

      <div className="admin-card mt-6 hidden overflow-hidden lg:block">
        <div className="table-scroll">
          <table className="res-ops-table">
            <thead>
              <tr>
                <th>{t('admin.signatureRequests.colReservation')}</th>
                <th>{t('admin.signatureRequests.colCustomer')}</th>
                <th>{t('admin.signatureRequests.colVehicle')}</th>
                <th>{t('admin.signatureRequests.colStatus')}</th>
                <th>{t('admin.signatureRequests.colExpires')}</th>
                <th>{t('admin.signatureRequests.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-[var(--admin-muted)]">
                    {t('admin.signatureRequests.loading')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-[var(--admin-muted)]">
                    {t('admin.signatureRequests.empty')}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const sr = row.signatureRequest || {}
                  const rs = sr.requestStatus || 'none'
                  return (
                    <tr key={row._id} className="cursor-default">
                      <td>
                        <Link
                          to={`/owner/manage-bookings?bookingId=${row._id}`}
                          className="font-semibold text-[var(--admin-primary)] hover:underline"
                        >
                          {row.reservationId || '—'}
                        </Link>
                      </td>
                      <td>
                        <p className="font-medium text-[var(--admin-ink)]">{row.customerName || '—'}</p>
                        <p className="text-[11px] text-[var(--admin-muted)]">{row.customerEmail || ''}</p>
                      </td>
                      <td>{carLabel(row.car)}</td>
                      <td>
                        <StatusBadge tone={signatureTone(rs)}>
                          {t(`admin.signatureRequests.statuses.${rs}`)}
                        </StatusBadge>
                      </td>
                      <td className="text-xs text-[var(--admin-muted)]">{formatDt(sr.tokenExpiresAt, language)}</td>
                      <td>{rowActions(row, rs)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--admin-muted)]">
          <span>
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
              className="admin-btn admin-btn-secondary admin-btn-sm disabled:opacity-40"
            >
              {t('admin.signatureRequests.prev')}
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="admin-btn admin-btn-secondary admin-btn-sm disabled:opacity-40"
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

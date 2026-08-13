import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import ConfirmDialog from '../../components/owner/ConfirmDialog'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'

const inputClass =
  'w-full min-h-11 rounded-xl border border-borderColor bg-white px-3.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40'
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted'

const StatusBadge = ({ status, t }) => {
  const active = status === 'active'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-sand/80 text-muted ring-1 ring-borderColor'
      }`}
    >
      {active ? t('admin.directory.statusActive') : t('admin.directory.statusInactive')}
    </span>
  )
}

/**
 * Shared list + create/edit drawer for Chauffeur / Samsar / PartnerCompany.
 * Configured via `config` from thin page wrappers.
 */
const DirectoryCrudPage = ({ config }) => {
  const { axios } = useAppContext()
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('-createdAt')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => config.emptyForm())
  const [saving, setSaving] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 20,
        sort,
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(status !== 'all' ? { status } : {}),
      }
      const { data } = await axios.get(config.listPath, { params })
      if (!data.success) {
        toast.error(data.message || t('admin.directory.loadError'))
        return
      }
      setItems(data[config.listKey] || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [axios, config.listKey, config.listPath, page, q, sort, status, t])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(config.emptyForm())
    setDrawerOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm(config.toForm(row))
    setDrawerOpen(true)
  }

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const onSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = config.toPayload(form)
      const { data } = editing
        ? await axios.put(`${config.listPath}/${editing._id}`, payload)
        : await axios.post(config.listPath, payload)
      if (!data.success) {
        toast.error(data.message || t('admin.directory.saveError'))
        return
      }
      toast.success(editing ? t('admin.directory.updated') : t('admin.directory.created'))
      setDrawerOpen(false)
      setEditing(null)
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const confirmToggleStatus = async () => {
    if (!pendingStatus) return
    const { row, next } = pendingStatus
    setPendingStatus(null)
    try {
      const { data } = await axios.patch(`${config.listPath}/${row._id}/status`, { status: next })
      if (!data.success) {
        toast.error(data.message || t('admin.directory.saveError'))
        return
      }
      toast.success(t('admin.directory.statusUpdated'))
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const columns = useMemo(() => config.columns(t), [config, t])

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-16 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Title title={t(config.titleKey)} subTitle={t(config.subtitleKey)} />
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dull"
        >
          {t(config.createKey)}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-borderColor/70 bg-white p-3 sm:flex-row sm:items-center sm:p-4">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
          placeholder={t('admin.directory.searchPlaceholder')}
          className={`${inputClass} sm:max-w-xs`}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
          className={`${inputClass} sm:max-w-[10rem]`}
        >
          <option value="all">{t('admin.directory.filterAll')}</option>
          <option value="active">{t('admin.directory.statusActive')}</option>
          <option value="inactive">{t('admin.directory.statusInactive')}</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={`${inputClass} sm:max-w-[12rem]`}
        >
          <option value="-createdAt">{t('admin.directory.sortNewest')}</option>
          <option value="createdAt">{t('admin.directory.sortOldest')}</option>
          <option value="name">{t('admin.directory.sortNameAsc')}</option>
          <option value="-name">{t('admin.directory.sortNameDesc')}</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-borderColor/70 bg-white">
        {loading ? (
          <div className="space-y-3 p-5 animate-pulse" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-sand/70" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-display text-xl text-ink">{t('admin.directory.emptyTitle')}</p>
            <p className="mt-2 text-sm text-muted">{t('admin.directory.emptyHint')}</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dull"
            >
              {t(config.createKey)}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-borderColor/70 bg-sand/40 text-[11px] uppercase tracking-[0.12em] text-muted">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 font-semibold whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold">{t('admin.directory.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row._id} className="border-b border-borderColor/50 last:border-0 hover:bg-sand/30">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 align-middle text-ink/90">
                        {col.render ? col.render(row, t) : row[col.key] || '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-lg border border-borderColor px-3 py-1.5 text-xs font-semibold hover:bg-light"
                        >
                          {t('admin.directory.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingStatus({
                              row,
                              next: row.status === 'active' ? 'inactive' : 'active',
                            })
                          }
                          className="rounded-lg border border-borderColor px-3 py-1.5 text-xs font-semibold hover:bg-light"
                        >
                          {row.status === 'active'
                            ? t('admin.directory.deactivate')
                            : t('admin.directory.activate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-borderColor/70 px-4 py-3 text-sm">
            <p className="text-muted">
              {t('admin.directory.pageOf', {
                page: pagination.page,
                total: pagination.totalPages,
                count: pagination.total,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-borderColor px-3 py-1.5 disabled:opacity-40"
              >
                {t('admin.directory.prev')}
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-borderColor px-3 py-1.5 disabled:opacity-40"
              >
                {t('admin.directory.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-ink/40">
          <button type="button" className="flex-1 cursor-default" aria-label="Close" onClick={() => setDrawerOpen(false)} />
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="border-b border-borderColor px-5 py-4">
              <h3 className="font-display text-2xl text-ink">
                {editing ? t(config.editKey) : t(config.createKey)}
              </h3>
            </div>
            <form onSubmit={onSave} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {config.fields.map((field) => (
                  <div key={field.name}>
                    <label htmlFor={`dir-${field.name}`} className={labelClass}>
                      {t(field.labelKey)}
                      {field.required ? ' *' : ''}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`dir-${field.name}`}
                        rows={3}
                        className={inputClass}
                        value={form[field.name] ?? ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                        required={field.required}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        id={`dir-${field.name}`}
                        className={inputClass}
                        value={form[field.name] ?? ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`dir-${field.name}`}
                        type={field.type || 'text'}
                        className={inputClass}
                        value={form[field.name] ?? ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                        required={field.required}
                        min={field.min}
                        step={field.step}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-borderColor px-5 py-4">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="min-h-11 flex-1 rounded-xl border border-borderColor text-sm font-semibold"
                >
                  {t('admin.directory.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary-dull disabled:opacity-60"
                >
                  {saving ? t('admin.directory.saving') : t('admin.directory.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingStatus)}
        title={t('admin.directory.confirmStatusTitle')}
        message={
          pendingStatus?.next === 'inactive'
            ? t('admin.directory.confirmDeactivate')
            : t('admin.directory.confirmActivate')
        }
        confirmText={t('admin.directory.confirm')}
        cancelText={t('admin.directory.cancel')}
        variant={pendingStatus?.next === 'inactive' ? 'danger' : 'primary'}
        onCancel={() => setPendingStatus(null)}
        onConfirm={confirmToggleStatus}
      />
    </div>
  )
}

export { StatusBadge }
export default DirectoryCrudPage

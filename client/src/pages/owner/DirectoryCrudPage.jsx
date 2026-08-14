import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Title from '../../components/owner/Title'
import ConfirmDialog from '../../components/owner/ConfirmDialog'
import PhoneInput from '../../components/PhoneInput'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import {
  AdminDrawer,
  AdminSwitch,
  CurrencyInput,
  DrawerSection,
  EmptyState,
  FormField,
  PercentInput,
  SegmentedControl,
  SkeletonBlock,
  StatusBadge as ToneBadge,
} from '../../admin/ui'

const inputClass = 'admin-input'

const StatusBadge = ({ status, t }) => (
  <ToneBadge tone={status === 'active' ? 'success' : 'neutral'}>
    {status === 'active' ? t('admin.directory.statusActive') : t('admin.directory.statusInactive')}
  </ToneBadge>
)

const FieldControl = ({ field, form, setField, t, currency }) => {
  const id = `dir-${field.name}`
  const value = form[field.name] ?? ''
  const span = field.span === 2 ? 'sm:col-span-2' : ''

  if (field.control === 'switch') {
    return (
      <AdminSwitch
        checked={value === 'active' || value === true}
        onChange={(on) => setField(field.name, field.type === 'select' ? (on ? 'active' : 'inactive') : on)}
        label={t(field.labelKey)}
        description={field.hintKey ? t(field.hintKey) : undefined}
      />
    )
  }

  if (field.control === 'segmented') {
    return (
      <FormField label={t(field.labelKey)} htmlFor={id} className={span} required={field.required}>
        <SegmentedControl
          ariaLabel={t(field.labelKey)}
          value={value}
          onChange={(v) => setField(field.name, v)}
          options={(field.options || []).map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
        />
      </FormField>
    )
  }

  if (field.control === 'phone' || field.type === 'tel') {
    return (
      <FormField label={t(field.labelKey)} htmlFor={id} className={span} required={field.required}>
        <PhoneInput
          id={id}
          value={value}
          onChange={(phone) => setField(field.name, phone)}
          required={field.required}
          inputClassName="admin-input min-h-11 h-auto"
        />
      </FormField>
    )
  }

  if (field.control === 'commission') {
    const percent = form.commissionType === 'percent'
    return (
      <FormField
        label={t(field.labelKey)}
        htmlFor={id}
        className={span}
        required={field.required}
        hint={t(percent ? 'admin.directory.commissionHintPercent' : 'admin.directory.commissionHintFixed')}
      >
        {percent ? (
          <PercentInput id={id} value={value} onChange={(v) => setField(field.name, v)} required={field.required} />
        ) : (
          <CurrencyInput
            id={id}
            currency={currency}
            value={value}
            onChange={(v) => setField(field.name, v)}
            required={field.required}
          />
        )}
      </FormField>
    )
  }

  if (field.control === 'currency') {
    return (
      <FormField
        label={t(field.labelKey)}
        htmlFor={id}
        className={span}
        required={field.required}
        hint={field.hintKey ? t(field.hintKey) : undefined}
      >
        <CurrencyInput
          id={id}
          currency={currency}
          value={value}
          onChange={(v) => setField(field.name, v)}
          required={field.required}
        />
      </FormField>
    )
  }

  return (
    <FormField
      label={t(field.labelKey)}
      htmlFor={id}
      className={span}
      required={field.required}
      hint={field.hintKey ? t(field.hintKey) : undefined}
    >
      {field.type === 'textarea' ? (
        <textarea
          id={id}
          rows={3}
          className={inputClass}
          value={value}
          onChange={(e) => setField(field.name, e.target.value)}
          required={field.required}
        />
      ) : field.type === 'select' ? (
        <select
          id={id}
          className={inputClass}
          value={value}
          onChange={(e) => setField(field.name, e.target.value)}
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.type || 'text'}
          className={inputClass}
          value={value}
          onChange={(e) => setField(field.name, e.target.value)}
          required={field.required}
          min={field.min}
          step={field.step}
        />
      )}
    </FormField>
  )
}

/**
 * Shared list + create/edit drawer for Chauffeur / Samsar / PartnerCompany.
 * Configured via `config` from thin page wrappers.
 */
const DirectoryCrudPage = ({ config }) => {
  const { axios, currency } = useAppContext()
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
  const [dirty, setDirty] = useState(false)
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
    setDirty(false)
    setDrawerOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm(config.toForm(row))
    setDirty(false)
    setDrawerOpen(true)
  }

  const setField = (key, value) => {
    setDirty(true)
    setForm((f) => ({ ...f, [key]: value }))
  }

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
      setDirty(false)
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
    <div className="admin-page-pad flex-1 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-2">
        <Title title={t(config.titleKey)} subTitle={t(config.subtitleKey)} />
        <button
          type="button"
          onClick={openCreate}
          className="admin-btn admin-btn-primary"
        >
          {t(config.createKey)}
        </button>
      </div>

      <div className="mt-6 admin-filter-bar">
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

      <div className="mt-4 admin-table-wrap">
        {loading ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('admin.directory.emptyTitle')}
            description={t('admin.directory.emptyHint')}
            action={
              <button type="button" onClick={openCreate} className="admin-btn admin-btn-primary">
                {t(config.createKey)}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-full">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>{t('admin.directory.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row._id}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row, t) : row[col.key] || '—'}
                      </td>
                    ))}
                    <td className="whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openEdit(row)} className="admin-btn admin-btn-secondary min-h-9 px-3 text-xs">
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
                          className="admin-btn admin-btn-ghost min-h-9 px-3 text-xs"
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
          <div className="flex items-center justify-between gap-3 border-t border-[var(--admin-border)] px-4 py-3 text-sm">
            <p className="text-[var(--admin-muted)]">
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
                className="admin-btn admin-btn-secondary min-h-9 px-3 text-xs"
              >
                {t('admin.directory.prev')}
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="admin-btn admin-btn-secondary min-h-9 px-3 text-xs"
              >
                {t('admin.directory.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      <AdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? t(config.editKey) : t(config.createKey)}
        description={editing ? t('admin.directory.editHint') : t('admin.directory.createHint')}
        dirty={dirty}
        unsavedTitle={t('admin.ui.unsavedTitle')}
        unsavedMessage={t('admin.ui.unsavedMessage')}
        discardLabel={t('admin.ui.discard')}
        keepEditingLabel={t('admin.ui.keepEditing')}
        closeLabel={t('admin.ui.close')}
        footer={
          <>
            <button type="button" onClick={() => setDrawerOpen(false)} className="admin-btn admin-btn-secondary">
              {t('admin.directory.cancel')}
            </button>
            <button type="submit" form="directory-crud-form" disabled={saving} className="admin-btn admin-btn-primary">
              {saving ? t('admin.directory.saving') : t('admin.directory.save')}
            </button>
          </>
        }
      >
        <form id="directory-crud-form" onSubmit={onSave} className="space-y-6">
          {(config.sections || [{ titleKey: null, fields: config.fields.map((f) => f.name) }]).map((section, idx) => {
            const fields = (section.fields || [])
              .map((name) => config.fields.find((f) => f.name === name))
              .filter(Boolean)
            return (
              <DrawerSection key={section.titleKey || idx} title={section.titleKey ? t(section.titleKey) : undefined} description={section.hintKey ? t(section.hintKey) : undefined}>
                {fields.map((field) => (
                  <FieldControl
                    key={field.name}
                    field={field}
                    form={form}
                    setField={setField}
                    t={t}
                    currency={currency}
                  />
                ))}
              </DrawerSection>
            )
          })}
        </form>
      </AdminDrawer>

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

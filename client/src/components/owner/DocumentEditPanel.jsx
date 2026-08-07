import React from 'react'

const inputClass = 'border border-borderColor px-3 py-2 rounded-lg w-full text-sm'
const labelClass = 'text-xs font-medium text-gray-600'
const textareaClass = 'border border-borderColor px-3 py-2 rounded-lg w-full text-sm font-mono min-h-[120px]'

/**
 * Shared editor for persistent document instances (contracts / invoices).
 * Tabs: fields (caller-rendered), sections HTML, version history.
 */
const DocumentEditPanel = ({
  title,
  tabsLabel,
  open,
  onClose,
  activeTab,
  setActiveTab,
  saving,
  onSave,
  onSaveAndRegenerate,
  onRegenerate,
  onRefreshFromSource,
  versions = [],
  versionsLoading,
  onRestoreVersion,
  fieldsContent,
  sections,
  setSections,
  t,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-borderColor bg-white shadow-xl flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-borderColor px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('admin.documents.editHint')}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">✕</button>
        </div>

        <div className="flex gap-2 border-b border-borderColor px-5 pt-3">
          {['fields', 'sections', 'history'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t(`admin.documents.tab.${tab}`)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'fields' && fieldsContent}

          {activeTab === 'sections' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">{t('admin.documents.sectionsHint')}</p>
              {[
                { key: 'headerHtml', label: t('admin.documents.header') },
                { key: 'bodyHtml', label: t('admin.documents.body') },
                { key: 'termsHtml', label: t('admin.documents.terms') },
                { key: 'footerHtml', label: t('admin.documents.footer') },
                { key: 'customCss', label: t('admin.documents.css') },
                { key: 'logoUrl', label: t('admin.documents.logoUrl') },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className={labelClass}>{label}</label>
                    <button
                      type="button"
                      className="text-[11px] text-red-700"
                      onClick={() => setSections((s) => ({ ...s, [key]: '' }))}
                    >
                      {t('admin.documents.clearSection')}
                    </button>
                  </div>
                  {key === 'logoUrl' ? (
                    <input
                      className={inputClass}
                      value={sections?.[key] || ''}
                      onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.value }))}
                    />
                  ) : (
                    <textarea
                      className={textareaClass}
                      value={sections?.[key] || ''}
                      onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              <div className="space-y-1 max-w-xs">
                <label className={labelClass}>{t('admin.documents.pageSize')}</label>
                <select
                  className={inputClass}
                  value={sections?.pageSize || 'A4'}
                  onChange={(e) => setSections((s) => ({ ...s, pageSize: e.target.value }))}
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {versionsLoading ? (
                <p className="text-sm text-gray-500">{t('admin.common.loading')}</p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-gray-500">{t('admin.documents.noVersions')}</p>
              ) : (
                <ul className="divide-y divide-borderColor rounded-xl border border-borderColor">
                  {versions.map((v) => (
                    <li key={v._id || v.version} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">v{v.version} · {v.note}</p>
                        <p className="text-xs text-gray-500">
                          {v.createdAt ? new Date(v.createdAt).toLocaleString() : '—'}
                          {v.createdBy?.name ? ` · ${v.createdBy.name}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestoreVersion(v.version)}
                        className="text-xs font-medium text-primary"
                      >
                        {t('admin.documents.restore')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-borderColor px-5 py-3 bg-light/40">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-borderColor text-sm">
            {t('admin.common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onRegenerate}
            className="px-4 py-2 rounded-xl border border-borderColor text-sm disabled:opacity-60"
          >
            {t('admin.documents.regeneratePdf')}
          </button>
          {onRefreshFromSource && (
            <button
              type="button"
              disabled={saving}
              onClick={onRefreshFromSource}
              className="px-4 py-2 rounded-xl border border-amber-300 text-amber-800 text-sm disabled:opacity-60"
            >
              {t('admin.documents.refreshFromBooking')}
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="px-4 py-2 rounded-xl border border-primary text-primary text-sm disabled:opacity-60"
          >
            {saving ? t('admin.invoices.saving') : t('admin.common.save')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSaveAndRegenerate}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-60"
          >
            {saving ? t('admin.invoices.saving') : t('admin.documents.saveAndRegenerate')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocumentEditPanel
export { inputClass, labelClass, textareaClass }

import React from 'react'
import DocumentGenerationOverlay from '../DocumentGenerationOverlay'
import { AdminDrawer } from '../../admin/ui'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const textareaClass = 'admin-input font-mono min-h-[7rem] resize-y'

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
  generation = null,
}) => {
  const busy = Boolean(saving || generation?.running)

  return (
    <>
      {generation?.open && (
        <DocumentGenerationOverlay
          open={generation.open}
          status={generation.status}
          mode={generation.mode}
          error={generation.error}
          pdfUrl={generation.pdfUrl}
          onRetry={generation.onRetry}
          onDismiss={generation.onDismiss}
          autoDismissMs={generation.status === 'success' ? 850 : 0}
          embedPdf={generation.status === 'success' && Boolean(generation.pdfUrl)}
        />
      )}
      <AdminDrawer
        open={open}
        onClose={() => !busy && onClose?.()}
        title={title}
        description={t('admin.documents.editHint')}
        size="xl"
        closeLabel={t('admin.common.cancel')}
        footer={
          <>
            <button type="button" disabled={busy} onClick={onClose} className="admin-btn admin-btn-secondary">
              {t('admin.common.cancel')}
            </button>
            <button type="button" disabled={busy} onClick={onRegenerate} className="admin-btn admin-btn-ghost">
              {t('admin.documents.regeneratePdf')}
            </button>
            {onRefreshFromSource && (
              <button type="button" disabled={busy} onClick={onRefreshFromSource} className="admin-btn admin-btn-ghost">
                {t('admin.documents.refreshFromBooking')}
              </button>
            )}
            <button type="button" disabled={busy} onClick={onSave} className="admin-btn admin-btn-secondary">
              {busy ? t('admin.invoices.saving') : t('admin.common.save')}
            </button>
            <button type="button" disabled={busy} onClick={onSaveAndRegenerate} className="admin-btn admin-btn-primary">
              {busy ? t('admin.invoices.saving') : t('admin.documents.saveAndRegenerate')}
            </button>
          </>
        }
      >

        <div className="flex gap-2 border-b border-[var(--admin-border)] -mx-1 mb-4">
          {['fields', 'sections', 'history'].map((tab) => (
            <button
              key={tab}
              type="button"
              disabled={busy}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px disabled:opacity-50 ${
                activeTab === tab
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t(`admin.documents.tab.${tab}`)}
            </button>
          ))}
        </div>

        {/* Keep current document visible under the generation overlay */}
        <div className={`${busy ? 'pointer-events-none select-none' : ''}`}>
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
                        disabled={busy}
                        onClick={() => onRestoreVersion(v.version)}
                        className="text-xs font-medium text-primary disabled:opacity-50"
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
      </AdminDrawer>
    </>
  )
}

export default DocumentEditPanel
export { inputClass, labelClass, textareaClass }

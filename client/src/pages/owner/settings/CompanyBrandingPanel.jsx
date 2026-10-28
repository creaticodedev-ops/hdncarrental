import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../../utils/apiError'
import { Field, SettingsCard, StatusPill, settingsUi } from './settingsUi'

const emptyProfile = {
  name: 'HDN CAR',
  addressLine1: 'AB IBN BATTOUTA, QUARTIER AZIB DERAI',
  addressLine2: 'SAFI, MAROC',
  address: 'AB IBN BATTOUTA, QUARTIER AZIB DERAI, SAFI, MAROC',
  phone: '+212 661 865 184',
  email: 'haddanecar@gmail.com',
  ice: '003790056000093',
  if: '68379943',
  rc: '16263',
  accentColor: '#8F1F1F',
  paymentInstructions: '',
  invoiceFooter: '',
  logoUrl: '',
  stampUrl: '',
  signatureUrl: '',
  combinedStampSignatureUrl: '',
}

const ASSET_KINDS = [
  { kind: 'logo', field: 'logoUrl', labelKey: 'logo' },
  { kind: 'stamp', field: 'stampUrl', labelKey: 'stamp' },
  { kind: 'signature', field: 'signatureUrl', labelKey: 'signature' },
  { kind: 'combined', field: 'combinedStampSignatureUrl', labelKey: 'combined' },
]

const CompanyBrandingPanel = ({ axios, initial, t, onSaved }) => {
  const [form, setForm] = useState(() => ({ ...emptyProfile, ...(initial || {}) }))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    setForm({ ...emptyProfile, ...(initial || {}) })
  }, [initial])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await axios.put('/api/owner/settings', {
        companyProfile: {
          ...form,
          address: [form.addressLine1, form.addressLine2].filter(Boolean).join(', ') || form.address,
        },
      })
      if (!data.success) throw new Error(data.message || 'Save failed')
      const saved = data.settings?.companyProfile || form
      setForm({ ...emptyProfile, ...saved })
      onSaved?.(saved)
      toast.success(t('admin.settings.brandingSaved'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const uploadAsset = async (kind, file) => {
    if (!file) return
    setUploading(kind)
    try {
      const body = new FormData()
      body.append('file', file)
      const { data } = await axios.post(`/api/owner/settings/company-assets/${kind}`, body)
      if (!data.success) throw new Error(data.message || 'Upload failed')
      const saved = data.companyProfile || form
      setForm({ ...emptyProfile, ...saved })
      onSaved?.(saved)
      toast.success(t('admin.settings.brandingAssetUploaded'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setUploading('')
    }
  }

  const clearAsset = async (kind) => {
    setUploading(kind)
    try {
      const { data } = await axios.delete(`/api/owner/settings/company-assets/${kind}`)
      if (!data.success) throw new Error(data.message || 'Remove failed')
      const saved = data.companyProfile || form
      setForm({ ...emptyProfile, ...saved })
      onSaved?.(saved)
      toast.success(t('admin.settings.brandingAssetRemoved'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setUploading('')
    }
  }

  return (
    <div className="space-y-5">
      <SettingsCard
        soft
        eyebrow={t('admin.settings.tabBranding')}
        title={t('admin.settings.brandingTitle')}
        description={t('admin.settings.brandingHint')}
        action={<StatusPill tone="info">{t('admin.settings.brandingLegal')}</StatusPill>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('admin.settings.brandingName')}>
            <input className={settingsUi.input} value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.brandingAccent')}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accentColor || '#8F1F1F'}
                onChange={(e) => setField('accentColor', e.target.value)}
                className="h-11 w-14 rounded-xl border border-borderColor bg-white p-1"
              />
              <input className={settingsUi.input} value={form.accentColor} onChange={(e) => setField('accentColor', e.target.value)} />
            </div>
          </Field>
          <Field label={t('admin.settings.brandingAddress1')} className="sm:col-span-2">
            <input className={settingsUi.input} value={form.addressLine1} onChange={(e) => setField('addressLine1', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.brandingAddress2')} className="sm:col-span-2">
            <input className={settingsUi.input} value={form.addressLine2} onChange={(e) => setField('addressLine2', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.brandingPhone')}>
            <input className={settingsUi.input} value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.brandingEmail')}>
            <input className={settingsUi.input} type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          </Field>
          <Field label="ICE">
            <input className={settingsUi.input} value={form.ice} onChange={(e) => setField('ice', e.target.value)} />
          </Field>
          <Field label="IF">
            <input className={settingsUi.input} value={form.if} onChange={(e) => setField('if', e.target.value)} />
          </Field>
          <Field label="RC">
            <input className={settingsUi.input} value={form.rc} onChange={(e) => setField('rc', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.brandingPaymentInstructions')} className="sm:col-span-2">
            <textarea
              className={settingsUi.textarea}
              value={form.paymentInstructions}
              onChange={(e) => setField('paymentInstructions', e.target.value)}
              placeholder={t('admin.settings.brandingPaymentPlaceholder')}
            />
          </Field>
          <Field label={t('admin.settings.brandingFooter')} className="sm:col-span-2">
            <textarea
              className={settingsUi.textarea}
              value={form.invoiceFooter}
              onChange={(e) => setField('invoiceFooter', e.target.value)}
              placeholder={t('admin.settings.brandingFooterPlaceholder')}
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t('admin.settings.brandingAssetsTitle')}
        description={t('admin.settings.brandingAssetsHint')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ASSET_KINDS.map(({ kind, field, labelKey }) => (
            <div key={kind} className="rounded-2xl border border-borderColor/70 bg-white/90 p-4">
              <p className={settingsUi.sectionLabel}>{t(`admin.settings.brandingAsset.${labelKey}`)}</p>
              <div className="mt-3 flex min-h-[6.5rem] items-center justify-center rounded-xl bg-sand/40 p-3">
                {form[field] ? (
                  <img src={form[field]} alt="" className="max-h-24 max-w-full object-contain" />
                ) : (
                  <p className="text-xs text-muted text-center px-4">{t('admin.settings.brandingAssetEmpty')}</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className={`${settingsUi.btnSecondary} cursor-pointer`}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    disabled={Boolean(uploading)}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      uploadAsset(kind, file)
                    }}
                  />
                  {uploading === kind ? t('admin.settings.brandingUploading') : t('admin.settings.brandingUpload')}
                </label>
                {form[field] ? (
                  <button
                    type="button"
                    className={settingsUi.btnGhost}
                    disabled={Boolean(uploading)}
                    onClick={() => clearAsset(kind)}
                  >
                    {t('admin.settings.brandingRemove')}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <div className={settingsUi.stickyBar}>
        <button type="button" className={settingsUi.btnPrimary} disabled={saving} onClick={save}>
          {saving ? t('admin.common.saving') : t('admin.settings.brandingSave')}
        </button>
      </div>
    </div>
  )
}

export default CompanyBrandingPanel

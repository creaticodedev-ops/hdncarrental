import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../../utils/apiError'

const DEFAULTS = {
  minRentalDays: 1,
  maxRentalDays: 90,
  advanceBookingDays: 365,
  cancellationPolicyText: '',
  cancellationFeeType: 'none',
  cancellationFeeValue: 0,
  securityDepositDefault: 0,
  extraDriverAllowed: true,
  extraDriverFeePerDay: 0,
  mileageMode: 'unlimited',
  mileageLimitKmPerDay: 250,
  pickupHoursStart: '08:00',
  pickupHoursEnd: '20:00',
  returnHoursStart: '08:00',
  returnHoursEnd: '20:00',
  pendingReservationExpiryHours: 48,
}

const BookingSettingsPanel = ({ axios, initial, t, inputClass }) => {
  const [form, setForm] = useState({ ...DEFAULTS, ...(initial || {}) })
  const [saving, setSaving] = useState(false)

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const onSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await axios.put('/api/owner/settings', { bookingSettings: form })
      if (!data.success) {
        toast.error(data.message || t('admin.settings.saveError'))
        return
      }
      toast.success(t('admin.settings.saved'))
      if (data.settings?.bookingSettings) {
        setForm({ ...DEFAULTS, ...data.settings.bookingSettings })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, children, hint }) => (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      {children}
      {hint ? <p className="text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  )

  return (
    <form onSubmit={onSave} className="space-y-5 max-w-3xl">
      <section className="rounded-xl border border-borderColor bg-white p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            {t('admin.settings.bookingSection')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{t('admin.settings.bookingHint')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('admin.settings.minRentalDays')}>
            <input type="number" min={1} className={inputClass} value={form.minRentalDays}
              onChange={(e) => set('minRentalDays', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.maxRentalDays')}>
            <input type="number" min={1} className={inputClass} value={form.maxRentalDays}
              onChange={(e) => set('maxRentalDays', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.advanceBookingDays')} hint={t('admin.settings.advanceBookingHint')}>
            <input type="number" min={1} className={inputClass} value={form.advanceBookingDays}
              onChange={(e) => set('advanceBookingDays', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.pendingExpiryHours')} hint={t('admin.settings.pendingExpiryHint')}>
            <input type="number" min={0} className={inputClass} value={form.pendingReservationExpiryHours}
              onChange={(e) => set('pendingReservationExpiryHours', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-borderColor bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          {t('admin.settings.cancellationSection')}
        </h2>
        <Field label={t('admin.settings.cancellationPolicy')}>
          <textarea
            rows={4}
            className={inputClass}
            value={form.cancellationPolicyText}
            onChange={(e) => set('cancellationPolicyText', e.target.value)}
            placeholder={t('admin.settings.cancellationPolicyPlaceholder')}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('admin.settings.cancellationFeeType')}>
            <select className={inputClass} value={form.cancellationFeeType}
              onChange={(e) => set('cancellationFeeType', e.target.value)}>
              <option value="none">{t('admin.settings.feeNone')}</option>
              <option value="fixed">{t('admin.settings.feeFixed')}</option>
              <option value="percent">{t('admin.settings.feePercent')}</option>
            </select>
          </Field>
          <Field label={t('admin.settings.cancellationFeeValue')}>
            <input type="number" min={0} step="0.01" className={inputClass}
              value={form.cancellationFeeValue}
              disabled={form.cancellationFeeType === 'none'}
              onChange={(e) => set('cancellationFeeValue', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-borderColor bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          {t('admin.settings.depositExtrasSection')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('admin.settings.securityDepositDefault')} hint={t('admin.settings.securityDepositHint')}>
            <input type="number" min={0} step="0.01" className={inputClass}
              value={form.securityDepositDefault}
              onChange={(e) => set('securityDepositDefault', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.extraDriverFee')}>
            <input type="number" min={0} step="0.01" className={inputClass}
              value={form.extraDriverFeePerDay}
              onChange={(e) => set('extraDriverFeePerDay', e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(form.extraDriverAllowed)}
            onChange={(e) => set('extraDriverAllowed', e.target.checked)}
          />
          {t('admin.settings.extraDriverAllowed')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('admin.settings.mileageMode')}>
            <select className={inputClass} value={form.mileageMode}
              onChange={(e) => set('mileageMode', e.target.value)}>
              <option value="unlimited">{t('admin.settings.mileageUnlimited')}</option>
              <option value="limited">{t('admin.settings.mileageLimited')}</option>
            </select>
          </Field>
          <Field label={t('admin.settings.mileageLimit')}>
            <input type="number" min={0} className={inputClass}
              disabled={form.mileageMode !== 'limited'}
              value={form.mileageLimitKmPerDay}
              onChange={(e) => set('mileageLimitKmPerDay', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-borderColor bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          {t('admin.settings.hoursSection')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label={t('admin.settings.pickupHoursStart')}>
            <input type="time" className={inputClass} value={form.pickupHoursStart}
              onChange={(e) => set('pickupHoursStart', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.pickupHoursEnd')}>
            <input type="time" className={inputClass} value={form.pickupHoursEnd}
              onChange={(e) => set('pickupHoursEnd', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.returnHoursStart')}>
            <input type="time" className={inputClass} value={form.returnHoursStart}
              onChange={(e) => set('returnHoursStart', e.target.value)} />
          </Field>
          <Field label={t('admin.settings.returnHoursEnd')}>
            <input type="time" className={inputClass} value={form.returnHoursEnd}
              onChange={(e) => set('returnHoursEnd', e.target.value)} />
          </Field>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60"
      >
        {saving ? t('admin.settings.saving') : t('admin.settings.saveBooking')}
      </button>
    </form>
  )
}

export default BookingSettingsPanel

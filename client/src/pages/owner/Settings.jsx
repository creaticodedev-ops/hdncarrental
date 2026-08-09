import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import PhoneInput, { isPhoneValid } from '../../components/PhoneInput'
import BookingSettingsPanel from './settings/BookingSettingsPanel'
import PromotionsPanel from './settings/PromotionsPanel'

const emptyWhatsApp = {
  whatsappReservationNumber: '',
  whatsappConfirmationNumber: '',
}

const Settings = () => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [tab, setTab] = useState('booking')
  const [form, setForm] = useState(emptyWhatsApp)
  const [effective, setEffective] = useState({ reservationDial: '', confirmationDial: '' })
  const [bookingSettings, setBookingSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/owner/settings')
      if (!data.success) {
        toast.error(data.message || t('admin.settings.loadError'))
        return
      }
      const s = data.settings || {}
      setForm({
        whatsappReservationNumber: s.whatsappReservationNumber || '',
        whatsappConfirmationNumber: s.whatsappConfirmationNumber || '',
      })
      setEffective({
        reservationDial: s.effective?.reservationDial || '',
        confirmationDial: s.effective?.confirmationDial || '',
      })
      setBookingSettings(s.bookingSettings || null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [axios])

  const validateOptionalPhone = (value, label) => {
    const trimmed = String(value || '').trim()
    if (!trimmed) return true
    if (!isPhoneValid(trimmed)) {
      toast.error(t('admin.settings.invalidPhone', { field: label }))
      return false
    }
    return true
  }

  const onSaveWhatsApp = async (e) => {
    e.preventDefault()
    if (!validateOptionalPhone(form.whatsappReservationNumber, t('admin.settings.reservationNumber'))) return
    if (!validateOptionalPhone(form.whatsappConfirmationNumber, t('admin.settings.confirmationNumber'))) return

    setSaving(true)
    try {
      const { data } = await axios.put('/api/owner/settings', {
        whatsappReservationNumber: form.whatsappReservationNumber,
        whatsappConfirmationNumber: form.whatsappConfirmationNumber,
      })
      if (!data.success) {
        toast.error(data.message || t('admin.settings.saveError'))
        return
      }
      toast.success(data.message || t('admin.settings.saved'))
      const s = data.settings || {}
      setForm({
        whatsappReservationNumber: s.whatsappReservationNumber || '',
        whatsappConfirmationNumber: s.whatsappConfirmationNumber || '',
      })
      setEffective({
        reservationDial: s.effective?.reservationDial || '',
        confirmationDial: s.effective?.confirmationDial || '',
      })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const input = 'border border-borderColor rounded-md px-3 py-2 text-sm w-full outline-none focus:border-primary bg-white'

  const tabs = [
    { id: 'booking', label: t('admin.settings.tabBooking') },
    { id: 'promotions', label: t('admin.settings.tabPromotions') },
    { id: 'whatsapp', label: t('admin.settings.tabWhatsApp') },
  ]

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-12 min-w-0">
      <Title title={t('admin.settings.title')} subTitle={t('admin.settings.subtitle')} />

      <div className="mt-6 flex flex-wrap gap-2 border-b border-borderColor pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-primary text-white'
                : 'bg-white border border-borderColor text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-gray-500">{t('admin.settings.loading')}</p>
      ) : (
        <div className="mt-6">
          {tab === 'booking' && (
            <BookingSettingsPanel
              axios={axios}
              initial={bookingSettings}
              t={t}
              inputClass={input}
            />
          )}
          {tab === 'promotions' && (
            <PromotionsPanel axios={axios} t={t} currency={currency || 'MAD '} inputClass={input} />
          )}
          {tab === 'whatsapp' && (
            <form onSubmit={onSaveWhatsApp} className="max-w-2xl space-y-5">
              <section className="rounded-xl border border-borderColor bg-white p-4 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    {t('admin.settings.whatsappSection')}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">{t('admin.settings.whatsappHint')}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500">{t('admin.settings.reservationNumber')}</label>
                  <PhoneInput
                    value={form.whatsappReservationNumber}
                    onChange={(phone) => setForm((f) => ({ ...f, whatsappReservationNumber: phone }))}
                  />
                  <p className="text-[11px] text-gray-400">{t('admin.settings.reservationHelp')}</p>
                  {effective.reservationDial && (
                    <p className="text-[11px] text-emerald-700">
                      {t('admin.settings.effectiveDial', { dial: `+${effective.reservationDial}` })}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500">{t('admin.settings.confirmationNumber')}</label>
                  <PhoneInput
                    value={form.whatsappConfirmationNumber}
                    onChange={(phone) => setForm((f) => ({ ...f, whatsappConfirmationNumber: phone }))}
                  />
                  <p className="text-[11px] text-gray-400">{t('admin.settings.confirmationHelp')}</p>
                  {effective.confirmationDial && (
                    <p className="text-[11px] text-emerald-700">
                      {t('admin.settings.effectiveDial', { dial: `+${effective.confirmationDial}` })}
                    </p>
                  )}
                </div>

                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {t('admin.settings.fallbackHint')}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60"
                  >
                    {saving ? t('admin.settings.saving') : t('admin.settings.save')}
                  </button>
                  <button
                    type="button"
                    onClick={load}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-lg border border-borderColor text-sm disabled:opacity-60"
                  >
                    {t('admin.settings.reload')}
                  </button>
                </div>
              </section>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default Settings

import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../../../i18n/I18nContext'
import InvoiceComposer from './InvoiceComposer'
import './invoiceWorkspace.css'

/**
 * Full-viewport invoice creation workspace matching the premium HDN CAR reference.
 */
const InvoiceWorkspace = ({
  open,
  onClose,
  title,
  description,
  form,
  setForm,
  onSubmit,
  submitting = false,
  dirty = false,
}) => {
  const { t } = useI18n()
  const titleId = useId()
  const panelRef = useRef(null)
  const dirtyRef = useRef(dirty)
  const askLeaveRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  const [askLeave, setAskLeave] = useState(false)
  const [mobilePane, setMobilePane] = useState('edit')

  dirtyRef.current = dirty
  askLeaveRef.current = askLeave

  const invoiceKind = form?.invoiceKind === 'reservation' ? 'reservation' : 'free'

  useEffect(() => {
    if (open) {
      setMounted(true)
      setMobilePane('edit')
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
    setAskLeave(false)
    const timer = setTimeout(() => setMounted(false), 240)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (askLeaveRef.current) {
        setAskLeave(false)
        return
      }
      if (dirtyRef.current) {
        setAskLeave(true)
        return
      }
      onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mounted, onClose])

  useEffect(() => {
    if (mounted) panelRef.current?.focus?.()
  }, [mounted])

  if (!mounted) return null

  const requestClose = () => {
    if (dirtyRef.current) {
      setAskLeave(true)
      return
    }
    onClose?.()
  }

  const setKind = (kind) => {
    setForm((prev) => ({
      ...prev,
      invoiceKind: kind,
      ...(kind === 'free'
        ? {
            bookingId: '',
            reservationRef: '',
            vehicleBrand: '',
            vehicleModel: '',
            vehicleYear: '',
            vehiclePlate: '',
            vehicleType: '',
            pickupDate: '',
            returnDate: '',
            pickupLocation: '',
            returnLocation: '',
          }
        : {}),
    }))
  }

  return (
    <div className={`invw-shell ${entered ? 'is-open' : ''}`} role="presentation">
      <button type="button" className="invw-shell-backdrop" aria-label={t('admin.ui.close')} onClick={requestClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`invw-shell-panel ${entered ? 'is-open' : ''}`}
      >
        <header className="invw-shell-header">
          <div className="invw-shell-heading">
            <button type="button" className="invw-shell-back" onClick={requestClose}>
              ← {t('admin.invoices.title')}
            </button>
            <h2 id={titleId}>{title}</h2>
            {description ? <p className="invw-shell-desc">{description}</p> : null}
          </div>
          <div className="invw-shell-header-actions">
            <label className="invw-kind-select">
              <span className="sr-only">{t('admin.invoices.sectionMode')}</span>
              <select
                value={invoiceKind}
                onChange={(e) => setKind(e.target.value)}
                aria-label={t('admin.invoices.sectionMode')}
              >
                <option value="free">{t('admin.invoices.modeFree')}</option>
                <option value="reservation">{t('admin.invoices.modeReservation')}</option>
              </select>
            </label>
            <div className="invw-mobile-tabs" role="tablist" aria-label={t('admin.invoices.workspaceTabs')}>
              <button
                type="button"
                role="tab"
                aria-selected={mobilePane === 'edit'}
                className={mobilePane === 'edit' ? 'is-active' : ''}
                onClick={() => setMobilePane('edit')}
              >
                {t('admin.invoices.tabEdit')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobilePane === 'preview'}
                className={mobilePane === 'preview' ? 'is-active' : ''}
                onClick={() => setMobilePane('preview')}
              >
                {t('admin.invoices.tabPreview')}
              </button>
            </div>
            <button type="button" className="admin-btn admin-btn-ghost min-h-10 w-10 px-0 text-lg" onClick={requestClose} aria-label={t('admin.ui.close')}>
              ×
            </button>
          </div>
        </header>

        <div className={`invw-shell-body is-${mobilePane}`}>
          <InvoiceComposer
            form={form}
            setForm={setForm}
            onSubmit={onSubmit}
            submitting={submitting}
            mode="create"
            hideSubmit
            formId="invoice-create-form"
            variant="workspace"
            mobilePane={mobilePane}
            onRequestPreviewPane={() => setMobilePane('preview')}
            hideModeToggle
          />
        </div>

        <footer className="invw-shell-footer">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={requestClose} disabled={submitting}>
            {t('admin.common.cancel')}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => setMobilePane('preview')}
          >
            {t('admin.invoices.preview')}
          </button>
          <button type="submit" form="invoice-create-form" className="admin-btn admin-btn-primary" disabled={submitting}>
            {submitting ? t('admin.invoices.saving') : t('admin.invoices.generate')}
          </button>
        </footer>
      </div>

      {askLeave ? (
        <div className="invw-shell-leave">
          <button type="button" className="invw-shell-backdrop is-solid" aria-hidden onClick={() => setAskLeave(false)} />
          <div role="alertdialog" aria-labelledby={`${titleId}-unsaved`} className="invw-shell-leave-card">
            <h3 id={`${titleId}-unsaved`}>{t('admin.ui.unsavedTitle')}</h3>
            <p>{t('admin.ui.unsavedMessage')}</p>
            <div className="invw-shell-leave-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setAskLeave(false)}>
                {t('admin.ui.keepEditing')}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => {
                  setAskLeave(false)
                  onClose?.()
                }}
              >
                {t('admin.ui.discard')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default InvoiceWorkspace

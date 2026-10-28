import { useEffect, useMemo, useRef, useState } from 'react'
import DateField from '../../calendar/DateField'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import './invoiceWorkspace.css'

const money = (value, currency = 'MAD') => {
  const n = Number(value) || 0
  return `${new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${currency}`
}

const Field = ({ label, children, className = '', wide = false }) => (
  <div className={`invw-field ${wide ? 'is-wide' : ''} ${className}`.trim()}>
    {label ? <label>{label}</label> : null}
    {children}
  </div>
)

/**
 * Premium invoice creation / edit workspace with live server-rendered preview.
 */
const InvoiceComposer = ({
  form,
  setForm,
  onSubmit,
  submitting = false,
  mode = 'create',
  actions = null,
  hideSubmit = false,
  formId = 'invoice-composer-form',
}) => {
  const { axios, currency: appCurrency } = useAppContext()
  const { t } = useI18n()
  const currency = form.currency || String(appCurrency || 'MAD').trim() || 'MAD'
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewStatus, setPreviewStatus] = useState('idle')
  const timerRef = useRef(null)
  const requestRef = useRef(0)
  const previewPaneRef = useRef(null)

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const updateItem = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }))
  }

  const lineTotals = useMemo(() => {
    const items = (form.items || []).filter((item) => item.description || item.quantity || item.unitPrice)
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
    const discount = Number(form.discountAmount) || 0
    const tax = items.reduce((sum, item) => {
      const line = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      return sum + line * ((Number(item.taxRate) || 0) / 100)
    }, 0)
    const total = Math.max(0, subtotal - discount + tax)
    const paid = Number(form.amountPaid)
    const amountPaid = Number.isFinite(paid) && paid >= 0
      ? paid
      : String(form.paymentStatus || '').toLowerCase() === 'paid'
        ? total
        : 0
    return { subtotal, discount, tax, total, amountPaid, balance: Math.max(0, total - amountPaid) }
  }, [form.items, form.discountAmount, form.amountPaid, form.paymentStatus])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const reqId = ++requestRef.current
      setPreviewStatus('loading')
      try {
        const { data } = await axios.post('/api/invoices/preview-html', {
          ...form,
          items: form.items,
          discountAmount: Number(form.discountAmount || 0),
          amountPaid: form.amountPaid === '' || form.amountPaid == null ? undefined : Number(form.amountPaid),
        })
        if (reqId !== requestRef.current) return
        if (data.success && data.html) {
          setPreviewHtml(data.html)
          setPreviewStatus('ready')
        } else {
          setPreviewStatus('error')
        }
      } catch {
        if (reqId !== requestRef.current) return
        setPreviewStatus('error')
      }
    }, 450)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [axios, form])

  const openPreviewWindow = () => {
    if (!previewHtml) return
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    win.document.write(previewHtml)
    win.document.close()
    return win
  }

  const printPreview = () => {
    const win = openPreviewWindow()
    if (!win) return
    win.focus()
    win.print()
  }

  const scrollToPreview = () => {
    previewPaneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const sharePreview = async () => {
    if (!previewHtml) return
    const title = form.invoiceNumber ? `Facture ${form.invoiceNumber}` : 'Facture HDN CAR'
    try {
      if (navigator.share) {
        const blob = new Blob([previewHtml], { type: 'text/html' })
        const file = new File([blob], `${form.invoiceNumber || 'facture'}.html`, { type: 'text/html' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title, files: [file] })
          return
        }
        await navigator.share({ title, text: title })
        return
      }
    } catch {
      /* user cancelled or share failed — fall through */
    }
    openPreviewWindow()
  }

  return (
    <div className="invw invw-layout">
      <form id={formId} className="invw-form" onSubmit={onSubmit}>
        <section className="invw-section">
          <h3 className="invw-section-title">{t('admin.invoices.sectionIdentity')}</h3>
          <div className="invw-grid is-3">
            <Field label={t('admin.invoices.invoiceNumber')}>
              <input value={form.invoiceNumber} onChange={(e) => update('invoiceNumber', e.target.value)} placeholder="INV-…" />
            </Field>
            <Field label={t('admin.invoices.invoiceDate')}>
              <DateField value={form.invoiceDate} onChange={(value) => update('invoiceDate', value)} />
            </Field>
            <Field label={t('admin.invoices.dueDate')}>
              <DateField value={form.dueDate} onChange={(value) => update('dueDate', value)} />
            </Field>
            <Field label={t('admin.invoices.reservationRef')}>
              <input value={form.reservationRef || ''} onChange={(e) => update('reservationRef', e.target.value)} placeholder="RES-…" />
            </Field>
            <Field label={t('admin.invoices.currency')}>
              <input value={form.currency} onChange={(e) => update('currency', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="invw-section">
          <h3 className="invw-section-title">{t('admin.invoices.sectionCustomer')}</h3>
          <div className="invw-grid">
            <Field label={t('admin.invoices.customerName')}>
              <input required value={form.customerName} onChange={(e) => update('customerName', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.customerTaxId')}>
              <input value={form.customerTaxId} onChange={(e) => update('customerTaxId', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.customerEmail')}>
              <input type="email" value={form.customerEmail} onChange={(e) => update('customerEmail', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.customerPhone')}>
              <input value={form.customerPhone} onChange={(e) => update('customerPhone', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.customerAddress')} wide>
              <input value={form.customerAddress} onChange={(e) => update('customerAddress', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="invw-section">
          <h3 className="invw-section-title">{t('admin.invoices.sectionVehicle')}</h3>
          <div className="invw-grid is-3">
            <Field label={t('admin.invoices.vehicleBrand')}>
              <input value={form.vehicleBrand} onChange={(e) => update('vehicleBrand', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.vehicleModel')}>
              <input value={form.vehicleModel} onChange={(e) => update('vehicleModel', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.vehiclePlate')}>
              <input value={form.vehiclePlate} onChange={(e) => update('vehiclePlate', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.vehicleYear')}>
              <input value={form.vehicleYear} onChange={(e) => update('vehicleYear', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.vehicleType')}>
              <input value={form.vehicleType} onChange={(e) => update('vehicleType', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="invw-section">
          <h3 className="invw-section-title">{t('admin.invoices.sectionRental')}</h3>
          <div className="invw-grid is-3">
            <Field label={t('admin.invoices.pickupDate')}>
              <DateField value={form.pickupDate || ''} onChange={(value) => update('pickupDate', value)} />
            </Field>
            <Field label={t('admin.invoices.returnDate')}>
              <DateField value={form.returnDate || ''} onChange={(value) => update('returnDate', value)} />
            </Field>
            <Field label={t('admin.invoices.pickupLocation')}>
              <input value={form.pickupLocation || ''} onChange={(e) => update('pickupLocation', e.target.value)} />
            </Field>
            <Field label={t('admin.invoices.returnLocation')}>
              <input value={form.returnLocation || ''} onChange={(e) => update('returnLocation', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="invw-section">
          <h3 className="invw-section-title">{t('admin.invoices.sectionItems')}</h3>
          <div className="invw-items">
            {(form.items || []).map((item, index) => (
              <div key={index} className="invw-item">
                <Field label={t('admin.invoices.itemDescription')}>
                  <input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                </Field>
                <Field label={t('admin.invoices.itemQty')}>
                  <input type="number" min="0" step="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                </Field>
                <Field label={t('admin.invoices.itemUnit')}>
                  <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
                </Field>
                <Field label={t('admin.invoices.itemTax')}>
                  <input type="number" min="0" step="0.01" value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', e.target.value)} />
                </Field>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  disabled={(form.items || []).length <= 1}
                  onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-secondary mt-3"
            onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, unitPrice: '', taxRate: 0 }] }))}
          >
            {t('admin.invoices.addItem')}
          </button>
          <div className="invw-grid mt-3">
            <Field label={t('admin.invoices.discountAmount')}>
              <input type="number" min="0" step="0.01" value={form.discountAmount} onChange={(e) => update('discountAmount', e.target.value)} />
            </Field>
          </div>
          <div className="invw-totals">
            <div><span>{t('admin.invoices.subtotal')}</span><strong>{money(lineTotals.subtotal, currency)}</strong></div>
            <div><span>{t('admin.invoices.discount')}</span><strong>− {money(lineTotals.discount, currency)}</strong></div>
            {lineTotals.tax > 0 ? <div><span>{t('admin.invoices.tax')}</span><strong>{money(lineTotals.tax, currency)}</strong></div> : null}
            <div className="is-total"><span>{t('admin.invoices.totalTtc')}</span><strong>{money(lineTotals.total, currency)}</strong></div>
            <div><span>{t('admin.invoices.amountPaid')}</span><strong>{money(lineTotals.amountPaid, currency)}</strong></div>
            <div><span>{t('admin.invoices.balanceDue')}</span><strong>{money(lineTotals.balance, currency)}</strong></div>
          </div>
        </section>

        <section className="invw-section">
          <h3 className="invw-section-title">{t('admin.invoices.sectionPayment')}</h3>
          <div className="invw-grid is-3">
            <Field label={t('admin.invoices.paymentStatus')}>
              <select value={form.paymentStatus} onChange={(e) => update('paymentStatus', e.target.value)}>
                <option value="pending">{t('admin.invoices.statusPending')}</option>
                <option value="partial">{t('admin.invoices.statusPartial')}</option>
                <option value="paid">{t('admin.invoices.statusPaid')}</option>
              </select>
            </Field>
            <Field label={t('admin.invoices.amountPaid')}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amountPaid ?? ''}
                onChange={(e) => update('amountPaid', e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label={t('admin.invoices.paymentMethod')}>
              <select value={form.paymentMethod} onChange={(e) => update('paymentMethod', e.target.value)}>
                <option value="cash">{t('admin.invoices.methodCash')}</option>
                <option value="card">{t('admin.invoices.methodCard')}</option>
                <option value="bank_transfer">{t('admin.invoices.methodTransfer')}</option>
                <option value="check">{t('admin.invoices.methodCheck')}</option>
                <option value="other">{t('admin.invoices.methodOther')}</option>
              </select>
            </Field>
            <Field label={t('admin.invoices.paymentReference')}>
              <input value={form.paymentReference} onChange={(e) => update('paymentReference', e.target.value)} />
            </Field>
          </div>
          <div className="invw-grid mt-3">
            <Field label={t('admin.invoices.notes')} wide>
              <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </Field>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--admin-ink)]">
            <input
              type="checkbox"
              checked={Boolean(form.includeCompanyStamp)}
              onChange={(e) => update('includeCompanyStamp', e.target.checked)}
            />
            {t('admin.invoices.includeStamp')}
          </label>
        </section>

        <div className="invw-actions">
          {!hideSubmit ? (
            <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
              {submitting
                ? t('admin.invoices.saving')
                : mode === 'edit'
                  ? t('admin.common.save')
                  : t('admin.invoices.create')}
            </button>
          ) : null}
          <button type="button" className="admin-btn admin-btn-secondary" onClick={scrollToPreview} disabled={!previewHtml}>
            {t('admin.invoices.preview')}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={openPreviewWindow} disabled={!previewHtml}>
            {t('admin.invoices.openPreview')}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={printPreview} disabled={!previewHtml}>
            {t('admin.invoices.print')}
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={sharePreview} disabled={!previewHtml}>
            {t('admin.invoices.share')}
          </button>
          {actions}
        </div>
      </form>

      <aside ref={previewPaneRef} className="invw-preview-pane" aria-label={t('admin.invoices.livePreview')}>
        <div className="invw-preview-bar">
          <p>{t('admin.invoices.livePreview')}</p>
          <span className="text-xs text-[var(--admin-muted)]">
            {previewStatus === 'loading'
              ? t('admin.invoices.previewUpdating')
              : previewStatus === 'error'
                ? t('admin.invoices.previewError')
                : t('admin.invoices.previewReady')}
          </span>
        </div>
        {previewHtml ? (
          <iframe title={t('admin.invoices.livePreview')} className="invw-preview-frame" srcDoc={previewHtml} />
        ) : (
          <div className="invw-preview-empty">{t('admin.invoices.previewEmpty')}</div>
        )}
      </aside>
    </div>
  )
}

export default InvoiceComposer

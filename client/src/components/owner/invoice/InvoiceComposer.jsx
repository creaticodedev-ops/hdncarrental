import { useEffect, useMemo, useRef, useState } from 'react'
import DateField from '../../calendar/DateField'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'
import './invoiceWorkspace.css'

const money = (value, currency = 'MAD') => {
  const n = Number(value) || 0
  return `${new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${currency}`
}

const emptyItem = () => ({
  description: '',
  details: '',
  quantity: 1,
  unitPrice: '',
  discountAmount: '',
  taxRate: 0,
})

const Field = ({ label, children, className = '', wide = false }) => (
  <div className={`invw-field ${wide ? 'is-wide' : ''} ${className}`.trim()}>
    {label ? <label title={label}>{label}</label> : null}
    {children}
  </div>
)

/**
 * Premium invoice creation / edit composer with live server-rendered preview.
 * Supports Facture libre (default) and Facture liée à une réservation.
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
  variant = 'embedded',
  mobilePane = 'edit',
  onRequestPreviewPane,
}) => {
  const { axios, currency: appCurrency } = useAppContext()
  const { t } = useI18n()
  const currency = form.currency || String(appCurrency || 'MAD').trim() || 'MAD'
  const invoiceKind = form.invoiceKind === 'reservation' ? 'reservation' : 'free'
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewStatus, setPreviewStatus] = useState('idle')
  const [previewError, setPreviewError] = useState('')
  const [bookingQuery, setBookingQuery] = useState('')
  const [bookingResults, setBookingResults] = useState([])
  const [bookingLoading, setBookingLoading] = useState(false)
  const timerRef = useRef(null)
  const requestRef = useRef(0)
  const bookingTimerRef = useRef(null)
  const previewPaneRef = useRef(null)

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const updateItem = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }))
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

  const lineTotals = useMemo(() => {
    const items = (form.items || []).filter((item) => item.description || item.quantity || item.unitPrice)
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
    const lineDiscount = items.reduce((sum, item) => sum + (Number(item.discountAmount) || 0), 0)
    const discount = (Number(form.discountAmount) || 0) + lineDiscount
    const tax = items.reduce((sum, item) => {
      const net = Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discountAmount) || 0))
      return sum + net * ((Number(item.taxRate) || 0) / 100)
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
      setPreviewError('')
      try {
        const { data } = await axios.post('/api/invoices/preview-html', {
          ...form,
          invoiceKind,
          items: form.items,
          discountAmount: Number(form.discountAmount || 0),
          amountPaid: form.amountPaid === '' || form.amountPaid == null ? undefined : Number(form.amountPaid),
        })
        if (reqId !== requestRef.current) return
        if (data.success && data.html) {
          setPreviewHtml(data.html)
          setPreviewStatus('ready')
          setPreviewError('')
        } else {
          setPreviewStatus('error')
          setPreviewError(data.message || t('admin.invoices.previewError'))
        }
      } catch (error) {
        if (reqId !== requestRef.current) return
        setPreviewStatus('error')
        setPreviewError(getErrorMessage(error) || t('admin.invoices.previewError'))
      }
    }, 450)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [axios, form, invoiceKind, t])

  useEffect(() => {
    if (invoiceKind !== 'reservation') return undefined
    if (bookingTimerRef.current) clearTimeout(bookingTimerRef.current)
    bookingTimerRef.current = setTimeout(async () => {
      setBookingLoading(true)
      try {
        const q = bookingQuery.trim()
        const { data } = await axios.get('/api/bookings/owner', {
          params: { page: 1, limit: 12, ...(q ? { search: q } : {}) },
        })
        if (data.success) setBookingResults(data.bookings || data.data || [])
      } catch {
        setBookingResults([])
      } finally {
        setBookingLoading(false)
      }
    }, 280)
    return () => {
      if (bookingTimerRef.current) clearTimeout(bookingTimerRef.current)
    }
  }, [axios, bookingQuery, invoiceKind])

  const applyBooking = (booking) => {
    if (!booking) return
    const car = booking.car || {}
    const toDate = (value) => {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toISOString().slice(0, 10)
    }
    setForm((prev) => ({
      ...prev,
      invoiceKind: 'reservation',
      bookingId: booking._id,
      reservationRef: booking.reservationId || '',
      customerName: booking.customerName || prev.customerName,
      customerEmail: booking.customerEmail || prev.customerEmail,
      customerPhone: booking.customerPhone || prev.customerPhone,
      customerAddress: booking.customerAddress || prev.customerAddress,
      vehicleBrand: car.brand || '',
      vehicleModel: car.model || '',
      vehicleYear: car.year || '',
      vehiclePlate: car.licensePlate || '',
      vehicleType: car.category || '',
      pickupDate: toDate(booking.pickupDate),
      returnDate: toDate(booking.returnDate),
      pickupLocation: booking.pickupLocation || '',
      returnLocation: booking.returnLocation || '',
      paymentStatus: booking.paymentStatus || prev.paymentStatus,
      currency: prev.currency || 'MAD',
      items: prev.items?.some((i) => i.description || i.unitPrice)
        ? prev.items
        : [{
            description: `Location — ${car.brand || ''} ${car.model || ''}`.trim(),
            details: '',
            quantity: 1,
            unitPrice: booking.price ?? '',
            discountAmount: booking.priceBreakdown?.discountTotal || '',
            taxRate: 0,
          }],
    }))
  }

  const moveItem = (index, dir) => {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      const target = index + dir
      if (target < 0 || target >= items.length) return prev
      ;[items[index], items[target]] = [items[target], items[index]]
      return { ...prev, items }
    })
  }

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

  const focusPreview = () => {
    if (onRequestPreviewPane) onRequestPreviewPane()
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
      /* cancelled */
    }
    openPreviewWindow()
  }

  return (
    <div className="invw-frame">
      <div className={`invw invw-layout is-${variant}`} data-mobile-pane={mobilePane}>
        <form id={formId} className="invw-form" onSubmit={onSubmit}>
          <section className="invw-section">
            <h3 className="invw-section-title">{t('admin.invoices.sectionMode')}</h3>
            <div className="invw-mode-toggle" role="tablist" aria-label={t('admin.invoices.sectionMode')}>
              <button
                type="button"
                role="tab"
                aria-selected={invoiceKind === 'free'}
                className={invoiceKind === 'free' ? 'is-active' : ''}
                onClick={() => setKind('free')}
              >
                <strong>{t('admin.invoices.modeFree')}</strong>
                <span>{t('admin.invoices.modeFreeHint')}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={invoiceKind === 'reservation'}
                className={invoiceKind === 'reservation' ? 'is-active' : ''}
                onClick={() => setKind('reservation')}
              >
                <strong>{t('admin.invoices.modeReservation')}</strong>
                <span>{t('admin.invoices.modeReservationHint')}</span>
              </button>
            </div>
          </section>

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
              <Field label={t('admin.invoices.currency')}>
                <input value={form.currency} onChange={(e) => update('currency', e.target.value)} />
              </Field>
            </div>
          </section>

          {invoiceKind === 'reservation' ? (
            <section className="invw-section">
              <h3 className="invw-section-title">{t('admin.invoices.sectionReservation')}</h3>
              <Field label={t('admin.invoices.searchReservation')}>
                <input
                  value={bookingQuery}
                  onChange={(e) => setBookingQuery(e.target.value)}
                  placeholder={t('admin.invoices.searchReservationPlaceholder')}
                />
              </Field>
              <div className="invw-booking-list">
                {bookingLoading ? <p className="invw-muted">{t('admin.invoices.loadingBookings')}</p> : null}
                {!bookingLoading && bookingResults.length === 0 ? (
                  <p className="invw-muted">{t('admin.invoices.noBookings')}</p>
                ) : null}
                {bookingResults.map((booking) => {
                  const selected = form.bookingId === booking._id
                  const car = booking.car || {}
                  return (
                    <button
                      key={booking._id}
                      type="button"
                      className={`invw-booking-row ${selected ? 'is-selected' : ''}`}
                      onClick={() => applyBooking(booking)}
                    >
                      <strong>{booking.reservationId || booking._id}</strong>
                      <span>{booking.customerName || '—'}</span>
                      <span>{`${car.brand || ''} ${car.model || ''}`.trim() || '—'}</span>
                      <span>{booking.price != null ? money(booking.price, currency) : ''}</span>
                    </button>
                  )
                })}
              </div>
              <div className="invw-grid mt-3">
                <Field label={t('admin.invoices.reservationRef')}>
                  <input value={form.reservationRef || ''} onChange={(e) => update('reservationRef', e.target.value)} placeholder="RES-…" />
                </Field>
              </div>
            </section>
          ) : null}

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

          {invoiceKind === 'reservation' ? (
            <>
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
            </>
          ) : null}

          <section className="invw-section">
            <h3 className="invw-section-title">{t('admin.invoices.sectionItems')}</h3>
            <div className="invw-items">
              {(form.items || []).map((item, index) => {
                const net = Math.max(
                  0,
                  (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discountAmount) || 0),
                )
                return (
                  <div key={index} className="invw-item is-rich">
                    <Field label={t('admin.invoices.itemDescription')}>
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder={t('admin.invoices.itemDescriptionPlaceholder')}
                      />
                    </Field>
                    <Field label={t('admin.invoices.itemDetails')} wide>
                      <input
                        value={item.details || ''}
                        onChange={(e) => updateItem(index, 'details', e.target.value)}
                        placeholder={t('admin.invoices.itemDetailsPlaceholder')}
                      />
                    </Field>
                    <Field label={t('admin.invoices.itemQty')}>
                      <input type="number" min="0" step="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                    </Field>
                    <Field label={t('admin.invoices.itemUnit')}>
                      <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
                    </Field>
                    <Field label={t('admin.invoices.itemDiscount')}>
                      <input type="number" min="0" step="0.01" value={item.discountAmount ?? ''} onChange={(e) => updateItem(index, 'discountAmount', e.target.value)} />
                    </Field>
                    <Field label={t('admin.invoices.itemTax')}>
                      <input type="number" min="0" step="0.01" value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', e.target.value)} />
                    </Field>
                    <div className="invw-item-amount">
                      <span>{t('admin.invoices.lineAmount')}</span>
                      <strong>{money(net, currency)}</strong>
                    </div>
                    <div className="invw-item-tools">
                      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Up">↑</button>
                      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => moveItem(index, 1)} disabled={index >= (form.items || []).length - 1} aria-label="Down">↓</button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        disabled={(form.items || []).length <= 1}
                        onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary mt-3"
              onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}
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
            <button type="button" className="admin-btn admin-btn-secondary" onClick={focusPreview} disabled={!previewHtml && previewStatus !== 'ready'}>
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
                  : previewStatus === 'ready'
                    ? t('admin.invoices.previewReady')
                    : t('admin.invoices.previewEmpty')}
            </span>
          </div>
          {previewHtml ? (
            <iframe title={t('admin.invoices.livePreview')} className="invw-preview-frame" srcDoc={previewHtml} />
          ) : previewStatus === 'error' ? (
            <div className="invw-preview-error">
              <strong>{t('admin.invoices.previewError')}</strong>
              {previewError ? <code>{previewError}</code> : null}
            </div>
          ) : (
            <div className="invw-preview-empty">{t('admin.invoices.previewEmpty')}</div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default InvoiceComposer

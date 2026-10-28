import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/owner/Title'
import DocumentEditPanel from '../../components/owner/DocumentEditPanel'
import DocumentSourceFields, { normalizeSourceDataForEdit } from '../../components/owner/DocumentSourceFields'
import { useDocumentGeneration } from '../../hooks/useDocumentGeneration'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { openDocumentPdf } from '../../utils/openDocumentPdf'
import { downloadXlsx } from '../../utils/downloadXlsx'
import InvoiceComposer from '../../components/owner/invoice/InvoiceComposer'
import InvoiceWorkspace from '../../components/owner/invoice/InvoiceWorkspace'

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

const createEmptyItem = () => ({
  description: '',
  details: '',
  quantity: 1,
  unitPrice: '',
  discountAmount: '',
  taxRate: 0,
})
const createEmptyForm = () => ({
  invoiceKind: 'free',
  bookingId: '',
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  reservationRef: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  customerTaxId: '',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleYear: '',
  vehiclePlate: '',
  vehicleType: '',
  pickupDate: '',
  returnDate: '',
  pickupLocation: '',
  returnLocation: '',
  items: [createEmptyItem()],
  discountAmount: '0',
  amountPaid: '',
  notes: '',
  paymentStatus: 'pending',
  paymentMethod: 'cash',
  paymentReference: '',
  currency: 'MAD',
  includeCompanyStamp: true,
})

const Invoices = () => {
  const { axios, currency } = useAppContext()
  const { t, language } = useI18n()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [filters, setFilters] = useState({ search: '', customerName: '', cin: '', phone: '' })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [form, setForm] = useState(createEmptyForm())
  const [editOpen, setEditOpen] = useState(false)
  const [editTab, setEditTab] = useState('fields')
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(createEmptyForm())
  const [editSource, setEditSource] = useState({})
  const [editSections, setEditSections] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const docGen = useDocumentGeneration()
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  const fetchInvoices = async (override = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(override.page ?? pagination.page),
        limit: String(override.limit ?? pagination.limit),
      })
      const search = (override.search ?? filters.search ?? '').trim()
      const customerName = (override.customerName ?? filters.customerName ?? '').trim()
      const cin = (override.cin ?? filters.cin ?? '').trim()
      const phone = (override.phone ?? filters.phone ?? '').trim()

      if (search) params.set('search', search)
      if (customerName) params.set('customerName', customerName)
      if (cin) params.set('cin', cin)
      if (phone) params.set('phone', phone)

      const { data } = await axios.get(`/api/invoices?${params}`)
      if (data.success) {
        setInvoices(data.invoices || [])
        setPagination((prev) => ({ ...prev, ...data.pagination }))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices({ page: 1 })
  }, [axios])

  useEffect(() => {
    fetchInvoices({ page: pagination.page })
  }, [pagination.page, pagination.limit])

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchInvoices({ page: 1 })
  }

  const handleReset = () => {
    const next = { search: '', customerName: '', cin: '', phone: '' }
    setFilters(next)
    fetchInvoices({ page: 1, ...next })
  }

  const handleDownload = async (invoice, { download = false } = {}) => {
    try {
      await openDocumentPdf(axios, `/api/invoices/${invoice._id}/pdf`, {
        filename: `${invoice.invoiceNumber || 'invoice'}.pdf`,
        download,
      })
    } catch (error) {
      toast.error(getErrorMessage(error) || 'PDF not available')
    }
  }

  const handleShareInvoice = async (invoice) => {
    const title = invoice.invoiceNumber ? `Facture ${invoice.invoiceNumber}` : 'Facture HDN CAR'
    const url = invoice.pdfUrl || ''
    try {
      if (navigator.share) {
        await navigator.share(url ? { title, url } : { title, text: title })
        return
      }
    } catch {
      /* cancelled */
    }
    await handleDownload(invoice)
  }

  const totals = useMemo(() => ({
    count: invoices.length,
    totalAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? (invoice.booking?.price || 0)), 0),
  }), [invoices])

  const invoiceToForm = (invoice) => {
    const inv = invoice?.sourceData?.invoice || {}
    const sd = invoice?.sourceData || {}
    const pick = (...vals) => {
      for (const v of vals) {
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '—') return v
      }
      return ''
    }
    const toDateInput = (value) => {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) {
        const m = String(value).match(/(\d{4}-\d{2}-\d{2})/)
        return m ? m[1] : ''
      }
      return d.toISOString().slice(0, 10)
    }
    const itemsSource = (invoice.items?.length ? invoice.items : inv.items) || []
    const kind = inv.invoiceKind || sd._meta?.invoiceKind || (invoice.booking ? 'reservation' : 'free')
    return {
      invoiceKind: kind === 'reservation' ? 'reservation' : 'free',
      bookingId: invoice.booking?._id || invoice.booking || '',
      invoiceNumber: pick(invoice.invoiceNumber, inv.invoiceNumber, sd.contract_number),
      invoiceDate: toDateInput(invoice.invoiceDate || inv.invoiceDate),
      dueDate: toDateInput(invoice.dueDate || inv.dueDate),
      customerName: pick(invoice.customerName, inv.customerName, sd.customer_name),
      customerEmail: pick(invoice.customerEmail, inv.customerEmail, sd.customer_email),
      customerPhone: pick(invoice.customerPhone, inv.customerPhone, sd.customer_phone),
      customerAddress: pick(invoice.customerAddress, inv.customerAddress, sd.customer_address),
      customerTaxId: pick(invoice.customerTaxId, inv.customerTaxId),
      vehicleBrand: pick(invoice.vehicleBrand, inv.vehicleBrand, sd.car_brand),
      vehicleModel: pick(invoice.vehicleModel, inv.vehicleModel, sd.car_model),
      vehicleYear: pick(invoice.vehicleYear, inv.vehicleYear, sd.car_year),
      vehiclePlate: pick(invoice.vehiclePlate, inv.vehiclePlate, sd.car_registration),
      vehicleType: pick(invoice.vehicleType, inv.vehicleType, sd.car_category),
      reservationRef: pick(inv.reservationRef, sd.reservation_id, invoice.booking?.reservationId),
      pickupDate: toDateInput(inv.pickupDate || sd.pickup_date),
      returnDate: toDateInput(inv.returnDate || sd.return_date),
      pickupLocation: pick(inv.pickupLocation, sd.pickup_location),
      returnLocation: pick(inv.returnLocation, sd.return_location),
      items: itemsSource.length
        ? itemsSource.map((item) => ({
            description: item.description || '',
            details: item.details || '',
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? '',
            discountAmount: item.discountAmount ?? '',
            taxRate: item.taxRate ?? 0,
          }))
        : [createEmptyItem()],
      discountAmount: String(invoice.discountAmount ?? inv.discountAmount ?? 0),
      amountPaid: inv.amountPaid != null ? String(inv.amountPaid) : '',
      notes: pick(invoice.notes, inv.notes, sd.notes),
      paymentStatus: pick(invoice.paymentStatus, inv.paymentStatus, sd.payment_status) || 'pending',
      paymentMethod: pick(invoice.paymentMethod, inv.paymentMethod) || 'cash',
      paymentReference: pick(invoice.paymentReference, inv.paymentReference),
      currency: pick(invoice.currency, inv.currency, sd.currency) || 'MAD',
      includeCompanyStamp: invoice.includeCompanyStamp !== false
        && invoice?.sourceData?._meta?.includeCompanyStamp !== false,
    }
  }

  const applyInvoiceDocToEditState = (doc) => {
    setEditing(doc)
    setEditForm(invoiceToForm(doc))
    setEditSource(normalizeSourceDataForEdit(doc.sourceData || {}))
    setEditSections({
      headerHtml: '',
      bodyHtml: '',
      termsHtml: '',
      footerHtml: '',
      customCss: '',
      pageSize: 'A4',
      logoUrl: '',
      ...(doc.sections || {}),
    })
  }

  const openEdit = async (invoice) => {
    try {
      const { data } = await axios.get(`/api/invoices/${invoice._id}`)
      if (!data.success) {
        toast.error(data.message)
        return
      }
      applyInvoiceDocToEditState(data.invoice)
      setEditTab('fields')
      setEditOpen(true)
      setVersionsLoading(true)
      const ver = await axios.get(`/api/invoices/${invoice._id}/versions`)
      if (ver.data.success) setVersions(ver.data.versions || [])
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setVersionsLoading(false)
    }
  }

  const saveEdit = async ({ regeneratePdf = true } = {}) => {
    if (!editing || docGen.running || editSaving) return
    if (!editForm.customerName.trim()) {
      toast.error(t('admin.invoices.customerRequired'))
      return
    }
    const items = editForm.items.filter((item) => item.description || item.quantity || item.unitPrice)
    if (!items.length) {
      toast.error(t('admin.invoices.itemRequired'))
      return
    }

    setEditSaving(true)
    try {
      const syncedSource = {
        ...editSource,
        customer_name: editForm.customerName,
        customerName: editForm.customerName,
        customer_email: editForm.customerEmail,
        customerEmail: editForm.customerEmail,
        customer_phone: editForm.customerPhone,
        customerPhone: editForm.customerPhone,
        customer_address: editForm.customerAddress,
        customerAddress: editForm.customerAddress,
        car_brand: editForm.vehicleBrand,
        carBrand: editForm.vehicleBrand,
        car_model: editForm.vehicleModel,
        carModel: editForm.vehicleModel,
        car_year: editForm.vehicleYear,
        carYear: editForm.vehicleYear,
        car_registration: editForm.vehiclePlate,
        carRegistration: editForm.vehiclePlate,
        car_category: editForm.vehicleType,
        carCategory: editForm.vehicleType,
        currency: editForm.currency,
        payment_status: editForm.paymentStatus,
        paymentStatus: editForm.paymentStatus,
        notes: editForm.notes,
        contract_number: editForm.invoiceNumber || editSource.contract_number,
        contractNumber: editForm.invoiceNumber || editSource.contractNumber,
        _meta: {
          ...(editSource._meta || {}),
          includeCompanyStamp: editForm.includeCompanyStamp,
        },
        invoice: {
          ...(editSource.invoice || {}),
          invoiceNumber: editForm.invoiceNumber,
          invoiceDate: editForm.invoiceDate,
          dueDate: editForm.dueDate,
          currency: editForm.currency,
          customerName: editForm.customerName,
          customerEmail: editForm.customerEmail,
          customerPhone: editForm.customerPhone,
          customerAddress: editForm.customerAddress,
          customerTaxId: editForm.customerTaxId,
          vehicleBrand: editForm.vehicleBrand,
          vehicleModel: editForm.vehicleModel,
          vehicleYear: editForm.vehicleYear,
          vehiclePlate: editForm.vehiclePlate,
          vehicleType: editForm.vehicleType,
          reservationRef: editForm.reservationRef,
          pickupDate: editForm.pickupDate,
          returnDate: editForm.returnDate,
          pickupLocation: editForm.pickupLocation,
          returnLocation: editForm.returnLocation,
          items,
          discountAmount: Number(editForm.discountAmount || 0),
          amountPaid: editForm.amountPaid === '' || editForm.amountPaid == null ? undefined : Number(editForm.amountPaid),
          notes: editForm.notes,
          paymentStatus: editForm.paymentStatus,
          paymentMethod: editForm.paymentMethod,
          paymentReference: editForm.paymentReference,
        },
      }
      await docGen.run(
        async () => {
          const { data } = await axios.patch(`/api/invoices/${editing._id}`, {
            expectedUpdatedAt: editing.updatedAt,
            regeneratePdf,
            sections: editSections,
            sourceData: syncedSource,
            invoiceNumber: editForm.invoiceNumber,
            invoiceDate: editForm.invoiceDate,
            dueDate: editForm.dueDate,
            customerName: editForm.customerName,
            customerEmail: editForm.customerEmail,
            customerPhone: editForm.customerPhone,
            customerAddress: editForm.customerAddress,
            customerTaxId: editForm.customerTaxId,
            vehicleBrand: editForm.vehicleBrand,
            vehicleModel: editForm.vehicleModel,
            vehicleYear: editForm.vehicleYear,
            vehiclePlate: editForm.vehiclePlate,
            vehicleType: editForm.vehicleType,
            reservationRef: editForm.reservationRef,
            pickupDate: editForm.pickupDate,
            returnDate: editForm.returnDate,
            pickupLocation: editForm.pickupLocation,
            returnLocation: editForm.returnLocation,
            items,
            discountAmount: Number(editForm.discountAmount || 0),
            amountPaid: editForm.amountPaid === '' || editForm.amountPaid == null ? undefined : Number(editForm.amountPaid),
            notes: editForm.notes,
            paymentStatus: editForm.paymentStatus,
            paymentMethod: editForm.paymentMethod,
            paymentReference: editForm.paymentReference,
            currency: editForm.currency,
            includeCompanyStamp: editForm.includeCompanyStamp,
          })
          if (!data.success) throw new Error(data.message)
          return data
        },
        {
          mode: 'regenerate',
          axios,
          extractPdfApiPath: (data) => (data?.invoice?._id ? `/api/invoices/${data.invoice._id}/pdf` : ''),
          extractPdfUrl: (data) => data?.invoice?.pdfUrl || '',
          onSuccess: async (data) => {
            toast.success(data.message || t('admin.documents.saved'))
            applyInvoiceDocToEditState(data.invoice)
            setInvoices((prev) => prev.map((inv) => (inv._id === data.invoice._id ? { ...inv, ...data.invoice } : inv)))
            const ver = await axios.get(`/api/invoices/${data.invoice._id}/versions`)
            if (ver.data.success) setVersions(ver.data.versions || [])
          },
        },
      )
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(t('admin.documents.conflict'))
        openEdit(editing)
        docGen.close()
      } else if (!docGen.open) {
        toast.error(getErrorMessage(error))
      }
    } finally {
      setEditSaving(false)
    }
  }

  const regenerateOnly = async ({ fromBooking = false } = {}) => {
    if (!editing || docGen.running || editSaving) return
    if (fromBooking && !window.confirm(t('admin.documents.refreshFromBookingConfirm'))) return
    setEditSaving(true)
    try {
      await docGen.run(
        async () => {
          const { data } = await axios.post(`/api/invoices/${editing._id}/regenerate`, {
            expectedUpdatedAt: editing.updatedAt,
            fromBooking,
          })
          if (!data.success) throw new Error(data.message)
          return data
        },
        {
          mode: 'regenerate',
          axios,
          extractPdfApiPath: (data) => (data?.invoice?._id ? `/api/invoices/${data.invoice._id}/pdf` : ''),
          extractPdfUrl: (data) => data?.invoice?.pdfUrl || '',
          onSuccess: async (data) => {
            toast.success(data.message)
            applyInvoiceDocToEditState(data.invoice)
            setInvoices((prev) => prev.map((inv) => (inv._id === data.invoice._id ? { ...inv, ...data.invoice } : inv)))
          },
        },
      )
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(t('admin.documents.conflict'))
        docGen.close()
      } else if (!docGen.open) {
        toast.error(getErrorMessage(error))
      }
    } finally {
      setEditSaving(false)
    }
  }

  const restoreVersion = async (version) => {
    if (!editing || !window.confirm(t('admin.documents.restoreConfirm'))) return
    if (docGen.running || editSaving) return
    setEditSaving(true)
    try {
      await docGen.run(
        async () => {
          const { data } = await axios.post(`/api/invoices/${editing._id}/versions/${version}/restore`)
          if (!data.success) throw new Error(data.message)
          return data
        },
        {
          mode: 'regenerate',
          axios,
          extractPdfApiPath: (data) => (data?.invoice?._id ? `/api/invoices/${data.invoice._id}/pdf` : ''),
          extractPdfUrl: (data) => data?.invoice?.pdfUrl || '',
          onSuccess: async (data) => {
            toast.success(data.message)
            applyInvoiceDocToEditState(data.invoice)
            setInvoices((prev) => prev.map((inv) => (inv._id === data.invoice._id ? { ...inv, ...data.invoice } : inv)))
            const ver = await axios.get(`/api/invoices/${data.invoice._id}/versions`)
            if (ver.data.success) setVersions(ver.data.versions || [])
          },
        },
      )
    } catch (error) {
      if (!docGen.open) toast.error(getErrorMessage(error))
    } finally {
      setEditSaving(false)
    }
  }

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    if (!form.customerName.trim()) {
      toast.error(t('admin.invoices.customerRequired'))
      return
    }

    const items = form.items.filter((item) => item.description || item.quantity || item.unitPrice)
    if (!items.length) {
      toast.error(t('admin.invoices.itemRequired'))
      return
    }

    setCreating(true)
    try {
      const { data } = await axios.post('/api/invoices/manual', {
        invoiceKind: form.invoiceKind === 'reservation' ? 'reservation' : 'free',
        bookingId: form.bookingId || undefined,
        invoiceNumber: form.invoiceNumber || '',
        invoiceDate: form.invoiceDate || new Date().toISOString().slice(0, 10),
        dueDate: form.dueDate || '',
        reservationRef: form.reservationRef || '',
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        customerAddress: form.customerAddress,
        customerTaxId: form.customerTaxId,
        vehicleBrand: form.vehicleBrand,
        vehicleModel: form.vehicleModel,
        vehicleYear: form.vehicleYear,
        vehiclePlate: form.vehiclePlate,
        vehicleType: form.vehicleType,
        pickupDate: form.pickupDate || '',
        returnDate: form.returnDate || '',
        pickupLocation: form.pickupLocation || '',
        returnLocation: form.returnLocation || '',
        items,
        discountAmount: Number(form.discountAmount || 0),
        amountPaid: form.amountPaid === '' || form.amountPaid == null ? undefined : Number(form.amountPaid),
        notes: form.notes,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        currency: form.currency,
        includeCompanyStamp: form.includeCompanyStamp,
      })
      if (data.success) {
        toast.success(data.message)
        setShowCreateModal(false)
        setForm(createEmptyForm())
        await fetchInvoices({ page: 1 })
        if (data.invoice?._id) {
          try {
            await openDocumentPdf(axios, `/api/invoices/${data.invoice._id}/pdf`, {
              filename: `${data.invoice.invoiceNumber || 'invoice'}.pdf`,
            })
          } catch (error) {
            toast.error(getErrorMessage(error))
          }
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="admin-page-pad flex-1 pb-12 min-w-0 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Title title={t('admin.invoices.title')} subTitle={t('admin.invoices.subtitle')} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-borderColor bg-white px-4 py-3 text-sm text-gray-600">
            <div>{t('admin.invoices.totalCount', { count: totals.count })}</div>
            <div>{t('admin.invoices.totalAmount', { amount: `${currency}${totals.totalAmount.toFixed(2)}` })}</div>
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              try {
                await downloadXlsx(axios, '/api/invoices/export', {
                  params: {
                    ...(filters.search ? { search: filters.search } : {}),
                    ...(filters.customerName ? { customerName: filters.customerName } : {}),
                    ...(filters.cin ? { cin: filters.cin } : {}),
                    ...(filters.phone ? { phone: filters.phone } : {}),
                  },
                  language,
                  fallbackName: 'invoices.xlsx',
                })
                toast.success(t('admin.common.exportSuccess'))
              } catch (error) {
                toast.error(getErrorMessage(error) || t('admin.common.exportError'))
              } finally {
                setExporting(false)
              }
            }}
            className="rounded-xl border border-borderColor px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            {exporting ? t('admin.common.exporting') : t('admin.common.exportExcel')}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dull"
          >
            {t('admin.invoices.create')}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-borderColor bg-white p-4 space-y-4">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            className="border border-borderColor px-3 py-2 rounded-lg w-full text-sm"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder={t('admin.invoices.searchPlaceholder')}
          />
          <input
            className="border border-borderColor px-3 py-2 rounded-lg w-full text-sm"
            value={filters.customerName}
            onChange={(e) => setFilters((prev) => ({ ...prev, customerName: e.target.value }))}
            placeholder={t('admin.invoices.customerNamePlaceholder')}
          />
          <input
            className="border border-borderColor px-3 py-2 rounded-lg w-full text-sm"
            value={filters.cin}
            onChange={(e) => setFilters((prev) => ({ ...prev, cin: e.target.value }))}
            placeholder={t('admin.invoices.cinPlaceholder')}
          />
          <input
            className="border border-borderColor px-3 py-2 rounded-lg w-full text-sm"
            value={filters.phone}
            onChange={(e) => setFilters((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder={t('admin.invoices.phonePlaceholder')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white text-sm">{t('admin.bookings.applyFilters')}</button>
          <button type="button" onClick={handleReset} className="px-4 py-2 rounded-xl border border-borderColor text-sm">{t('admin.bookings.clear')}</button>
        </div>
      </form>

      <div className="rounded-2xl border border-borderColor bg-white overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">{t('admin.invoices.loading')}</p>
        ) : invoices.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">{t('admin.invoices.none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-light text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">{t('admin.invoices.number')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.reservation')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.customer')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.total')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.created')}</th>
                  <th className="px-4 py-3">{t('admin.invoices.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const booking = invoice.booking || {}
                  return (
                    <tr key={invoice._id} className="border-t border-borderColor">
                      <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">{invoice.source === 'manual' ? t('admin.invoices.manual') : (booking.reservationId || '—')}</td>
                      <td className="px-4 py-3">
                        <p>{invoice.customerName || invoice.sourceData?.customer_name || booking.customerName || '—'}</p>
                        <p className="text-xs text-gray-500">{invoice.customerPhone || invoice.sourceData?.customer_phone || booking.customerPhone || ''}</p>
                      </td>
                      <td className="px-4 py-3">{invoice.totalAmount != null ? `${invoice.currency || currency}${Number(invoice.totalAmount).toFixed(2)}` : (booking.price != null ? `${currency}${booking.price}` : '—')}</td>
                      <td className="px-4 py-3">
                        <p>{formatDateTime(invoice.updatedAt || invoice.createdAt)}</p>
                        <p className="text-[10px] text-gray-400">
                          v{invoice.version || 1}
                          {invoice.contentLocked ? ` · ${t('admin.documents.edited')}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openEdit(invoice)} className="text-primary text-xs font-medium">
                            {t('admin.common.edit')}
                          </button>
                          <button type="button" onClick={() => handleDownload(invoice)} className="text-gray-700 text-xs font-medium">
                            {t('admin.invoices.preview')}
                          </button>
                          <button type="button" onClick={() => handleDownload(invoice, { download: true })} className="text-gray-700 text-xs font-medium">
                            {t('admin.invoices.download')}
                          </button>
                          <button type="button" onClick={() => handleShareInvoice(invoice)} className="text-gray-700 text-xs font-medium">
                            {t('admin.invoices.share')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="px-3 py-1.5 rounded-lg border border-borderColor disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-gray-600">{pagination.page} / {pagination.totalPages}</span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="px-3 py-1.5 rounded-lg border border-borderColor disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}

      <InvoiceWorkspace
        open={showCreateModal}
        onClose={() => {
          if (creating) return
          setShowCreateModal(false)
          setForm(createEmptyForm())
        }}
        title={t('admin.invoices.createManual')}
        description={t('admin.invoices.createManualHint')}
        form={form}
        setForm={setForm}
        onSubmit={handleCreateInvoice}
        submitting={creating}
        dirty={showCreateModal && !creating}
      />

      <DocumentEditPanel
        open={editOpen}
        onClose={() => {
          if (docGen.running) return
          setEditOpen(false)
          docGen.close()
        }}
        title={editing ? `${t('admin.common.edit')} ${editing.invoiceNumber}` : ''}
        activeTab={editTab}
        setActiveTab={setEditTab}
        saving={editSaving || docGen.running}
        onSave={() => saveEdit({ regeneratePdf: true })}
        onSaveAndRegenerate={() => saveEdit({ regeneratePdf: true })}
        onRegenerate={() => regenerateOnly({ fromBooking: false })}
        onRefreshFromSource={editing?.booking ? () => regenerateOnly({ fromBooking: true }) : undefined}
        versions={versions}
        versionsLoading={versionsLoading}
        onRestoreVersion={restoreVersion}
        sections={editSections}
        setSections={setEditSections}
        t={t}
        generation={{
          open: docGen.open,
          status: docGen.status,
          mode: docGen.mode,
          error: docGen.error,
          pdfUrl: docGen.pdfUrl || editing?.pdfUrl || '',
          running: docGen.running,
          onRetry: () => docGen.retry(),
          onDismiss: () => docGen.close(),
        }}
        fieldsContent={(
          <div className="space-y-8">
            <InvoiceComposer
              form={editForm}
              setForm={setEditForm}
              onSubmit={(e) => {
                e.preventDefault()
                saveEdit({ regeneratePdf: true })
              }}
              submitting={editSaving || docGen.running}
              mode="edit"
              hideSubmit
            />
            <div className="border-t border-borderColor pt-4">
              <DocumentSourceFields
                sourceData={editSource}
                setSourceData={setEditSource}
                t={t}
                title={t('admin.documents.allFields')}
              />
            </div>
          </div>
        )}
      />
    </div>
  )
}

export default Invoices

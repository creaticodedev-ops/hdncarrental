import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/owner/Title'
import ChannelBadge from '../../components/owner/ChannelBadge'
import BookingRowActions from '../../components/owner/BookingRowActions'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { escapeHtml, getErrorMessage } from '../../utils/apiError'
import PhoneInput, { isPhoneValid } from '../../components/PhoneInput'
import { Link } from 'react-router-dom'
import { buildOwnerCompletionWaUrl, buildWaMeUrl } from '../../utils/whatsapp'
import { AdminDrawer, DrawerSection, FormField, SearchSelect } from '../../admin/ui'

const emptyFilters = {
  customerName: '',
  phone: '',
  email: '',
  reservationId: '',
  vehicle: '',
  licensePlate: '',
  status: '',
  paymentStatus: '',
  channel: '',
  pickupLocation: '',
  pickupDateFrom: '',
  pickupDateTo: '',
}

const emptyEdit = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  pickupDate: '',
  returnDate: '',
  pickupLocation: '',
  returnLocation: '',
  notes: '',
  status: 'pending',
  paymentStatus: 'pending',
  carId: '',
}

const toInputDateTime = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '-' : d.toLocaleString()
}

const statusClass = (status) => {
  if (status === 'confirmed') return 'bg-green-100 text-green-600'
  if (status === 'ready_for_pickup') return 'bg-emerald-100 text-emerald-700'
  if (status === 'active') return 'bg-blue-100 text-blue-600'
  if (status === 'completed') return 'bg-purple-100 text-purple-600'
  if (status === 'cancelled') return 'bg-red-100 text-red-600'
  return 'bg-yellow-100 text-yellow-700'
}

const ManageBookings = () => {
  const { currency, axios, hasPermission } = useAppContext()
  const { t } = useI18n()

  const [bookings, setBookings] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [fleetCars, setFleetCars] = useState([])
  const [assigningVehicle, setAssigningVehicle] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState('')
  const [identityType, setIdentityType] = useState('national_id')
  const [completionLinkCache, setCompletionLinkCache] = useState({})
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false)
  const [whatsappDials, setWhatsappDials] = useState({
    reservationDial: '',
    confirmationDial: '',
  })
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [extensionForm, setExtensionForm] = useState({ newReturnDate: '', notes: '', regenerateContract: true })
  const [extensionPreview, setExtensionPreview] = useState(null)
  const [extensionBusy, setExtensionBusy] = useState(false)

  const resolveCompletionUrl = (booking) =>
    booking?.completion?.shareableCompletionUrl ||
    booking?.completion?.completionUrl ||
    completionLinkCache[booking?._id] ||
    ''

  const cacheCompletionUrl = (bookingId, url) => {
    if (!bookingId || !url) return
    setCompletionLinkCache((prev) => ({ ...prev, [bookingId]: url }))
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    params.set('page', String(pagination.page))
    params.set('limit', String(pagination.limit))
    params.set('sortBy', 'createdAt')
    params.set('sortOrder', 'desc')
    return params.toString()
  }, [appliedFilters, pagination.page, pagination.limit])

  const fetchOwnerBookings = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/bookings/owner?${queryString}`)
      if (data.success) {
        setBookings(data.bookings)
        setPagination((prev) => ({ ...prev, ...data.pagination }))
        if (selectedBooking) {
          const refreshed = data.bookings.find((b) => b._id === selectedBooking._id)
          if (refreshed) setSelectedBooking(refreshed)
        }
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
    fetchOwnerBookings()
  }, [queryString])

  useEffect(() => {
    axios.get('/api/owner/cars')
      .then(({ data }) => { if (data.success) setFleetCars(data.cars || []) })
      .catch(() => {})
  }, [axios])

  useEffect(() => {
    axios
      .get('/api/owner/settings')
      .then(({ data }) => {
        if (data.success) {
          setWhatsappDials({
            reservationDial: data.settings?.effective?.reservationDial || '',
            confirmationDial: data.settings?.effective?.confirmationDial || '',
          })
        }
      })
      .catch(() => {})
  }, [axios])

  const compatibleVehicles = useMemo(() => {
    if (!selectedBooking?.car) return []
    const brand = selectedBooking.car.brand
    const model = selectedBooking.car.model
    return fleetCars.filter(
      (c) => c.brand === brand && c.model === model && c.status !== 'maintenance' && c.isAvaliable !== false,
    )
  }, [fleetCars, selectedBooking])

  const editVehicleOptions = useMemo(() => {
    if (!editing?.car) return []
    const brand = editing.car.brand
    const model = editing.car.model
    return fleetCars.filter(
      (c) => c.brand === brand && c.model === model && c.status !== 'maintenance' && c.isAvaliable !== false,
    )
  }, [fleetCars, editing])

  const applyFilters = (e) => {
    e?.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    setAppliedFilters({ ...filters })
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const changeBookingStatus = async (bookingId, status) => {
    try {
      const { data } = await axios.post('/api/bookings/change-status', { bookingId, status })
      if (data.success) {
        if (status === 'confirmed') {
          if (data.completion?.completionUrl) {
            cacheCompletionUrl(bookingId, data.completion.completionUrl)
          }
          if (data.completion?.emailSent) {
            toast.success(data.message)
          } else {
            toast.error(data.message, { duration: 8000 })
            if (data.completion?.completionUrl) {
              try {
                await navigator.clipboard.writeText(data.completion.completionUrl)
                toast.success(t('admin.bookings.linkCopied'))
              } catch { /* ignore */ }
            }
          }
        } else {
          toast.success(data.message)
        }
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const resendCompletionLink = async (bookingId) => {
    try {
      const { data } = await axios.post('/api/booking-completion/owner/resend-link', { bookingId })
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message || t('admin.bookings.emailFailed'), { duration: 8000 })
      }
      if (data.completionUrl) {
        cacheCompletionUrl(bookingId, data.completionUrl)
        try {
          await navigator.clipboard.writeText(data.completionUrl)
          toast.success(t('admin.bookings.linkCopied'))
        } catch { /* ignore */ }
      }
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 8000 })
    }
  }

  const copyCompletionLink = async (booking) => {
    try {
      const data = await ensureCompletionLinkPayload(booking)
      const url = data.shareableCompletionUrl || data.completionUrl
      await navigator.clipboard.writeText(url)
      toast.success(t('admin.bookings.linkCopied'))
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const cancelCompletionLink = async (bookingId) => {
    if (!window.confirm(t('admin.bookings.cancelLinkConfirm'))) return
    try {
      const { data } = await axios.post('/api/booking-completion/owner/cancel-link', { bookingId })
      if (!data.success) {
        toast.error(data.message || t('admin.signatureRequests.actionError'))
        return
      }
      toast.success(t('admin.bookings.linkCancelled'))
      setCompletionLinkCache((prev) => {
        const next = { ...prev }
        delete next[bookingId]
        return next
      })
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const toInputDateTimeLocal = (v) => {
    if (!v) return ''
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const openExtensionModal = (booking) => {
    const current = new Date(booking.returnDate)
    current.setDate(current.getDate() + 1)
    setExtensionForm({
      newReturnDate: toInputDateTimeLocal(current),
      notes: '',
      regenerateContract: true,
    })
    setExtensionPreview(null)
    setExtensionOpen(true)
  }

  const previewExtension = async () => {
    if (!selectedBooking) return
    setExtensionBusy(true)
    setExtensionPreview(null)
    try {
      const { data } = await axios.post('/api/bookings/owner/extend/preview', {
        bookingId: selectedBooking._id,
        newReturnDate: extensionForm.newReturnDate,
      })
      if (!data.success) {
        toast.error(data.message || t('admin.bookings.extensionPreviewError'))
        return
      }
      setExtensionPreview(data.preview)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setExtensionBusy(false)
    }
  }

  const applyExtension = async (e) => {
    e.preventDefault()
    if (!selectedBooking) return
    setExtensionBusy(true)
    try {
      const { data } = await axios.post('/api/bookings/owner/extend', {
        bookingId: selectedBooking._id,
        newReturnDate: extensionForm.newReturnDate,
        notes: extensionForm.notes,
        regenerateContract: extensionForm.regenerateContract,
      })
      if (!data.success) {
        toast.error(data.message || t('admin.bookings.extensionApplyError'))
        return
      }
      toast.success(t('admin.bookings.extensionApplied'))
      if (data.contract?.reason === 'content_locked') {
        toast(t('admin.bookings.extensionContractLocked'), { icon: 'â„¹ï¸' })
      }
      setExtensionOpen(false)
      setSelectedBooking(data.booking)
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setExtensionBusy(false)
    }
  }

  const ensureCompletionLinkPayload = async (booking) => {
    const bookingId = booking._id
    const tryEnsure = async (url) => {
      const { data } = await axios.post(url, { bookingId })
      return data
    }

    let data
    try {
      data = await tryEnsure('/api/booking-completion/owner/ensure-link')
    } catch (err) {
      if (err.response?.status === 404) {
        data = await tryEnsure('/api/bookings/owner/completion/ensure-link')
      } else {
        throw err
      }
    }

    const url = data.shareableCompletionUrl || data.completionUrl
    if (!data.success || !url) {
      throw new Error(data.message || t('admin.bookings.noCompletionLink'))
    }
    cacheCompletionUrl(bookingId, url)
    return data
  }

  const ensureCompletionUrl = async (booking) => {
    const cached = resolveCompletionUrl(booking)
    if (cached) return cached
    const data = await ensureCompletionLinkPayload(booking)
    return data.shareableCompletionUrl || data.completionUrl
  }

  const openCompletionWaMe = (booking, completionUrl, dial) => {
    const url = buildOwnerCompletionWaUrl(booking, completionUrl, {
      currency,
      dial: dial || whatsappDials.confirmationDial,
    })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  /** Ensures completion link exists, then opens wa.me (no WhatsApp send API). */
  const confirmViaWhatsApp = async (booking) => {
    if (!booking?._id) return
    setOpeningWhatsApp(true)
    try {
      const data = await ensureCompletionLinkPayload(booking)
      const completionUrl = data.shareableCompletionUrl || data.completionUrl
      if (data.whatsappConfirmationUrl) {
        window.open(data.whatsappConfirmationUrl, '_blank', 'noopener,noreferrer')
      } else {
        openCompletionWaMe(
          booking,
          completionUrl,
          data.whatsappConfirmationDial || whatsappDials.confirmationDial,
        )
      }
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 8000 })
    } finally {
      setOpeningWhatsApp(false)
    }
  }

  const changePaymentStatus = async (bookingId, paymentStatus) => {
    try {
      const { data } = await axios.post('/api/bookings/change-payment-status', { bookingId, paymentStatus })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const startEdit = (booking) => {
    setEditing(booking)
    setEditForm({
      customerName: booking.customerName || '',
      customerEmail: booking.customerEmail || '',
      customerPhone: booking.customerPhone || '',
      pickupDate: toInputDateTime(booking.pickupDate),
      returnDate: toInputDateTime(booking.returnDate),
      pickupLocation: booking.pickupLocation || '',
      returnLocation: booking.returnLocation || '',
      notes: booking.notes || '',
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || 'pending',
      carId: booking.car?._id || booking.car || '',
    })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!isPhoneValid(editForm.customerPhone)) {
      toast.error(t('admin.bookings.invalidPhone'))
      return
    }
    try {
      const { data } = await axios.post('/api/bookings/update', {
        bookingId: editing._id,
        ...editForm,
      })
      if (data.success) {
        toast.success(data.message)
        setEditing(null)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteBooking = async (bookingId) => {
    if (!window.confirm('Delete this reservation permanently?')) return
    try {
      const { data } = await axios.post('/api/bookings/delete', { bookingId })
      if (data.success) {
        toast.success(data.message)
        if (selectedBooking?._id === bookingId) setSelectedBooking(null)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const downloadDocument = async (bookingId, docType) => {
    try {
      const { data } = await axios.get(`/api/bookings/owner/${bookingId}/documents/${docType}`)
      if (data.success && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error(data.message || t('admin.bookings.documentMissing'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const uploadDocument = async (bookingId, file, docType) => {
    if (!file) return
    setUploadingDoc(docType)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docType', docType)
      if (docType === 'identity') formData.append('identityType', identityType)

      const { data } = await axios.post(`/api/bookings/owner/${bookingId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setUploadingDoc('')
    }
  }

  const assignVehicle = async (bookingId, carId) => {
    if (!carId) return
    setAssigningVehicle(true)
    try {
      const { data } = await axios.post('/api/bookings/assign-vehicle', { bookingId, carId })
      if (data.success) {
        toast.success(data.message)
        setSelectedBooking(data.booking)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setAssigningVehicle(false)
    }
  }

  const generateInvoiceForBooking = async (booking) => {
    try {
      const { data } = await axios.post('/api/invoices/generate', {
        bookingId: booking._id,
        includeCompanyStamp: true,
      })
      if (data.success) {
        toast.success(data.message)
        if (data.invoice?.pdfUrl) {
          window.open(data.invoice.pdfUrl, '_blank', 'noopener,noreferrer')
        }
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const openWhatsApp = (booking) => {
    const vehicle = booking.car
      ? `${booking.car.brand} ${booking.car.model}`
      : 'â€”'
    const text = [
      'Hello, regarding this reservation:',
      '',
      `ID: ${booking.reservationId || 'â€”'}`,
      `Customer: ${booking.customerName || 'â€”'}`,
      `Phone: ${booking.customerPhone || 'â€”'}`,
      `Vehicle: ${vehicle}`,
      `Status: ${booking.status || 'â€”'}`,
    ].join('\n')
    window.open(
      buildWaMeUrl(text, whatsappDials.confirmationDial || whatsappDials.reservationDial),
      '_blank',
      'noopener,noreferrer',
    )
  }

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      const response = await axios.get(`/api/bookings/owner/export?${params.toString()}`, {
        responseType: 'blob',
      })
      const contentType = response.headers['content-type'] || ''
      if (contentType.includes('application/json')) {
        const text = await response.data.text()
        const json = JSON.parse(text)
        toast.error(json.message || 'Export failed')
        return
      }
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reservations-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const printBooking = (booking) => {
    const reservationId = booking.reservationId || `RES-${booking._id?.toString().slice(-8).toUpperCase()}`
    const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : '-'
    const html = `
      <html>
        <head>
          <title>Reservation ${escapeHtml(reservationId)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            h1 { margin-bottom: 4px; }
            .muted { color: #666; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
            td:first-child { font-weight: 600; width: 40%; color: #374151; }
          </style>
        </head>
        <body>
          <h1>Reservation ${escapeHtml(reservationId)}</h1>
          <p class="muted">Printed ${escapeHtml(new Date().toLocaleString())}</p>
          <table>
            <tr><td>Customer</td><td>${escapeHtml(booking.customerName || '-')}</td></tr>
            <tr><td>Phone</td><td>${escapeHtml(booking.customerPhone || '-')}</td></tr>
            <tr><td>Email</td><td>${escapeHtml(booking.customerEmail || '-')}</td></tr>
            <tr><td>Vehicle</td><td>${escapeHtml(vehicle)}</td></tr>
            <tr><td>Pickup Location</td><td>${escapeHtml(booking.pickupLocation || '-')}</td></tr>
            <tr><td>Drop-off Location</td><td>${escapeHtml(booking.returnLocation || '-')}</td></tr>
            <tr><td>Pickup</td><td>${escapeHtml(formatDateTime(booking.pickupDate))}</td></tr>
            <tr><td>Return</td><td>${escapeHtml(formatDateTime(booking.returnDate))}</td></tr>
            <tr><td>Status</td><td>${escapeHtml(booking.status)}</td></tr>
            <tr><td>Payment</td><td>${escapeHtml(booking.paymentStatus)}</td></tr>
            <tr><td>Total</td><td>${escapeHtml(String(currency))}${escapeHtml(String(booking.price))}</td></tr>
            <tr><td>Notes</td><td>${escapeHtml(booking.notes || '-')}</td></tr>
          </table>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) {
      toast.error('Please allow pop-ups to print')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  const inputClass = 'admin-input'
  const labelClass = 'admin-label'

  return (
    <div className='admin-page-pad w-full min-w-0'>
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4'>
        <Title title={t('admin.bookings.title')} subTitle={t('admin.bookings.subtitle')} />
        <div className='flex flex-wrap gap-2'>
          <Link to="/owner/walk-in" className='admin-btn admin-btn-secondary min-h-10'>
            {t('admin.walkIn.menu')}
          </Link>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className='admin-btn admin-btn-secondary min-h-10'>
            {showFilters ? t('admin.bookings.hideFilters') : t('admin.bookings.showFilters')}
          </button>
          <button type="button" onClick={exportCsv} className='admin-btn admin-btn-primary min-h-10'>
            {t('admin.bookings.exportCsv')}
          </button>
        </div>
      </div>

      {showFilters && (
        <form onSubmit={applyFilters} className='mt-6 rounded-xl border border-borderColor bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
          <div>
            <label className={labelClass}>{t('admin.bookings.customerName')}</label>
            <input className={inputClass} value={filters.customerName} onChange={(e) => setFilters({ ...filters, customerName: e.target.value })} placeholder="Name" />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.phone')}</label>
            <input className={inputClass} value={filters.phone} onChange={(e) => setFilters({ ...filters, phone: e.target.value })} placeholder="Phone" />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.email')}</label>
            <input className={inputClass} value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} placeholder="Email" />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.reservationId')}</label>
            <input className={inputClass} value={filters.reservationId} onChange={(e) => setFilters({ ...filters, reservationId: e.target.value })} placeholder="RES-XXXXXXXX" />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.vehicle')}</label>
            <input className={inputClass} value={filters.vehicle} onChange={(e) => setFilters({ ...filters, vehicle: e.target.value })} placeholder="Brand or model" />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.licensePlate')}</label>
            <input className={inputClass} value={filters.licensePlate} onChange={(e) => setFilters({ ...filters, licensePlate: e.target.value })} placeholder={t('admin.bookings.licensePlatePlaceholder')} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.status')}</label>
            <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.paymentStatus')}</label>
            <select className={inputClass} value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
              <option value="">All payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.channel')}</label>
            <select className={inputClass} value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })}>
              <option value="">All channels</option>
              <option value="online">Online</option>
              <option value="walk_in">Walk-in</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.pickupLocation')}</label>
            <input className={inputClass} value={filters.pickupLocation} onChange={(e) => setFilters({ ...filters, pickupLocation: e.target.value })} placeholder="Location" />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.pickupFrom')}</label>
            <input type="date" className={inputClass} value={filters.pickupDateFrom} onChange={(e) => setFilters({ ...filters, pickupDateFrom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.pickupTo')}</label>
            <input type="date" className={inputClass} value={filters.pickupDateTo} onChange={(e) => setFilters({ ...filters, pickupDateTo: e.target.value })} />
          </div>
          <div className='sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-wrap gap-2 pt-1'>
            <button type="submit" className='px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dull cursor-pointer'>{t('admin.bookings.applyFilters')}</button>
            <button type="button" onClick={clearFilters} className='px-4 py-2 text-sm border border-borderColor rounded-lg hover:bg-gray-50 cursor-pointer'>{t('admin.bookings.clear')}</button>
            <span className='text-sm text-gray-500 self-center ml-auto'>
              {pagination.total === 1
                ? t('admin.bookings.count', { count: pagination.total })
                : t('admin.bookings.count_plural', { count: pagination.total })}
            </span>
          </div>
        </form>
      )}

      <div className='mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]'>
        <div className='w-full rounded-xl overflow-hidden border border-borderColor bg-white'>
          <div className='table-scroll'>
            <table className='w-full border-collapse text-left text-sm text-gray-600 max-lg:min-w-[640px]'>
              <thead className='text-gray-500 bg-gray-50'>
                <tr>
                  <th className="p-3 font-medium">{t('admin.bookings.reservation')}</th>
                  <th className="p-3 font-medium">{t('admin.bookings.customer')}</th>
                  <th className="p-3 font-medium max-md:hidden">{t('admin.bookings.dates')}</th>
                  <th className="p-3 font-medium">{t('admin.bookings.total')}</th>
                  <th className="p-3 font-medium">{t('admin.bookings.status')}</th>
                  <th className="p-3 font-medium text-right w-[1%] whitespace-nowrap">{t('admin.bookings.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className='p-6 text-center text-gray-400'>{t('admin.bookings.loading')}</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan="6" className='p-6 text-center text-gray-400'>{t('admin.bookings.none')}</td></tr>
                ) : bookings.map((booking) => (
                  <tr key={booking._id} className='border-t border-borderColor hover:bg-gray-50/60'>
                    <td className='p-3'>
                      <button type="button" onClick={() => setSelectedBooking(booking)} className='text-left cursor-pointer'>
                        <p className='font-medium text-primary'>{booking.reservationId || `RES-${booking._id.toString().slice(-8).toUpperCase()}`}</p>
                        <p className='text-xs text-gray-500'>{booking.car?.brand} {booking.car?.model}</p>
                        {booking.car?.licensePlate && (
                          <p className='text-[10px] text-gray-400'>{booking.car.licensePlate}</p>
                        )}
                        <ChannelBadge channel={booking.channel || 'online'} className="mt-1" />
                      </button>
                    </td>
                    <td className='p-3'>
                      <p className='font-medium text-gray-700'>{booking.customerName || t('admin.common.guest')}</p>
                      <p className='text-xs'>{booking.customerPhone || '-'}</p>
                    </td>
                    <td className='p-3 max-md:hidden text-xs'>
                      {formatDateTime(booking.pickupDate)}
                      <br />to {formatDateTime(booking.returnDate)}
                    </td>
                    <td className='p-3'>{currency}{booking.price}</td>
                    <td className='p-3'>
                      <select
                        onChange={(e) => changeBookingStatus(booking._id, e.target.value)}
                        value={booking.status}
                        className='px-2 py-1.5 text-xs border border-borderColor rounded-md outline-none'
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="ready_for_pickup">Ready for Pickup</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <p className='text-[11px] mt-1 capitalize text-gray-400'>
                        Pay: {booking.paymentStatus}
                      </p>
                    </td>
                    <td className='p-2 sm:p-3 text-right align-middle'>
                      <BookingRowActions
                        t={t}
                        onView={() => setSelectedBooking(booking)}
                        onEdit={() => startEdit(booking)}
                        onDownloadLicense={() => downloadDocument(booking._id, 'driving_license')}
                        onDownloadId={() => downloadDocument(booking._id, 'identity')}
                        onDownloadPassport={() => downloadDocument(booking._id, 'passport')}
                        onWhatsApp={() => openWhatsApp(booking)}
                        onPrint={() => printBooking(booking)}
                        onDelete={() => deleteBooking(booking._id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className='flex items-center justify-between px-4 py-3 border-t border-borderColor text-sm'>
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className='px-3 py-1.5 border rounded-lg disabled:opacity-40 cursor-pointer'
              >
                {t('admin.bookings.previous')}
              </button>
              <span>{t('admin.bookings.pageOf', { page: pagination.page, total: pagination.totalPages })}</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className='px-3 py-1.5 border rounded-lg disabled:opacity-40 cursor-pointer'
              >
                {t('admin.bookings.next')}
              </button>
            </div>
          )}
        </div>

        {selectedBooking ? (
          <div className='rounded-xl border border-borderColor bg-white p-5 text-sm text-gray-600 h-max xl:sticky xl:top-24 min-w-0'>
            <div className='flex items-start justify-between gap-3'>
              <div className="min-w-0">
                <h2 className='text-lg font-semibold text-gray-800'>{t('admin.bookings.details')}</h2>
                <p className='text-primary font-medium mt-1 break-all'>
                  {selectedBooking.reservationId || `RES-${selectedBooking._id.toString().slice(-8).toUpperCase()}`}
                </p>
                <ChannelBadge channel={selectedBooking.channel || 'online'} className="mt-2" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ${statusClass(selectedBooking.status)}`}>
                {selectedBooking.status}
              </span>
            </div>

            <div className='mt-4 space-y-2 break-words'>
              <p><span className='font-medium'>{t('admin.bookings.customer')}:</span> {selectedBooking.customerName || '-'}</p>
              <p><span className='font-medium'>{t('admin.bookings.email')}:</span> {selectedBooking.customerEmail || '-'}</p>
              <p><span className='font-medium'>{t('admin.bookings.phone')}:</span> {selectedBooking.customerPhone || '-'}</p>
              <p><span className='font-medium'>{t('admin.bookings.vehicle')}:</span> {selectedBooking.car?.brand} {selectedBooking.car?.model}</p>
              {selectedBooking.car?.licensePlate && (
                <p><span className='font-medium'>{t('admin.bookings.licensePlate')}:</span> {selectedBooking.car.licensePlate}</p>
              )}
              {compatibleVehicles.length > 0 && (
                <div className='rounded-lg border border-borderColor bg-gray-50 p-3'>
                  <label className={labelClass}>{t('admin.bookings.assignVehicle')}</label>
                  <select
                    className={inputClass}
                    disabled={assigningVehicle}
                    value={selectedBooking.car?._id || ''}
                    onChange={(e) => assignVehicle(selectedBooking._id, e.target.value)}
                  >
                    {compatibleVehicles.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.licensePlate || c.fleetId || c._id.slice(-6)} â€” {c.brand} {c.model}
                      </option>
                    ))}
                  </select>
                  <p className='mt-2 text-[11px] text-gray-500'>Same-model vehicles available for the selected dates are shown.</p>
                </div>
              )}
              <p><span className='font-medium'>Pickup:</span> {formatDateTime(selectedBooking.pickupDate)}</p>
              <p><span className='font-medium'>Return:</span> {formatDateTime(selectedBooking.returnDate)}</p>
              <p><span className='font-medium'>{t('admin.bookings.pickupLocation')}:</span> {selectedBooking.pickupLocation || '-'}</p>
              <p><span className='font-medium'>Drop-off Location:</span> {selectedBooking.returnLocation || '-'}</p>
              <p><span className='font-medium'>{t('admin.bookings.paymentStatus')}:</span> {selectedBooking.paymentStatus}</p>
              {selectedBooking.priceBreakdown ? (
                <div className='rounded-lg border border-borderColor bg-gray-50 px-3 py-2 space-y-1 text-sm'>
                  <p className='text-xs uppercase text-gray-400 font-medium'>{t('admin.bookings.priceBreakdown')}</p>
                  <p className='flex justify-between gap-2'><span>{t('admin.bookings.rentalPrice')}</span><span>{currency}{selectedBooking.priceBreakdown.rentalPrice ?? 0}</span></p>
                  <p className='flex justify-between gap-2'><span>{t('admin.bookings.pickupFee')}</span><span>{(selectedBooking.priceBreakdown.pickupDeliveryFee || 0) <= 0 ? t('admin.bookings.free') : `${currency}${selectedBooking.priceBreakdown.pickupDeliveryFee}`}</span></p>
                  <p className='flex justify-between gap-2'><span>{t('admin.bookings.dropoffFee')}</span><span>{(selectedBooking.priceBreakdown.dropoffDeliveryFee || 0) <= 0 ? t('admin.bookings.free') : `${currency}${selectedBooking.priceBreakdown.dropoffDeliveryFee}`}</span></p>
                  {(selectedBooking.priceBreakdown.discountTotal || 0) > 0 && (
                    <p className='flex justify-between gap-2 text-green-700'><span>{t('admin.bookings.discounts')}</span><span>âˆ’{currency}{selectedBooking.priceBreakdown.discountTotal}</span></p>
                  )}
                  <p className='flex justify-between gap-2 font-semibold border-t border-borderColor pt-1'><span>{t('admin.bookings.total')}</span><span>{currency}{selectedBooking.price}</span></p>
                </div>
              ) : (
                <p><span className='font-medium'>{t('admin.bookings.total')}:</span> {currency}{selectedBooking.price}</p>
              )}
              <p><span className='font-medium'>Notes:</span> {selectedBooking.notes || 'No notes'}</p>
            </div>

            <div className='mt-5 grid grid-cols-2 gap-2'>
              <button onClick={() => changeBookingStatus(selectedBooking._id, 'confirmed')} className='px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium cursor-pointer'>{t('admin.bookings.confirm')}</button>
              <button onClick={() => changeBookingStatus(selectedBooking._id, 'cancelled')} className='px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium cursor-pointer'>{t('admin.bookings.cancel')}</button>
              <button onClick={() => changeBookingStatus(selectedBooking._id, 'completed')} className='px-3 py-2 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium cursor-pointer'>{t('admin.bookings.complete')}</button>
              <button onClick={() => changeBookingStatus(selectedBooking._id, 'active')} className='px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium cursor-pointer'>{t('admin.bookings.markActive')}</button>
              {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') && (
                <button
                  onClick={() => resendCompletionLink(selectedBooking._id)}
                  className='col-span-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-xs font-medium cursor-pointer'
                >
                  {t('admin.bookings.resendLink')}
                </button>
              )}
              {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending' || selectedBooking.status === 'ready_for_pickup') && (
                <button
                  type="button"
                  onClick={() => copyCompletionLink(selectedBooking)}
                  className='col-span-2 px-3 py-2 rounded-lg bg-sky-50 text-sky-800 text-xs font-medium cursor-pointer'
                >
                  {t('admin.bookings.copyLink')}
                </button>
              )}
              {selectedBooking.completion?.requestStatus === 'pending' && !selectedBooking.completion?.signatureComplete && (
                <button
                  type="button"
                  onClick={() => cancelCompletionLink(selectedBooking._id)}
                  className='col-span-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium cursor-pointer'
                >
                  {t('admin.bookings.cancelLink')}
                </button>
              )}
              {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') && (
                <button
                  type="button"
                  disabled={openingWhatsApp}
                  onClick={() => confirmViaWhatsApp(selectedBooking)}
                  className='col-span-2 px-3 py-2 rounded-lg bg-green-50 text-green-800 text-xs font-medium cursor-pointer disabled:opacity-50'
                >
                  {openingWhatsApp ? 'â€¦' : t('admin.bookings.confirmViaWhatsApp')}
                </button>
              )}
              {['confirmed', 'ready_for_pickup', 'active'].includes(selectedBooking.status) && (
                <button
                  type="button"
                  onClick={() => openExtensionModal(selectedBooking)}
                  className='col-span-2 px-3 py-2 rounded-lg bg-violet-50 text-violet-800 text-xs font-medium cursor-pointer'
                >
                  {t('admin.bookings.extendRental')}
                </button>
              )}
              {hasPermission('contracts') && selectedBooking.status !== 'cancelled' && (
                <>
                  <button
                    type="button"
                    onClick={() => generateInvoiceForBooking(selectedBooking)}
                    className='col-span-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium cursor-pointer'
                  >
                    {t('admin.bookings.generateInvoice')}
                  </button>
                  <Link
                    to={`/owner/contracts?bookingId=${selectedBooking._id}`}
                    className='col-span-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium text-center hover:bg-primary/15'
                  >
                    {t('admin.bookings.generateContract')}
                  </Link>
                </>
              )}
            </div>

            {selectedBooking.completion && (
              <div className='mt-4 rounded-lg border border-borderColor bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1'>
                <p className='font-medium text-gray-800'>{t('admin.bookings.completionProgress')}</p>
                {selectedBooking.completion.requestStatus ? (
                  <p>
                    {t('admin.bookings.requestStatus')}:{' '}
                    {t(`admin.bookings.requestStatuses.${selectedBooking.completion.requestStatus}`)}
                  </p>
                ) : null}
                <p>{t('admin.bookings.docs')}: {selectedBooking.completion.documentsComplete ? 'âœ“' : 'â€”'}</p>
                <p>{t('admin.bookings.pay')}: {selectedBooking.completion.paymentComplete ? 'âœ“' : 'â€”'}</p>
                <p>{t('admin.bookings.sign')}: {selectedBooking.completion.signatureComplete ? 'âœ“' : 'â€”'}</p>
              </div>
            )}

            {Array.isArray(selectedBooking.extensionHistory) && selectedBooking.extensionHistory.length > 0 && (
              <div className='mt-4 rounded-lg border border-borderColor bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-2'>
                <p className='font-medium text-gray-800'>{t('admin.bookings.extensionHistory')}</p>
                {[...selectedBooking.extensionHistory].reverse().map((ext, idx) => (
                  <div key={idx} className='border-t border-borderColor/60 pt-2 first:border-0 first:pt-0'>
                    <p>
                      {formatDateTime(ext.previousReturnDate)} â†’ {formatDateTime(ext.newReturnDate)}
                      {' '}(+{ext.deltaDays}d)
                    </p>
                    <p>
                      {currency}{ext.previousPrice} â†’ {currency}{ext.newPrice}
                      {' '}(+{currency}{ext.deltaAmount})
                    </p>
                    {ext.notes ? <p className='text-muted'>{ext.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}

            <div className='mt-4 rounded-lg border border-borderColor bg-gray-50 px-3 py-3 space-y-2'>
              <p className='font-medium text-gray-800 text-xs'>{t('admin.bookings.uploadDocuments')}</p>
              <div className='flex flex-wrap gap-2'>
                <button
                  type="button"
                  onClick={() => downloadDocument(selectedBooking._id, 'driving_license')}
                  className='px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50'
                >
                  â†“ {t('admin.bookings.downloadLicense')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument(selectedBooking._id, 'identity')}
                  className='px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50'
                >
                  â†“ {t('admin.bookings.downloadId')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument(selectedBooking._id, 'passport')}
                  className='px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50'
                >
                  â†“ {t('admin.bookings.downloadPassport')}
                </button>
              </div>
              <div className='grid gap-2 pt-1'>
                <label className='text-xs text-gray-500'>{t('admin.bookings.uploadLicense')}</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'driving_license'}
                  onChange={(e) => {
                    uploadDocument(selectedBooking._id, e.target.files?.[0], 'driving_license')
                    e.target.value = ''
                  }}
                  className='text-xs'
                />
                <div className='flex flex-wrap items-center gap-2'>
                  <select
                    className='border border-borderColor rounded px-2 py-1 text-xs'
                    value={identityType}
                    onChange={(e) => setIdentityType(e.target.value)}
                  >
                    <option value="national_id">{t('admin.bookings.nationalId')}</option>
                    <option value="passport">{t('admin.bookings.passport')}</option>
                  </select>
                  <label className='text-xs text-gray-500'>{t('admin.bookings.uploadIdentity')}</label>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'identity'}
                  onChange={(e) => {
                    uploadDocument(selectedBooking._id, e.target.files?.[0], 'identity')
                    e.target.value = ''
                  }}
                  className='text-xs'
                />
                <label className='text-xs text-gray-500'>{t('admin.bookings.downloadPassport')} (upload)</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingDoc === 'passport'}
                  onChange={(e) => {
                    uploadDocument(selectedBooking._id, e.target.files?.[0], 'passport')
                    e.target.value = ''
                  }}
                  className='text-xs'
                />
              </div>
            </div>

            <div className='mt-3'>
              <label className={labelClass}>{t('admin.bookings.paymentStatus')}</label>
              <select
                className={inputClass}
                value={selectedBooking.paymentStatus || 'pending'}
                onChange={(e) => changePaymentStatus(selectedBooking._id, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div className='mt-4 flex flex-wrap gap-2'>
              <button onClick={() => startEdit(selectedBooking)} className='admin-btn admin-btn-secondary min-h-9 text-xs'>{t('admin.bookings.edit')}</button>
              <button onClick={() => openWhatsApp(selectedBooking)} className='admin-btn admin-btn-secondary min-h-9 text-xs'>{t('admin.bookings.whatsapp')}</button>
              <button onClick={() => printBooking(selectedBooking)} className='admin-btn admin-btn-ghost min-h-9 text-xs'>{t('admin.bookings.print')}</button>
              <button onClick={() => deleteBooking(selectedBooking._id)} className='admin-btn admin-btn-danger min-h-9 text-xs'>{t('admin.bookings.delete')}</button>
            </div>
          </div>
        ) : (
          <div className='rounded-xl border border-dashed border-borderColor bg-white p-8 text-center text-gray-400 h-max'>
            {t('admin.bookings.selectHint')}
          </div>
        )}
      </div>

      <AdminDrawer
        open={Boolean(extensionOpen && selectedBooking)}
        onClose={() => !extensionBusy && setExtensionOpen(false)}
        title={t('admin.bookings.extendTitle')}
        description={selectedBooking ? `${selectedBooking.reservationId} · ${t('admin.bookings.extendCurrentReturn')}: ${formatDateTime(selectedBooking.returnDate)}` : ''}
        size="lg"
        dirty={Boolean(extensionForm.newReturnDate) && !extensionBusy}
        unsavedTitle={t('admin.ui.unsavedTitle')}
        unsavedMessage={t('admin.ui.unsavedMessage')}
        discardLabel={t('admin.ui.discard')}
        keepEditingLabel={t('admin.ui.keepEditing')}
        closeLabel={t('admin.ui.close')}
        footer={
          <>
            <button
              type="button"
              disabled={extensionBusy || !extensionForm.newReturnDate}
              onClick={previewExtension}
              className="admin-btn admin-btn-secondary"
            >
              {t('admin.bookings.extendPreview')}
            </button>
            <button
              type="submit"
              form="booking-extend-form"
              disabled={extensionBusy || !extensionPreview}
              className="admin-btn admin-btn-primary"
            >
              {extensionBusy ? t('admin.bookings.extendSaving') : t('admin.bookings.extendConfirm')}
            </button>
          </>
        }
      >
        {selectedBooking && (
          <form id="booking-extend-form" onSubmit={applyExtension} className="space-y-6">
            <ol className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              <li className={`rounded-full px-2.5 py-1 border ${!extensionPreview ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]' : 'border-[var(--admin-border)]'}`}>1 · {t('admin.bookings.extendNewReturn')}</li>
              <li className={`rounded-full px-2.5 py-1 border ${extensionPreview ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]' : 'border-[var(--admin-border)]'}`}>2 · {t('admin.bookings.extendPreview')}</li>
              <li className="rounded-full px-2.5 py-1 border border-[var(--admin-border)]">3 · {t('admin.bookings.extendConfirm')}</li>
            </ol>
            <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3 text-sm">
              <p className="admin-label mb-1">{t('admin.bookings.extendCurrentReturn')}</p>
              <p className="font-medium text-[var(--admin-ink)]">
                {currency}{selectedBooking.price} · {formatDateTime(selectedBooking.pickupDate)} → {formatDateTime(selectedBooking.returnDate)}
              </p>
            </div>
            <DrawerSection title={t('admin.bookings.extendNewReturn')}>
              <FormField label={t('admin.bookings.extendNewReturn')} required className="sm:col-span-2">
                <input
                  type="datetime-local"
                  required
                  value={extensionForm.newReturnDate}
                  onChange={(e) => {
                    setExtensionPreview(null)
                    setExtensionForm((f) => ({ ...f, newReturnDate: e.target.value }))
                  }}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t('admin.bookings.extendNotes')} className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={extensionForm.notes}
                  onChange={(e) => setExtensionForm((f) => ({ ...f, notes: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-[var(--admin-ink)]">
                <input
                  type="checkbox"
                  checked={extensionForm.regenerateContract}
                  onChange={(e) => setExtensionForm((f) => ({ ...f, regenerateContract: e.target.checked }))}
                />
                {t('admin.bookings.extendRegenContract')}
              </label>
            </DrawerSection>
            {extensionPreview && (
              <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 text-sm space-y-1.5">
                <p className="flex justify-between">
                  <span>{t('admin.bookings.extendDeltaDays')}</span>
                  <strong>+{extensionPreview.deltaDays}</strong>
                </p>
                <p className="flex justify-between">
                  <span>{t('admin.bookings.extendDeltaAmount')}</span>
                  <strong>{currency}{extensionPreview.deltaAmount}</strong>
                </p>
                <p className="flex justify-between text-base pt-2 border-t border-[var(--admin-border)]">
                  <span>{t('admin.bookings.extendNewTotal')}</span>
                  <strong className="text-[var(--admin-primary)]">{currency}{extensionPreview.newPrice}</strong>
                </p>
              </div>
            )}
          </form>
        )}
      </AdminDrawer>

      <AdminDrawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`${t('admin.bookings.edit')} ${t('admin.bookings.reservation')}`}
        description={editing?.reservationId}
        size="lg"
        dirty={Boolean(editing)}
        unsavedTitle={t('admin.ui.unsavedTitle')}
        unsavedMessage={t('admin.ui.unsavedMessage')}
        discardLabel={t('admin.ui.discard')}
        keepEditingLabel={t('admin.ui.keepEditing')}
        closeLabel={t('admin.ui.close')}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="admin-btn admin-btn-secondary">
              {t('admin.common.cancel')}
            </button>
            <button type="submit" form="booking-edit-form" className="admin-btn admin-btn-primary">
              {t('admin.common.save')}
            </button>
          </>
        }
      >
        {editing && (
          <form id="booking-edit-form" onSubmit={saveEdit} className="space-y-6">
            <DrawerSection title={t('admin.bookings.customer')}>
              <FormField label={t('admin.bookings.customerName')} required>
                <input className={inputClass} value={editForm.customerName} onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })} required />
              </FormField>
              <FormField label={t('admin.bookings.phone')} required>
                <PhoneInput value={editForm.customerPhone} onChange={(customerPhone) => setEditForm({ ...editForm, customerPhone })} required inputClassName="admin-input min-h-11 h-auto" />
              </FormField>
              <FormField label={t('admin.bookings.email')} required className="sm:col-span-2">
                <input type="email" className={inputClass} value={editForm.customerEmail} onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })} required />
              </FormField>
            </DrawerSection>
            <DrawerSection title={t('admin.bookings.status')}>
              <FormField label={t('admin.bookings.status')}>
                <select className={inputClass} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="ready_for_pickup">Ready for Pickup</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </FormField>
              <FormField label={t('admin.bookings.paymentStatus')}>
                <select className={inputClass} value={editForm.paymentStatus} onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </FormField>
              <FormField label={t('admin.walkIn.pickup')} required>
                <input type="datetime-local" className={inputClass} value={editForm.pickupDate} onChange={(e) => setEditForm({ ...editForm, pickupDate: e.target.value })} required />
              </FormField>
              <FormField label={t('admin.walkIn.return')} required>
                <input type="datetime-local" className={inputClass} value={editForm.returnDate} onChange={(e) => setEditForm({ ...editForm, returnDate: e.target.value })} required />
              </FormField>
              <FormField label={t('admin.bookings.pickupLocation')}>
                <input className={inputClass} value={editForm.pickupLocation} onChange={(e) => setEditForm({ ...editForm, pickupLocation: e.target.value })} required />
              </FormField>
              <FormField label={t('admin.walkIn.returnLoc')}>
                <input className={inputClass} value={editForm.returnLocation} onChange={(e) => setEditForm({ ...editForm, returnLocation: e.target.value })} required />
              </FormField>
            </DrawerSection>
            <DrawerSection title={t('admin.bookings.assignVehicle')}>
              <FormField label={t('admin.bookings.assignVehicle')} className="sm:col-span-2">
                <SearchSelect
                  value={editForm.carId}
                  onChange={(carId) => setEditForm({ ...editForm, carId })}
                  placeholder={t('admin.accounting.searchVehicle')}
                  emptyLabel={t('admin.ui.noResults')}
                  options={editVehicleOptions.map((c) => ({
                    value: c._id,
                    label: `${c.brand} ${c.model}`,
                    hint: [c.licensePlate, c.fleetId].filter(Boolean).join(' · '),
                  }))}
                />
              </FormField>
              <FormField label={t('admin.walkIn.notes')} className="sm:col-span-2">
                <textarea className={inputClass} rows="3" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </FormField>
            </DrawerSection>
          </form>
        )}
      </AdminDrawer>
    </div>
  )
}

export default ManageBookings

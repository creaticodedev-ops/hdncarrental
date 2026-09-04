import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Title from '../../components/owner/Title'
import ConfirmDialog from '../../components/owner/ConfirmDialog'
import ReservationList from '../../components/owner/bookings/ReservationList'
import ReservationDetail from '../../components/owner/bookings/ReservationDetail'
import SignatureRequestDrawer from '../../components/owner/bookings/SignatureRequestDrawer'
import {
  customerEmail,
  extraCalendarDays,
  formatDateTime as formatDt,
  hasSignedContractArchive,
  money,
  presentBooking,
  rentalDayCount,
  reservationRef,
  toAgencyDateTimeLocal,
  addHoursAgencyLocal,
  getSignatureStatus,
} from '../../components/owner/bookings/reservationHelpers'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { escapeHtml, getErrorMessage } from '../../utils/apiError'
import PhoneInput, { isPhoneValid } from '../../components/PhoneInput'
import { buildOwnerCompletionWaUrl, buildWaMeUrl, createExternalTabOpener, openOwnerSignedContractWhatsApp } from '../../utils/whatsapp'
import { AdminDrawer, DrawerSection, FormField, VehicleSelect } from '../../admin/ui'
import { downloadXlsx } from '../../utils/downloadXlsx'
import { openDocumentPdf } from '../../utils/openDocumentPdf'
import DocumentGenerationOverlay from '../../components/DocumentGenerationOverlay'
import { useDocumentGeneration } from '../../hooks/useDocumentGeneration'
import DateField from '../../components/calendar/DateField'

const emptyFilters = {
  search: '',
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

const ManageBookings = () => {
  const { currency, axios, hasPermission } = useAppContext()
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [bookings, setBookings] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [fleetCars, setFleetCars] = useState([])
  const [assigningVehicle, setAssigningVehicle] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState('')
  const [identityType, setIdentityType] = useState('national_id')
  const [completionLinkCache, setCompletionLinkCache] = useState({})
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false)
  const [sharingSignedContract, setSharingSignedContract] = useState(false)
  const [whatsappDials, setWhatsappDials] = useState({
    reservationDial: '',
    confirmationDial: '',
  })
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [extensionForm, setExtensionForm] = useState({ newReturnDate: '', notes: '' })
  const [extensionPreview, setExtensionPreview] = useState(null)
  const [extensionBusy, setExtensionBusy] = useState(false)
  const [extensionError, setExtensionError] = useState('')
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [signatureBusy, setSignatureBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [sigFilter, setSigFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [inspectorContract, setInspectorContract] = useState(null)
  const [contractLoading, setContractLoading] = useState(false)
  const docGen = useDocumentGeneration()
  const selectedIdRef = useRef(null)
  selectedIdRef.current = selectedBooking?._id

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
        if (selectedIdRef.current) {
          const refreshed = data.bookings.find((b) => b._id === selectedIdRef.current)
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

  const selectBooking = (booking) => {
    setSelectedBooking(booking)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (booking?._id) next.set('bookingId', booking._id)
      else next.delete('bookingId')
      return next
    }, { replace: true })
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const clearSelection = () => {
    setSelectedBooking(null)
    setSignatureOpen(false)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('bookingId')
      return next
    }, { replace: true })
  }

  useEffect(() => {
    const id = searchParams.get('bookingId')
    if (!id || !bookings.length) return
    const found = bookings.find((b) => b._id === id)
    if (found && found._id !== selectedIdRef.current) {
      setSelectedBooking(found)
    }
  }, [bookings, searchParams])

  useEffect(() => {
    const bookingId = selectedBooking?._id
    if (!bookingId || !hasPermission('contracts')) {
      setInspectorContract(null)
      setContractLoading(false)
      return undefined
    }
    let cancelled = false
    setContractLoading(true)
    axios
      .get(`/api/contracts?bookingId=${bookingId}&limit=1&summary=1`)
      .then(({ data }) => {
        if (cancelled) return
        setInspectorContract(data.success ? data.contracts?.[0] || null : null)
      })
      .catch(() => {
        if (!cancelled) setInspectorContract(null)
      })
      .finally(() => {
        if (!cancelled) setContractLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedBooking?._id, selectedBooking?.updatedAt, axios, hasPermission])

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
    setSigFilter('')
    setContractFilter('')
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const setQuickFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setAppliedFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const applySearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    setAppliedFilters((prev) => ({ ...prev, search: filters.search || '' }))
  }

  const visibleBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (sigFilter) {
        const status = booking?.completion?.signatureComplete
          ? 'signed'
          : (booking?.completion?.requestStatus && booking.completion.requestStatus !== 'none'
            ? booking.completion.requestStatus
            : 'none')
        if (status !== sigFilter) return false
      }
      if (contractFilter) {
        const status = booking?.completion?.contractPdfUrl
          ? 'ready'
          : booking?.completion?.documentsComplete
            ? 'in_progress'
            : 'none'
        if (status !== contractFilter) return false
      }
      return true
    })
  }, [bookings, sigFilter, contractFilter])

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
    setSignatureBusy(true)
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
    } finally {
      setSignatureBusy(false)
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

  const copyCompletionLink = async (booking) => {
    setSignatureBusy(true)
    try {
      const data = await ensureCompletionLinkPayload(booking)
      const url = data.shareableCompletionUrl || data.completionUrl
      await navigator.clipboard.writeText(url)
      toast.success(t('admin.bookings.linkCopied'))
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSignatureBusy(false)
    }
  }

  const generateSignatureLink = async (booking) => {
    setSignatureBusy(true)
    try {
      await ensureCompletionLinkPayload(booking)
      toast.success(t('admin.bookings.linkReady'))
      fetchOwnerBookings()
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 8000 })
    } finally {
      setSignatureBusy(false)
    }
  }

  const cancelCompletionLink = async (bookingId) => {
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

  const openExtensionModal = (booking) => {
    setExtensionForm({
      newReturnDate: addHoursAgencyLocal(booking.returnDate, 24),
      notes: '',
    })
    setExtensionPreview(null)
    setExtensionError('')
    setExtensionOpen(true)
  }

  const previewExtension = async () => {
    if (!selectedBooking) return
    setExtensionBusy(true)
    setExtensionPreview(null)
    setExtensionError('')
    try {
      const { data } = await axios.post('/api/bookings/owner/extend/preview', {
        bookingId: selectedBooking._id,
        newReturnDate: extensionForm.newReturnDate,
      })
      if (!data.success) {
        toast.error(data.message || t('admin.bookings.extendPreviewError'))
        setExtensionError(data.message || t('admin.bookings.extendUnavailable'))
        return
      }
      setExtensionPreview(data.preview)
    } catch (error) {
      const msg = getErrorMessage(error)
      setExtensionError(msg)
      toast.error(msg)
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
      })
      if (!data.success) {
        toast.error(data.message || t('admin.bookings.extendApplyError'))
        return
      }
      const pdfUrl = data.contract?.pdfUrl || data.booking?.completion?.contractPdfUrl || ''
      if (data.contract?.regenerated && pdfUrl) {
        toast.success(t('admin.bookings.extensionContractReady'))
        window.open(pdfUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast.success(t('admin.bookings.extensionApplied'))
        if (data.contract && !data.contract.regenerated) {
          toast.error(t('admin.bookings.extensionContractFailed'))
        }
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

  const openCompletionWaMe = (booking, completionUrl, dial) => {
    const url = buildOwnerCompletionWaUrl(booking, completionUrl, {
      currency,
      dial: dial || whatsappDials.confirmationDial,
    })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const confirmViaWhatsApp = async (booking) => {
    if (!booking?._id) return
    setOpeningWhatsApp(true)
    setSignatureBusy(true)
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
      setSignatureBusy(false)
    }
  }

  const shareSignedContract = async (booking) => {
    if (!booking?._id) return
    setSharingSignedContract(true)
    const opener = createExternalTabOpener()
    try {
      await openOwnerSignedContractWhatsApp(axios, booking, { language, opener })
      toast.success(t('admin.bookings.shareSignedContractOpened'))
    } catch (error) {
      opener.close()
      toast.error(getErrorMessage(error) || t('admin.bookings.shareSignedContractFailed'))
    } finally {
      setSharingSignedContract(false)
    }
  }

  const requestGoogleReview = async (booking) => {
    const crmKey = String(booking?.customerEmail || '').trim()
    if (!crmKey) {
      toast.error(t('admin.bookings.requestGoogleReviewNoCustomer'))
      return
    }
    if (!booking?.customerPhone) {
      toast.error(t('admin.customers.whatsappNoPhone'))
      return
    }
    const opener = createExternalTabOpener()
    try {
      const { data } = await axios.post(
        `/api/owner/crm/customers/${encodeURIComponent(crmKey)}/whatsapp`,
        { templateId: 'review_request', bookingId: booking._id, lang: language },
      )
      if (!data?.success || !data.whatsappUrl) {
        throw new Error(data?.message || t('admin.bookings.requestGoogleReviewFailed'))
      }
      if (!opener.navigate(data.whatsappUrl)) opener.close()
      toast.success(t('admin.bookings.requestGoogleReviewOpened'))
    } catch (error) {
      opener.close()
      toast.error(getErrorMessage(error) || t('admin.bookings.requestGoogleReviewFailed'))
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
      customerEmail: customerEmail(booking),
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
    try {
      const { data } = await axios.post('/api/bookings/delete', { bookingId })
      if (data.success) {
        toast.success(data.message)
        if (selectedBooking?._id === bookingId) clearSelection()
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
    const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : '—'
    const text = [
      'Hello, regarding this reservation:',
      '',
      `ID: ${booking.reservationId || '—'}`,
      `Customer: ${booking.customerName || '—'}`,
      `Phone: ${booking.customerPhone || '—'}`,
      `Vehicle: ${vehicle}`,
      `Status: ${booking.status || '—'}`,
    ].join('\n')
    window.open(
      buildWaMeUrl(text, whatsappDials.confirmationDial || whatsappDials.reservationDial),
      '_blank',
      'noopener,noreferrer',
    )
  }

  const exportCsv = async () => {
    try {
      const params = {}
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params[key] = value
      })
      await downloadXlsx(axios, '/api/bookings/owner/export', {
        params,
        language,
        fallbackName: 'reservations.xlsx',
      })
      toast.success(t('admin.common.exportSuccess'))
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.common.exportError'))
    }
  }

  const openContractPdf = async (contract, { download = false, signed = false } = {}) => {
    if (!contract?._id) {
      const url = selectedBooking?.completion?.contractPdfUrl
      if (!url) {
        toast.error(t('admin.bookings.contractPdfMissing'))
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const params = new URLSearchParams()
      if (signed) params.set('variant', 'signed')
      if (download) params.set('download', '1')
      const qs = params.toString()
      await openDocumentPdf(
        axios,
        `/api/contracts/${contract._id}/pdf${qs ? `?${qs}` : ''}`,
        {
          filename: `${contract.contractNumber || 'contract'}${signed ? '-signed' : ''}.pdf`,
          download,
        },
      )
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.bookings.contractPdfMissing'))
    }
  }

  const openBookingContract = (booking) => {
    if (inspectorContract?._id && booking?._id === selectedBooking?._id) {
      openContractPdf(inspectorContract)
      return
    }
    const url = booking?.completion?.contractPdfUrl
    if (!url) {
      toast.error(t('admin.bookings.documentMissing'))
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const generateInspectorContract = async () => {
    if (!selectedBooking?._id || docGen.running) return
    try {
      await docGen.run(
        async () => {
          const { data } = await axios.post('/api/contracts/generate', {
            bookingId: selectedBooking._id,
            includeCompanyStamp: true,
          })
          if (!data.success) throw new Error(data.message)
          return data
        },
        {
          mode: 'generate',
          axios,
          extractPdfApiPath: (data) => (data?.contract?._id ? `/api/contracts/${data.contract._id}/pdf` : ''),
          extractPdfUrl: (data) => data?.contract?.pdfUrl || '',
          onSuccess: async (data) => {
            setInspectorContract(data.contract || null)
            toast.success(data.alreadyExists ? data.message : t('admin.bookings.contractGenerated'))
            fetchOwnerBookings()
            if (data.contract?._id) {
              await openContractPdf(data.contract)
            }
          },
        },
      )
    } catch (error) {
      if (!docGen.open) toast.error(getErrorMessage(error))
    }
  }

  const regenerateInspectorContract = async () => {
    if (!inspectorContract?._id || docGen.running) return
    try {
      await docGen.run(
        async () => {
          const { data } = await axios.post(`/api/contracts/${inspectorContract._id}/regenerate`, {
            fromBooking: true,
          })
          if (!data.success) throw new Error(data.message)
          return data
        },
        {
          mode: 'regenerate',
          axios,
          extractPdfApiPath: (data) => (data?.contract?._id ? `/api/contracts/${data.contract._id}/pdf` : ''),
          extractPdfUrl: (data) => data?.contract?.pdfUrl || '',
          onSuccess: async (data) => {
            setInspectorContract(data.contract || inspectorContract)
            toast.success(t('admin.bookings.contractRegenerated'))
            fetchOwnerBookings()
            if (data.contract?._id) {
              await openContractPdf(data.contract)
            }
          },
        },
      )
    } catch (error) {
      if (!docGen.open) toast.error(getErrorMessage(error))
    }
  }

  const printBooking = (booking) => {
    if (!booking) return
    const aligned = presentBooking(booking)
    const reservationId = booking.reservationId || `RES-${booking._id?.toString().slice(-8).toUpperCase()}`
    const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : '-'
    const billedDays = rentalDayCount(booking.pickupDate, booking.returnDate)
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
            <tr><td>Email</td><td>${escapeHtml(customerEmail(booking) || '-')}</td></tr>
            <tr><td>Vehicle</td><td>${escapeHtml(vehicle)}</td></tr>
            <tr><td>Pickup Location</td><td>${escapeHtml(booking.pickupLocation || '-')}</td></tr>
            <tr><td>Drop-off Location</td><td>${escapeHtml(booking.returnLocation || '-')}</td></tr>
            <tr><td>Pickup</td><td>${escapeHtml(formatDt(booking.pickupDate, language))}</td></tr>
            <tr><td>Return</td><td>${escapeHtml(formatDt(booking.returnDate, language))}</td></tr>
            <tr><td>Duration</td><td>${escapeHtml(String(billedDays))} day(s)</td></tr>
            <tr><td>Status</td><td>${escapeHtml(booking.status)}</td></tr>
            <tr><td>Payment</td><td>${escapeHtml(booking.paymentStatus)}</td></tr>
            <tr><td>Total</td><td>${escapeHtml(String(currency))}${escapeHtml(String(aligned?.price ?? booking.price))}</td></tr>
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

  const runConfirm = () => {
    const action = confirmAction
    setConfirmAction(null)
    if (!action) return
    if (action.type === 'delete') deleteBooking(action.bookingId)
    if (action.type === 'cancelLink') cancelCompletionLink(action.bookingId)
    if (action.type === 'cancelBooking') changeBookingStatus(action.bookingId, 'cancelled')
    if (action.type === 'regenerateContract') regenerateInspectorContract()
  }

  const liveExtraDays = selectedBooking
    ? extraCalendarDays(
        selectedBooking.pickupDate,
        selectedBooking.returnDate,
        extensionForm.newReturnDate,
      )
    : 0
  const partnerDiscounts = extensionPreview?.priceBreakdown?.discounts?.filter((d) => Number(d.amount) > 0) || []
  const inputClass = 'admin-input'

  return (
    <div className={`res-module admin-page-pad w-full min-w-0 relative ${selectedBooking ? 'has-selection' : ''}`}>
      <DocumentGenerationOverlay
        open={docGen.open}
        status={docGen.status}
        mode={docGen.mode}
        error={docGen.error}
        pdfUrl={docGen.pdfUrl}
        onRetry={() => docGen.retry()}
        onDismiss={() => docGen.close()}
        autoDismissMs={docGen.status === 'success' ? 850 : 0}
        embedPdf={false}
        position="fixed"
      />
      <div className="res-chrome">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <Title title={t('admin.bookings.title')} subTitle={t('admin.bookings.subtitle')} />
          <div className="res-chrome-tools">
            <Link to="/owner/walk-in" className="admin-btn admin-btn-primary res-btn">
              + {t('admin.bookings.newReservation')}
            </Link>
            <button type="button" onClick={() => setShowFilters((v) => !v)} className="admin-btn admin-btn-secondary res-btn">
              {showFilters ? t('admin.bookings.hideFilters') : t('admin.bookings.moreFilters')}
            </button>
            <button type="button" onClick={exportCsv} className="admin-btn admin-btn-secondary res-btn">
              {t('admin.common.exportExcel')}
            </button>
          </div>
        </div>

        <div className="res-filter-bar">
          <input
            className="admin-input res-filter-search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch()
            }}
            placeholder={t('admin.bookings.quickSearchPlaceholder')}
          />
          <select
            className="res-filter-chip"
            value={filters.status}
            onChange={(e) => setQuickFilter('status', e.target.value)}
            aria-label={t('admin.bookings.status')}
          >
            <option value="">{t('admin.bookings.status')}: {t('admin.bookings.filterAll')}</option>
            <option value="pending">{t('admin.bookings.statuses.pending')}</option>
            <option value="confirmed">{t('admin.bookings.statuses.confirmed')}</option>
            <option value="ready_for_pickup">{t('admin.bookings.statuses.ready_for_pickup')}</option>
            <option value="active">{t('admin.bookings.statuses.active')}</option>
            <option value="completed">{t('admin.bookings.statuses.completed')}</option>
            <option value="cancelled">{t('admin.bookings.statuses.cancelled')}</option>
          </select>
          <select
            className="res-filter-chip"
            value={filters.paymentStatus}
            onChange={(e) => setQuickFilter('paymentStatus', e.target.value)}
            aria-label={t('admin.bookings.payment')}
          >
            <option value="">{t('admin.bookings.payment')}: {t('admin.bookings.filterAll')}</option>
            <option value="pending">{t('admin.bookings.paymentLabels.unpaid')}</option>
            <option value="paid">{t('admin.bookings.paymentLabels.paid')}</option>
            <option value="failed">{t('admin.bookings.paymentLabels.failed')}</option>
            <option value="refunded">{t('admin.bookings.paymentLabels.refunded')}</option>
          </select>
          <button type="button" className="admin-btn admin-btn-secondary res-btn shrink-0" onClick={applySearch}>
            {t('admin.bookings.applyFilters')}
          </button>
        </div>

        {showFilters && (
          <form onSubmit={applyFilters} className="admin-card mt-3 grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div>
              <label className="admin-label">{t('admin.bookings.customerName')}</label>
              <input className={inputClass} value={filters.customerName} onChange={(e) => setFilters({ ...filters, customerName: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.phone')}</label>
              <input className={inputClass} value={filters.phone} onChange={(e) => setFilters({ ...filters, phone: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.email')}</label>
              <input className={inputClass} value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.reservationId')}</label>
              <input className={inputClass} value={filters.reservationId} onChange={(e) => setFilters({ ...filters, reservationId: e.target.value })} placeholder="RES-XXXXXXXX" />
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.vehicle')}</label>
              <input className={inputClass} value={filters.vehicle} onChange={(e) => setFilters({ ...filters, vehicle: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.licensePlate')}</label>
              <input className={inputClass} value={filters.licensePlate} onChange={(e) => setFilters({ ...filters, licensePlate: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.status')}</label>
              <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">{t('admin.bookings.allStatuses')}</option>
                <option value="pending">{t('admin.bookings.statuses.pending')}</option>
                <option value="confirmed">{t('admin.bookings.statuses.confirmed')}</option>
                <option value="ready_for_pickup">{t('admin.bookings.statuses.ready_for_pickup')}</option>
                <option value="active">{t('admin.bookings.statuses.active')}</option>
                <option value="completed">{t('admin.bookings.statuses.completed')}</option>
                <option value="cancelled">{t('admin.bookings.statuses.cancelled')}</option>
              </select>
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.paymentStatus')}</label>
              <select className={inputClass} value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
                <option value="">{t('admin.bookings.allPayments')}</option>
                <option value="pending">{t('admin.bookings.paymentLabels.unpaid')}</option>
                <option value="paid">{t('admin.bookings.paymentLabels.paid')}</option>
                <option value="failed">{t('admin.bookings.paymentLabels.failed')}</option>
                <option value="refunded">{t('admin.bookings.paymentLabels.refunded')}</option>
              </select>
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.channel')}</label>
              <select className={inputClass} value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })}>
                <option value="">{t('admin.bookings.allChannels')}</option>
                <option value="online">Online</option>
                <option value="walk_in">Walk-in</option>
              </select>
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.signature')}</label>
              <select className={inputClass} value={sigFilter} onChange={(e) => setSigFilter(e.target.value)}>
                <option value="">{t('admin.bookings.filterAll')}</option>
                <option value="none">{t('admin.bookings.requestStatuses.none')}</option>
                <option value="pending">{t('admin.bookings.requestStatuses.pending')}</option>
                <option value="signed">{t('admin.bookings.requestStatuses.signed')}</option>
                <option value="expired">{t('admin.bookings.requestStatuses.expired')}</option>
                <option value="cancelled">{t('admin.bookings.requestStatuses.cancelled')}</option>
              </select>
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.contract')}</label>
              <select className={inputClass} value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
                <option value="">{t('admin.bookings.filterAll')}</option>
                <option value="none">{t('admin.bookings.contractLabels.none')}</option>
                <option value="in_progress">{t('admin.bookings.contractLabels.in_progress')}</option>
                <option value="ready">{t('admin.bookings.contractLabels.ready')}</option>
              </select>
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.pickupLocation')}</label>
              <input className={inputClass} value={filters.pickupLocation} onChange={(e) => setFilters({ ...filters, pickupLocation: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.pickupFrom')}</label>
              <DateField className={inputClass} value={filters.pickupDateFrom} onChange={(pickupDateFrom) => setFilters({ ...filters, pickupDateFrom })} />
            </div>
            <div>
              <label className="admin-label">{t('admin.bookings.pickupTo')}</label>
              <DateField className={inputClass} value={filters.pickupDateTo} onChange={(pickupDateTo) => setFilters({ ...filters, pickupDateTo })} />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">{t('admin.bookings.applyFilters')}</button>
              <button type="button" onClick={clearFilters} className="admin-btn admin-btn-secondary admin-btn-sm">{t('admin.bookings.clear')}</button>
              <span className="ml-auto text-sm text-[var(--admin-muted)]">
                {pagination.total === 1
                  ? t('admin.bookings.count', { count: pagination.total })
                  : t('admin.bookings.count_plural', { count: pagination.total })}
              </span>
            </div>
          </form>
        )}
      </div>

      <div className="res-split">
        <div className="res-list min-w-0">
          <ReservationList
            t={t}
            language={language}
            currency={currency}
            bookings={visibleBookings}
            loading={loading}
            selectedId={selectedBooking?._id}
            onSelect={selectBooking}
            onEdit={startEdit}
            onPrint={printBooking}
            onViewContract={openBookingContract}
            onWhatsApp={openWhatsApp}
            onShareSigned={shareSignedContract}
            onDelete={(booking) => setConfirmAction({ type: 'delete', bookingId: booking._id })}
            onDownloadLicense={(booking) => downloadDocument(booking._id, 'driving_license')}
            onDownloadId={(booking) => downloadDocument(booking._id, 'identity')}
            onDownloadPassport={(booking) => downloadDocument(booking._id, 'passport')}
            pagination={pagination}
            onPrev={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            onNext={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            onPageSize={(limit) => setPagination((p) => ({ ...p, page: 1, limit }))}
          />
        </div>

        <ReservationDetail
          t={t}
          language={language}
          currency={currency}
          booking={selectedBooking}
          compatibleVehicles={compatibleVehicles}
          assigningVehicle={assigningVehicle}
          uploadingDoc={uploadingDoc}
          identityType={identityType}
          setIdentityType={setIdentityType}
          hasPermission={hasPermission}
          onBack={clearSelection}
          onRequestSignature={() => setSignatureOpen(true)}
          onExtend={() => openExtensionModal(selectedBooking)}
          onEdit={() => startEdit(selectedBooking)}
          onResendSignature={() => resendCompletionLink(selectedBooking._id)}
          onCancelSignature={() => setConfirmAction({ type: 'cancelLink', bookingId: selectedBooking._id })}
          onChangeStatus={(status) => changeBookingStatus(selectedBooking._id, status)}
          onChangePayment={(status) => changePaymentStatus(selectedBooking._id, status)}
          onAssignVehicle={(carId) => assignVehicle(selectedBooking._id, carId)}
          onWhatsApp={() => openWhatsApp(selectedBooking)}
          onEmail={() => resendCompletionLink(selectedBooking._id)}
          onCopyLink={() => copyCompletionLink(selectedBooking)}
          onSetAmountPaid={async (amountPaid) => {
            try {
              const { data } = await axios.put(`/api/bookings/owner/${selectedBooking._id}/payments`, { amountPaid })
              if (!data.success) throw new Error(data.message)
              toast.success(t('admin.walkInReady.paidSaved'))
              if (data.booking) setSelectedBooking(data.booking)
              fetchOwnerBookings()
            } catch (error) {
              toast.error(getErrorMessage(error))
            }
          }}
          onPrint={() => printBooking(selectedBooking)}
          onViewContract={() => openContractPdf(inspectorContract)}
          onGenerateContract={generateInspectorContract}
          onDownloadContract={() => openContractPdf(inspectorContract, { download: true })}
          onEditContract={() => {
            if (inspectorContract?._id) navigate(`/owner/contracts?edit=${inspectorContract._id}`)
          }}
          onRegenerateContract={() => {
            const signedCurrent = getSignatureStatus(selectedBooking) === 'signed'
              && !hasSignedContractArchive(inspectorContract)
            setConfirmAction({ type: 'regenerateContract', signed: signedCurrent })
          }}
          onViewSignedContract={() => openContractPdf(inspectorContract, {
            signed: Boolean(inspectorContract?.signedPdfUrl),
          })}
          onShareSignedContract={() => shareSignedContract(selectedBooking)}
          onRequestGoogleReview={() => requestGoogleReview(selectedBooking)}
          sharingSignedContract={sharingSignedContract}
          contract={inspectorContract}
          contractLoading={contractLoading}
          contractBusy={docGen.running}
          onDelete={() => setConfirmAction({ type: 'delete', bookingId: selectedBooking._id })}
          onCancelReservation={() => setConfirmAction({ type: 'cancelBooking', bookingId: selectedBooking._id })}
          onGenerateInvoice={() => generateInvoiceForBooking(selectedBooking)}
          onDownloadLicense={() => downloadDocument(selectedBooking._id, 'driving_license')}
          onDownloadId={() => downloadDocument(selectedBooking._id, 'identity')}
          onDownloadPassport={() => downloadDocument(selectedBooking._id, 'passport')}
          onUpload={(file, docType) => uploadDocument(selectedBooking._id, file, docType)}
        />
      </div>

      <SignatureRequestDrawer
        open={Boolean(signatureOpen && selectedBooking)}
        onClose={() => setSignatureOpen(false)}
        booking={selectedBooking}
        t={t}
        language={language}
        linkUrl={resolveCompletionUrl(selectedBooking)}
        busy={signatureBusy || openingWhatsApp || sharingSignedContract}
        onGenerate={() => generateSignatureLink(selectedBooking)}
        onCopy={() => copyCompletionLink(selectedBooking)}
        onResend={() => resendCompletionLink(selectedBooking._id)}
        onShare={() => confirmViaWhatsApp(selectedBooking)}
        onShareSigned={() => shareSignedContract(selectedBooking)}
        sharingSigned={sharingSignedContract}
        onCancelRequest={() => setConfirmAction({ type: 'cancelLink', bookingId: selectedBooking._id })}
        onEditReservation={() => {
          setSignatureOpen(false)
          startEdit(selectedBooking)
        }}
      />

      <AdminDrawer
        open={Boolean(extensionOpen && selectedBooking)}
        onClose={() => !extensionBusy && setExtensionOpen(false)}
        title={t('admin.bookings.extendTitle')}
        description={selectedBooking ? reservationRef(selectedBooking) : ''}
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
              <li className={`rounded-full border px-2.5 py-1 ${!extensionPreview ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]' : 'border-[var(--admin-border)]'}`}>
                1 · {t('admin.bookings.extendStepDates')}
              </li>
              <li className={`rounded-full border px-2.5 py-1 ${extensionPreview ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]' : 'border-[var(--admin-border)]'}`}>
                2 · {t('admin.bookings.extendStepReview')}
              </li>
              <li className="rounded-full border border-[var(--admin-border)] px-2.5 py-1">
                3 · {t('admin.bookings.extendStepConfirm')}
              </li>
            </ol>

            <div className="space-y-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3 text-sm">
              <p className="admin-label mb-1">{t('admin.bookings.extendCurrentReturn')}</p>
              <p className="font-medium text-[var(--admin-ink)]">{formatDt(selectedBooking.returnDate, language)}</p>
              <p className="text-xs text-[var(--admin-muted)]">
                {t('admin.bookings.extendCurrentTotal')}: {money(currency, selectedBooking.price)}
              </p>
            </div>

            <DrawerSection title={t('admin.bookings.extendNewReturn')} description={t('admin.bookings.extendPreviewHint')}>
              <FormField label={t('admin.bookings.extendNewReturn')} required className="sm:col-span-2">
                <DateField
                  mode="datetime"
                  required
                  min={toAgencyDateTimeLocal(selectedBooking.returnDate)}
                  value={extensionForm.newReturnDate}
                  onChange={(newReturnDate) => {
                    setExtensionPreview(null)
                    setExtensionError('')
                    setExtensionForm((f) => ({ ...f, newReturnDate }))
                  }}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t('admin.bookings.extendDeltaDays')}>
                <p className="text-sm font-medium text-[var(--admin-ink)]">+{liveExtraDays}</p>
              </FormField>
              <FormField label={t('admin.bookings.extendNotes')} className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={extensionForm.notes}
                  onChange={(e) => setExtensionForm((f) => ({ ...f, notes: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
              <p className="sm:col-span-2 text-xs text-[var(--admin-muted)]">
                {t('admin.bookings.extendContractHint')}
              </p>
            </DrawerSection>

            {extensionError ? (
              <p className="rounded-[var(--admin-radius)] bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
                {extensionError}
              </p>
            ) : null}

            {extensionPreview ? (
              <div className="space-y-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 text-sm">
                <p className="flex justify-between gap-2">
                  <span>{t('admin.bookings.extendAvailability')}</span>
                  <strong className="text-[var(--admin-success)]">{t('admin.bookings.extendAvailable')}</strong>
                </p>
                <p className="flex justify-between gap-2">
                  <span>{t('admin.bookings.extendDeltaDays')}</span>
                  <strong>+{extensionPreview.deltaDays}</strong>
                </p>
                {partnerDiscounts.map((d, i) => (
                  <p key={i} className="flex justify-between gap-2 text-[var(--admin-success)]">
                    <span>{t('admin.bookings.extendPartnerDiscount')}</span>
                    <strong>−{money(currency, d.amount)}</strong>
                  </p>
                ))}
                <p className="flex justify-between gap-2">
                  <span>{t('admin.bookings.extendDeltaAmount')}</span>
                  <strong>{money(currency, extensionPreview.deltaAmount)}</strong>
                </p>
                <p className="flex justify-between gap-2 border-t border-[var(--admin-border)] pt-2 text-base">
                  <span>{t('admin.bookings.extendNewTotal')}</span>
                  <strong className="text-[var(--admin-primary)]">{money(currency, extensionPreview.newPrice)}</strong>
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--admin-muted)]">{t('admin.bookings.extendNeedPreview')}</p>
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
              <FormField
                label={t('admin.bookings.email')}
                hint={t('admin.bookings.emailOptionalHint')}
                className="sm:col-span-2"
              >
                <input
                  type="email"
                  className={inputClass}
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                  placeholder={t('admin.bookings.emailPlaceholder')}
                />
              </FormField>
            </DrawerSection>
            <DrawerSection title={t('admin.bookings.status')}>
              <FormField label={t('admin.bookings.status')}>
                <select className={inputClass} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="pending">{t('admin.bookings.statuses.pending')}</option>
                  <option value="confirmed">{t('admin.bookings.statuses.confirmed')}</option>
                  <option value="ready_for_pickup">{t('admin.bookings.statuses.ready_for_pickup')}</option>
                  <option value="active">{t('admin.bookings.statuses.active')}</option>
                  <option value="completed">{t('admin.bookings.statuses.completed')}</option>
                  <option value="cancelled">{t('admin.bookings.statuses.cancelled')}</option>
                </select>
              </FormField>
              <FormField label={t('admin.bookings.paymentStatus')}>
                <select className={inputClass} value={editForm.paymentStatus} onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}>
                  <option value="pending">{t('admin.bookings.paymentLabels.unpaid')}</option>
                  <option value="paid">{t('admin.bookings.paymentLabels.paid')}</option>
                  <option value="failed">{t('admin.bookings.paymentLabels.failed')}</option>
                  <option value="refunded">{t('admin.bookings.paymentLabels.refunded')}</option>
                </select>
              </FormField>
              <FormField label={t('admin.walkIn.pickup')} required>
                <DateField mode="datetime" className={inputClass} value={editForm.pickupDate} onChange={(pickupDate) => setEditForm({ ...editForm, pickupDate })} required />
              </FormField>
              <FormField label={t('admin.walkIn.return')} required>
                <DateField mode="datetime" className={inputClass} value={editForm.returnDate} onChange={(returnDate) => setEditForm({ ...editForm, returnDate })} required />
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
                <VehicleSelect
                  cars={editVehicleOptions}
                  value={editForm.carId}
                  onChange={(carId) => setEditForm({ ...editForm, carId })}
                  placeholder={t('admin.accounting.searchVehicle')}
                  searchPlaceholder={t('admin.accounting.searchVehicle')}
                  emptyLabel={t('admin.ui.noResults')}
                />
              </FormField>
              <FormField label={t('admin.walkIn.notes')} className="sm:col-span-2">
                <textarea className={inputClass} rows="3" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </FormField>
            </DrawerSection>
          </form>
        )}
      </AdminDrawer>

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'delete'
            ? t('admin.bookings.delete')
            : confirmAction?.type === 'cancelLink'
              ? t('admin.bookings.cancelLink')
              : confirmAction?.type === 'regenerateContract'
                ? (confirmAction.signed
                  ? t('admin.bookings.newVersionConfirmTitle')
                  : t('admin.bookings.regenerateConfirmTitle'))
                : t('admin.bookings.cancelReservation')
        }
        message={
          confirmAction?.type === 'delete'
            ? t('admin.bookings.deleteConfirm')
            : confirmAction?.type === 'cancelLink'
              ? t('admin.bookings.cancelLinkConfirm')
              : confirmAction?.type === 'regenerateContract'
                ? (confirmAction.signed
                  ? t('admin.bookings.newVersionConfirmMessage')
                  : t('admin.bookings.regenerateConfirmMessage'))
                : t('admin.bookings.cancelReservationConfirm')
        }
        confirmText={
          confirmAction?.type === 'regenerateContract' && confirmAction.signed
            ? t('admin.bookings.createContractVersion')
            : t('admin.bookings.confirm')
        }
        cancelText={t('admin.common.cancel')}
        variant={confirmAction?.type === 'regenerateContract' ? 'primary' : 'danger'}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}

export default ManageBookings

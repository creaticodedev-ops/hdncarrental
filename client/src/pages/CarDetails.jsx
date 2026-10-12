import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import Loader from '../components/Loader'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/apiError'
import { formatLocationsDisplay, getCarLocations } from '../utils/carLocations'
import { findDefaultLocationId } from '../utils/defaultLocation'
import { calculateBookingPricePreview, resolveLocationDeliveryFees } from '../utils/pricing'
import {
  earliestReturnIsoDate,
  validateRentalDuration,
} from '../utils/bookingDuration'
import {
  bookingDateMessageFromCode,
  mergeUnavailablePeriods,
  validateBookingDates,
} from '../utils/vehicleAvailability'
import { isPhoneValid } from '../components/PhoneInput'
import { buildGuestReservationWaUrl, createExternalTabOpener } from '../utils/whatsapp'
import ReservationPanel from '../components/reservation/ReservationPanel'
import VehicleGallery from '../components/reservation/VehicleGallery'
import { booking } from '../components/ui/bookingUi'
import {
  trackCarView,
  trackReservationCompleted,
  trackReservationStarted,
  trackWhatsAppClick,
} from '../analytics/ga4'
import SeoHead from '../seo/SeoHead'
import { uniqueCarSlug } from '../seo/slugify'
import { vehicleProductJsonLd } from '../seo/jsonLd'
import { SITE_NAME } from '../seo/constants'
import PromotionBadge from '../components/PromotionBadge'
import { getDisplayDailyPrices } from '../utils/promotionDisplay'
import { carDisplayName } from '../utils/carDisplay'
import './carDetails.css'

const stroke = {
  className: 'h-4 w-4',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: '1.6',
  'aria-hidden': true,
}

const SpecIcons = {
  fuel: (
    <svg {...stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3v3.75m0 0h-6a1.5 1.5 0 00-1.5 1.5V21h9V8.25a1.5 1.5 0 00-1.5-1.5zM6.75 12h9M17.25 9l2.25 2.25V18a1.5 1.5 0 01-3 0v-3" />
    </svg>
  ),
  gear: (
    <svg {...stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5v15M6 12h12m0-7.5v15M12 4.5v7.5" />
      <circle cx="6" cy="3.75" r="1.25" />
      <circle cx="12" cy="3.75" r="1.25" />
      <circle cx="18" cy="3.75" r="1.25" />
    </svg>
  ),
  seat: (
    <svg {...stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h4.5a2.25 2.25 0 012.25 2.25v7.5H9.75A2.25 2.25 0 017.5 11.25v-7.5zM14.25 13.5h3a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H9a4.5 4.5 0 01-4.5-4.5V9" />
    </svg>
  ),
  calendar: (
    <svg {...stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V6a.75.75 0 01.75-.75z" />
    </svg>
  ),
  pin: (
    <svg {...stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
}

const toDateTimeLocal = (value) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T10:00`
  return value.slice(0, 16)
}

const formatFeeLabel = (location, currency, freeLabel) => {
  const fee = Number(location.deliveryFee) || 0
  const base = `${location.name} — ${location.address}`
  if (fee <= 0) return `${base} (${freeLabel})`
  return `${base} (+${currency}${fee})`
}

const CarDetails = () => {
  const { id } = useParams()
  const { t, language } = useI18n()
  const { cars, axios, pickupDate, setPickupDate, returnDate, setReturnDate, pickupLocations, carsLoading } = useAppContext()

  const navigate = useNavigate()
  const [car, setCar] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    pickupLocationId: '',
    returnLocationId: '',
    notes: '',
    promoCode: '',
  })
  const [serverQuote, setServerQuote] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [quoting, setQuoting] = useState(false)
  // null until loaded from the owner's live bookingSettings — never assume a hardcoded minimum.
  const [bookingRules, setBookingRules] = useState(null)
  const [unavailablePeriods, setUnavailablePeriods] = useState([])
  const [rulesLoading, setRulesLoading] = useState(true)

  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const fallbackImage = assets.car_image1
  const minRentalDays = bookingRules
    ? Math.max(1, Number(bookingRules.minRentalDays) || 1)
    : null
  const maxRentalDays = bookingRules
    ? Math.max(minRentalDays, Number(bookingRules.maxRentalDays) || 365)
    : null
  const advanceBookingDays = bookingRules
    ? Math.max(1, Number(bookingRules.advanceBookingDays) || 365)
    : 365
  const pickupHoursStart = bookingRules?.pickupHoursStart || '08:00'
  const pickupHoursEnd = bookingRules?.pickupHoursEnd || '20:00'
  const returnHoursStart = bookingRules?.returnHoursStart || '08:00'
  const returnHoursEnd = bookingRules?.returnHoursEnd || '20:00'

  const applyBookingRules = (rules) => {
    if (!rules || rules.minRentalDays == null) return
    setBookingRules((prev) => ({
      minRentalDays: Math.max(1, Number(rules.minRentalDays) || 1),
      maxRentalDays: Math.max(1, Number(rules.maxRentalDays) || 365),
      advanceBookingDays: Math.max(
        1,
        Number(rules.advanceBookingDays ?? prev?.advanceBookingDays) || 365,
      ),
      pickupHoursStart: rules.pickupHoursStart || prev?.pickupHoursStart || '08:00',
      pickupHoursEnd: rules.pickupHoursEnd || prev?.pickupHoursEnd || '20:00',
      returnHoursStart: rules.returnHoursStart || prev?.returnHoursStart || '08:00',
      returnHoursEnd: rules.returnHoursEnd || prev?.returnHoursEnd || '20:00',
    }))
  }

  const applyUnavailablePeriods = (periods) => {
    setUnavailablePeriods(mergeUnavailablePeriods(periods || []))
  }

  // Always load the car + live booking rules from the API (catalog cache is only a paint hint).
  useEffect(() => {
    let cancelled = false
    const fromList = cars.find((c) => c._id === id)
    if (fromList) setCar(fromList)

    const load = async () => {
      setLoadError(false)
      setRulesLoading(true)
      try {
        // Prefer dedicated live rules endpoint; always also fetch the car.
        // Requests are independent so a missing rules route cannot block the page.
        const carReq = axios.get(`/api/user/cars/${id}`).catch((error) => ({ error }))
        const rulesReq = axios.get(`/api/user/cars/${id}/booking-rules`).catch((error) => ({ error }))
        const [carRes, rulesRes] = await Promise.all([carReq, rulesReq])
        if (cancelled) return

        if (carRes.error) {
          if (carRes.error.response?.status === 404 && !fromList) setNotFound(true)
          else if (!fromList) {
            toast.error(getErrorMessage(carRes.error))
            setLoadError(true)
          }
          if (fromList?.bookingRules) applyBookingRules(fromList.bookingRules)
        } else if (carRes.data?.success && carRes.data.car) {
          setCar(carRes.data.car)
          if (carRes.data.car.bookingRules) applyBookingRules(carRes.data.car.bookingRules)
        } else if (!fromList) {
          setNotFound(true)
        }

        if (!rulesRes.error && rulesRes.data?.success && rulesRes.data.bookingRules) {
          applyBookingRules(rulesRes.data.bookingRules)
          if (Array.isArray(rulesRes.data.unavailablePeriods)) {
            applyUnavailablePeriods(rulesRes.data.unavailablePeriods)
          }
        }
      } finally {
        if (!cancelled) setRulesLoading(false)
      }
    }

    if (!carsLoading) load()
    return () => { cancelled = true }
  }, [cars, id, carsLoading, axios, reloadToken])

  // Refresh live rules + availability when the tab regains focus / periodically.
  useEffect(() => {
    if (!id) return undefined
    const refreshRules = async () => {
      try {
        const { data } = await axios.get(`/api/user/cars/${id}/booking-rules`)
        if (data.success && data.bookingRules) applyBookingRules(data.bookingRules)
        if (data.success && Array.isArray(data.unavailablePeriods)) {
          applyUnavailablePeriods(data.unavailablePeriods)
        }
      } catch {
        /* keep last known rules */
      }
    }
    const onFocus = () => { refreshRules() }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshRules()
    }
    const interval = window.setInterval(refreshRules, 60_000)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [axios, id])

  useEffect(() => {
    if (pickupDate && /^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      setPickupDate(`${pickupDate}T10:00`)
    }
    if (returnDate && /^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      setReturnDate(`${returnDate}T10:00`)
    }
  }, [pickupDate, returnDate, setPickupDate, setReturnDate])

  // Guide / auto-correct return date once live min rental days are known.
  useEffect(() => {
    if (minRentalDays == null) return
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    if (!pickup || !ret || minRentalDays <= 1) return
    const check = validateRentalDuration(pickup, ret, { minRentalDays, maxRentalDays })
    if (check.ok || check.code !== 'MIN_RENTAL_DAYS') return
    const pickupDay = pickup.slice(0, 10)
    const earliest = earliestReturnIsoDate(pickupDay, minRentalDays)
    if (!earliest) return
    const retParts = ret.includes('T') ? ret.split('T') : [ret, '10:00']
    const next = `${earliest}T${retParts[1] || '10:00'}`
    if (next.slice(0, 16) !== ret.slice(0, 16)) setReturnDate(next)
  }, [pickupDate, returnDate, minRentalDays, maxRentalDays, setReturnDate])

  useEffect(() => {
    if (car?._id) trackCarView(car)
  }, [car?._id])

  const pickupLoc = useMemo(
    () => pickupLocations.find((l) => l._id === form.pickupLocationId),
    [pickupLocations, form.pickupLocationId],
  )
  const returnLoc = useMemo(
    () => pickupLocations.find((l) => l._id === form.returnLocationId),
    [pickupLocations, form.returnLocationId],
  )

  const bookableLocations = useMemo(() => {
    if (!car) return pickupLocations
    const cities = getCarLocations(car)
    if (!cities.length) return pickupLocations
    const citySet = new Set(cities.map((c) => c.toLowerCase()))
    return pickupLocations.filter((l) => citySet.has(String(l.city || '').toLowerCase()))
  }, [car, pickupLocations])

  useEffect(() => {
    const ids = new Set(bookableLocations.map((l) => String(l._id)))
    const preferred = findDefaultLocationId(bookableLocations)
    if (!preferred && ids.size === 0) return
    setForm((f) => {
      const pickupOk = Boolean(f.pickupLocationId) && ids.has(String(f.pickupLocationId))
      const returnOk = Boolean(f.returnLocationId) && ids.has(String(f.returnLocationId))
      const pickupLocationId = pickupOk ? f.pickupLocationId : preferred
      const returnLocationId = returnOk ? f.returnLocationId : preferred
      if (pickupLocationId === f.pickupLocationId && returnLocationId === f.returnLocationId) return f
      return { ...f, pickupLocationId, returnLocationId }
    })
  }, [bookableLocations])

  const localPreview = useMemo(() => {
    if (!car) return null
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    const { pickupDeliveryFee, dropoffDeliveryFee } = resolveLocationDeliveryFees(pickupLoc, returnLoc)
    return calculateBookingPricePreview({
      pricePerDay: car.pricePerDay,
      pickupDate: pickup,
      returnDate: ret,
      pickupDeliveryFee,
      dropoffDeliveryFee,
    })
  }, [car, pickupDate, returnDate, pickupLoc, returnLoc])

  const dateCheck = useMemo(() => {
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    if (!pickup || !ret) return { ok: true, code: null, days: 0 }
    if (minRentalDays == null || maxRentalDays == null) {
      return { ok: false, code: 'RULES_LOADING', days: 0 }
    }
    return validateBookingDates(pickup, ret, {
      minRentalDays,
      maxRentalDays,
      advanceBookingDays,
      pickupHoursStart,
      pickupHoursEnd,
      returnHoursStart,
      returnHoursEnd,
      unavailablePeriods,
    })
  }, [
    pickupDate,
    returnDate,
    minRentalDays,
    maxRentalDays,
    advanceBookingDays,
    pickupHoursStart,
    pickupHoursEnd,
    returnHoursStart,
    returnHoursEnd,
    unavailablePeriods,
  ])

  const dateError = useMemo(() => {
    if (!pickupDate || !returnDate) return ''
    if (dateCheck.code === 'RULES_LOADING' || rulesLoading) return ''
    if (dateCheck.ok) return ''
    return bookingDateMessageFromCode(t, language, {
      ...dateCheck,
      hoursStart:
        dateCheck.code === 'RETURN_HOURS' ? returnHoursStart : pickupHoursStart,
      hoursEnd: dateCheck.code === 'RETURN_HOURS' ? returnHoursEnd : pickupHoursEnd,
    })
  }, [
    pickupDate,
    returnDate,
    dateCheck,
    rulesLoading,
    t,
    language,
    pickupHoursStart,
    pickupHoursEnd,
    returnHoursStart,
    returnHoursEnd,
  ])

  // Keep legacy alias used by quote gating / price preview.
  const durationCheck = dateCheck
  const durationError = dateError

  useEffect(() => {
    if (!car || !pickupDate || !returnDate || !form.pickupLocationId || !form.returnLocationId) {
      setServerQuote(null)
      setPromoError('')
      return
    }
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    if (new Date(ret) <= new Date(pickup)) {
      setServerQuote(null)
      return
    }
    if (durationCheck.code === 'RULES_LOADING') {
      setServerQuote(null)
      return
    }
    // Do not quote while dates are clearly invalid / unavailable (local guidance).
    if (
      durationCheck.code === 'DATES_UNAVAILABLE'
      || durationCheck.code === 'PAST_PICKUP'
      || durationCheck.code === 'INVALID_DATES'
      || durationCheck.code === 'PICKUP_HOURS'
      || durationCheck.code === 'RETURN_HOURS'
      || durationCheck.code === 'ADVANCE_BOOKING'
      || durationCheck.code === 'MAX_RENTAL_DAYS'
    ) {
      setServerQuote(null)
      setPromoError('')
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setQuoting(true)
      try {
        const { data } = await axios.post('/api/bookings/quote', {
          car: car._id,
          pickupDate: pickup,
          returnDate: ret,
          pickupLocationId: form.pickupLocationId,
          returnLocationId: form.returnLocationId,
          promoCode: form.promoCode,
          email: form.email,
        })
        if (cancelled) return
        if (data.success) {
          setServerQuote(data)
          setPromoError('')
          if (data.bookingSettings) applyBookingRules(data.bookingSettings)
        } else {
          setServerQuote(null)
          if (data.code === 'DATES_UNAVAILABLE') {
            setPromoError('')
            if (Array.isArray(data.unavailablePeriods)) {
              setUnavailablePeriods((prev) =>
                mergeUnavailablePeriods([...prev, ...data.unavailablePeriods]),
              )
            }
          } else if (data.code === 'MIN_RENTAL_DAYS' || data.code === 'MAX_RENTAL_DAYS' || data.bookingSettings) {
            setPromoError('')
            if (data.minRentalDays || data.maxRentalDays || data.bookingSettings) {
              applyBookingRules({
                ...(data.bookingSettings || {}),
                minRentalDays: data.minRentalDays ?? data.bookingSettings?.minRentalDays,
                maxRentalDays: data.maxRentalDays ?? data.bookingSettings?.maxRentalDays,
              })
            }
          } else {
            setPromoError(data.message || '')
          }
        }
      } catch (error) {
        if (cancelled) return
        setServerQuote(null)
        const payload = error.response?.data || {}
        if (payload.code === 'DATES_UNAVAILABLE') {
          setPromoError('')
          if (Array.isArray(payload.unavailablePeriods)) {
            setUnavailablePeriods((prev) =>
              mergeUnavailablePeriods([...prev, ...payload.unavailablePeriods]),
            )
          }
        } else if (
          payload.code === 'MIN_RENTAL_DAYS'
          || payload.code === 'MAX_RENTAL_DAYS'
          || payload.code === 'ADVANCE_BOOKING'
          || payload.code === 'PAST_PICKUP'
          || payload.code === 'PICKUP_HOURS'
          || payload.code === 'RETURN_HOURS'
          || payload.bookingSettings
        ) {
          setPromoError('')
          if (payload.bookingSettings || payload.minRentalDays || payload.maxRentalDays) {
            applyBookingRules({
              ...(payload.bookingSettings || {}),
              minRentalDays: payload.minRentalDays ?? payload.bookingSettings?.minRentalDays,
              maxRentalDays: payload.maxRentalDays ?? payload.bookingSettings?.maxRentalDays,
              advanceBookingDays:
                payload.advanceBookingDays ?? payload.bookingSettings?.advanceBookingDays,
            })
          }
        } else {
          setPromoError(getErrorMessage(error))
        }
      } finally {
        if (!cancelled) setQuoting(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    axios,
    car,
    pickupDate,
    returnDate,
    form.pickupLocationId,
    form.returnLocationId,
    form.promoCode,
    form.email,
    durationCheck.code,
  ])

  const priceBreakdown = useMemo(() => {
    if (durationError || minRentalDays == null) {
      return {
        ...(localPreview || {}),
        ready: false,
        pricePerDay: car?.pricePerDay,
      }
    }
    if (serverQuote?.priceBreakdown) {
      return {
        ...serverQuote.priceBreakdown,
        ready: true,
        pricePerDay: car?.pricePerDay,
      }
    }
    // Local preview only after live rules confirm the duration is valid.
    if (localPreview?.ready && durationCheck.ok) return localPreview
    return { ...(localPreview || {}), ready: false, pricePerDay: car?.pricePerDay }
  }, [serverQuote, localPreview, car, durationError, minRentalDays, durationCheck.ok])

  const submitReservation = async ({ channel = 'whatsapp' } = {}) => {
    if (submitting || submitted) return
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    if (minRentalDays == null || maxRentalDays == null) {
      toast.error(t('carDetails.rulesLoading'))
      return
    }
    const check = validateBookingDates(pickup, ret, {
      minRentalDays,
      maxRentalDays,
      advanceBookingDays,
      pickupHoursStart,
      pickupHoursEnd,
      returnHoursStart,
      returnHoursEnd,
      unavailablePeriods,
    })
    if (!check.ok) {
      toast.error(
        bookingDateMessageFromCode(t, language, {
          ...check,
          hoursStart: check.code === 'RETURN_HOURS' ? returnHoursStart : pickupHoursStart,
          hoursEnd: check.code === 'RETURN_HOURS' ? returnHoursEnd : pickupHoursEnd,
        }),
      )
      return
    }
    if (!form.pickupLocationId || !form.returnLocationId) {
      toast.error(t('carDetails.selectLocations'))
      return
    }
    if (!isPhoneValid(form.phone)) {
      toast.error(t('carDetails.invalidPhone'))
      return
    }

    trackReservationStarted({
      channel,
      car_id: car?._id,
      category: car?.category,
    })
    if (channel === 'whatsapp') {
      trackWhatsAppClick({ source: 'car_details_reserve' })
    }

    // Mobile browsers block popups opened after await — prepare the tab in this gesture.
    const waTab = channel === 'whatsapp' ? createExternalTabOpener() : null

    // Re-check availability immediately before submit (race guidance).
    try {
      const { data: live } = await axios.get(`/api/user/cars/${id}/booking-rules`)
      if (live?.success) {
        if (live.bookingRules) applyBookingRules(live.bookingRules)
        if (Array.isArray(live.unavailablePeriods)) {
          applyUnavailablePeriods(live.unavailablePeriods)
          const recheck = validateBookingDates(pickup, ret, {
            minRentalDays: live.bookingRules?.minRentalDays ?? minRentalDays,
            maxRentalDays: live.bookingRules?.maxRentalDays ?? maxRentalDays,
            advanceBookingDays: live.bookingRules?.advanceBookingDays ?? advanceBookingDays,
            pickupHoursStart: live.bookingRules?.pickupHoursStart || pickupHoursStart,
            pickupHoursEnd: live.bookingRules?.pickupHoursEnd || pickupHoursEnd,
            returnHoursStart: live.bookingRules?.returnHoursStart || returnHoursStart,
            returnHoursEnd: live.bookingRules?.returnHoursEnd || returnHoursEnd,
            unavailablePeriods: live.unavailablePeriods,
          })
          if (!recheck.ok) {
            waTab?.close()
            toast.error(
              bookingDateMessageFromCode(t, language, {
                ...recheck,
                hoursStart:
                  recheck.code === 'RETURN_HOURS'
                    ? (live.bookingRules?.returnHoursStart || returnHoursStart)
                    : (live.bookingRules?.pickupHoursStart || pickupHoursStart),
                hoursEnd:
                  recheck.code === 'RETURN_HOURS'
                    ? (live.bookingRules?.returnHoursEnd || returnHoursEnd)
                    : (live.bookingRules?.pickupHoursEnd || pickupHoursEnd),
              }),
            )
            return
          }
        }
      }
    } catch {
      /* proceed — server remains final authority */
    }

    setSubmitting(true)
    try {
      const { data } = await axios.post('/api/bookings/create', {
        car: id,
        pickupDate: pickup,
        returnDate: ret,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        pickupLocationId: form.pickupLocationId,
        returnLocationId: form.returnLocationId,
        notes: form.notes,
        promoCode: form.promoCode,
        channel,
      })

      if (data.success) {
        const confirmation = {
          reservationId: data.reservationId,
          price: data.price,
          priceBreakdown: data.priceBreakdown,
          pricingSnapshot: data.pricingSnapshot,
          carName: `${car.brand} ${car.model}`,
          customerName: form.fullName,
          email: form.email,
          phone: form.phone,
          pickupDate: pickup,
          returnDate: ret,
          pickupLocation: pickupLoc ? `${pickupLoc.name} - ${pickupLoc.address}` : '',
          returnLocation: returnLoc ? `${returnLoc.name} - ${returnLoc.address}` : '',
          channel: data.channel || channel,
          notes: form.notes,
          whatsappUrl: data.whatsappUrl || null,
          whatsappDial: data.whatsappDial || null,
        }
        sessionStorage.setItem('lastReservation', JSON.stringify(confirmation))
        setSubmitted(confirmation)
        trackReservationCompleted({
          channel: confirmation.channel || channel,
          reservation_id: confirmation.reservationId,
          car_name: confirmation.carName,
          days: confirmation.priceBreakdown?.days,
          value: Number(confirmation.price),
          currency: String(currency).trim(),
        })

        if (channel === 'whatsapp') {
          const url =
            data.whatsappUrl
            || buildGuestReservationWaUrl(confirmation, {
              currency: currency.trim(),
              dial: data.whatsappDial,
            })
          confirmation.whatsappUrl = url
          const opened = waTab?.navigate(url)
          if (!opened) {
            toast.success(
              t('carDetails.whatsappPopupBlocked', { id: confirmation.reservationId }),
              { duration: 8000 },
            )
          } else {
            toast.success(t('carDetails.whatsappOpened', { id: confirmation.reservationId }), {
              duration: 5000,
            })
          }
          navigate('/booking-confirmation', { state: confirmation })
          return
        }

        toast.success(data.message)
        navigate('/booking-confirmation', { state: confirmation })
      } else {
        waTab?.close()
        if (data.code === 'DATES_UNAVAILABLE' && Array.isArray(data.unavailablePeriods)) {
          setUnavailablePeriods((prev) =>
            mergeUnavailablePeriods([...prev, ...data.unavailablePeriods]),
          )
        }
        const msg = bookingDateMessageFromCode(t, language, {
          code: data.code,
          minRentalDays: data.minRentalDays ?? data.bookingSettings?.minRentalDays,
          maxRentalDays: data.maxRentalDays ?? data.bookingSettings?.maxRentalDays,
          advanceBookingDays: data.advanceBookingDays ?? data.bookingSettings?.advanceBookingDays,
          unavailablePeriods: data.unavailablePeriods,
          hoursStart: data.bookingSettings?.pickupHoursStart,
          hoursEnd: data.bookingSettings?.pickupHoursEnd,
          fallback: data.message,
        })
        toast.error(msg)
      }
    } catch (error) {
      waTab?.close()
      const payload = error.response?.data || {}
      if (payload.code === 'DATES_UNAVAILABLE' && Array.isArray(payload.unavailablePeriods)) {
        setUnavailablePeriods((prev) =>
          mergeUnavailablePeriods([...prev, ...payload.unavailablePeriods]),
        )
      }
      const msg = bookingDateMessageFromCode(t, language, {
        code: payload.code,
        minRentalDays: payload.minRentalDays ?? payload.bookingSettings?.minRentalDays,
        maxRentalDays: payload.maxRentalDays ?? payload.bookingSettings?.maxRentalDays,
        advanceBookingDays: payload.advanceBookingDays ?? payload.bookingSettings?.advanceBookingDays,
        unavailablePeriods: payload.unavailablePeriods,
        hoursStart: payload.bookingSettings?.pickupHoursStart || pickupHoursStart,
        hoursEnd: payload.bookingSettings?.pickupHoursEnd || pickupHoursEnd,
        fallback: getErrorMessage(error),
      })
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = useMemo(() => new Date(), [])

  const bookingRef = useRef(null)
  const [showDock, setShowDock] = useState(false)

  useEffect(() => {
    const node = bookingRef.current
    if (!node || !('IntersectionObserver' in window)) return undefined
    const io = new IntersectionObserver(([entry]) => {
      setShowDock(!entry.isIntersecting)
    })
    io.observe(node)
    return () => io.disconnect()
  }, [car?._id])

  if (notFound) {
    return (
      <div className="page-pad page-shell mt-10 sm:mt-16 text-center pb-16">
        <h1 className="text-2xl font-semibold text-gray-800">{t('carDetails.notFound')}</h1>
        <button type="button" onClick={() => navigate('/cars')} className="mt-4 text-primary cursor-pointer">{t('carDetails.back')}</button>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page-pad page-shell mt-10 sm:mt-16 text-center pb-16">
        <h1 className="text-2xl font-semibold text-gray-800">{t('carDetails.loadError')}</h1>
        <button
          type="button"
          onClick={() => {
            setLoadError(false)
            setCar(null)
            setReloadToken((n) => n + 1)
          }}
          className="mt-4 text-primary cursor-pointer"
        >
          {t('carDetails.retry')}
        </button>
      </div>
    )
  }

  if (!car) return <Loader />

  // Only characteristics the Car model actually stores — nothing inferred.
  const specs = [
    { key: 'specFuel', value: car.fuel_type, icon: SpecIcons.fuel },
    { key: 'specTransmission', value: car.transmission, icon: SpecIcons.gear },
    { key: 'specSeats', value: car.seating_capacity, icon: SpecIcons.seat },
    { key: 'specYear', value: car.year, icon: SpecIcons.calendar },
    { key: 'specCities', value: formatLocationsDisplay(car), icon: SpecIcons.pin },
  ].filter((spec) => spec.value !== '' && spec.value != null)

  const seoSlug = uniqueCarSlug(car, cars)
  const seoPath = seoSlug ? `/cars/${seoSlug}` : `/car-details/${car._id}`
  const carName = `${car.brand || ''} ${car.model || ''}`.trim()
  const displayName = carDisplayName(car)
  const promoPrices = car.displayPromotion ? getDisplayDailyPrices(car) : null
  const dailyPrice = promoPrices?.showStrike ? promoPrices.final : car.pricePerDay

  const dayCount = (days) =>
    Number(days) === 1 ? t('carDetails.condDay') : t('carDetails.condDays', { days })
  const conditions = bookingRules
    ? [
        { key: 'condMin', value: dayCount(minRentalDays) },
        { key: 'condMax', value: dayCount(maxRentalDays) },
        { key: 'condPickup', value: `${pickupHoursStart} – ${pickupHoursEnd}` },
        { key: 'condReturn', value: `${returnHoursStart} – ${returnHoursEnd}` },
        { key: 'condAdvance', value: t('carDetails.condAhead', { days: advanceBookingDays }) },
      ]
    : []

  const scrollToBooking = () => {
    const node = document.getElementById('reserve')
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className={`cd page-pad page-shell ${booking.pageBottom}`}>
      <SeoHead
        title={`Location ${carName} Maroc`}
        description={`Louez ${carName} avec ${SITE_NAME}. Réservation en ligne.`}
        path={seoPath}
        image={car.image || undefined}
        jsonLd={[vehicleProductJsonLd(car, seoPath)]}
      />

      <nav className="cd-crumbs" aria-label={t('carDetails.back')}>
        <button type="button" onClick={() => navigate(-1)} className="cd-back booking-tap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="M11 18l-6-6 6-6" />
          </svg>
          {t('carDetails.back')}
        </button>
        {car.category ? (
          <button
            type="button"
            onClick={() => {
              navigate(`/cars?category=${encodeURIComponent(car.category)}`)
              window.scrollTo(0, 0)
            }}
            className="cd-crumb booking-tap"
          >
            {car.category}
          </button>
        ) : null}
      </nav>

      <div className="cd-layout">
        <header className="cd-head">
          <p className="cd-kicker">
            <span className="cd-kicker-rule" aria-hidden="true" />
            {[car.category, car.year].filter(Boolean).join(' · ')}
          </p>
          <h1 className="cd-title">{displayName}</h1>
          <div className="cd-head-meta">
            <p className="cd-price">
              <span className="cd-price-label">{t('carDetails.startingFrom')}</span>
              <span className="cd-price-row">
                {promoPrices?.showStrike ? (
                  <span className="cd-price-was">{currency}{promoPrices.original}</span>
                ) : null}
                <span className="cd-price-now">
                  <span className="cd-price-cur">{currency.trim()}</span>
                  {dailyPrice}
                </span>
                <span className="cd-price-unit">{t('carDetails.perDay')}</span>
              </span>
            </p>
            {car.isAvaliable ? <span className="cd-live">{t('carCard.available')}</span> : null}
          </div>
        </header>

        <section className="cd-media">
          <VehicleGallery
            car={car}
            fallbackImage={fallbackImage}
            currency={currency}
            alt={displayName}
          />
        </section>

        {specs.length ? (
          <section className="cd-specs" aria-label={t('carDetails.specsTitle')}>
            <ul>
              {specs.map(({ key, value, icon }) => (
                <li key={key} className={key === 'specCities' ? 'is-wide' : undefined}>
                  <span className="cd-spec-label">
                    {icon}
                    {t(`carDetails.${key}`)}
                  </span>
                  <span className="cd-spec-value" title={String(value)}>{value}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="cd-details">
          {car.displayPromotion ? (
            <PromotionBadge
              promotion={car.displayPromotion}
              currency={currency}
              variant="detail"
              showPrice
              className="cd-promo"
            />
          ) : null}

          {car.description ? (
            <section className="cd-block">
              <h2 className="cd-block-title">{t('carDetails.description')}</h2>
              <p className="cd-desc">{car.description}</p>
            </section>
          ) : null}

          {car.features?.length ? (
            <section className="cd-block">
              <h2 className="cd-block-title">{t('carDetails.features')}</h2>
              <ul className="cd-features">
                {car.features.map((item) => (
                  <li key={item}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {conditions.length ? (
            <section className="cd-block">
              <h2 className="cd-block-title">{t('carDetails.conditionsTitle')}</h2>
              <dl className="cd-conditions">
                {conditions.map(({ key, value }) => (
                  <div key={key}>
                    <dt>{t(`carDetails.${key}`)}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        <aside id="reserve" ref={bookingRef} className="cd-book">
          <ReservationPanel
            car={car}
            form={form}
            setForm={setForm}
            pickupDate={pickupDate}
            setPickupDate={setPickupDate}
            returnDate={returnDate}
            setReturnDate={setReturnDate}
            bookableLocations={bookableLocations}
            pickupLoc={pickupLoc}
            returnLoc={returnLoc}
            priceBreakdown={priceBreakdown}
            currency={currency}
            submitting={submitting || Boolean(submitted)}
            onWhatsAppSubmit={() => submitReservation({ channel: 'whatsapp' })}
            t={t}
            formatFeeLabel={(loc) => formatFeeLabel(loc, currency, t('carDetails.free'))}
            minDate={minDate}
            minRentalDays={minRentalDays}
            maxRentalDays={maxRentalDays}
            advanceBookingDays={advanceBookingDays}
            pickupHoursStart={pickupHoursStart}
            pickupHoursEnd={pickupHoursEnd}
            returnHoursStart={returnHoursStart}
            returnHoursEnd={returnHoursEnd}
            unavailablePeriods={unavailablePeriods}
            dateError={dateError}
            rulesLoading={rulesLoading || minRentalDays == null}
            promoError={promoError}
            quoting={quoting}
          />
        </aside>
      </div>

      <div className={`cd-dock${showDock ? ' is-on' : ''}`} aria-hidden={!showDock}>
        <p className="cd-dock-price">
          <span className="cd-dock-name">{displayName}</span>
          <span>
            <strong>{currency}{dailyPrice}</strong> {t('carDetails.perDay')}
          </span>
        </p>
        <button type="button" onClick={scrollToBooking} className="cd-dock-cta booking-tap" tabIndex={showDock ? 0 : -1}>
          {t('carDetails.bookingHeadline')}
        </button>
      </div>
    </div>
  )
}

export default CarDetails

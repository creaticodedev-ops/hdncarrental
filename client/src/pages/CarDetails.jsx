import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import Loader from '../components/Loader'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import { getErrorMessage } from '../utils/apiError'
import { formatLocationsDisplay, getCarLocations } from '../utils/carLocations'
import { calculateBookingPricePreview, resolveLocationDeliveryFees } from '../utils/pricing'
import {
  durationMessageFromCode,
  earliestReturnIsoDate,
  validateRentalDuration,
} from '../utils/bookingDuration'
import { isPhoneValid } from '../components/PhoneInput'
import { buildGuestReservationWaUrl, createExternalTabOpener } from '../utils/whatsapp'
import ReservationPanel from '../components/reservation/ReservationPanel'
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
  const { t } = useI18n()
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
  const [rulesLoading, setRulesLoading] = useState(true)

  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const fallbackImage = assets.car_image1
  const minRentalDays = bookingRules
    ? Math.max(1, Number(bookingRules.minRentalDays) || 1)
    : null
  const maxRentalDays = bookingRules
    ? Math.max(minRentalDays, Number(bookingRules.maxRentalDays) || 365)
    : null

  const applyBookingRules = (rules) => {
    if (!rules || rules.minRentalDays == null) return
    setBookingRules({
      minRentalDays: Math.max(1, Number(rules.minRentalDays) || 1),
      maxRentalDays: Math.max(1, Number(rules.maxRentalDays) || 365),
    })
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
        }
      } finally {
        if (!cancelled) setRulesLoading(false)
      }
    }

    if (!carsLoading) load()
    return () => { cancelled = true }
  }, [cars, id, carsLoading, axios, reloadToken])

  // Refresh live rules when the tab regains focus (Admin may have just changed Settings).
  useEffect(() => {
    if (!id) return undefined
    const refreshRules = async () => {
      try {
        const { data } = await axios.get(`/api/user/cars/${id}/booking-rules`)
        if (data.success && data.bookingRules) applyBookingRules(data.bookingRules)
      } catch {
        /* keep last known rules */
      }
    }
    const onFocus = () => { refreshRules() }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshRules()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
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

  const durationCheck = useMemo(() => {
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    if (!pickup || !ret) return { ok: true, days: 0 }
    // Until live rules load, do not client-approve a short stay.
    if (minRentalDays == null || maxRentalDays == null) {
      return { ok: false, code: 'RULES_LOADING', days: 0 }
    }
    return validateRentalDuration(pickup, ret, { minRentalDays, maxRentalDays })
  }, [pickupDate, returnDate, minRentalDays, maxRentalDays])

  const durationError = useMemo(() => {
    if (!pickupDate || !returnDate) return ''
    if (durationCheck.code === 'RULES_LOADING' || rulesLoading) return ''
    if (durationCheck.ok) return ''
    return durationMessageFromCode(t, durationCheck)
  }, [pickupDate, returnDate, durationCheck, rulesLoading, t])

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
    // Still quote when local rules say too short — server is authority and returns live min.
    if (durationCheck.code === 'RULES_LOADING') {
      setServerQuote(null)
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
          if (data.bookingSettings) {
            setBookingRules((prev) => ({
              minRentalDays: data.bookingSettings.minRentalDays ?? prev.minRentalDays,
              maxRentalDays: data.bookingSettings.maxRentalDays ?? prev.maxRentalDays,
            }))
          }
        } else {
          setServerQuote(null)
          if (data.code === 'MIN_RENTAL_DAYS' || data.code === 'MAX_RENTAL_DAYS') {
            setPromoError('')
            if (data.minRentalDays || data.maxRentalDays) {
              setBookingRules((prev) => ({
                minRentalDays: data.minRentalDays ?? prev.minRentalDays,
                maxRentalDays: data.maxRentalDays ?? prev.maxRentalDays,
              }))
            }
          } else {
            setPromoError(data.message || '')
          }
        }
      } catch (error) {
        if (cancelled) return
        setServerQuote(null)
        const payload = error.response?.data || {}
        if (payload.code === 'MIN_RENTAL_DAYS' || payload.code === 'MAX_RENTAL_DAYS') {
          setPromoError('')
          if (payload.minRentalDays || payload.maxRentalDays || payload.bookingSettings) {
            setBookingRules((prev) => ({
              minRentalDays:
                payload.minRentalDays
                ?? payload.bookingSettings?.minRentalDays
                ?? prev.minRentalDays,
              maxRentalDays:
                payload.maxRentalDays
                ?? payload.bookingSettings?.maxRentalDays
                ?? prev.maxRentalDays,
            }))
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
    if (new Date(ret) <= new Date(pickup)) {
      toast.error(t('carDetails.invalidDates'))
      return
    }
    if (minRentalDays == null || maxRentalDays == null) {
      toast.error(t('carDetails.rulesLoading'))
      return
    }
    const duration = validateRentalDuration(pickup, ret, { minRentalDays, maxRentalDays })
    if (!duration.ok) {
      toast.error(durationMessageFromCode(t, duration))
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
          // WhatsApp tab is already open — move this tab to the confirmation page
          // so the reservation ID is not stuck in a disappearing toast.
          navigate('/booking-confirmation', { state: confirmation })
          return
        }

        toast.success(data.message)
        navigate('/booking-confirmation', { state: confirmation })
      } else {
        waTab?.close()
        const msg = durationMessageFromCode(t, {
          code: data.code,
          minRentalDays: data.minRentalDays ?? data.bookingSettings?.minRentalDays,
          maxRentalDays: data.maxRentalDays ?? data.bookingSettings?.maxRentalDays,
          fallback: data.message,
        })
        toast.error(msg)
      }
    } catch (error) {
      waTab?.close()
      const payload = error.response?.data || {}
      const msg = durationMessageFromCode(t, {
        code: payload.code,
        minRentalDays: payload.minRentalDays ?? payload.bookingSettings?.minRentalDays,
        maxRentalDays: payload.maxRentalDays ?? payload.bookingSettings?.maxRentalDays,
        fallback: getErrorMessage(error),
      })
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = useMemo(() => new Date(), [])

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

  const specs = [
    { icon: assets.users_icon, text: t('carDetails.seats', { count: car.seating_capacity }) },
    { icon: assets.fuel_icon, text: car.fuel_type },
    { icon: assets.car_icon, text: car.transmission },
    { icon: assets.location_icon, text: formatLocationsDisplay(car) },
  ]

  const seoSlug = uniqueCarSlug(car, cars)
  const seoPath = seoSlug ? `/cars/${seoSlug}` : `/car-details/${car._id}`
  const carName = `${car.brand || ''} ${car.model || ''}`.trim()

  return (
    <div className={`page-pad page-shell mt-4 overflow-x-clip bg-gradient-to-b from-white via-white to-sand/40 sm:mt-8 md:mt-10 ${booking.pageBottom}`}>
      <SeoHead
        title={`Location ${carName} Maroc`}
        description={`Louez ${carName} avec ${SITE_NAME}. Réservation en ligne.`}
        path={seoPath}
        image={car.image || undefined}
        jsonLd={[vehicleProductJsonLd(car, seoPath)]}
      />
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="booking-tap mb-5 inline-flex min-h-12 items-center gap-2 rounded-2xl px-2 text-sm text-muted transition hover:text-ink cursor-pointer sm:mb-7"
      >
        <img src={assets.arrow_icon} alt="" className="w-4 rotate-180 opacity-55" />
        {t('carDetails.back')}
      </button>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12 lg:gap-10 xl:gap-14">
        <div className="order-2 min-w-0 lg:order-1 lg:col-span-7 xl:col-span-8">
          <Motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="relative overflow-hidden rounded-[1.35rem] bg-sand/40 shadow-sm ring-1 ring-borderColor/70 sm:rounded-3xl">
              <img
                src={car.image || car.images?.[0] || fallbackImage}
                onError={(e) => { e.currentTarget.src = fallbackImage }}
                alt={`${car.brand} ${car.model}`}
                width={1280}
                height={720}
                fetchPriority="high"
                decoding="async"
                className="aspect-[16/10] w-full object-cover sm:aspect-[16/9]"
              />
              {car.displayPromotion ? (
                <PromotionBadge promotion={car.displayPromotion} currency={currency} />
              ) : null}
            </div>

            <div className="mt-6 sm:mt-8">
              <p className={booking.eyebrow}>{car.category}</p>
              <h1 className="font-display mt-1.5 text-[1.75rem] font-medium leading-tight text-ink sm:text-3xl lg:text-4xl">
                {car.brand} {car.model}
              </h1>
              <p className="mt-1.5 text-sm text-muted">{car.year}</p>
              {car.displayPromotion ? (
                <div className="mt-4 max-w-lg">
                  <PromotionBadge
                    promotion={car.displayPromotion}
                    currency={currency}
                    variant="detail"
                    showPrice
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
              {specs.map(({ icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-2 rounded-full border border-borderColor/80 bg-white px-3.5 py-2 text-xs font-medium text-ink/80 shadow-sm"
                >
                  <img src={icon} alt="" className="h-4 w-4 opacity-70" />
                  {text}
                </span>
              ))}
            </div>

            <div className="mt-9 grid gap-8 sm:mt-10 sm:grid-cols-2 sm:gap-10">
              <section>
                <h2 className={booking.label}>{t('carDetails.description')}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">{car.description}</p>
              </section>
              <section>
                <h2 className={booking.label}>{t('carDetails.features')}</h2>
                <ul className="mt-3 space-y-2.5">
                  {(car.features?.length ? car.features : ['360 Camera', 'Bluetooth', 'GPS', 'Heated Seats']).map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-ink/75">
                      <img src={assets.check_icon} className="h-4 w-4 shrink-0 opacity-80" alt="" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </Motion.div>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 min-w-0">
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
            durationError={durationError}
            rulesLoading={rulesLoading || minRentalDays == null}
            promoError={promoError}
            quoting={quoting}
          />
        </div>
      </div>
    </div>
  )
}

export default CarDetails

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

  const currency = import.meta.env.VITE_CURRENCY || 'MAD '
  const fallbackImage = assets.car_image1

  useEffect(() => {
    const fromList = cars.find((c) => c._id === id)
    if (fromList) {
      setCar(fromList)
      return
    }

    const fetchCar = async () => {
      setLoadError(false)
      try {
        const { data } = await axios.get(`/api/user/cars/${id}`)
        if (data.success) setCar(data.car)
        else setNotFound(true)
      } catch (error) {
        if (error.response?.status === 404) setNotFound(true)
        else {
          toast.error(getErrorMessage(error))
          setLoadError(true)
        }
      }
    }

    if (!carsLoading) fetchCar()
  }, [cars, id, carsLoading, axios, reloadToken])

  useEffect(() => {
    if (pickupDate && /^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      setPickupDate(`${pickupDate}T10:00`)
    }
    if (returnDate && /^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      setReturnDate(`${returnDate}T10:00`)
    }
  }, [pickupDate, returnDate, setPickupDate, setReturnDate])

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
        } else {
          setServerQuote(null)
          setPromoError(data.message || '')
        }
      } catch (error) {
        if (cancelled) return
        setServerQuote(null)
        setPromoError(getErrorMessage(error))
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
    if (serverQuote?.priceBreakdown) {
      return {
        ...serverQuote.priceBreakdown,
        ready: true,
        pricePerDay: car?.pricePerDay,
      }
    }
    return localPreview
  }, [serverQuote, localPreview, car])

  const submitReservation = async ({ channel = 'whatsapp' } = {}) => {
    if (submitting || submitted) return
    const pickup = toDateTimeLocal(pickupDate)
    const ret = toDateTimeLocal(returnDate)
    if (new Date(ret) <= new Date(pickup)) {
      toast.error(t('carDetails.invalidDates'))
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
        toast.error(data.message)
      }
    } catch (error) {
      waTab?.close()
      toast.error(getErrorMessage(error))
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
            promoError={promoError}
            quoting={quoting}
          />
        </div>
      </div>
    </div>
  )
}

export default CarDetails

import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { AdminDrawer, DrawerSection, VehicleSelect } from '../../../admin/ui'
import ConfirmDialog from '../ConfirmDialog'
import { getErrorMessage } from '../../../utils/apiError'
import { getSignatureStatus, formatDateTime, vehicleLabelWithPlate } from './reservationHelpers'

const ChangeVehicleDrawer = ({
  open,
  onClose,
  booking,
  t,
  language,
  axios,
  onApplied,
}) => {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const savingRef = useRef(false)

  const currentId = String(booking?.car?._id || booking?.car || '')
  const cancelled = booking?.status === 'cancelled'
  const signed = getSignatureStatus(booking) === 'signed'
  const selected = cars.find((car) => String(car._id) === String(selectedId))
  const canApply = Boolean(selectedId) && String(selectedId) !== currentId && !cancelled && !saving

  useEffect(() => {
    if (!open || !booking?._id) return undefined
    let cancelledFetch = false
    setSelectedId(currentId)
    setConfirmOpen(false)
    setLoading(true)
    axios
      .get(`/api/bookings/owner/${booking._id}/available-vehicles`)
      .then(({ data }) => {
        if (cancelledFetch) return
        if (!data.success) throw new Error(data.message)
        setCars(data.cars || [])
      })
      .catch((error) => {
        if (cancelledFetch) return
        setCars([])
        toast.error(getErrorMessage(error) || t('admin.bookings.changeVehicleLoadError'))
      })
      .finally(() => {
        if (!cancelledFetch) setLoading(false)
      })
    return () => {
      cancelledFetch = true
    }
  }, [open, booking?._id, currentId, axios, t])

  const close = () => {
    if (savingRef.current) return
    setConfirmOpen(false)
    onClose?.()
  }

  const apply = async () => {
    if (!canApply || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const { data } = await axios.post('/api/bookings/change-vehicle', {
        bookingId: booking._id,
        carId: selectedId,
      })
      if (!data.success) throw new Error(data.message)
      toast.success(data.message || t('admin.bookings.changeVehicleSuccess'))
      if (data.contract?.reason === 'error') {
        toast.error(t('admin.bookings.changeVehicleContractWarn'))
      }
      setConfirmOpen(false)
      onApplied?.(data.booking, data)
      onClose?.()
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.bookings.changeVehicleFailed'))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (!booking) return null

  const confirmMessage = [
    t('admin.bookings.changeVehicleConfirmMessage', {
      from: vehicleLabelWithPlate(booking.car),
      to: vehicleLabelWithPlate(selected),
    }),
    signed ? t('admin.bookings.changeVehicleConfirmSigned') : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <AdminDrawer
        open={open}
        onClose={close}
        title={t('admin.bookings.changeVehicleTitle')}
        description={t('admin.bookings.changeVehicleHint')}
        size="md"
        closeLabel={t('admin.ui.close')}
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={close} disabled={saving}>
              {t('admin.common.cancel')}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={!canApply || loading}
              onClick={() => setConfirmOpen(true)}
            >
              {t('admin.bookings.changeVehicleApply')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <DrawerSection title={t('admin.bookings.changeVehicleCurrent')}>
            <p className="text-sm font-semibold text-[var(--admin-ink)] sm:col-span-2">
              {vehicleLabelWithPlate(booking.car)}
            </p>
            <p className="text-xs text-[var(--admin-muted)] sm:col-span-2">
              {t('admin.bookings.rentalPeriod')}: {formatDateTime(booking.pickupDate, language)}
              {' → '}
              {formatDateTime(booking.returnDate, language)}
            </p>
          </DrawerSection>

          {cancelled ? (
            <p className="text-sm text-[var(--admin-danger)]">{t('admin.bookings.changeVehicleCancelled')}</p>
          ) : (
            <DrawerSection title={t('admin.bookings.changeVehicleSelect')} description={t('admin.bookings.changeVehicleListHint')}>
              <div className="sm:col-span-2">
                {loading ? (
                  <p className="text-sm text-[var(--admin-muted)]">{t('admin.common.loading')}</p>
                ) : cars.length ? (
                  <VehicleSelect
                    cars={cars}
                    value={selectedId}
                    onChange={setSelectedId}
                    disabled={saving}
                    placeholder={t('admin.walkIn.selectVehicle')}
                    searchPlaceholder={t('admin.walkIn.searchVehicle')}
                    emptyLabel={t('admin.ui.noResults')}
                  />
                ) : (
                  <p className="text-sm text-[var(--admin-muted)]">{t('admin.bookings.changeVehicleEmpty')}</p>
                )}
                {!loading && cars.length > 0 && !cars.some((car) => String(car._id) !== currentId) ? (
                  <p className="mt-2 text-sm text-[var(--admin-muted)]">{t('admin.bookings.changeVehicleEmpty')}</p>
                ) : null}
              </div>
            </DrawerSection>
          )}
        </div>
      </AdminDrawer>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('admin.bookings.changeVehicleConfirmTitle')}
        message={confirmMessage}
        confirmText={saving ? t('admin.common.saving') : t('admin.bookings.changeVehicleApply')}
        cancelText={t('admin.common.cancel')}
        variant="primary"
        confirmDisabled={saving}
        onCancel={() => !savingRef.current && setConfirmOpen(false)}
        onConfirm={apply}
      />
    </>
  )
}

export default ChangeVehicleDrawer

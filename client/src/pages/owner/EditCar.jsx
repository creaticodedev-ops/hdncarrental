import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Title from '../../components/owner/Title'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { VEHICLE_CATEGORIES } from '../../utils/vehicleCategories'
import LocationMultiSelect from '../../components/owner/LocationMultiSelect'
import { getCarLocations } from '../../utils/carLocations'
import { AdminPage, FormField, FormSection, SkeletonBlock, StickyFormFooter } from '../../admin/ui'

const EditCar = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { axios, currency, pickupLocations } = useAppContext()
  const { t } = useI18n()

  const cities = useMemo(() => {
    return [...new Set(pickupLocations.map((location) => location.city))].sort()
  }, [pickupLocations])

  const [image, setImage] = useState(null)
  const [existingImage, setExistingImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const [car, setCar] = useState({
    brand: '',
    model: '',
    year: '',
    pricePerDay: '',
    category: '',
    transmission: '',
    fuel_type: '',
    seating_capacity: '',
    locations: [],
    description: '',
    licensePlate: '',
    mileage: '',
    fleetId: '',
    vin: '',
    branch: '',
  })

  useEffect(() => {
    const fetchCar = async () => {
      try {
        const { data } = await axios.get(`/api/owner/cars/${id}`)
        if (data.success) {
          const c = data.car
          setCar({
            brand: c.brand || '',
            model: c.model || '',
            year: c.year || '',
            pricePerDay: c.pricePerDay || '',
            category: c.category || '',
            transmission: c.transmission || '',
            fuel_type: c.fuel_type || '',
            seating_capacity: c.seating_capacity || '',
            locations: getCarLocations(c),
            description: c.description || '',
            licensePlate: c.licensePlate || '',
            mileage: c.mileage || '',
            fleetId: c.fleetId || '',
            vin: c.vin || '',
            branch: c.branch || '',
          })
          setExistingImage(c.image || '')
        } else {
          toast.error(data.message)
          navigate('/owner/manage-cars')
        }
      } catch (error) {
        toast.error(getErrorMessage(error))
        navigate('/owner/manage-cars')
      } finally {
        setLoading(false)
      }
    }
    fetchCar()
  }, [id])

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (isSaving) return
    if (!car.locations?.length) {
      toast.error(t('admin.addCar.locationsRequired'))
      return
    }

    setIsSaving(true)
    try {
      const formData = new FormData()
      if (image) formData.append('image', image)
      formData.append('carId', id)
      formData.append('carData', JSON.stringify(car))

      const { data } = await axios.post('/api/owner/update-car', formData)
      if (data.success) {
        toast.success(data.message)
        navigate('/owner/manage-cars')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const setField = (key) => (e) => setCar((c) => ({ ...c, [key]: e.target.value }))

  if (loading) {
    return (
      <AdminPage>
        <SkeletonBlock className="h-10 w-64 mb-4" />
        <SkeletonBlock className="h-40 mb-4" />
        <SkeletonBlock className="h-56" />
        <p className="mt-3 text-sm text-[var(--admin-muted)]">{t('admin.fleet.loading')}</p>
      </AdminPage>
    )
  }

  return (
    <AdminPage>
      <Title
        title={`${t('admin.common.edit')} ${t('admin.fleet.car')}`}
        subTitle={t('admin.fleet.subtitle')}
        breadcrumb={[
          { label: t('admin.fleet.title'), to: '/owner/manage-cars' },
          { label: t('admin.common.edit') },
        ]}
      />

      <form onSubmit={onSubmitHandler} className="mt-2 max-w-3xl space-y-5">
        <FormSection title={t('admin.addCar.uploadHint')} description={t('admin.addCar.assetHint')}>
          <div className="sm:col-span-2 flex items-center gap-4">
            <label htmlFor="car-image" className="cursor-pointer">
              <img
                src={previewUrl || existingImage || assets.car_image1}
                alt=""
                className="h-20 w-28 rounded-[var(--admin-radius)] object-cover ring-1 ring-[var(--admin-border)]"
              />
              <input
                type="file"
                id="car-image"
                accept="image/*"
                hidden
                onChange={(e) => setImage(e.target.files[0])}
              />
            </label>
            <p className="text-sm text-[var(--admin-muted)]">{t('admin.addCar.uploadHint')}</p>
          </div>
        </FormSection>

        <FormSection title={`${t('admin.addCar.brand')} & model`}>
          <FormField label={t('admin.addCar.brand')} required>
            <input type="text" required className="admin-input" value={car.brand} onChange={setField('brand')} />
          </FormField>
          <FormField label={t('admin.addCar.model')} required>
            <input type="text" required className="admin-input" value={car.model} onChange={setField('model')} />
          </FormField>
          <FormField label={t('admin.addCar.year')} required>
            <input type="number" required className="admin-input" value={car.year} onChange={setField('year')} />
          </FormField>
          <FormField label={t('admin.addCar.category')} required>
            <select required className="admin-input" value={car.category} onChange={setField('category')}>
              <option value="">Select a category</option>
              {VEHICLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormField>
        </FormSection>

        <FormSection title={t('admin.addCar.assetIdentity')} description={t('admin.addCar.assetHint')}>
          <FormField label={t('admin.addCar.fleetId')}>
            <input type="text" className="admin-input uppercase" value={car.fleetId} onChange={setField('fleetId')} placeholder="AC-0001" />
          </FormField>
          <FormField label={t('admin.addCar.vin')}>
            <input type="text" className="admin-input uppercase" value={car.vin} onChange={setField('vin')} />
          </FormField>
          <FormField label={t('admin.addCar.plate')} required>
            <input type="text" required className="admin-input uppercase" value={car.licensePlate} onChange={setField('licensePlate')} />
          </FormField>
          <FormField label={t('admin.addCar.mileage')}>
            <input type="number" min="0" className="admin-input" value={car.mileage} onChange={setField('mileage')} />
          </FormField>
          <FormField label={t('admin.addCar.branch')} className="sm:col-span-2">
            <input type="text" className="admin-input" value={car.branch} onChange={setField('branch')} placeholder={car.locations?.[0] || ''} />
          </FormField>
        </FormSection>

        <FormSection title={t('admin.addCar.dailyPrice')}>
          <FormField label={`${t('admin.addCar.dailyPrice')} (${currency})`} required>
            <input type="number" required className="admin-input" value={car.pricePerDay} onChange={setField('pricePerDay')} />
          </FormField>
          <FormField label={t('admin.addCar.transmission')} required>
            <select required className="admin-input" value={car.transmission} onChange={setField('transmission')}>
              <option value="">Select a transmission</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
              <option value="Semi-Automatic">Semi-Automatic</option>
            </select>
          </FormField>
          <FormField label={t('admin.addCar.fuelType')} required>
            <select required className="admin-input" value={car.fuel_type} onChange={setField('fuel_type')}>
              <option value="">Select a fuel type</option>
              <option value="Gas">ESSENCE</option>
              <option value="Diesel">DIESEL</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </FormField>
          <FormField label={t('admin.addCar.seats')} required>
            <input type="number" required className="admin-input" value={car.seating_capacity} onChange={setField('seating_capacity')} />
          </FormField>
        </FormSection>

        <FormSection title={t('admin.addCar.locations')} description={t('admin.addCar.locationsHint')}>
          <div className="sm:col-span-2">
            <LocationMultiSelect
              cities={cities}
              selected={car.locations}
              onChange={(locations) => setCar({ ...car, locations })}
              label={t('admin.addCar.locations')}
              selectAllLabel={t('admin.addCar.selectAllLocations')}
              hint={t('admin.addCar.locationsHint')}
              required
            />
          </div>
          <FormField label={t('admin.addCar.description')} required className="sm:col-span-2">
            <textarea rows={4} required className="admin-input" value={car.description} onChange={setField('description')} />
          </FormField>
        </FormSection>

        <StickyFormFooter>
          <button type="button" onClick={() => navigate('/owner/manage-cars')} className="admin-btn admin-btn-secondary">
            {t('admin.common.cancel')}
          </button>
          <button type="button" onClick={() => navigate(`/owner/vehicle-stats/${id}`)} className="admin-btn admin-btn-ghost">
            {t('admin.vehicleStats.viewStats')}
          </button>
          <button type="submit" disabled={isSaving} className="admin-btn admin-btn-primary">
            <img src={assets.tick_icon} alt="" className="h-4 w-4" />
            {isSaving ? t('admin.common.loading') : t('admin.common.save')}
          </button>
        </StickyFormFooter>
      </form>
    </AdminPage>
  )
}

export default EditCar

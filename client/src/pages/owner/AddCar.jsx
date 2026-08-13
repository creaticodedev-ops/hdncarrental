import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/owner/Title'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { VEHICLE_CATEGORIES } from '../../utils/vehicleCategories'
import LocationMultiSelect from '../../components/owner/LocationMultiSelect'
import { AdminPage, FormField, FormSection, StickyFormFooter } from '../../admin/ui'

const AddCar = () => {
  const { axios, currency, pickupLocations } = useAppContext()
  const { t } = useI18n()

  const cities = useMemo(() => {
    return [...new Set(pickupLocations.map((location) => location.city))].sort()
  }, [pickupLocations])

  const [image, setImage] = useState(null)
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
    fleetId: '',
    vin: '',
    licensePlate: '',
    branch: '',
    mileage: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (isLoading) return

    if (!image) {
      toast.error('Please upload a car image')
      return
    }
    if (!car.category || !car.transmission || !car.fuel_type) {
      toast.error('Please complete all vehicle details')
      return
    }
    if (!car.locations?.length) {
      toast.error(t('admin.addCar.locationsRequired'))
      return
    }
    if (!car.licensePlate?.trim()) {
      toast.error('License plate is required for each physical vehicle')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('carData', JSON.stringify(car))

      const { data } = await axios.post('/api/owner/add-car', formData)
      if (data.success) {
        toast.success(data.message)
        setImage(null)
        setCar({
          brand: '', model: '', year: '', pricePerDay: '', category: '',
          transmission: '', fuel_type: '', seating_capacity: '', locations: [], description: '',
          fleetId: '', vin: '', licensePlate: '', branch: '', mileage: '',
        })
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const setField = (key) => (e) => setCar((c) => ({ ...c, [key]: e.target.value }))

  return (
    <AdminPage>
      <Title title={t('admin.addCar.title')} subTitle={t('admin.addCar.subtitle')} />

      <form onSubmit={onSubmitHandler} className="mt-2 max-w-3xl space-y-5">
        <FormSection title={t('admin.addCar.uploadHint')} description={t('admin.addCar.assetHint')}>
          <div className="sm:col-span-2 flex items-center gap-4">
            <label htmlFor="car-image" className="cursor-pointer">
              <img
                src={previewUrl || assets.upload_icon}
                alt=""
                className="h-20 w-20 rounded-[var(--admin-radius)] object-cover ring-1 ring-[var(--admin-border)]"
              />
              <input
                type="file"
                id="car-image"
                accept="image/*"
                required
                hidden
                onChange={(e) => setImage(e.target.files[0])}
              />
            </label>
            <p className="text-sm text-[var(--admin-muted)]">{t('admin.addCar.uploadHint')}</p>
          </div>
        </FormSection>

        <FormSection title={t('admin.addCar.brand') + ' & model'}>
          <FormField label={t('admin.addCar.brand')} required>
            <input type="text" required className="admin-input" value={car.brand} onChange={setField('brand')} placeholder="BMW, Mercedes…" />
          </FormField>
          <FormField label={t('admin.addCar.model')} required>
            <input type="text" required className="admin-input" value={car.model} onChange={setField('model')} placeholder="X5, E-Class…" />
          </FormField>
          <FormField label={t('admin.addCar.year')} required>
            <input type="number" required className="admin-input" value={car.year} onChange={setField('year')} placeholder="2025" />
          </FormField>
          <FormField label={t('admin.addCar.category')} required>
            <select required className="admin-input" value={car.category} onChange={setField('category')}>
              <option value="">Select a category</option>
              {VEHICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>
        </FormSection>

        <FormSection title={t('admin.addCar.assetIdentity')} description={t('admin.addCar.assetHint')}>
          <FormField label={t('admin.addCar.fleetId')} hint="Auto if empty (FLT-XXXXXX)">
            <input type="text" className="admin-input uppercase" value={car.fleetId} onChange={setField('fleetId')} />
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
            <input type="text" className="admin-input" value={car.branch} onChange={setField('branch')} />
          </FormField>
        </FormSection>

        <FormSection title={t('admin.addCar.dailyPrice')}>
          <FormField label={`${t('admin.addCar.dailyPrice')} (${currency})`} required>
            <input type="number" min="1" required className="admin-input" value={car.pricePerDay} onChange={setField('pricePerDay')} />
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
            <input type="number" min="1" required className="admin-input" value={car.seating_capacity} onChange={setField('seating_capacity')} />
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
          <button type="submit" disabled={isLoading} className="admin-btn admin-btn-primary">
            <img src={assets.tick_icon} alt="" className="h-4 w-4" />
            {isLoading ? t('admin.addCar.listing') : t('admin.addCar.submit')}
          </button>
        </StickyFormFooter>
      </form>
    </AdminPage>
  )
}

export default AddCar

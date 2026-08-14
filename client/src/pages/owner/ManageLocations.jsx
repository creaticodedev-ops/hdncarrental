import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import ConfirmDialog from '../../components/owner/ConfirmDialog'
import { AdminDrawer, AdminSwitch, CurrencyInput, DrawerSection, FormField } from '../../admin/ui'

const emptyForm = {
  name: '',
  city: '',
  address: '',
  googleMapsLink: '',
  locationType: 'custom',
  deliveryFee: '0',
  latitude: '',
  longitude: '',
  isActive: true,
}

const ManageLocations = () => {
  const { isOwner, axios, fetchPickupLocations, currency } = useAppContext()
  const { t } = useI18n()

  const [locations, setLocations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  const fetchLocations = async () => {
    try {
      const { data } = await axios.get('/api/pickup-locations/all')
      data.success ? setLocations(data.locations) : toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDirty(false)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isLoading) return

    const fee = Number(form.deliveryFee)
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error(t('admin.locations.invalidFee'))
      return
    }

    if (form.latitude !== '' || form.longitude !== '') {
      const lat = Number(form.latitude)
      const lng = Number(form.longitude)
      if (form.latitude === '' || form.longitude === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error(t('admin.locations.invalidCoords'))
        return
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast.error(t('admin.locations.invalidCoords'))
        return
      }
    }

    setIsLoading(true)
    try {
      const payload = {
        name: form.name,
        city: form.city,
        address: form.address,
        googleMapsLink: form.googleMapsLink,
        locationType: form.locationType,
        deliveryFee: fee,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        isActive: form.isActive,
      }
      const endpoint = editingId ? '/api/pickup-locations/update' : '/api/pickup-locations/create'
      const body = editingId ? { locationId: editingId, ...payload } : payload
      const { data } = await axios.post(endpoint, body)

      if (data.success) {
        toast.success(data.message)
        closeDrawer()
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (location) => {
    setEditingId(location._id)
    setForm({
      name: location.name || '',
      city: location.city || '',
      address: location.address || '',
      googleMapsLink: location.googleMapsLink || '',
      locationType: location.locationType || 'custom',
      deliveryFee: String(location.deliveryFee ?? 0),
      latitude: location.latitude != null && location.latitude !== '' ? String(location.latitude) : '',
      longitude: location.longitude != null && location.longitude !== '' ? String(location.longitude) : '',
      isActive: location.isActive !== false,
    })
    setDirty(false)
    setDrawerOpen(true)
  }

  const toggleLocation = async (locationId) => {
    try {
      const { data } = await axios.post('/api/pickup-locations/toggle', { locationId })
      if (data.success) {
        toast.success(data.message)
        if (editingId === locationId && data.location) {
          setForm((prev) => ({ ...prev, isActive: data.location.isActive }))
        }
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteLocation = (locationId) => setPendingDelete(locationId)

  const confirmDelete = async () => {
    const locationId = pendingDelete
    setPendingDelete(null)
    if (!locationId) return

    try {
      const { data } = await axios.post('/api/pickup-locations/delete', { locationId })
      if (data.success) {
        toast.success(data.message)
        if (editingId === locationId) closeDrawer()
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  useEffect(() => {
    isOwner && fetchLocations()
  }, [isOwner])

  const money = currency || 'MAD '

  const setLoc = (patch) => {
    setDirty(true)
    setForm((f) => ({ ...f, ...patch }))
  }

  return (
    <div className='admin-page-pad w-full pb-12'>
      <Title
        title={t('admin.locations.title')}
        subTitle={t('admin.locations.subtitle')}
        primaryAction={
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              resetForm()
              setDrawerOpen(true)
            }}
          >
            {t('admin.locations.add')}
          </button>
        }
      />

      <AdminDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingId ? t('admin.locations.update') : t('admin.locations.add')}
        description={editingId ? t('admin.locations.editing') : t('admin.locations.subtitle')}
        dirty={dirty}
        unsavedTitle={t('admin.ui.unsavedTitle')}
        unsavedMessage={t('admin.ui.unsavedMessage')}
        discardLabel={t('admin.ui.discard')}
        keepEditingLabel={t('admin.ui.keepEditing')}
        closeLabel={t('admin.ui.close')}
        footer={
          <>
            <button type="button" onClick={closeDrawer} className="admin-btn admin-btn-secondary">{t('admin.common.cancel')}</button>
            <button type="submit" form="location-form" disabled={isLoading} className="admin-btn admin-btn-primary">
              {isLoading ? t('admin.locations.saving') : editingId ? t('admin.locations.update') : t('admin.locations.add')}
            </button>
          </>
        }
      >
        <form id="location-form" onSubmit={handleSubmit} className="space-y-6">
          <DrawerSection title={t('admin.locations.name')}>
            <FormField label={t('admin.locations.name')} required>
              <input type="text" required className="admin-input" value={form.name} onChange={(e) => setLoc({ name: e.target.value })} />
            </FormField>
            <FormField label={t('admin.locations.city')} required>
              <input type="text" required className="admin-input" value={form.city} onChange={(e) => setLoc({ city: e.target.value })} />
            </FormField>
            <FormField label={t('admin.locations.address')} required className="sm:col-span-2">
              <input type="text" required className="admin-input" value={form.address} onChange={(e) => setLoc({ address: e.target.value })} />
            </FormField>
            <FormField label={t('admin.locations.type')}>
              <select className="admin-input" value={form.locationType} onChange={(e) => setLoc({ locationType: e.target.value })}>
                <option value="airport">{t('admin.locations.typeAirport')}</option>
                <option value="hotel">{t('admin.locations.typeHotel')}</option>
                <option value="office">{t('admin.locations.typeOffice')}</option>
                <option value="custom">{t('admin.locations.typeCustom')}</option>
              </select>
            </FormField>
            <FormField label={t('admin.locations.deliveryFee')} hint={t('admin.locations.deliveryFeeHint')}>
              <CurrencyInput currency={money} value={form.deliveryFee} onChange={(deliveryFee) => setLoc({ deliveryFee })} required />
            </FormField>
          </DrawerSection>
          <DrawerSection title={t('admin.locations.mapsLink')}>
            <FormField label={t('admin.locations.mapsLink')} className="sm:col-span-2">
              <input type="url" className="admin-input" value={form.googleMapsLink} onChange={(e) => setLoc({ googleMapsLink: e.target.value })} placeholder="https://maps.google.com/..." />
            </FormField>
            <FormField label={t('admin.locations.latitude')}>
              <input type="number" step="any" min="-90" max="90" className="admin-input" value={form.latitude} onChange={(e) => setLoc({ latitude: e.target.value })} />
            </FormField>
            <FormField label={t('admin.locations.longitude')}>
              <input type="number" step="any" min="-180" max="180" className="admin-input" value={form.longitude} onChange={(e) => setLoc({ longitude: e.target.value })} />
            </FormField>
            <AdminSwitch
              checked={form.isActive}
              onChange={(isActive) => setLoc({ isActive })}
              label={t('admin.locations.available')}
            />
          </DrawerSection>
        </form>
      </AdminDrawer>

      <div className="max-w-5xl w-full rounded-md overflow-hidden border border-borderColor mt-8 bg-white">
        <div className="table-scroll">
        <table className="w-full border-collapse text-left text-sm text-gray-600 max-lg:min-w-[720px]">
          <thead className="text-gray-500 bg-gray-50">
            <tr>
              <th className="p-3 font-medium">{t('admin.locations.colLocation')}</th>
              <th className="p-3 font-medium max-md:hidden">{t('admin.locations.colCity')}</th>
              <th className="p-3 font-medium max-md:hidden">{t('admin.locations.colType')}</th>
              <th className="p-3 font-medium">{t('admin.locations.colFee')}</th>
              <th className="p-3 font-medium max-lg:hidden">{t('admin.locations.colCoords')}</th>
              <th className="p-3 font-medium">{t('admin.locations.colStatus')}</th>
              <th className="p-3 font-medium">{t('admin.locations.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => {
              const fee = Number(location.deliveryFee) || 0
              const hasCoords = location.latitude != null && location.longitude != null
              return (
                <tr
                  key={location._id}
                  className={`border-t border-borderColor ${editingId === location._id ? 'bg-primary/5' : ''}`}
                >
                  <td className="p-3">
                    <p className="font-medium">{location.name}</p>
                    <p className="text-xs text-gray-500 max-w-xs truncate">{location.address}</p>
                  </td>
                  <td className="p-3 max-md:hidden">{location.city}</td>
                  <td className="p-3 max-md:hidden capitalize">{location.locationType}</td>
                  <td className="p-3">
                    {fee <= 0 ? (
                      <span className="text-green-600 font-medium">{t('admin.locations.free')}</span>
                    ) : (
                      <span className="font-medium text-gray-800">{money}{fee}</span>
                    )}
                  </td>
                  <td className="p-3 max-lg:hidden text-xs text-gray-500">
                    {hasCoords ? `${location.latitude}, ${location.longitude}` : '—'}
                  </td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs ${location.isActive ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                      {location.isActive ? t('admin.locations.active') : t('admin.locations.inactive')}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                    <img
                      onClick={() => toggleLocation(location._id)}
                      src={location.isActive ? assets.eye_close_icon : assets.eye_icon}
                      alt=""
                      title={location.isActive ? t('admin.locations.inactive') : t('admin.locations.active')}
                      className="cursor-pointer"
                    />
                    <img
                      onClick={() => startEdit(location)}
                      src={assets.edit_icon}
                      alt=""
                      title={t('admin.locations.update')}
                      className="cursor-pointer"
                    />
                    <img
                      onClick={() => deleteLocation(location._id)}
                      src={assets.delete_icon}
                      alt=""
                      title={t('admin.common.delete')}
                      className="cursor-pointer"
                    />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t('admin.common.delete')}
        message={t('admin.locations.deleteConfirm')}
        confirmText={t('admin.common.delete')}
        cancelText={t('admin.common.cancel')}
        variant="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

export default ManageLocations

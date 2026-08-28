import React from 'react'
import AccountingLedgerPage, {
  toInputDate,
  carLabel,
} from './AccountingLedgerPage'
import { CurrencyInput, DrawerSection, FormField, SearchSelect, SegmentedControl } from '../../admin/ui'
import DateField from '../../components/calendar/DateField'

const VEHICLE_CATEGORIES = [
  'fuel',
  'maintenance',
  'repair',
  'insurance',
  'registration',
  'parking',
  'fine',
  'cleaning',
  'tires',
  'other',
]

const config = {
  listPath: '/api/owner/accounting/vehicle-expenses',
  listKey: 'expenses',
  titleKey: 'admin.accounting.vehicleTitle',
  subtitleKey: 'admin.accounting.vehicleSubtitle',
  createKey: 'admin.accounting.vehicleCreate',
  editKey: 'admin.accounting.vehicleEdit',
  exportLedger: 'vehicle-expenses',
  categories: VEHICLE_CATEGORIES,
  categoryI18nPrefix: 'admin.accounting.vehicleCategories',
  needsCars: true,
  emptyForm: () => ({
    car: '',
    category: 'fuel',
    amount: '',
    expenseDate: toInputDate(new Date()),
    description: '',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    odometerKm: '',
    notes: '',
  }),
  toForm: (row) => ({
    car: row.car?._id || row.car || '',
    category: row.category || 'other',
    amount: row.amount ?? '',
    expenseDate: toInputDate(row.expenseDate),
    description: row.description || '',
    paymentStatus: row.paymentStatus || 'paid',
    paymentMethod: row.paymentMethod || 'cash',
    odometerKm: row.odometerKm ?? '',
    notes: row.notes || '',
  }),
  toPayload: (form) => ({
    car: form.car,
    category: form.category,
    amount: Number(form.amount),
    expenseDate: form.expenseDate,
    description: form.description,
    paymentStatus: form.paymentStatus,
    paymentMethod: form.paymentMethod,
    odometerKm: form.odometerKm === '' ? null : Number(form.odometerKm),
    notes: form.notes,
  }),
  columns: [
    {
      key: 'date',
      labelKey: 'admin.accounting.colDate',
      render: (row) => toInputDate(row.expenseDate) || '—',
    },
    {
      key: 'car',
      labelKey: 'admin.accounting.colVehicle',
      render: (row, { carLabel: cl }) => cl(row.car),
    },
    {
      key: 'category',
      labelKey: 'admin.accounting.colCategory',
      render: (row, { t }) => t(`admin.accounting.vehicleCategories.${row.category}`),
    },
    {
      key: 'amount',
      labelKey: 'admin.accounting.colAmount',
      render: (row, { formatMoney, currency }) => formatMoney(row.amount, currency),
    },
    {
      key: 'status',
      labelKey: 'admin.accounting.colPaymentStatus',
      render: (row, { t }) => t(`admin.accounting.paymentStatuses.${row.paymentStatus}`),
    },
  ],
  renderFields: ({ form, setField, t, cars, currency }) => (
    <>
      <DrawerSection title={t('admin.accounting.sectionDetails')}>
        <FormField label={t('admin.accounting.vehicle')} required className="sm:col-span-2">
          <SearchSelect
            required
            value={form.car}
            onChange={(v) => setField('car', v)}
            placeholder={t('admin.accounting.searchVehicle')}
            emptyLabel={t('admin.ui.noResults')}
            options={cars.map((c) => ({
              value: c._id,
              label: carLabel(c),
              hint: [c.fleetId, c.branch].filter(Boolean).join(' · '),
            }))}
          />
        </FormField>
        <FormField label={t('admin.accounting.category')}>
          <select className="admin-input" value={form.category} onChange={(e) => setField('category', e.target.value)} required>
            {VEHICLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`admin.accounting.vehicleCategories.${c}`)}</option>
            ))}
          </select>
        </FormField>
        <FormField label={t('admin.accounting.odometer')}>
          <input type="number" min="0" className="admin-input" value={form.odometerKm} onChange={(e) => setField('odometerKm', e.target.value)} />
        </FormField>
        <FormField label={t('admin.accounting.amount')} required>
          <CurrencyInput currency={currency} value={form.amount} onChange={(v) => setField('amount', v)} required />
        </FormField>
        <FormField label={t('admin.accounting.date')} required>
          <DateField required className="admin-input" value={form.expenseDate} onChange={(expenseDate) => setField('expenseDate', expenseDate)} />
        </FormField>
        <FormField label={t('admin.accounting.description')} className="sm:col-span-2">
          <input className="admin-input" value={form.description} onChange={(e) => setField('description', e.target.value)} />
        </FormField>
      </DrawerSection>
      <DrawerSection title={t('admin.accounting.sectionPayment')}>
        <FormField label={t('admin.accounting.paymentStatus')} className="sm:col-span-2">
          <SegmentedControl
            value={form.paymentStatus}
            onChange={(v) => setField('paymentStatus', v)}
            options={['pending', 'paid', 'cancelled'].map((s) => ({
              value: s,
              label: t(`admin.accounting.paymentStatuses.${s}`),
            }))}
          />
        </FormField>
        <FormField label={t('admin.accounting.paymentMethod')} className="sm:col-span-2">
          <select className="admin-input" value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)}>
            {['cash', 'bank_transfer', 'check', 'card', 'other'].map((s) => (
              <option key={s} value={s}>{t(`admin.accounting.paymentMethods.${s}`)}</option>
            ))}
          </select>
        </FormField>
        <FormField label={t('admin.accounting.notes')} className="sm:col-span-2">
          <textarea rows={3} className="admin-input" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        </FormField>
      </DrawerSection>
    </>
  ),
}

const VehicleExpenses = () => <AccountingLedgerPage config={config} />

export default VehicleExpenses

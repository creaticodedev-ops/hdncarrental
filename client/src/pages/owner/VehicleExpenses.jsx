import React from 'react'
import AccountingLedgerPage, {
  toInputDate,
  inputClass,
  labelClass,
  carLabel,
} from './AccountingLedgerPage'

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

const FieldSelect = ({ label, value, onChange, options, inputClass: ic, labelClass: lc, required = true }) => (
  <label className="block text-sm">
    <span className={lc}>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={ic} required={required}>
      {options}
    </select>
  </label>
)

const config = {
  listPath: '/api/owner/accounting/vehicle-expenses',
  listKey: 'expenses',
  titleKey: 'admin.accounting.vehicleTitle',
  subtitleKey: 'admin.accounting.vehicleSubtitle',
  createKey: 'admin.accounting.vehicleCreate',
  editKey: 'admin.accounting.vehicleEdit',
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
  renderFields: ({ form, setField, t, cars }) => (
    <>
      <FieldSelect
        label={t('admin.accounting.vehicle')}
        value={form.car}
        onChange={(v) => setField('car', v)}
        inputClass={inputClass}
        labelClass={labelClass}
        options={[
          <option key="" value="">
            {t('admin.accounting.selectVehicle')}
          </option>,
          ...cars.map((c) => (
            <option key={c._id} value={c._id}>
              {carLabel(c)}
            </option>
          )),
        ]}
      />
      <FieldSelect
        label={t('admin.accounting.category')}
        value={form.category}
        onChange={(v) => setField('category', v)}
        inputClass={inputClass}
        labelClass={labelClass}
        options={VEHICLE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {t(`admin.accounting.vehicleCategories.${c}`)}
          </option>
        ))}
      />
      <label className="block text-sm">
        <span className={labelClass}>{t('admin.accounting.amount')}</span>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={form.amount}
          onChange={(e) => setField('amount', e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className={labelClass}>{t('admin.accounting.date')}</span>
        <input
          type="date"
          required
          value={form.expenseDate}
          onChange={(e) => setField('expenseDate', e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className={labelClass}>{t('admin.accounting.odometer')}</span>
        <input
          type="number"
          min="0"
          value={form.odometerKm}
          onChange={(e) => setField('odometerKm', e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        <span className={labelClass}>{t('admin.accounting.description')}</span>
        <input
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          className={inputClass}
        />
      </label>
      <FieldSelect
        label={t('admin.accounting.paymentStatus')}
        value={form.paymentStatus}
        onChange={(v) => setField('paymentStatus', v)}
        inputClass={inputClass}
        labelClass={labelClass}
        options={['pending', 'paid', 'cancelled'].map((s) => (
          <option key={s} value={s}>
            {t(`admin.accounting.paymentStatuses.${s}`)}
          </option>
        ))}
      />
      <FieldSelect
        label={t('admin.accounting.paymentMethod')}
        value={form.paymentMethod}
        onChange={(v) => setField('paymentMethod', v)}
        inputClass={inputClass}
        labelClass={labelClass}
        options={['cash', 'bank_transfer', 'check', 'card', 'other'].map((s) => (
          <option key={s} value={s}>
            {t(`admin.accounting.paymentMethods.${s}`)}
          </option>
        ))}
      />
      <label className="block text-sm">
        <span className={labelClass}>{t('admin.accounting.notes')}</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          className={inputClass}
        />
      </label>
    </>
  ),
}

const VehicleExpenses = () => <AccountingLedgerPage config={config} />

export default VehicleExpenses

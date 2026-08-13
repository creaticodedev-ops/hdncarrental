import React from 'react'
import AccountingLedgerPage, {
  toInputDate,
  inputClass,
  labelClass,
  carLabel,
} from './AccountingLedgerPage'

const AGENCY_CATEGORIES = [
  'rent',
  'utilities',
  'salaries',
  'marketing',
  'insurance',
  'office',
  'taxes',
  'software',
  'other',
]

const FieldSelect = ({ label, value, onChange, options, inputClass: ic, labelClass: lc }) => (
  <label className="block text-sm">
    <span className={lc}>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={ic} required>
      {options}
    </select>
  </label>
)

const config = {
  listPath: '/api/owner/accounting/agency-expenses',
  listKey: 'expenses',
  titleKey: 'admin.accounting.agencyTitle',
  subtitleKey: 'admin.accounting.agencySubtitle',
  createKey: 'admin.accounting.agencyCreate',
  editKey: 'admin.accounting.agencyEdit',
  categories: AGENCY_CATEGORIES,
  categoryI18nPrefix: 'admin.accounting.agencyCategories',
  emptyForm: () => ({
    category: 'rent',
    amount: '',
    expenseDate: toInputDate(new Date()),
    description: '',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    notes: '',
  }),
  toForm: (row) => ({
    category: row.category || 'other',
    amount: row.amount ?? '',
    expenseDate: toInputDate(row.expenseDate),
    description: row.description || '',
    paymentStatus: row.paymentStatus || 'paid',
    paymentMethod: row.paymentMethod || 'cash',
    notes: row.notes || '',
  }),
  toPayload: (form) => ({
    category: form.category,
    amount: Number(form.amount),
    expenseDate: form.expenseDate,
    description: form.description,
    paymentStatus: form.paymentStatus,
    paymentMethod: form.paymentMethod,
    notes: form.notes,
  }),
  columns: [
    {
      key: 'date',
      labelKey: 'admin.accounting.colDate',
      render: (row) => toInputDate(row.expenseDate) || '—',
    },
    {
      key: 'category',
      labelKey: 'admin.accounting.colCategory',
      render: (row, { t }) => t(`admin.accounting.agencyCategories.${row.category}`),
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
    {
      key: 'desc',
      labelKey: 'admin.accounting.colDescription',
      render: (row) => row.description || '—',
    },
  ],
  renderFields: ({ form, setField, t }) => (
    <>
      <FieldSelect
        label={t('admin.accounting.category')}
        value={form.category}
        onChange={(v) => setField('category', v)}
        inputClass={inputClass}
        labelClass={labelClass}
        options={AGENCY_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {t(`admin.accounting.agencyCategories.${c}`)}
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

const AgencyExpenses = () => <AccountingLedgerPage config={config} />

export default AgencyExpenses

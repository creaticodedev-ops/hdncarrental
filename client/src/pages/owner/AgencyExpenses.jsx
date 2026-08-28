import React from 'react'
import AccountingLedgerPage, {
  toInputDate,
} from './AccountingLedgerPage'
import { CurrencyInput, DrawerSection, FormField, SegmentedControl } from '../../admin/ui'
import DateField from '../../components/calendar/DateField'

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

const config = {
  listPath: '/api/owner/accounting/agency-expenses',
  listKey: 'expenses',
  titleKey: 'admin.accounting.agencyTitle',
  subtitleKey: 'admin.accounting.agencySubtitle',
  createKey: 'admin.accounting.agencyCreate',
  exportLedger: 'agency-expenses',
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
  renderFields: ({ form, setField, t, currency }) => (
    <>
      <DrawerSection title={t('admin.accounting.sectionDetails')}>
        <FormField label={t('admin.accounting.category')} className="sm:col-span-2">
          <select className="admin-input" value={form.category} onChange={(e) => setField('category', e.target.value)} required>
            {AGENCY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`admin.accounting.agencyCategories.${c}`)}</option>
            ))}
          </select>
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

const AgencyExpenses = () => <AccountingLedgerPage config={config} />

export default AgencyExpenses

import React from 'react'
import AccountingLedgerPage, { toInputDate } from './AccountingLedgerPage'
import { CurrencyInput, DrawerSection, FormField, SearchSelect, SegmentedControl } from '../../admin/ui'

const config = {
  listPath: '/api/owner/accounting/samsar-payments',
  listKey: 'payments',
  titleKey: 'admin.accounting.samsarPayTitle',
  subtitleKey: 'admin.accounting.samsarPaySubtitle',
  createKey: 'admin.accounting.samsarPayCreate',
  exportLedger: 'samsar-payments',
  editKey: 'admin.accounting.samsarPayEdit',
  needsSamsars: true,
  emptyForm: () => ({
    samsar: '',
    booking: '',
    amount: '',
    paymentDate: toInputDate(new Date()),
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    notes: '',
  }),
  toForm: (row) => ({
    samsar: row.samsar?._id || row.samsar || '',
    booking: row.booking?._id || row.booking || '',
    amount: row.amount ?? '',
    paymentDate: toInputDate(row.paymentDate),
    paymentStatus: row.paymentStatus || 'paid',
    paymentMethod: row.paymentMethod || 'cash',
    notes: row.notes || '',
  }),
  toPayload: (form) => ({
    samsar: form.samsar,
    booking: form.booking || null,
    amount: Number(form.amount),
    paymentDate: form.paymentDate,
    paymentStatus: form.paymentStatus,
    paymentMethod: form.paymentMethod,
    notes: form.notes,
  }),
  columns: [
    {
      key: 'date',
      labelKey: 'admin.accounting.colDate',
      render: (row) => toInputDate(row.paymentDate) || '—',
    },
    {
      key: 'samsar',
      labelKey: 'admin.accounting.colSamsar',
      render: (row) => row.samsar?.fullName || '—',
    },
    {
      key: 'booking',
      labelKey: 'admin.accounting.colReservation',
      render: (row) => row.booking?.reservationId || '—',
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
  renderFields: ({ form, setField, t, samsars, currency }) => (
    <>
      <DrawerSection title={t('admin.accounting.sectionDetails')}>
        <FormField label={t('admin.accounting.samsar')} required className="sm:col-span-2">
          <SearchSelect
            required
            value={form.samsar}
            onChange={(v) => setField('samsar', v)}
            placeholder={t('admin.accounting.searchSamsar')}
            emptyLabel={t('admin.ui.noResults')}
            options={samsars.map((s) => ({
              value: s._id,
              label: s.fullName,
              hint: s.phone || s.email || '',
            }))}
          />
        </FormField>
        <FormField label={t('admin.accounting.amount')} required>
          <CurrencyInput currency={currency} value={form.amount} onChange={(v) => setField('amount', v)} required />
        </FormField>
        <FormField label={t('admin.accounting.date')} required>
          <input type="date" required className="admin-input" value={form.paymentDate} onChange={(e) => setField('paymentDate', e.target.value)} />
        </FormField>
        <FormField label={t('admin.accounting.bookingIdOptional')} className="sm:col-span-2" hint={t('admin.accounting.bookingIdOptional')}>
          <input className="admin-input" value={form.booking} onChange={(e) => setField('booking', e.target.value)} />
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

const SamsarPayments = () => <AccountingLedgerPage config={config} />

export default SamsarPayments

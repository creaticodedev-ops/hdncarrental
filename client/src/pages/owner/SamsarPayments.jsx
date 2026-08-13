import React from 'react'
import AccountingLedgerPage, {
  toInputDate,
  inputClass,
  labelClass,
} from './AccountingLedgerPage'

const FieldSelect = ({ label, value, onChange, options, inputClass: ic, labelClass: lc }) => (
  <label className="block text-sm">
    <span className={lc}>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={ic} required>
      {options}
    </select>
  </label>
)

const config = {
  listPath: '/api/owner/accounting/samsar-payments',
  listKey: 'payments',
  titleKey: 'admin.accounting.samsarPayTitle',
  subtitleKey: 'admin.accounting.samsarPaySubtitle',
  createKey: 'admin.accounting.samsarPayCreate',
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
  renderFields: ({ form, setField, t, samsars }) => (
    <>
      <FieldSelect
        label={t('admin.accounting.samsar')}
        value={form.samsar}
        onChange={(v) => setField('samsar', v)}
        inputClass={inputClass}
        labelClass={labelClass}
        options={[
          <option key="" value="">
            {t('admin.accounting.selectSamsar')}
          </option>,
          ...samsars.map((s) => (
            <option key={s._id} value={s._id}>
              {s.fullName}
            </option>
          )),
        ]}
      />
      <label className="block text-sm">
        <span className={labelClass}>{t('admin.accounting.bookingIdOptional')}</span>
        <input
          value={form.booking}
          onChange={(e) => setField('booking', e.target.value)}
          placeholder="Mongo ObjectId"
          className={inputClass}
        />
      </label>
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
          value={form.paymentDate}
          onChange={(e) => setField('paymentDate', e.target.value)}
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

const SamsarPayments = () => <AccountingLedgerPage config={config} />

export default SamsarPayments

import React from 'react'
import DirectoryCrudPage, { StatusBadge } from './DirectoryCrudPage'

const config = {
  listPath: '/api/owner/samsars',
  listKey: 'samsars',
  titleKey: 'admin.directory.samsarsTitle',
  subtitleKey: 'admin.directory.samsarsSubtitle',
  createKey: 'admin.directory.samsarsCreate',
  editKey: 'admin.directory.samsarsEdit',
  emptyForm: () => ({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    commissionType: 'percent',
    commissionValue: 10,
    status: 'active',
    notes: '',
  }),
  toForm: (row) => ({
    fullName: row.fullName || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    commissionType: row.commissionType || 'percent',
    commissionValue: row.commissionValue ?? 10,
    status: row.status || 'active',
    notes: row.notes || '',
  }),
  toPayload: (form) => ({
    ...form,
    commissionValue: Number(form.commissionValue),
  }),
  fields: [
    { name: 'fullName', labelKey: 'admin.directory.fullName', required: true, span: 2 },
    { name: 'status', labelKey: 'admin.directory.status', control: 'switch', type: 'select' },
    { name: 'phone', labelKey: 'admin.directory.phone', control: 'phone' },
    { name: 'email', labelKey: 'admin.directory.email', type: 'email' },
    { name: 'address', labelKey: 'admin.directory.address', type: 'textarea', span: 2 },
    {
      name: 'commissionType',
      labelKey: 'admin.directory.commissionType',
      control: 'segmented',
      options: [
        { value: 'percent', labelKey: 'admin.directory.commissionPercent' },
        { value: 'fixed', labelKey: 'admin.directory.commissionFixed' },
      ],
    },
    {
      name: 'commissionValue',
      labelKey: 'admin.directory.commissionValue',
      control: 'commission',
      type: 'number',
      min: 0,
      step: '0.01',
    },
    { name: 'notes', labelKey: 'admin.directory.notes', type: 'textarea', span: 2, hintKey: 'admin.directory.notesHint' },
  ],
  sections: [
    { titleKey: 'admin.directory.sectionIdentity', fields: ['fullName', 'status'] },
    { titleKey: 'admin.directory.sectionContact', fields: ['phone', 'email', 'address'] },
    { titleKey: 'admin.directory.sectionCommission', fields: ['commissionType', 'commissionValue'] },
    { titleKey: 'admin.directory.sectionNotes', fields: ['notes'] },
  ],
  columns: (t) => [
    { key: 'fullName', label: t('admin.directory.fullName') },
    { key: 'phone', label: t('admin.directory.phone') },
    { key: 'email', label: t('admin.directory.email') },
    {
      key: 'commission',
      label: t('admin.directory.commission'),
      render: (row) =>
        row.commissionType === 'fixed'
          ? `${row.commissionValue ?? 0}`
          : `${row.commissionValue ?? 0}%`,
    },
    {
      key: 'status',
      label: t('admin.directory.status'),
      render: (row, tr) => <StatusBadge status={row.status} t={tr} />,
    },
  ],
}

const Samsars = () => <DirectoryCrudPage config={config} />
export default Samsars

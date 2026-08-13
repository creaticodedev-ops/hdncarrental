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
    { name: 'fullName', labelKey: 'admin.directory.fullName', required: true },
    { name: 'phone', labelKey: 'admin.directory.phone', type: 'tel' },
    { name: 'email', labelKey: 'admin.directory.email', type: 'email' },
    { name: 'address', labelKey: 'admin.directory.address', type: 'textarea' },
    {
      name: 'commissionType',
      labelKey: 'admin.directory.commissionType',
      type: 'select',
      options: [
        { value: 'percent', labelKey: 'admin.directory.commissionPercent' },
        { value: 'fixed', labelKey: 'admin.directory.commissionFixed' },
      ],
    },
    {
      name: 'commissionValue',
      labelKey: 'admin.directory.commissionValue',
      type: 'number',
      min: 0,
      step: '0.01',
    },
    {
      name: 'status',
      labelKey: 'admin.directory.status',
      type: 'select',
      options: [
        { value: 'active', labelKey: 'admin.directory.statusActive' },
        { value: 'inactive', labelKey: 'admin.directory.statusInactive' },
      ],
    },
    { name: 'notes', labelKey: 'admin.directory.notes', type: 'textarea' },
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

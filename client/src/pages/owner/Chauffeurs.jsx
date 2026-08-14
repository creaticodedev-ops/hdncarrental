import React from 'react'
import DirectoryCrudPage, { StatusBadge } from './DirectoryCrudPage'

const toDateInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const config = {
  listPath: '/api/owner/chauffeurs',
  listKey: 'chauffeurs',
  titleKey: 'admin.directory.chauffeursTitle',
  subtitleKey: 'admin.directory.chauffeursSubtitle',
  createKey: 'admin.directory.chauffeursCreate',
  editKey: 'admin.directory.chauffeursEdit',
  emptyForm: () => ({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'active',
    notes: '',
  }),
  toForm: (row) => ({
    fullName: row.fullName || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    licenseNumber: row.licenseNumber || '',
    licenseExpiry: toDateInput(row.licenseExpiry),
    status: row.status || 'active',
    notes: row.notes || '',
  }),
  toPayload: (form) => ({
    ...form,
    licenseExpiry: form.licenseExpiry || null,
  }),
  fields: [
    { name: 'fullName', labelKey: 'admin.directory.fullName', required: true, span: 2 },
    { name: 'status', labelKey: 'admin.directory.status', control: 'switch', type: 'select' },
    { name: 'phone', labelKey: 'admin.directory.phone', control: 'phone' },
    { name: 'email', labelKey: 'admin.directory.email', type: 'email' },
    { name: 'address', labelKey: 'admin.directory.address', type: 'textarea', span: 2 },
    { name: 'licenseNumber', labelKey: 'admin.directory.licenseNumber' },
    { name: 'licenseExpiry', labelKey: 'admin.directory.licenseExpiry', type: 'date', hintKey: 'admin.directory.licenseHint' },
    { name: 'notes', labelKey: 'admin.directory.notes', type: 'textarea', span: 2, hintKey: 'admin.directory.notesHint' },
  ],
  sections: [
    { titleKey: 'admin.directory.sectionIdentity', fields: ['fullName', 'status'] },
    { titleKey: 'admin.directory.sectionContact', fields: ['phone', 'email', 'address'] },
    { titleKey: 'admin.directory.sectionLicense', fields: ['licenseNumber', 'licenseExpiry'] },
    { titleKey: 'admin.directory.sectionNotes', fields: ['notes'] },
  ],
  columns: (t) => [
    { key: 'fullName', label: t('admin.directory.fullName') },
    { key: 'phone', label: t('admin.directory.phone') },
    { key: 'email', label: t('admin.directory.email') },
    {
      key: 'license',
      label: t('admin.directory.license'),
      render: (row) => {
        const exp = row.licenseExpiry ? new Date(row.licenseExpiry) : null
        const expired = exp && !Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()
        return (
          <span className={expired ? 'text-red-700 font-medium' : ''}>
            {row.licenseNumber || '—'}
            {exp && !Number.isNaN(exp.getTime())
              ? ` · ${exp.toLocaleDateString()}${expired ? ` (${t('admin.directory.licenseExpired')})` : ''}`
              : ''}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t('admin.directory.status'),
      render: (row, tr) => <StatusBadge status={row.status} t={tr} />,
    },
  ],
}

const Chauffeurs = () => <DirectoryCrudPage config={config} />
export default Chauffeurs

import React from 'react'
import DirectoryCrudPage, { StatusBadge } from './DirectoryCrudPage'

const config = {
  listPath: '/api/owner/partner-companies',
  listKey: 'partnerCompanies',
  titleKey: 'admin.directory.partnersTitle',
  subtitleKey: 'admin.directory.partnersSubtitle',
  createKey: 'admin.directory.partnersCreate',
  editKey: 'admin.directory.partnersEdit',
  emptyForm: () => ({
    companyName: '',
    legalName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    registrationNumber: '',
    status: 'active',
    notes: '',
  }),
  toForm: (row) => ({
    companyName: row.companyName || '',
    legalName: row.legalName || '',
    contactName: row.contactName || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    taxId: row.taxId || '',
    registrationNumber: row.registrationNumber || '',
    status: row.status || 'active',
    notes: row.notes || '',
  }),
  toPayload: (form) => ({ ...form }),
  fields: [
    { name: 'companyName', labelKey: 'admin.directory.companyName', required: true, span: 2 },
    { name: 'legalName', labelKey: 'admin.directory.legalName' },
    { name: 'status', labelKey: 'admin.directory.status', control: 'switch', type: 'select' },
    { name: 'contactName', labelKey: 'admin.directory.contactName' },
    { name: 'phone', labelKey: 'admin.directory.phone', control: 'phone' },
    { name: 'email', labelKey: 'admin.directory.email', type: 'email' },
    { name: 'address', labelKey: 'admin.directory.address', type: 'textarea', span: 2 },
    { name: 'taxId', labelKey: 'admin.directory.taxId' },
    { name: 'registrationNumber', labelKey: 'admin.directory.registrationNumber' },
    { name: 'notes', labelKey: 'admin.directory.notes', type: 'textarea', span: 2, hintKey: 'admin.directory.notesHint' },
  ],
  sections: [
    { titleKey: 'admin.directory.sectionCompany', fields: ['companyName', 'legalName', 'status'] },
    { titleKey: 'admin.directory.sectionContact', fields: ['contactName', 'phone', 'email', 'address'] },
    { titleKey: 'admin.directory.sectionLegal', fields: ['taxId', 'registrationNumber'] },
    { titleKey: 'admin.directory.sectionNotes', fields: ['notes'] },
  ],
  columns: (t) => [
    { key: 'companyName', label: t('admin.directory.companyName') },
    { key: 'contactName', label: t('admin.directory.contactName') },
    { key: 'phone', label: t('admin.directory.phone') },
    { key: 'email', label: t('admin.directory.email') },
    { key: 'taxId', label: t('admin.directory.taxId') },
    {
      key: 'status',
      label: t('admin.directory.status'),
      render: (row, tr) => <StatusBadge status={row.status} t={tr} />,
    },
  ],
}

const PartnerCompanies = () => <DirectoryCrudPage config={config} />
export default PartnerCompanies

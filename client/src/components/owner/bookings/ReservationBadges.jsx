import React from 'react'
import { StatusBadge } from '../../../admin/ui'
import {
  bookingStatusTone,
  contractTone,
  getContractStatus,
  getPaymentDisplay,
  getSignatureStatus,
  paymentTone,
  signatureTone,
} from './reservationHelpers'

export const BookingStatusBadge = ({ status, t }) => (
  <StatusBadge tone={bookingStatusTone(status)}>
    {t(`admin.bookings.statuses.${status}`)}
  </StatusBadge>
)

export const SignatureBadge = ({ booking, t }) => {
  const status = getSignatureStatus(booking)
  return (
    <StatusBadge tone={signatureTone(status)}>
      {t(`admin.bookings.requestStatuses.${status}`)}
    </StatusBadge>
  )
}

export const PaymentBadge = ({ booking, t }) => {
  const status = getPaymentDisplay(booking)
  return (
    <StatusBadge tone={paymentTone(status)}>
      {t(`admin.bookings.paymentLabels.${status}`)}
    </StatusBadge>
  )
}

export const ContractBadge = ({ booking, t }) => {
  const status = getContractStatus(booking)
  return (
    <StatusBadge tone={contractTone(status)}>
      {t(`admin.bookings.contractLabels.${status}`)}
    </StatusBadge>
  )
}

export const ChannelChip = ({ channel }) => {
  const walkIn = String(channel || '').toLowerCase().includes('walk')
  return (
    <StatusBadge tone={walkIn ? 'success' : 'info'}>
      {walkIn ? 'Walk-in' : 'Online'}
    </StatusBadge>
  )
}

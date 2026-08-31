import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { StatCard, StatusBadge, FormField, EmptyState } from '../../../admin/ui'
import WhatsAppGlyph from '../../WhatsAppGlyph'
import { customerEmail } from '../../../utils/customerEmail'
import { getErrorMessage } from '../../../utils/apiError'
import { createExternalTabOpener } from '../../../utils/whatsapp'
import {
  CRM_TABS,
  SMART_TONES,
  SMART_DOT,
  LOYALTY_TONES,
  WA_TEMPLATES,
  FOLLOW_UP_TO_TEMPLATE,
  formatShortDate,
  formatDay,
} from './crmPresentation'

const Stars = ({ value = 0, onChange, size = 'text-lg' }) => (
  <div className={`flex gap-0.5 ${size}`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange?.(n)}
        className={`${onChange ? 'cursor-pointer' : 'cursor-default'} ${n <= Math.round(value) ? 'text-amber-400' : 'text-gray-300'}`}
      >
        ★
      </button>
    ))}
  </div>
)

const bookingHref = (id) => `/owner/manage-bookings?bookingId=${id}`

const CustomerWorkspace = ({
  axios,
  detail,
  currency,
  language,
  t,
  onReload,
  onSetStatus,
  saving,
}) => {
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)
  const [careNotes, setCareNotes] = useState(detail?.care?.notes || '')
  const [satisfaction, setSatisfaction] = useState(detail?.care?.satisfaction || '')
  const [nextFollowUp, setNextFollowUp] = useState(
    detail?.care?.nextFollowUpAt ? String(detail.care.nextFollowUpAt).slice(0, 16) : '',
  )
  const [issueText, setIssueText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewBooking, setReviewBooking] = useState('')
  const [internalResponse, setInternalResponse] = useState('')
  const [referralCodeIn, setReferralCodeIn] = useState('')
  const [waTemplate, setWaTemplate] = useState('during_rental')
  const [waBooking, setWaBooking] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [adminRating, setAdminRating] = useState(5)

  useEffect(() => {
    setCareNotes(detail?.care?.notes || '')
    setSatisfaction(detail?.care?.satisfaction || '')
    setNextFollowUp(detail?.care?.nextFollowUpAt ? String(detail.care.nextFollowUpAt).slice(0, 16) : '')
  }, [detail?.customer?._id, detail?.care?.notes, detail?.care?.satisfaction, detail?.care?.nextFollowUpAt])

  const customer = detail?.customer || {}
  const emailKey = customer.email
  const kpis = detail?.kpis || {}
  const bookings = detail?.bookings || []

  const activeBookingId = detail?.care?.activeRental?._id || bookings[0]?._id || ''

  const post = async (url, body, successKey) => {
    setBusy(true)
    try {
      const { data } = await axios.post(url, body)
      if (!data?.success) throw new Error(data?.message || 'Failed')
      if (successKey) toast.success(t(successKey))
      onReload?.(data)
      return data
    } catch (error) {
      toast.error(getErrorMessage(error))
      return null
    } finally {
      setBusy(false)
    }
  }

  const saveCare = () => post(
    `/api/owner/crm/customers/${encodeURIComponent(emailKey)}/care`,
    {
      notes: careNotes,
      satisfaction,
      nextFollowUpAt: nextFollowUp || null,
    },
    'admin.customers.careSaved',
  )

  const markContacted = () => post(
    `/api/owner/crm/customers/${encodeURIComponent(emailKey)}/care`,
    { contacted: true },
    'admin.customers.markedContacted',
  )

  const sendWhatsApp = async (templateId, bookingId) => {
    const opener = createExternalTabOpener()
    setBusy(true)
    try {
      const { data } = await axios.post(
        `/api/owner/crm/customers/${encodeURIComponent(emailKey)}/whatsapp`,
        { templateId, bookingId: bookingId || waBooking || activeBookingId, lang: language },
      )
      if (!data?.success || !data.whatsappUrl) throw new Error(data?.message || 'WhatsApp failed')
      if (!opener.navigate(data.whatsappUrl)) opener.close()
      toast.success(t('admin.customers.whatsappOpened'))
      onReload?.()
    } catch (error) {
      opener.close?.()
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const displayEmail = customerEmail(customer)

  const kpiItems = useMemo(() => ([
    { label: t('admin.customers.kpiReservations'), value: kpis.totalReservations ?? customer.totalReservations ?? 0 },
    { label: t('admin.customers.kpiCompleted'), value: kpis.completedRentals ?? customer.completedReservations ?? 0 },
    { label: t('admin.customers.kpiActive'), value: kpis.activeRentals ?? 0 },
    { label: t('admin.customers.kpiRevenue'), value: `${currency}${kpis.totalRevenue ?? customer.totalSpent ?? 0}` },
    { label: t('admin.customers.kpiDays'), value: kpis.totalRentalDays ?? 0 },
    { label: t('admin.customers.kpiAvgDays'), value: kpis.averageRentalDays ?? 0 },
  ]), [kpis, customer, currency, t])

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--admin-ink)]">{customer.name}</h2>
            <StatusBadge tone={SMART_TONES[customer.smartStatus] || 'neutral'}>
              {SMART_DOT[customer.smartStatus] || ''} {t(`admin.customers.smart.${customer.smartStatus || 'inactive'}`)}
            </StatusBadge>
            <StatusBadge tone={LOYALTY_TONES[customer.loyaltyLevel] || 'neutral'}>
              {t(`admin.customers.loyalty.${customer.loyaltyLevel || 'new'}`)}
            </StatusBadge>
            {customer.status === 'blacklisted' ? (
              <StatusBadge tone="danger">{t('admin.customers.blacklist')}</StatusBadge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {customer.phone || '—'}
            {displayEmail ? ` · ${displayEmail}` : ''}
            {customer.city ? ` · ${customer.city}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !customer.phone}
            onClick={() => sendWhatsApp(detail?.care?.activeRental ? 'during_rental' : 'winback', activeBookingId)}
            className="admin-btn admin-btn-secondary inline-flex items-center gap-1.5"
          >
            <WhatsAppGlyph className="h-3.5 w-3.5" />
            {t('admin.customers.whatsapp')}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        {kpiItems.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <nav className="crm-tabs mt-5" role="tablist" aria-label={t('admin.customers.workspace')}>
        {CRM_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {t(`admin.customers.tabs.${id}`)}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-4">
        {tab === 'overview' && (
          <>
            <div className="admin-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-3">
                {t('admin.customers.journeyTitle')}
              </p>
              <div className="crm-journey">
                {(detail.journey?.stages || []).map((stage) => (
                  <div
                    key={stage.id}
                    className={`crm-journey-step ${stage.reached ? 'is-reached' : ''} ${stage.current ? 'is-current' : ''}`}
                  >
                    <span className="crm-journey-dot" />
                    <span className={`text-[10px] leading-tight ${stage.current ? 'font-semibold text-[var(--admin-ink)]' : 'text-[var(--admin-muted)]'}`}>
                      {t(`admin.customers.journey.${stage.id}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="admin-card p-4 text-sm space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">{t('admin.customers.profile')}</p>
                <p>{t('admin.customers.lastRental')}: {kpis.lastRental ? `${kpis.lastRental.vehicle} · ${formatDay(kpis.lastRental.pickupDate, language)}` : '—'}</p>
                <p>{t('admin.customers.favorite')}: {(kpis.favoriteVehicles || []).map((v) => `${v.label} (${v.count})`).join(', ') || '—'}</p>
                <p>{t('admin.customers.lastContact')}: {formatShortDate(customer.lastContactAt || detail.care?.lastContactAt, language)}</p>
                <p>{t('admin.customers.referrals')}: {detail.referrals?.successfulReferrals ?? 0}</p>
              </div>
              <div className="admin-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-2">{t('admin.customers.internalNotes')}</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(customer.internalNotes || []).slice().reverse().slice(0, 6).map((n) => (
                    <div key={n._id || n.createdAt} className="text-xs rounded-lg bg-[var(--admin-surface-2)] p-2">
                      {n.rating ? <Stars value={n.rating} size="text-sm" /> : null}
                      <p className="text-[var(--admin-ink-secondary)] mt-0.5">{n.text}</p>
                    </div>
                  ))}
                  {!(customer.internalNotes || []).length ? (
                    <p className="text-xs text-[var(--admin-muted)]">{t('admin.customers.noNotes')}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'rentals' && (
          <div className="admin-card overflow-hidden">
            {(bookings || []).length === 0 ? (
              <EmptyState title={t('admin.customers.noRentals')} />
            ) : (
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--admin-table-head)] text-[var(--admin-muted)]">
                    <tr>
                      <th className="p-3 text-left">{t('admin.bookings.reservation')}</th>
                      <th className="p-3 text-left">{t('admin.customers.vehicle')}</th>
                      <th className="p-3 text-left">{t('admin.customers.status')}</th>
                      <th className="p-3 text-left">{t('admin.customers.dates')}</th>
                      <th className="p-3 text-left">{t('admin.customers.spent')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b._id} className="border-t border-[var(--admin-border)]">
                        <td className="p-3">
                          <Link to={bookingHref(b._id)} className="font-medium text-primary hover:underline">
                            {b.reservationId}
                          </Link>
                        </td>
                        <td className="p-3">{b.car ? `${b.car.brand} ${b.car.model}` : '—'}</td>
                        <td className="p-3 capitalize">{b.status}</td>
                        <td className="p-3 text-xs">{formatDay(b.pickupDate, language)} → {formatDay(b.returnDate, language)}</td>
                        <td className="p-3">{currency}{b.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'care' && (
          <>
            <div className="admin-card p-4 space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">{t('admin.customers.tabs.care')}</p>
              {detail.care?.activeRental ? (
                <div className="rounded-lg border border-[var(--admin-border)] p-3 space-y-1">
                  <p className="font-medium">{detail.care.activeRental.reservationId} · {detail.care.activeRental.car?.brand} {detail.care.activeRental.car?.model}</p>
                  <p>{t('admin.customers.rentalStart')}: {formatShortDate(detail.care.activeRental.pickupDate, language)}</p>
                  <p>{t('admin.customers.expectedReturn')}: {formatShortDate(detail.care.activeRental.returnDate, language)}</p>
                  <p>{t('admin.customers.returnStatus')}: {t(`admin.customers.return.${detail.care.returnStatus || 'on_rent'}`)}</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => sendWhatsApp('during_rental', detail.care.activeRental._id)}
                    className="admin-btn admin-btn-primary mt-2 inline-flex items-center gap-1.5"
                  >
                    <WhatsAppGlyph className="h-3.5 w-3.5" />
                    {t('admin.customers.contactWhatsApp')}
                  </button>
                </div>
              ) : (
                <p className="text-[var(--admin-muted)]">{t('admin.customers.noActiveRental')}</p>
              )}
              <p>{t('admin.customers.contacted')}: {detail.care?.contacted ? t('admin.customers.yes') : t('admin.customers.no')}</p>
              <p>{t('admin.customers.lastContact')}: {formatShortDate(detail.care?.lastContactAt, language)}</p>
              {(detail.followUps || []).length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">{t('admin.customers.dueFollowUps')}</p>
                  {detail.followUps.map((f) => (
                    <div key={f._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--admin-surface-2)] px-3 py-2">
                      <span>{t(`admin.customers.followUp.${f.kind}`)}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary text-xs"
                          disabled={busy}
                          onClick={() => sendWhatsApp(FOLLOW_UP_TO_TEMPLATE[f.kind], f.booking)}
                        >
                          {t('admin.customers.send')}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost text-xs"
                          disabled={busy}
                          onClick={() => post(`/api/owner/crm/follow-ups/${f._id}/complete`, { status: 'skipped' })}
                        >
                          {t('admin.customers.skip')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <FormField label={t('admin.customers.satisfaction')}>
                <select className="admin-input" value={satisfaction} onChange={(e) => setSatisfaction(e.target.value)}>
                  <option value="">{t('admin.customers.notSet')}</option>
                  <option value="excellent">{t('admin.customers.sat.excellent')}</option>
                  <option value="good">{t('admin.customers.sat.good')}</option>
                  <option value="neutral">{t('admin.customers.sat.neutral')}</option>
                  <option value="poor">{t('admin.customers.sat.poor')}</option>
                </select>
              </FormField>
              <FormField label={t('admin.customers.nextFollowUp')}>
                <input type="datetime-local" className="admin-input" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
              </FormField>
              <FormField label={t('admin.customers.careNotes')} className="sm:col-span-2">
                <textarea className="admin-input" rows={3} value={careNotes} onChange={(e) => setCareNotes(e.target.value)} />
              </FormField>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={saveCare}>{t('admin.customers.saveCare')}</button>
                <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={markContacted}>{t('admin.customers.markContacted')}</button>
              </div>
            </div>
            <div className="admin-card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">{t('admin.customers.issues')}</p>
              {(detail.issues || []).map((issue) => (
                <div key={issue._id} className="rounded-lg border border-[var(--admin-border)] p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{issue.reportedIssue}</p>
                    <StatusBadge tone={issue.status === 'resolved' ? 'success' : 'danger'}>{t(`admin.customers.issueStatus.${issue.status}`)}</StatusBadge>
                  </div>
                  {issue.status !== 'resolved' ? (
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="admin-btn admin-btn-secondary text-xs" disabled={busy} onClick={() => post(`/api/owner/crm/issues/${issue._id}`, { status: 'in_progress' })}>
                        {t('admin.customers.markInProgress')}
                      </button>
                      <button type="button" className="admin-btn admin-btn-primary text-xs" disabled={busy} onClick={() => post(`/api/owner/crm/issues/${issue._id}`, { status: 'resolved' }, 'admin.customers.issueResolved')}>
                        {t('admin.customers.resolve')}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              <textarea className="admin-input" rows={2} placeholder={t('admin.customers.issuePlaceholder')} value={issueText} onChange={(e) => setIssueText(e.target.value)} />
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={busy || !issueText.trim()}
                onClick={async () => {
                  const ok = await post(`/api/owner/crm/customers/${encodeURIComponent(emailKey)}/issues`, {
                    reportedIssue: issueText,
                    bookingId: activeBookingId || null,
                  }, 'admin.customers.issueCreated')
                  if (ok) setIssueText('')
                }}
              >
                {t('admin.customers.logIssue')}
              </button>
            </div>
          </>
        )}

        {tab === 'communication' && (
          <div className="admin-card p-4 space-y-3">
            <p className="text-sm text-[var(--admin-muted)]">{t('admin.customers.waHint')}</p>
            <FormField label={t('admin.customers.template')}>
              <select className="admin-input" value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)}>
                {WA_TEMPLATES.map((id) => (
                  <option key={id} value={id}>{t(`admin.customers.wa.${id}`)}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('admin.customers.linkedReservation')}>
              <select className="admin-input" value={waBooking} onChange={(e) => setWaBooking(e.target.value)}>
                <option value="">{t('admin.customers.latestReservation')}</option>
                {bookings.map((b) => (
                  <option key={b._id} value={b._id}>{b.reservationId} · {b.status}</option>
                ))}
              </select>
            </FormField>
            <button type="button" className="admin-btn admin-btn-primary inline-flex items-center gap-1.5" disabled={busy || !customer.phone} onClick={() => sendWhatsApp(waTemplate, waBooking)}>
              <WhatsAppGlyph className="h-3.5 w-3.5" />
              {t('admin.customers.openWhatsApp')}
            </button>
          </div>
        )}

        {tab === 'documents' && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="admin-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-2">{t('admin.menu.contracts')}</p>
              {(detail.contracts || []).length === 0 ? <p className="text-sm text-[var(--admin-muted)]">{t('admin.customers.noneYet')}</p> : detail.contracts.map((c) => (
                <p key={c._id} className="text-sm py-1.5 border-b border-[var(--admin-border)] last:border-0">
                  {c.contractNumber} · {c.signedAt || c.signedPdfUrl ? t('admin.customers.signed') : t('admin.customers.unsigned')}
                </p>
              ))}
            </div>
            <div className="admin-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-2">{t('admin.menu.invoices')}</p>
              {(detail.invoices || []).length === 0 ? <p className="text-sm text-[var(--admin-muted)]">{t('admin.customers.noneYet')}</p> : detail.invoices.map((inv) => (
                <p key={inv._id} className="text-sm py-1.5 border-b border-[var(--admin-border)] last:border-0">
                  {inv.invoiceNumber} · {currency}{inv.totalAmount} · {inv.paymentStatus}
                </p>
              ))}
            </div>
            <div className="admin-card p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-2">{t('admin.customers.payments')}</p>
              {(detail.payments || []).length === 0 ? <p className="text-sm text-[var(--admin-muted)]">{t('admin.customers.noneYet')}</p> : detail.payments.slice(0, 12).map((p, i) => (
                <p key={`${p.reservationId}-${i}`} className="text-sm py-1.5 border-b border-[var(--admin-border)] last:border-0">
                  {p.reservationId} · {currency}{p.amount} · {p.method} · {formatDay(p.paidAt, language)}
                </p>
              ))}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="admin-card p-4 space-y-3">
            {(detail.reviews || []).map((r) => (
              <div key={r._id} className="rounded-lg border border-[var(--admin-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs text-[var(--admin-muted)]">{formatShortDate(r.createdAt, language)}</span>
                </div>
                {r.feedback ? <p className="mt-1 text-sm">{r.feedback}</p> : null}
                {r.complaintFlag ? <StatusBadge tone="danger">{t('admin.customers.complaint')}</StatusBadge> : null}
                {r.internalResponse ? <p className="mt-1 text-xs text-[var(--admin-muted)]">{r.internalResponse}</p> : null}
              </div>
            ))}
            <FormField label={t('admin.customers.linkedReservation')}>
              <select className="admin-input" value={reviewBooking} onChange={(e) => setReviewBooking(e.target.value)}>
                <option value="">{t('admin.customers.latestReservation')}</option>
                {bookings.map((b) => (
                  <option key={b._id} value={b._id}>{b.reservationId}</option>
                ))}
              </select>
            </FormField>
            <Stars value={reviewRating} onChange={setReviewRating} size="text-2xl" />
            <textarea className="admin-input" rows={2} placeholder={t('admin.customers.feedbackPlaceholder')} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
            <textarea className="admin-input" rows={2} placeholder={t('admin.customers.internalResponse')} value={internalResponse} onChange={(e) => setInternalResponse(e.target.value)} />
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={busy}
              onClick={async () => {
                const data = await post(`/api/owner/crm/customers/${encodeURIComponent(emailKey)}/reviews`, {
                  rating: reviewRating,
                  feedback: reviewText,
                  bookingId: reviewBooking || activeBookingId || null,
                  internalResponse,
                }, 'admin.customers.reviewSaved')
                if (data?.promptGoogle && data.googleReviewUrl) {
                  window.open(data.googleReviewUrl, '_blank', 'noopener,noreferrer')
                }
                if (data) {
                  setReviewText('')
                  setInternalResponse('')
                }
              }}
            >
              {t('admin.customers.saveReview')}
            </button>
          </div>
        )}

        {tab === 'loyalty' && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="admin-card p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">{t('admin.customers.tabs.loyalty')}</p>
              <p className="text-xl font-semibold">{t(`admin.customers.loyalty.${customer.loyaltyLevel || 'new'}`)}</p>
              <p className="text-[var(--admin-muted)]">{t('admin.customers.loyaltyHint')}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {['discount', 'freeUpgrade', 'priorityService', 'freeAdditionalDriver', 'returningCustomerPerk'].map((key) => (
                  <li key={key} className={customer.loyaltyBenefits?.[key] ? 'text-[var(--admin-success)]' : 'text-[var(--admin-muted)]'}>
                    {customer.loyaltyBenefits?.[key] ? '✓' : '○'} {t(`admin.customers.benefit.${key}`)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" onClick={() => onSetStatus('vip')} className="admin-btn admin-btn-secondary text-xs">{t('admin.customers.vip')}</button>
                <button type="button" onClick={() => onSetStatus('regular')} className="admin-btn admin-btn-secondary text-xs">{t('admin.customers.regular')}</button>
                <button type="button" onClick={() => onSetStatus('blacklisted')} className="admin-btn admin-btn-ghost text-xs">{t('admin.customers.blacklist')}</button>
              </div>
            </div>
            <div className="admin-card p-4 space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">{t('admin.customers.tabs.loyalty')} · {t('admin.customers.referrals')}</p>
              <p>{t('admin.customers.yourCode')}: <strong>{detail.referrals?.code || '—'}</strong></p>
              <p>{t('admin.customers.successfulReferrals')}: {detail.referrals?.successfulReferrals ?? 0}</p>
              <p>{t('admin.customers.referredBy')}: {detail.referrals?.referredBy?.name || detail.referrals?.referredByCode || '—'}</p>
              {(detail.referrals?.referred || []).map((r) => (
                <p key={r._id} className="text-xs">{r.name} · {r.phone}</p>
              ))}
              <FormField label={t('admin.customers.linkReferrer')}>
                <input className="admin-input" value={referralCodeIn} onChange={(e) => setReferralCodeIn(e.target.value)} placeholder="HDN-…" />
              </FormField>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={busy || !referralCodeIn.trim()}
                onClick={() => post(`/api/owner/crm/customers/${encodeURIComponent(emailKey)}/referral`, { referredByCode: referralCodeIn })}
              >
                {t('admin.customers.saveReferral')}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary inline-flex items-center gap-1.5"
                disabled={busy || !customer.phone}
                onClick={() => sendWhatsApp('referral')}
              >
                <WhatsAppGlyph className="h-3.5 w-3.5" />
                {t('admin.customers.wa.referral')}
              </button>
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="admin-card p-4">
            <div className="crm-timeline">
              {(detail.timeline || []).length === 0 ? (
                <p className="text-sm text-[var(--admin-muted)]">{t('admin.customers.noneYet')}</p>
              ) : detail.timeline.map((ev, i) => (
                <div key={`${ev.type}-${ev.at}-${i}`} className="crm-timeline-item text-sm">
                  <p className="font-medium text-[var(--admin-ink)]">{t(`admin.customers.event.${ev.type}`)}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{formatShortDate(ev.at, language)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="admin-card p-4 mt-4">
        <p className="text-sm font-medium mb-2">{t('admin.customers.rateCustomer')}</p>
        <Stars value={adminRating} onChange={setAdminRating} size="text-2xl" />
        <textarea className="admin-input mt-2" rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder={t('admin.customers.notePlaceholder')} />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            disabled={saving || busy}
            className="admin-btn admin-btn-primary text-xs"
            onClick={async () => {
              setBusy(true)
              try {
                const { data } = await axios.post('/api/owner/crm/rate', {
                  email: emailKey,
                  rating: adminRating,
                  note: adminNote || undefined,
                })
                if (data.success) {
                  toast.success(t('admin.customers.rated'))
                  setAdminNote('')
                  onReload?.()
                } else toast.error(data.message)
              } catch (error) {
                toast.error(getErrorMessage(error))
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('admin.customers.saveRating')}
          </button>
          <button
            type="button"
            disabled={saving || busy || !adminNote.trim()}
            className="admin-btn admin-btn-secondary text-xs"
            onClick={async () => {
              setBusy(true)
              try {
                const { data } = await axios.post('/api/owner/crm/note', { email: emailKey, note: adminNote })
                if (data.success) {
                  toast.success(t('admin.customers.noteSaved'))
                  setAdminNote('')
                  onReload?.()
                } else toast.error(data.message)
              } catch (error) {
                toast.error(getErrorMessage(error))
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('admin.customers.noteOnly')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomerWorkspace

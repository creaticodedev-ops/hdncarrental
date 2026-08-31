import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FormField } from '../../../admin/ui'
import WhatsAppGlyph from '../../WhatsAppGlyph'
import { customerEmail } from '../../../utils/customerEmail'
import { getErrorMessage } from '../../../utils/apiError'
import { createExternalTabOpener } from '../../../utils/whatsapp'
import { buildAgentInsight } from './crmInsights'
import {
  CRM_TABS,
  SMART_TONES,
  WA_TEMPLATES,
  FOLLOW_UP_TO_TEMPLATE,
  JOURNEY_VISIBLE,
  initials,
  formatShortDate,
  formatDay,
  groupByDay,
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

const Pulse = ({ tone = 'neutral', live = false, children }) => (
  <span className="crm-pulse" data-tone={tone} data-live={live ? 'true' : 'false'}>
    <i />
    {children}
  </span>
)

const bookingHref = (id) => `/owner/manage-bookings?bookingId=${id}`

const MSG_HINT = {
  booking_confirmation: 'hintConfirm',
  signed_contract: 'hintSigned',
  pickup_reminder: 'hintPickup',
  during_rental: 'hintCare',
  return_reminder: 'hintReturn',
  thank_you: 'hintThanks',
  review_request: 'hintReview',
  loyalty: 'hintLoyalty',
  winback: 'hintWinback',
  referral: 'hintReferral',
}

const CustomerWorkspace = ({
  axios,
  detail,
  currency,
  language,
  t,
  onReload,
  onSetStatus,
  onClose,
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
  const active = detail?.care?.activeRental
  const activeBookingId = active?._id || bookings[0]?._id || ''
  const displayEmail = customerEmail(customer)
  const live = customer.smartStatus === 'active' || Boolean(active)

  const insight = useMemo(
    () => buildAgentInsight(detail, { t, language }),
    [detail, t, language],
  )

  const avgReview = useMemo(() => {
    const list = detail?.reviews || []
    if (!list.length) return 0
    return Math.round((list.reduce((s, r) => s + Number(r.rating || 0), 0) / list.length) * 10) / 10
  }, [detail?.reviews])

  const journeyStages = useMemo(() => {
    const byId = Object.fromEntries((detail?.journey?.stages || []).map((s) => [s.id, s]))
    return JOURNEY_VISIBLE.map((id) => byId[id] || { id, reached: false, current: false })
  }, [detail?.journey])

  const activityGroups = useMemo(
    () => groupByDay(detail?.timeline || [], language),
    [detail?.timeline, language],
  )

  const messages = useMemo(
    () => (detail?.timeline || []).filter((e) => e.type === 'whatsapp_sent' || e.type === 'customer_contacted'),
    [detail?.timeline],
  )

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

  const runInsight = () => {
    const a = insight?.action
    if (!a) return
    if (a.type === 'tab') setTab(a.tab)
    else sendWhatsApp(a.templateId, a.bookingId)
  }

  const vehicleName = (car) => (car ? `${car.brand || ''} ${car.model || ''}`.trim() : '—')

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className="crm-back" onClick={onClose}>
          {t('admin.customers.backToList')}
        </button>
        <Pulse tone={customer.smartStatus === 'vip' ? 'vip' : (SMART_TONES[customer.smartStatus] || 'neutral')} live={live}>
          {t(`admin.customers.smart.${customer.smartStatus || 'inactive'}`)}
        </Pulse>
      </div>

      <header className="crm-hero">
        <div className="crm-hero-top">
          <div className="crm-hero-id">
            <span className="crm-mono is-lg" data-tier={customer.loyaltyLevel}>{initials(customer.name)}</span>
            <div className="min-w-0">
              <h2 className="crm-hero-name">{customer.name}</h2>
              <p className="crm-hero-contact">
                {customer.phone || '—'}
                {displayEmail ? `  ·  ${displayEmail}` : ''}
                {customer.city ? `  ·  ${customer.city}` : ''}
              </p>
            </div>
          </div>
          <div className="crm-hero-seals">
            <span className={`crm-seal ${customer.loyaltyLevel === 'gold' || customer.loyaltyLevel === 'vip' ? 'is-gold' : ''}`}>
              {t(`admin.customers.loyalty.${customer.loyaltyLevel || 'new'}`)}
            </span>
            {customer.status === 'blacklisted' ? <span className="crm-seal">{t('admin.customers.blacklist')}</span> : null}
          </div>
        </div>

        <div className="crm-kpi-rail">
          {[
            [t('admin.customers.kpiReservations'), kpis.totalReservations ?? customer.totalReservations ?? 0],
            [t('admin.customers.kpiCompleted'), kpis.completedRentals ?? customer.completedReservations ?? 0],
            [t('admin.customers.kpiRevenue'), `${currency}${kpis.totalRevenue ?? customer.totalSpent ?? 0}`],
            [t('admin.customers.kpiDays'), kpis.totalRentalDays ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="crm-kpi">
              <p className="crm-kpi-label">{label}</p>
              <p className="crm-kpi-value">{value}</p>
            </div>
          ))}
        </div>

        <div className="crm-nowrow">
          <div className="crm-now">
            <p className="crm-now-kicker">{active ? t('admin.customers.insight.onRent') : t('admin.customers.lastRental')}</p>
            {active ? (
              <>
                <p className="crm-now-title">{vehicleName(active.car)}</p>
                <p className="crm-now-sub">
                  {active.reservationId} · {formatDay(active.pickupDate, language)} → {formatShortDate(active.returnDate, language)}
                </p>
              </>
            ) : kpis.lastRental ? (
              <>
                <p className="crm-now-title">{kpis.lastRental.vehicle || '—'}</p>
                <p className="crm-now-sub">{formatDay(kpis.lastRental.pickupDate, language)}</p>
              </>
            ) : (
              <p className="crm-now-title">{t('admin.customers.noRentals')}</p>
            )}
          </div>
          <div className="crm-insight" data-tone={insight.tone}>
            <div>
              <p className="crm-insight-kicker">{insight.eyebrow}</p>
              <p className="crm-insight-title">{insight.headline}</p>
            </div>
            <button type="button" className="crm-insight-action" disabled={busy} onClick={runInsight}>
              {t('admin.customers.insight.recommend')} {insight.actionLabel}
            </button>
          </div>
        </div>

        <div className="crm-hero-actions">
          <button
            type="button"
            className="crm-wa"
            disabled={busy || !customer.phone}
            onClick={() => sendWhatsApp(insight.action?.templateId || 'during_rental', insight.action?.bookingId)}
          >
            <WhatsAppGlyph className="h-3.5 w-3.5" />
            {t('admin.customers.whatsapp')}
          </button>
          {active ? (
            <Link className="crm-ghost" to={bookingHref(active._id)}>{t('admin.customers.openRental')}</Link>
          ) : null}
        </div>
      </header>

      <nav className="crm-tabs" role="tablist" aria-label={t('admin.customers.workspace')}>
        {CRM_TABS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {t(`admin.customers.tabs.${id}`)}
          </button>
        ))}
      </nav>

      <div className="crm-panel mt-4 space-y-3">
        {tab === 'overview' && (
          <>
            <div className="crm-surface">
              <p className="crm-path-label mb-3 tracking-[0.14em] uppercase text-[var(--admin-muted)]">{t('admin.customers.journeyTitle')}</p>
              <ol className="crm-path">
                {journeyStages.map((stage) => (
                  <li
                    key={stage.id}
                    className={`crm-path-step ${stage.reached ? 'is-reached' : ''} ${stage.current ? 'is-current' : ''}`}
                  >
                    <span className="crm-path-node" />
                    <span className="crm-path-label">{t(`admin.customers.journey.${stage.id}`)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="crm-surface text-sm">
                <p className="crm-path-label uppercase tracking-[0.14em] mb-3">{t('admin.customers.favorite')}</p>
                {(kpis.favoriteVehicles || []).length ? (
                  <ul className="space-y-2">
                    {kpis.favoriteVehicles.map((v) => (
                      <li key={v.label} className="flex justify-between gap-3">
                        <span className="font-display text-lg text-[var(--admin-ink)]">{v.label}</span>
                        <span className="text-[var(--admin-muted)] text-xs self-center">{v.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[var(--admin-muted)]">{t('admin.customers.noneYet')}</p>
                )}
              </div>
              <div className="crm-surface">
                <p className="crm-path-label uppercase tracking-[0.14em] mb-3">{t('admin.customers.internalNotes')}</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(customer.internalNotes || []).slice().reverse().slice(0, 5).map((n) => (
                    <div key={n._id || n.createdAt}>
                      {n.rating ? <Stars value={n.rating} size="text-sm" /> : null}
                      <p className="text-sm text-[var(--admin-ink-secondary)]">{n.text}</p>
                    </div>
                  ))}
                  {!(customer.internalNotes || []).length ? (
                    <p className="text-sm text-[var(--admin-muted)]">{t('admin.customers.noNotes')}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'rentals' && (
          <div className="crm-surface">
            {!bookings.length ? (
              <div className="crm-empty">
                <p>{t('admin.customers.noRentals')}</p>
                <span>{t('admin.customers.noRentalsHint')}</span>
              </div>
            ) : bookings.map((b) => (
              <article key={b._id} className="crm-rental" data-status={b.status}>
                <span className="crm-rental-bar" />
                <div className="min-w-0">
                  <p className="crm-rental-id">{b.reservationId} · {b.status}</p>
                  <p className="crm-rental-car">{vehicleName(b.car)}</p>
                  <p className="crm-rental-dates">{formatDay(b.pickupDate, language)} → {formatDay(b.returnDate, language)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{currency}{b.price}</p>
                  <Link to={bookingHref(b._id)} className="text-xs text-primary hover:underline">{t('admin.customers.openRental')}</Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === 'care' && (
          <div className="space-y-3">
            <div className="crm-surface space-y-4">
              {active ? (
                <div>
                  <p className="crm-now-kicker !text-[var(--admin-primary)]">{t('admin.customers.insight.onRent')}</p>
                  <p className="font-display text-2xl text-[var(--admin-ink)] mt-1">{vehicleName(active.car)}</p>
                  <p className="text-sm text-[var(--admin-muted)] mt-1">
                    {formatShortDate(active.pickupDate, language)} → {formatShortDate(active.returnDate, language)} · {t(`admin.customers.return.${detail.care.returnStatus || 'on_rent'}`)}
                  </p>
                  <button type="button" disabled={busy} onClick={() => sendWhatsApp('during_rental', active._id)} className="crm-wa mt-3">
                    <WhatsAppGlyph className="h-3.5 w-3.5" />
                    {t('admin.customers.contactWhatsApp')}
                  </button>
                </div>
              ) : (
                <p className="text-[var(--admin-muted)]">{t('admin.customers.noActiveRental')}</p>
              )}
              {(detail.followUps || []).map((f) => (
                <div key={f._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--admin-surface-2)] px-3 py-2.5">
                  <span className="text-sm font-medium">{t(`admin.customers.followUp.${f.kind}`)}</span>
                  <div className="flex gap-2">
                    <button type="button" className="admin-btn admin-btn-primary !min-h-9 text-xs" disabled={busy} onClick={() => sendWhatsApp(FOLLOW_UP_TO_TEMPLATE[f.kind], f.booking)}>
                      {t('admin.customers.send')}
                    </button>
                    <button type="button" className="admin-btn admin-btn-ghost !min-h-9 text-xs" disabled={busy} onClick={() => post(`/api/owner/crm/follow-ups/${f._id}/complete`, { status: 'skipped' })}>
                      {t('admin.customers.skip')}
                    </button>
                  </div>
                </div>
              ))}
              <div className="grid sm:grid-cols-2 gap-3">
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
              </div>
              <FormField label={t('admin.customers.careNotes')}>
                <textarea className="admin-input" rows={3} value={careNotes} onChange={(e) => setCareNotes(e.target.value)} />
              </FormField>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => post(`/api/owner/crm/customers/${encodeURIComponent(emailKey)}/care`, { notes: careNotes, satisfaction, nextFollowUpAt: nextFollowUp || null }, 'admin.customers.careSaved')}>
                  {t('admin.customers.saveCare')}
                </button>
                <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => post(`/api/owner/crm/customers/${encodeURIComponent(emailKey)}/care`, { contacted: true }, 'admin.customers.markedContacted')}>
                  {t('admin.customers.markContacted')}
                </button>
              </div>
            </div>
            <div className="crm-surface space-y-3">
              <p className="crm-path-label uppercase tracking-[0.14em]">{t('admin.customers.issues')}</p>
              {(detail.issues || []).map((issue) => (
                <div key={issue._id} className="rounded-xl border border-[var(--admin-border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{issue.reportedIssue}</p>
                    <Pulse tone={issue.status === 'resolved' ? 'success' : 'danger'}>{t(`admin.customers.issueStatus.${issue.status}`)}</Pulse>
                  </div>
                  {issue.status !== 'resolved' ? (
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="admin-btn admin-btn-secondary !min-h-9 text-xs" disabled={busy} onClick={() => post(`/api/owner/crm/issues/${issue._id}`, { status: 'in_progress' })}>{t('admin.customers.markInProgress')}</button>
                      <button type="button" className="admin-btn admin-btn-primary !min-h-9 text-xs" disabled={busy} onClick={() => post(`/api/owner/crm/issues/${issue._id}`, { status: 'resolved' }, 'admin.customers.issueResolved')}>{t('admin.customers.resolve')}</button>
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
                  const ok = await post(`/api/owner/crm/customers/${encodeURIComponent(emailKey)}/issues`, { reportedIssue: issueText, bookingId: activeBookingId || null }, 'admin.customers.issueCreated')
                  if (ok) setIssueText('')
                }}
              >
                {t('admin.customers.logIssue')}
              </button>
            </div>
          </div>
        )}

        {tab === 'communication' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--admin-muted)] px-1">{t('admin.customers.waHint')}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {WA_TEMPLATES.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`crm-msg ${waTemplate === id ? 'is-on' : ''}`}
                  onClick={() => setWaTemplate(id)}
                >
                  <span className="crm-msg-name">{t(`admin.customers.wa.${id}`)}</span>
                  <span className="crm-msg-hint">{t(`admin.customers.msg.${MSG_HINT[id]}`)}</span>
                </button>
              ))}
            </div>
            <div className="crm-surface flex flex-wrap items-end gap-3">
              <FormField label={t('admin.customers.linkedReservation')} className="flex-1 min-w-[12rem]">
                <select className="admin-input" value={waBooking} onChange={(e) => setWaBooking(e.target.value)}>
                  <option value="">{t('admin.customers.latestReservation')}</option>
                  {bookings.map((b) => (
                    <option key={b._id} value={b._id}>{b.reservationId} · {b.status}</option>
                  ))}
                </select>
              </FormField>
              <button type="button" className="crm-wa mb-0.5" disabled={busy || !customer.phone} onClick={() => sendWhatsApp(waTemplate, waBooking)}>
                <WhatsAppGlyph className="h-3.5 w-3.5" />
                {t('admin.customers.openWhatsApp')}
              </button>
            </div>
            {messages.length ? (
              <div className="crm-surface">
                <p className="crm-path-label uppercase tracking-[0.14em] mb-3">{t('admin.customers.recentContact')}</p>
                {messages.slice(0, 8).map((ev, i) => (
                  <p key={`${ev.at}-${i}`} className="crm-doc">
                    <span>{t(`admin.customers.event.${ev.type}`)}</span>
                    <span className="text-[var(--admin-muted)] text-xs">{formatShortDate(ev.at, language)}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {tab === 'documents' && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="crm-surface">
              <p className="crm-path-label uppercase tracking-[0.14em] mb-1">{t('admin.menu.contracts')}</p>
              {(detail.contracts || []).length === 0 ? <p className="text-sm text-[var(--admin-muted)] mt-3">{t('admin.customers.noneYet')}</p> : detail.contracts.map((c) => (
                <div key={c._id} className="crm-doc">
                  <span className="font-medium">{c.contractNumber}</span>
                  <span className="text-[var(--admin-muted)] text-xs">{c.signedAt || c.signedPdfUrl ? t('admin.customers.signed') : t('admin.customers.unsigned')}</span>
                </div>
              ))}
            </div>
            <div className="crm-surface">
              <p className="crm-path-label uppercase tracking-[0.14em] mb-1">{t('admin.menu.invoices')}</p>
              {(detail.invoices || []).length === 0 ? <p className="text-sm text-[var(--admin-muted)] mt-3">{t('admin.customers.noneYet')}</p> : detail.invoices.map((inv) => (
                <div key={inv._id} className="crm-doc">
                  <span className="font-medium">{inv.invoiceNumber}</span>
                  <span className="text-[var(--admin-muted)] text-xs">{currency}{inv.totalAmount}</span>
                </div>
              ))}
            </div>
            <div className="crm-surface md:col-span-2">
              <p className="crm-path-label uppercase tracking-[0.14em] mb-1">{t('admin.customers.payments')}</p>
              {(detail.payments || []).length === 0 ? <p className="text-sm text-[var(--admin-muted)] mt-3">{t('admin.customers.noneYet')}</p> : detail.payments.slice(0, 10).map((p, i) => (
                <div key={`${p.reservationId}-${i}`} className="crm-doc">
                  <span>{p.reservationId} · {p.method}</span>
                  <span>{currency}{p.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="crm-surface space-y-4">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="crm-path-label uppercase tracking-[0.14em]">{t('admin.customers.rating')}</p>
                <p className="crm-score">{avgReview || '—'}</p>
              </div>
              <p className="text-sm text-[var(--admin-muted)] pb-2">{t('admin.customers.reviewCount', { count: (detail.reviews || []).length })}</p>
            </div>
            {(detail.reviews || []).map((r) => (
              <blockquote key={r._id} className="crm-quote">
                <Stars value={r.rating} />
                {r.feedback ? <p className="crm-quote-text mt-2">{r.feedback}</p> : null}
                <p className="text-xs text-[var(--admin-muted)] mt-1">{formatShortDate(r.createdAt, language)}</p>
              </blockquote>
            ))}
            <Stars value={reviewRating} onChange={setReviewRating} size="text-2xl" />
            <FormField label={t('admin.customers.linkedReservation')}>
              <select className="admin-input" value={reviewBooking} onChange={(e) => setReviewBooking(e.target.value)}>
                <option value="">{t('admin.customers.latestReservation')}</option>
                {bookings.map((b) => <option key={b._id} value={b._id}>{b.reservationId}</option>)}
              </select>
            </FormField>
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
                if (data?.promptGoogle && data.googleReviewUrl) window.open(data.googleReviewUrl, '_blank', 'noopener,noreferrer')
                if (data) { setReviewText(''); setInternalResponse('') }
              }}
            >
              {t('admin.customers.saveReview')}
            </button>
          </div>
        )}

        {tab === 'loyalty' && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="crm-member">
              <p className="crm-member-tier">{t(`admin.customers.loyalty.${customer.loyaltyLevel || 'new'}`)}</p>
              <p className="crm-member-name">{customer.name}</p>
              <p className="crm-member-code">{detail.referrals?.code || '—'}</p>
            </div>
            <div className="crm-surface">
              <p className="text-sm text-[var(--admin-muted)] mb-2">{t('admin.customers.loyaltyHint')}</p>
              {['discount', 'freeUpgrade', 'priorityService', 'freeAdditionalDriver', 'returningCustomerPerk'].map((key) => (
                <p key={key} className={`crm-benefit ${customer.loyaltyBenefits?.[key] ? 'is-on' : ''}`}>
                  <i />
                  {t(`admin.customers.benefit.${key}`)}
                </p>
              ))}
              <div className="flex flex-wrap gap-2 pt-3">
                <button type="button" onClick={() => onSetStatus('vip')} className="admin-btn admin-btn-secondary !min-h-9 text-xs">{t('admin.customers.vip')}</button>
                <button type="button" onClick={() => onSetStatus('regular')} className="admin-btn admin-btn-secondary !min-h-9 text-xs">{t('admin.customers.regular')}</button>
                <button type="button" onClick={() => onSetStatus('blacklisted')} className="admin-btn admin-btn-ghost !min-h-9 text-xs">{t('admin.customers.blacklist')}</button>
              </div>
            </div>
            <div className="crm-surface md:col-span-2 space-y-3">
              <p className="crm-path-label uppercase tracking-[0.14em]">{t('admin.customers.referrals')}</p>
              <p className="text-sm">{t('admin.customers.successfulReferrals')}: {detail.referrals?.successfulReferrals ?? 0}</p>
              <p className="text-sm">{t('admin.customers.referredBy')}: {detail.referrals?.referredBy?.name || detail.referrals?.referredByCode || '—'}</p>
              {(detail.referrals?.referred || []).map((r) => (
                <p key={r._id} className="text-sm">{r.name} · {r.phone}</p>
              ))}
              <FormField label={t('admin.customers.linkReferrer')}>
                <input className="admin-input" value={referralCodeIn} onChange={(e) => setReferralCodeIn(e.target.value)} placeholder="HDN-…" />
              </FormField>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="admin-btn admin-btn-secondary" disabled={busy || !referralCodeIn.trim()} onClick={() => post(`/api/owner/crm/customers/${encodeURIComponent(emailKey)}/referral`, { referredByCode: referralCodeIn })}>
                  {t('admin.customers.saveReferral')}
                </button>
                <button type="button" className="crm-wa" disabled={busy || !customer.phone} onClick={() => sendWhatsApp('referral')}>
                  <WhatsAppGlyph className="h-3.5 w-3.5" />
                  {t('admin.customers.wa.referral')}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="crm-surface">
            {!activityGroups.length ? (
              <div className="crm-empty">
                <p>{t('admin.customers.noneYet')}</p>
              </div>
            ) : (
              <div className="crm-timeline">
                {activityGroups.map((g) => (
                  <section key={g.key}>
                    <p className="crm-day">{g.key}</p>
                    <div className="crm-tl">
                      {g.items.map((ev, i) => (
                        <div key={`${ev.type}-${ev.at}-${i}`} className="crm-tl-item">
                          <p className="text-sm font-medium text-[var(--admin-ink)]">{t(`admin.customers.event.${ev.type}`)}</p>
                          <p className="text-xs text-[var(--admin-muted)]">{formatShortDate(ev.at, language)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="crm-surface mt-3">
        <p className="crm-path-label uppercase tracking-[0.14em] mb-2">{t('admin.customers.rateCustomer')}</p>
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
                const { data } = await axios.post('/api/owner/crm/rate', { email: emailKey, rating: adminRating, note: adminNote || undefined })
                if (data.success) { toast.success(t('admin.customers.rated')); setAdminNote(''); onReload?.() }
                else toast.error(data.message)
              } catch (error) { toast.error(getErrorMessage(error)) }
              finally { setBusy(false) }
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
                if (data.success) { toast.success(t('admin.customers.noteSaved')); setAdminNote(''); onReload?.() }
                else toast.error(data.message)
              } catch (error) { toast.error(getErrorMessage(error)) }
              finally { setBusy(false) }
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

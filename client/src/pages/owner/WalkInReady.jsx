import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'
import ConfirmDialog from '../../components/owner/ConfirmDialog'
import DocumentGenerationOverlay from '../../components/DocumentGenerationOverlay'
import { useDocumentGeneration } from '../../hooks/useDocumentGeneration'
import { StatusBadge, SkeletonBlock, ErrorState } from '../../admin/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { openDocumentPdf } from '../../utils/openDocumentPdf'
import { buildOwnerCompletionWaUrl, createExternalTabOpener } from '../../utils/whatsapp'
import { customerEmail } from '../../utils/customerEmail'
import {
  customerInitials,
  formatDateTime,
  getPaymentDisplay,
  getSignatureStatus,
  money,
  paymentTone,
  rentalDayCount,
  reservationRef,
  vehicleLabel,
} from '../../components/owner/bookings/reservationHelpers'
import './walkInReady.css'

const fade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

const paymentFigures = (booking) => {
  const total = Number(booking?.price || 0)
  const recorded = Number(booking?.completion?.amountPaid || 0)
  const paid = recorded > 0 ? recorded : booking?.paymentStatus === 'paid' ? total : 0
  const remaining = Math.max(0, total - paid)
  const deposit = Number(booking?.franchiseAmount || 0)
  return { total, paid, remaining, deposit }
}

const workflowOf = (booking, contract) => {
  const sig = getSignatureStatus(booking)
  const hasContract = Boolean(contract?._id)
  if (sig === 'signed') return 'signed'
  if (sig === 'expired') return 'expired'
  if (sig === 'cancelled') return 'cancelled'
  if (sig === 'pending') return 'sent'
  if (hasContract) return 'ready'
  return 'draft'
}

const WalkInReady = () => {
  const { bookingId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { axios, currency, hasPermission } = useAppContext()
  const { t, language } = useI18n()
  const justCreated = Boolean(location.state?.justCreated)
  const docGen = useDocumentGeneration()

  const [booking, setBooking] = useState(null)
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [whatsappDials, setWhatsappDials] = useState({ confirmationDial: '' })

  const canContracts = hasPermission('contracts')
  const linkUrl = booking?.completion?.shareableCompletionUrl || ''
  const workflow = workflowOf(booking, contract)
  const signed = workflow === 'signed'
  const pay = useMemo(() => paymentFigures(booking), [booking])
  const paidRatio = pay.total > 0 ? Math.min(100, Math.round((pay.paid / pay.total) * 100)) : 0
  const days = rentalDayCount(booking?.pickupDate, booking?.returnDate)
  const payLabel = getPaymentDisplay(booking)

  const loadBooking = useCallback(async () => {
    const { data } = await axios.get(`/api/bookings/owner/${bookingId}`)
    if (!data.success || !data.booking) throw new Error(data.message || t('admin.walkInReady.loadError'))
    setBooking(data.booking)
    return data.booking
  }, [axios, bookingId, t])

  const loadContract = useCallback(async () => {
    if (!canContracts) return null
    const { data } = await axios.get(`/api/contracts?bookingId=${bookingId}&limit=1&summary=1`)
    const doc = data.success ? data.contracts?.[0] || null : null
    setContract(doc)
    return doc
  }, [axios, bookingId, canContracts])

  const prepare = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const live = await loadBooking()
      let doc = await loadContract()
      if (canContracts && !doc?._id) {
        try {
          await docGen.run(
            async () => {
              const { data } = await axios.post('/api/contracts/generate', {
                bookingId,
                includeCompanyStamp: true,
              })
              if (!data.success) throw new Error(data.message)
              return data
            },
            {
              mode: 'generate',
              axios,
              extractPdfApiPath: (result) => (result?.contract?._id ? `/api/contracts/${result.contract._id}/pdf` : ''),
              extractPdfUrl: (result) => result?.contract?.pdfUrl || '',
              onSuccess: async (result) => {
                setContract(result.contract || null)
              },
            },
          )
        } catch (err) {
          toast.error(getErrorMessage(err) || t('admin.walkInReady.noContract'))
        }
      }
      if (getSignatureStatus(live) !== 'signed') {
        try {
          const { data } = await axios.post('/api/booking-completion/owner/ensure-link', { bookingId })
          if (data.success) await loadBooking()
        } catch (err) {
          toast.error(getErrorMessage(err))
        }
      }
    } catch (err) {
      setError(getErrorMessage(err) || t('admin.walkInReady.loadError'))
    } finally {
      setLoading(false)
    }
  }, [axios, bookingId, canContracts, docGen, loadBooking, loadContract, t])

  useEffect(() => {
    prepare()
  }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps -- run once per reservation

  useEffect(() => {
    axios
      .get('/api/owner/settings')
      .then(({ data }) => {
        if (data.success) {
          setWhatsappDials({ confirmationDial: data.settings?.effective?.confirmationDial || '' })
        }
      })
      .catch(() => {})
  }, [axios])

  useEffect(() => {
    if (!booking || signed) return undefined
    const timer = window.setInterval(() => {
      loadBooking().catch(() => {})
    }, 8000)
    return () => window.clearInterval(timer)
  }, [booking?._id, signed, loadBooking])

  const copyLink = async () => {
    if (!linkUrl) return
    try {
      await navigator.clipboard.writeText(linkUrl)
      setCopied(true)
      toast.success(t('admin.bookings.linkCopied'))
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error(t('admin.walkInReady.copyFailed'))
    }
  }

  const shareWhatsApp = async () => {
    setBusy('whatsapp')
    const opener = createExternalTabOpener()
    try {
      const { data } = await axios.post('/api/booking-completion/owner/ensure-link', { bookingId })
      const url = data.shareableCompletionUrl || data.completionUrl || linkUrl
      if (!url) throw new Error(t('admin.bookings.noCompletionLink'))
      const wa = data.whatsappConfirmationUrl
        || buildOwnerCompletionWaUrl(booking, url, {
          currency,
          dial: data.whatsappConfirmationDial || whatsappDials.confirmationDial,
          signatureOnly: true,
        })
      opener.navigate(wa)
      await loadBooking()
    } catch (err) {
      opener.close()
      toast.error(getErrorMessage(err))
    } finally {
      setBusy('')
    }
  }

  const sendEmail = async () => {
    if (!customerEmail(booking)) {
      toast.error(t('admin.walkInReady.emailMissing'))
      return
    }
    setBusy('email')
    try {
      const { data } = await axios.post('/api/booking-completion/owner/resend-link', { bookingId })
      if (!data.success) throw new Error(data.message)
      toast.success(data.emailSent ? t('admin.walkInReady.emailSent') : data.message)
      await loadBooking()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy('')
    }
  }

  const viewContract = async () => {
    if (!contract?._id) {
      toast.error(t('admin.walkInReady.noContract'))
      return
    }
    try {
      await openDocumentPdf(axios, `/api/contracts/${contract._id}/pdf`, {
        filename: `${contract.contractNumber || 'contract'}.pdf`,
      })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const togglePreview = async () => {
    if (previewOpen) {
      setPreviewOpen(false)
      return
    }
    setPreviewOpen(true)
    if (previewHtml || !contract?._id) return
    try {
      const { data } = await axios.get(`/api/contracts/${contract._id}/preview`)
      if (data.success) setPreviewHtml(data.html || '')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const regenerateLink = async () => {
    setBusy('regen')
    try {
      const { data } = await axios.post('/api/booking-completion/owner/ensure-link', {
        bookingId,
        refresh: true,
      })
      if (!data.success) throw new Error(data.message)
      toast.success(t('admin.walkInReady.linkRefreshed'))
      await loadBooking()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy('')
      setConfirm(null)
    }
  }

  const revokeLink = async () => {
    setBusy('revoke')
    try {
      const { data } = await axios.post('/api/booking-completion/owner/cancel-link', { bookingId })
      if (!data.success) throw new Error(data.message)
      toast.success(t('admin.bookings.linkCancelled'))
      await loadBooking()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy('')
      setConfirm(null)
    }
  }

  const ensureLink = async () => {
    setBusy('link')
    try {
      const { data } = await axios.post('/api/booking-completion/owner/ensure-link', { bookingId })
      if (!data.success) throw new Error(data.message)
      toast.success(t('admin.bookings.linkReady'))
      await loadBooking()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy('')
    }
  }

  if (loading && !booking) {
    return (
      <div className="wir-page admin-page-pad">
        <SkeletonBlock className="wir-skel h-40" />
        <div className="wir-grid mt-4">
          <SkeletonBlock className="h-72" />
          <SkeletonBlock className="h-72" />
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="wir-page admin-page-pad">
        <ErrorState
          title={t('admin.walkInReady.loadError')}
          description={error}
          onRetry={prepare}
          retryLabel={t('admin.walkInReady.retry')}
        />
      </div>
    )
  }

  const rail = [
    { key: 'created', label: t('admin.walkInReady.stepCreated'), hint: reservationRef(booking), state: 'done' },
    {
      key: 'contract',
      label: t('admin.walkInReady.stepContract'),
      hint: contract?.contractNumber || t('admin.walkInReady.preparing'),
      state: contract?._id ? 'done' : docGen.running ? 'active' : 'idle',
    },
    {
      key: 'sign',
      label: t('admin.walkInReady.stepSignature'),
      hint: t(`admin.walkInReady.flow.${workflow}`),
      state: signed ? 'done' : workflow === 'sent' || workflow === 'ready' ? 'active' : 'idle',
    },
  ]

  const timeline = [
    { key: 'res', done: true, active: false, title: t('admin.walkInReady.tlCreated'), hint: reservationRef(booking) },
    {
      key: 'ctr',
      done: Boolean(contract?._id),
      active: !contract?._id,
      title: t('admin.walkInReady.tlContract'),
      hint: contract?.contractNumber || t('admin.walkInReady.tlContractWait'),
    },
    {
      key: 'lnk',
      done: Boolean(linkUrl) || signed,
      active: Boolean(contract?._id) && !linkUrl && !signed,
      title: t('admin.walkInReady.tlLink'),
      hint: linkUrl ? t('admin.walkInReady.tlLinkReady') : t('admin.walkInReady.tlLinkWait'),
    },
    {
      key: 'sig',
      done: signed,
      active: workflow === 'sent',
      title: t('admin.walkInReady.tlSigned'),
      hint: signed ? t('admin.walkInReady.tlSignedDone') : t('admin.walkInReady.tlSignedWait'),
    },
  ]

  return (
    <div className="wir-page admin-page-pad">
      <DocumentGenerationOverlay
        open={docGen.open}
        status={docGen.status}
        mode={docGen.mode}
        error={docGen.error}
        pdfUrl={docGen.pdfUrl}
        onRetry={() => docGen.retry()}
        onDismiss={() => docGen.close()}
        autoDismissMs={docGen.status === 'success' ? 700 : 0}
        position="fixed"
      />

      <Motion.section className="wir-hero" initial="hidden" animate="show" variants={fade}>
        <div className="wir-hero-row">
          <div>
            <p className="wir-kicker">
              <span className="wir-kicker-dot" aria-hidden />
              {justCreated ? t('admin.walkInReady.kickerNew') : t('admin.walkInReady.kicker')}
            </p>
            <h1>{justCreated ? t('admin.walkInReady.title') : t('admin.walkInReady.titleExisting')}</h1>
            <p className="wir-hero-sub">{t('admin.walkInReady.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="wir-ref">{reservationRef(booking)}</span>
            <StatusBadge tone={signed ? 'success' : workflow === 'sent' ? 'warn' : 'info'}>
              {t(`admin.walkInReady.flow.${workflow}`)}
            </StatusBadge>
          </div>
        </div>
        <ol className="wir-rail" aria-label={t('admin.walkInReady.progress')}>
          {rail.map((step, i) => (
            <li key={step.key} className={`wir-rail-step is-${step.state}`}>
              <span className="wir-rail-index">{step.state === 'done' ? '✓' : i + 1}</span>
              <span className="wir-rail-copy">
                <strong>{step.label}</strong>
                <span>{step.hint}</span>
              </span>
            </li>
          ))}
        </ol>
      </Motion.section>

      <div className="wir-grid">
        <div className="space-y-4">
          <Motion.section className="wir-card" initial="hidden" animate="show" variants={fade}>
            <div className="wir-card-head">
              <div>
                <p className="wir-card-kicker">{t('admin.walkInReady.contractKicker')}</p>
                <h2 className="wir-card-title">{t('admin.walkInReady.contractTitle')}</h2>
              </div>
              <StatusBadge tone={signed ? 'success' : workflow === 'sent' ? 'warn' : contract ? 'info' : 'neutral'}>
                {t(`admin.walkInReady.flow.${workflow}`)}
              </StatusBadge>
            </div>

            <ol className="wir-timeline">
              {timeline.map((item) => (
                <li key={item.key} className={item.done ? 'is-done' : item.active ? 'is-active' : ''}>
                  <span className="wir-dot" aria-hidden />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.hint}</span>
                  </div>
                </li>
              ))}
            </ol>

            {signed ? (
              <div className="wir-signed">
                <span aria-hidden>✓</span>
                <div>
                  <strong>{t('admin.walkInReady.signedTitle')}</strong>
                  <p>{t('admin.walkInReady.signedHint')}</p>
                </div>
              </div>
            ) : (
              <>
                {linkUrl ? (
                  <div className="wir-link-box">
                    <input className="admin-input" readOnly value={linkUrl} aria-label={t('admin.walkInReady.signatureLink')} />
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={copyLink}>
                      {copied ? t('admin.walkInReady.copied') : t('admin.bookings.copy')}
                    </button>
                  </div>
                ) : (
                  <p className="wir-empty mb-3">{t('admin.walkInReady.noLinkYet')}</p>
                )}
                <div className="wir-actions">
                  {!linkUrl ? (
                    <button type="button" className="admin-btn admin-btn-primary" disabled={Boolean(busy)} onClick={ensureLink}>
                      {busy === 'link' ? t('admin.bookings.generatingLink') : t('admin.walkInReady.generateLink')}
                    </button>
                  ) : null}
                  <button type="button" className="admin-btn admin-btn-primary" disabled={!linkUrl || Boolean(busy)} onClick={shareWhatsApp}>
                    {t('admin.bookings.shareWhatsApp')}
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" disabled={!linkUrl || Boolean(busy)} onClick={sendEmail}>
                    {t('admin.walkInReady.sendEmail')}
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" disabled={!contract?._id} onClick={viewContract}>
                    {t('admin.bookings.viewContract')}
                  </button>
                  {linkUrl ? (
                    <>
                      <button type="button" className="admin-btn admin-btn-secondary" disabled={Boolean(busy)} onClick={() => setConfirm('regen')}>
                        {t('admin.walkInReady.regenerateLink')}
                      </button>
                      <button type="button" className="admin-btn admin-btn-secondary" disabled={Boolean(busy)} onClick={() => setConfirm('revoke')}>
                        {t('admin.walkInReady.revokeLink')}
                      </button>
                    </>
                  ) : null}
                  {contract?._id ? (
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={togglePreview}>
                      {previewOpen ? t('admin.walkInReady.hidePreview') : t('admin.walkInReady.showPreview')}
                    </button>
                  ) : null}
                </div>
              </>
            )}

            {signed ? (
              <div className="wir-actions mt-4">
                <button type="button" className="admin-btn admin-btn-primary" onClick={viewContract}>
                  {t('admin.bookings.viewContract')}
                </button>
              </div>
            ) : null}

            {previewOpen ? (
              <div className="wir-preview">
                {previewHtml ? (
                  <div className="wir-preview-html" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <p className="p-4 text-sm text-[var(--admin-muted)]">{t('admin.walkInReady.previewLoading')}</p>
                )}
              </div>
            ) : null}
          </Motion.section>

          <section className="wir-card">
            <div className="wir-card-head">
              <div>
                <p className="wir-card-kicker">{t('admin.walkInReady.paymentKicker')}</p>
                <h2 className="wir-card-title">{t('admin.walkInReady.paymentTitle')}</h2>
              </div>
              <StatusBadge tone={paymentTone(payLabel)}>
                {t(`admin.bookings.paymentLabels.${payLabel}`)}
              </StatusBadge>
            </div>
            <div className="wir-pay-bar" aria-hidden>
              <div className="wir-pay-fill" style={{ width: `${paidRatio}%` }} />
            </div>
            <div className="wir-pay-tiles">
              <div className="wir-pay-tile">
                <span>{t('admin.walkInReady.total')}</span>
                <strong>{money(currency, pay.total)}</strong>
              </div>
              <div className="wir-pay-tile is-paid">
                <span>{t('admin.walkInReady.paid')}</span>
                <strong>{money(currency, pay.paid)}</strong>
              </div>
              <div className={`wir-pay-tile${pay.remaining > 0 ? ' is-remain' : ''}`}>
                <span>{t('admin.walkInReady.remaining')}</span>
                <strong>{money(currency, pay.remaining)}</strong>
              </div>
              <div className="wir-pay-tile">
                <span>{t('admin.walkInReady.deposit')}</span>
                <strong>{pay.deposit ? money(currency, pay.deposit) : '—'}</strong>
              </div>
            </div>
          </section>
        </div>

        <aside className="wir-aside">
          <section className="wir-card">
            <p className="wir-card-kicker">{t('admin.walkInReady.customerKicker')}</p>
            <div className="wir-person mt-2">
              <span className="wir-avatar">{customerInitials(booking.customerName)}</span>
              <div>
                <p>{booking.customerName || t('admin.common.guest')}</p>
                <span>{booking.customerPhone || '—'}</span>
              </div>
            </div>
            <div className="wir-kv">
              <div className="wir-kv-row">
                <span>{t('admin.walkIn.email')}</span>
                <strong>{customerEmail(booking) || '—'}</strong>
              </div>
              <div className="wir-kv-row">
                <span>{t('admin.walkInReady.channel')}</span>
                <strong>Walk-in</strong>
              </div>
            </div>
          </section>

          <section className="wir-card">
            <p className="wir-card-kicker">{t('admin.walkInReady.tripKicker')}</p>
            <h3 className="wir-card-title" style={{ fontSize: '1.2rem' }}>{vehicleLabel(booking.car)}</h3>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{booking.car?.licensePlate || '—'}</p>
            <div className="wir-kv mt-3">
              <div className="wir-kv-row">
                <span>{t('admin.walkIn.pickup')}</span>
                <strong>{formatDateTime(booking.pickupDate, language)}</strong>
              </div>
              <div className="wir-kv-row">
                <span>{t('admin.walkIn.return')}</span>
                <strong>{formatDateTime(booking.returnDate, language)}</strong>
              </div>
              <div className="wir-kv-row">
                <span>{t('admin.walkIn.pickupLoc')}</span>
                <strong>{booking.pickupLocation || '—'}</strong>
              </div>
              <div className="wir-kv-row">
                <span>{t('admin.walkIn.returnLoc')}</span>
                <strong>{booking.returnLocation || '—'}</strong>
              </div>
              <div className="wir-kv-row">
                <span>{t('admin.bookings.duration')}</span>
                <strong>{t('admin.bookings.daysCount', { count: days })}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="wir-foot">
        <Link to={`/owner/manage-bookings?bookingId=${booking._id}`} className="admin-btn admin-btn-secondary">
          {t('admin.walkInReady.openReservation')}
        </Link>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/owner/walk-in')}>
          {t('admin.walkIn.createAnother')}
        </button>
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title={confirm === 'revoke' ? t('admin.walkInReady.revokeTitle') : t('admin.walkInReady.regenTitle')}
        message={confirm === 'revoke' ? t('admin.walkInReady.revokeMessage') : t('admin.walkInReady.regenMessage')}
        confirmText={t('admin.bookings.confirm')}
        cancelText={t('admin.common.cancel')}
        variant={confirm === 'revoke' ? 'danger' : 'primary'}
        onConfirm={() => (confirm === 'revoke' ? revokeLink() : regenerateLink())}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

export default WalkInReady

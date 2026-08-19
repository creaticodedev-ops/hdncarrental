import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'
import SignaturePad from '../../components/SignaturePad'
import DocumentGenerationOverlay from '../../components/DocumentGenerationOverlay'
import { useDocumentGeneration } from '../../hooks/useDocumentGeneration'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'

const Row = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4 py-2">
    <dt className="shrink-0 text-xs uppercase tracking-wide text-muted">{label}</dt>
    <dd className="min-w-0 text-right text-sm font-medium text-ink break-words">{value || '—'}</dd>
  </div>
)

const StepHeading = ({ index, title, hint }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
      {index}
    </span>
    <div className="min-w-0">
      <h2 className="font-display text-xl text-ink leading-tight">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  </div>
)

/**
 * Signature-only completion link.
 *
 * The reservation is already complete, so this page is deliberately read-only:
 * review the contract, sign, done. It posts nothing but the signature itself, and
 * the server refuses reservation edits on this kind of link regardless.
 */
const SignatureOnlyCompletion = ({ token, api, booking, onBookingChange }) => {
  const { t, language } = useI18n()
  const { currency } = useAppContext()
  const docGen = useDocumentGeneration()

  const [contractHtml, setContractHtml] = useState('')
  const [contractState, setContractState] = useState('idle')
  const [contractOpen, setContractOpen] = useState(false)
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const blobUrlRef = useRef('')

  const completion = booking?.completion
  const signed = Boolean(completion?.signatureComplete) || booking?.status === 'ready_for_pickup'

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    },
    [],
  )

  const loadContract = useCallback(async () => {
    setContractState('loading')
    try {
      const { data } = await api.get(`/api/booking-completion/${token}/contract-preview`)
      if (!data.success) throw new Error(data.message)
      setContractHtml(data.html)
      setContractState('ready')
    } catch (err) {
      setContractState('error')
      toast.error(getErrorMessage(err) || t('completion.only.contractError'))
    }
  }, [api, token, t])

  const toggleContract = () => {
    if (contractOpen) {
      setContractOpen(false)
      return
    }
    setContractOpen(true)
    if (contractState === 'idle' || contractState === 'error') loadContract()
  }

  const openContractTab = () => {
    if (!contractHtml) return
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    blobUrlRef.current = URL.createObjectURL(new Blob([contractHtml], { type: 'text/html' }))
    window.open(blobUrlRef.current, '_blank', 'noopener')
  }

  const handleSign = async () => {
    if (!signature) {
      toast.error(t('completion.needSignature'))
      return
    }
    if (!agreed) {
      toast.error(t('completion.needAgree'))
      return
    }
    if (signing || docGen.running) return

    setSigning(true)
    try {
      await docGen.run(
        async () => {
          // Signature only — no reservation data is sent from this page.
          const { data } = await api.post(`/api/booking-completion/${token}/signature`, {
            signatureDataUrl: signature,
            agreed: true,
          })
          if (!data.success) throw new Error(data.message)
          onBookingChange(data.booking)
          return data
        },
        {
          mode: 'finalize',
          extractPdfUrl: (data) => data?.booking?.completion?.contractPdfUrl || '',
          onSuccess: (data) => {
            toast.success(data.message)
            window.setTimeout(() => docGen.close(), 900)
          },
        },
      )
    } catch (err) {
      if (!docGen.open) toast.error(getErrorMessage(err))
    } finally {
      setSigning(false)
    }
  }

  const dateLabel = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const vehicle = booking?.car ? `${booking.car.brand} ${booking.car.model}` : '—'

  return (
    <div
      className={`relative bg-[radial-gradient(ellipse_at_top,_#f5efe8_0%,_#faf8f5_45%,_#f0ebe4_100%)] pb-16 ${
        signed ? '' : 'min-h-screen pb-20'
      }`}
    >
      <DocumentGenerationOverlay
        open={docGen.open}
        status={docGen.status}
        mode={docGen.mode}
        error={docGen.error}
        pdfUrl={docGen.pdfUrl || completion?.contractPdfUrl || ''}
        onRetry={() => docGen.retry()}
        onDismiss={() => docGen.close()}
        embedPdf={docGen.status === 'success'}
        position="fixed"
      />

      <div className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(143,31,31,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="relative page-pad py-12 md:py-14">
          <div className="mx-auto max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              {t('completion.only.eyebrow')}
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium leading-tight md:text-[2.35rem]">
              {signed ? t('completion.only.confirmedTitle') : t('completion.only.title')}
            </h1>
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
              <span className="font-medium text-white">{booking.reservationId}</span>
              <span className="text-white/40">·</span>
              <span>{vehicle}</span>
            </div>
          </div>
        </div>
      </div>

      {/* `relative` keeps these cards above the positioned hero they overlap. */}
      <div className="page-pad relative -mt-8">
        <div className="mx-auto max-w-2xl space-y-5">
          {signed ? (
            <Motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-borderColor/70 bg-white p-6 text-center shadow-[0_24px_60px_-44px_rgba(22,18,16,0.45)] sm:p-8"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
                ✓
              </div>
              <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink">
                {t('completion.only.confirmedHint')}
              </p>
              <p className="mt-2 text-sm text-muted">{booking.reservationId} · {vehicle}</p>

              {completion?.contractPdfUrl ? (
                <>
                  <div className="mt-6 overflow-hidden rounded-2xl border border-borderColor bg-sand/30 text-left">
                    <iframe
                      title={t('completion.only.viewSigned')}
                      src={completion.contractPdfUrl}
                      className="h-[min(65vh,30rem)] w-full bg-white"
                    />
                  </div>
                  <a
                    href={completion.contractPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm text-white"
                  >
                    {t('completion.downloadContract')}
                  </a>
                </>
              ) : null}

              <Link to="/" className="mt-8 block text-sm text-primary hover:underline">
                {t('completion.backHome')}
              </Link>
            </Motion.div>
          ) : (
            <>
              <section className="rounded-3xl border border-borderColor/70 bg-white p-5 shadow-[0_24px_60px_-44px_rgba(22,18,16,0.45)] sm:p-7">
                <StepHeading
                  index={1}
                  title={t('completion.only.reviewStep')}
                  hint={t('completion.only.reviewHint')}
                />

                <dl className="mt-5 divide-y divide-borderColor/70 rounded-2xl border border-borderColor bg-sand/25 px-4">
                  <Row label={t('confirmation.name')} value={booking.customerName} />
                  <Row label={t('confirmation.phoneLabel')} value={booking.customerPhone} />
                  <Row label={t('confirmation.vehicle')} value={vehicle} />
                  <Row label={t('confirmation.from')} value={dateLabel(booking.pickupDate)} />
                  <Row label={t('confirmation.until')} value={dateLabel(booking.returnDate)} />
                  <Row label={t('confirmation.pickup')} value={booking.pickupLocation} />
                  <Row label={t('confirmation.total')} value={`${currency}${booking.price}`} />
                </dl>

                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
                  <span aria-hidden>🔒</span>
                  {t('completion.only.lockedHint')}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleContract}
                    aria-expanded={contractOpen}
                    className="rounded-xl border border-borderColor bg-sand px-4 py-2.5 text-sm font-semibold text-ink cursor-pointer"
                  >
                    {contractOpen ? t('completion.only.hideContract') : t('completion.only.viewContract')}
                  </button>
                  {contractOpen && contractState === 'ready' ? (
                    <button
                      type="button"
                      onClick={openContractTab}
                      className="rounded-xl border border-borderColor px-4 py-2.5 text-sm text-muted cursor-pointer hover:text-ink"
                    >
                      {t('completion.only.openNewTab')}
                    </button>
                  ) : null}
                </div>

                {contractOpen ? (
                  <div className="mt-4">
                    {contractState === 'loading' ? (
                      <p className="rounded-2xl border border-borderColor bg-sand/30 px-4 py-8 text-center text-sm text-muted">
                        {t('completion.only.contractLoading')}
                      </p>
                    ) : contractState === 'error' ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center">
                        <p className="text-sm text-red-700">{t('completion.only.contractError')}</p>
                        <button
                          type="button"
                          onClick={loadContract}
                          className="mt-3 text-sm font-semibold text-primary hover:underline cursor-pointer"
                        >
                          {t('docGen.retry')}
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-borderColor bg-white">
                        <iframe
                          title={t('completion.only.reviewStep')}
                          srcDoc={contractHtml}
                          sandbox=""
                          className="h-[min(70vh,34rem)] w-full bg-white"
                        />
                      </div>
                    )}
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-borderColor/70 bg-white p-5 shadow-[0_24px_60px_-44px_rgba(22,18,16,0.45)] sm:p-7">
                <StepHeading
                  index={2}
                  title={t('completion.only.signStep')}
                  hint={t('completion.only.signHint')}
                />

                <div className="mt-5 space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-ink">
                      {t('completion.signatureCustomerLabel')}
                      <span className="ml-2 font-normal text-muted">{booking.customerName}</span>
                    </p>
                    <SignaturePad onChange={setSignature} disabled={signing} />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1"
                    />
                    <span>{t('completion.agreeTerms')}</span>
                  </label>

                  <button
                    type="button"
                    disabled={signing || docGen.running}
                    onClick={handleSign}
                    className="w-full cursor-pointer rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(143,31,31,0.8)] disabled:opacity-60"
                  >
                    {signing || docGen.running
                      ? t('completion.only.saving')
                      : t('completion.only.saveSignature')}
                  </button>

                  <p className="text-center text-xs text-muted">
                    {t('completion.signatureAgencyNote')}
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SignatureOnlyCompletion

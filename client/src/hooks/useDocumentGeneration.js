import { useCallback, useRef, useState } from 'react'
import { getErrorMessage } from '../utils/apiError'

/**
 * Shared async state for real document/PDF generation requests.
 * Status tracks the live promise — never uses fake timers for completion.
 */
export function useDocumentGeneration() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle') // idle | running | success | error
  const [mode, setMode] = useState('regenerate') // finalize | regenerate | generate
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const lastJobRef = useRef(null)

  const close = useCallback(() => {
    setOpen(false)
    setStatus('idle')
    setError('')
    setPdfUrl('')
    lastJobRef.current = null
  }, [])

  const run = useCallback(async (jobFn, options = {}) => {
    const {
      mode: nextMode = 'regenerate',
      onSuccess,
      extractPdfUrl = (result) =>
        result?.pdfUrl
        || result?.contract?.pdfUrl
        || result?.invoice?.pdfUrl
        || result?.booking?.completion?.contractPdfUrl
        || '',
    } = options

    lastJobRef.current = { jobFn, options }
    setMode(nextMode)
    setError('')
    setPdfUrl('')
    setOpen(true)
    setStatus('running')

    try {
      const result = await jobFn()
      const url = extractPdfUrl(result) || ''
      setPdfUrl(url)
      setStatus('success')
      if (onSuccess) await onSuccess(result)
      return result
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
      throw err
    }
  }, [])

  const retry = useCallback(async () => {
    const last = lastJobRef.current
    if (!last) return
    return run(last.jobFn, last.options)
  }, [run])

  return {
    open,
    status,
    mode,
    error,
    pdfUrl,
    running: status === 'running',
    run,
    retry,
    close,
  }
}

export default useDocumentGeneration

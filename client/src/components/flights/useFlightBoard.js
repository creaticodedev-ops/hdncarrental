import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_REFRESH_MS = 60_000
const ERROR_RETRY_MS = 2 * 60_000
const NO_COVERAGE_RETRY_MS = 10 * 60_000

/**
 * Fetches /api/flights/:iata while `active` (board on screen and tab visible), refreshing on the
 * server's `refreshAfterSeconds`. Keeps the last valid board per airport so failures can show it as stale.
 */
export const useFlightBoard = (axios, iata, active) => {
  const [boards, setBoards] = useState({})
  const [errors, setErrors] = useState({})
  const [pending, setPending] = useState(null)
  const dueAt = useRef(new Map())
  const requestId = useRef(0)

  const load = useCallback(async (code) => {
    const id = ++requestId.current
    setPending(code)
    try {
      const { data } = await axios.get(`/api/flights/${code}`)
      if (!data?.success) throw Object.assign(new Error('bad payload'), { code: data?.code })
      dueAt.current.set(code, Date.now() + Math.max(MIN_REFRESH_MS, Number(data.refreshAfterSeconds) * 1000 || 0))
      setBoards((prev) => ({ ...prev, [code]: data }))
      setErrors((prev) => ({ ...prev, [code]: null }))
    } catch (error) {
      const errorCode = error?.response?.data?.code || error?.code || 'FLIGHTS_NETWORK'
      dueAt.current.set(code, Date.now() + (errorCode === 'FLIGHTS_NO_COVERAGE' ? NO_COVERAGE_RETRY_MS : ERROR_RETRY_MS))
      setErrors((prev) => ({ ...prev, [code]: { code: errorCode, at: Date.now() } }))
    } finally {
      if (id === requestId.current) setPending(null)
    }
  }, [axios])

  useEffect(() => {
    if (!active || !iata) return undefined
    let cancelled = false
    let timer = 0
    const schedule = () => {
      const wait = Math.max(1_000, (dueAt.current.get(iata) || 0) - Date.now())
      timer = window.setTimeout(tick, wait)
    }
    const tick = () => {
      if (cancelled) return
      if ((dueAt.current.get(iata) || 0) > Date.now()) {
        schedule()
        return
      }
      load(iata).finally(() => {
        if (!cancelled) schedule()
      })
    }
    timer = window.setTimeout(tick, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [active, iata, load])

  const retry = useCallback(() => {
    if (!iata) return
    dueAt.current.delete(iata)
    load(iata)
  }, [iata, load])

  return {
    board: boards[iata] || null,
    error: errors[iata] || null,
    loading: pending === iata,
    retry,
  }
}

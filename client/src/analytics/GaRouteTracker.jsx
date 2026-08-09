import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { bindOutboundContactTracking, initGa4, trackPageView } from './ga4'

/**
 * SPA page-view tracker + outbound tel/mailto/WhatsApp click capture.
 * Mount once inside BrowserRouter (e.g. App).
 */
const GaRouteTracker = () => {
  const location = useLocation()

  useEffect(() => {
    initGa4()
    return bindOutboundContactTracking()
  }, [])

  useEffect(() => {
    trackPageView(location.pathname, location.search)
  }, [location.pathname, location.search])

  return null
}

export default GaRouteTracker

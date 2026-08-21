import { Navigate, useParams } from 'react-router-dom'

/** English / short aliases → canonical French commercial URLs. */
const AIRPORT_SLUG_MAP = {
  marrakech: 'marrakech-rak',
  rak: 'marrakech-rak',
  casablanca: 'casablanca-cmn',
  cmn: 'casablanca-cmn',
}

export const LocationAliasRedirect = () => {
  const { city } = useParams()
  const slug = String(city || '').toLowerCase()
  return <Navigate to={`/location-voiture/${slug}`} replace />
}

export const AirportAliasRedirect = () => {
  const { slug } = useParams()
  const key = String(slug || '').toLowerCase()
  const dest = AIRPORT_SLUG_MAP[key] || key
  return <Navigate to={`/location-voiture-aeroport/${dest}`} replace />
}

export const TrustAliasRedirect = ({ to }) => <Navigate to={to} replace />

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import SeoHead from '../../seo/SeoHead'
import { useAppContext } from '../../context/AppContext'
import { airportsFromLocations } from '../../seo/data/airports'
import { breadcrumbJsonLd } from '../../seo/jsonLd'
import { booking } from '../../components/ui/bookingUi'

const PATH = '/location-voiture-aeroport'
const TITLE = 'Location voiture aéroport Maroc'
const DESCRIPTION =
  'Location de voiture à l’arrivée : uniquement les aéroports réellement bookables chez HDN Car (ex. Casablanca CMN, Marrakech RAK).'

const AirportHubPage = () => {
  const { pickupLocations } = useAppContext()
  const airports = useMemo(() => airportsFromLocations(pickupLocations), [pickupLocations])
  const breadcrumbs = [
    { name: 'Accueil', path: '/' },
    { name: 'Aéroports', path: PATH },
  ]

  return (
    <article className="page-shell page-pad mx-auto max-w-3xl pb-16 pt-8">
      <SeoHead
        title={TITLE}
        description={DESCRIPTION}
        path={PATH}
        jsonLd={[breadcrumbJsonLd(breadcrumbs)]}
      />
      <nav aria-label="Fil d’Ariane" className="mb-6 text-sm text-muted">
        <Link to="/" className="hover:text-ink">Accueil</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">Aéroports</span>
      </nav>
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Location de voiture à l’aéroport au Maroc
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
        Ces pages n’existent que pour des points de type aéroport actifs dans notre système.
        Pas de comptoir inventé à Agadir ou ailleurs tant qu’il n’est pas bookable.
      </p>
      <div className="mt-6">
        <Link to="/cars" className={booking.btnPrimary}>Voir les véhicules</Link>
      </div>
      {airports.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          Aucun aéroport actif n’est publié pour le moment. Contactez HDN Car ou parcourez le catalogue ville.
        </p>
      ) : (
        <ul className="mt-10 space-y-3">
          {airports.map((airport) => (
            <li key={airport.slug}>
              <Link
                to={`/location-voiture-aeroport/${airport.slug}`}
                className="block rounded-2xl border border-borderColor/80 bg-white px-4 py-3 hover:border-ink/25"
              >
                <span className="font-medium text-ink">{airport.h1}</span>
                <p className="mt-1 text-sm text-muted">{airport.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-sm">
        <Link to="/guide/location-aeroport-maroc" className="text-primary hover:underline">
          Guide : louer à l’aéroport au Maroc
        </Link>
      </p>
    </article>
  )
}

export default AirportHubPage

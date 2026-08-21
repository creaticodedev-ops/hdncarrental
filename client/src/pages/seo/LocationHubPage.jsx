import { Link } from 'react-router-dom'
import SeoHead from '../../seo/SeoHead'
import { getPublishedCities } from '../../seo/data/cities'
import { SEO_CATEGORIES } from '../../seo/data/categories'
import { breadcrumbJsonLd, localBusinessJsonLd, organizationJsonLd } from '../../seo/jsonLd'
import { booking } from '../../components/ui/bookingUi'
import { NAP } from '../../seo/constants'

const PATH = '/location-voiture'
const TITLE = 'Location voiture par ville au Maroc'
const DESCRIPTION =
  'Choisissez une ville : Safi (siège HDN Car), Casablanca, Marrakech, Agadir, Rabat, Essaouira et autres destinations réellement couvertes.'

const LocationHubPage = () => {
  const cities = getPublishedCities()
  const breadcrumbs = [
    { name: 'Accueil', path: '/' },
    { name: 'Villes', path: PATH },
  ]

  return (
    <article className="page-shell page-pad mx-auto max-w-3xl pb-16 pt-8">
      <SeoHead
        title={TITLE}
        description={DESCRIPTION}
        path={PATH}
        jsonLd={[
          organizationJsonLd(),
          localBusinessJsonLd(),
          breadcrumbJsonLd(breadcrumbs),
        ]}
      />
      <nav aria-label="Fil d’Ariane" className="mb-6 text-sm text-muted">
        <Link to="/" className="hover:text-ink">Accueil</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">Villes</span>
      </nav>
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
        Location de voiture par ville au Maroc
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
        HDN Car est basé à {NAP.addressLocality}. Les pages ci-dessous décrivent la location dans des villes
        où nous organisons réellement une prise en charge, une livraison, ou un départ depuis un aéroport actif.
        Aucune agence n’est inventée.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/cars" className={booking.btnPrimary}>Voir les véhicules</Link>
        <Link to="/location-voiture-maroc" className={booking.btnSecondary}>Location voiture Maroc</Link>
      </div>
      <ul className="mt-10 space-y-3">
        {cities.map((city) => (
          <li key={city.slug}>
            <Link
              to={`/location-voiture/${city.slug}`}
              className="block rounded-2xl border border-borderColor/80 bg-white px-4 py-3 hover:border-ink/25"
            >
              <span className="font-medium text-ink">{city.h1}</span>
              <p className="mt-1 text-sm text-muted">{city.description}</p>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">Catégories</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SEO_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/cars/${c.slug}`}
                className="inline-flex rounded-full border border-borderColor bg-white px-3 py-1.5 text-sm text-ink hover:border-ink/30"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}

export default LocationHubPage

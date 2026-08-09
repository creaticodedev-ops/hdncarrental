import { Link } from 'react-router-dom'
import { getPublishedCities } from '../seo/data/cities'
import { SEO_CATEGORIES } from '../seo/data/categories'
import { booking } from './ui/bookingUi'

/** Light homepage bridge into the Morocco SEO pillar (below-the-fold). */
const SeoHomeModule = () => {
  const cities = getPublishedCities().slice(0, 8)

  return (
    <section className="page-shell page-pad border-t border-borderColor/60 bg-light/40 py-14 md:py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Location de voiture au Maroc
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Découvrez nos guides villes, aéroports actifs et catégories — puis réservez en ligne avec HDN Car.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/location-voiture-maroc" className={booking.btnPrimary}>
            Guide location voiture Maroc
          </Link>
          <Link to="/guide" className={booking.btnSecondary}>
            Conseils pratiques
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">Villes</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {cities.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/location-voiture/${c.slug}`}
                    className="inline-flex rounded-full border border-borderColor bg-white px-3 py-1 text-sm hover:border-ink/30"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">Catégories</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SEO_CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/cars/${c.slug}`}
                    className="inline-flex rounded-full border border-borderColor bg-white px-3 py-1 text-sm hover:border-ink/30"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SeoHomeModule

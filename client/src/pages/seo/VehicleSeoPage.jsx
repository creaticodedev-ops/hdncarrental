import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import SeoPageShell from './SeoPageShell'
import { useAppContext } from '../../context/AppContext'
import { uniqueCarSlug } from '../../seo/slugify'
import { SEO_CATEGORIES } from '../../seo/data/categories'
import { breadcrumbJsonLd, vehicleProductJsonLd } from '../../seo/jsonLd'
import { SITE_NAME } from '../../seo/constants'

const VehicleSeoPage = ({ slug }) => {
  const { cars, carsLoading } = useAppContext()

  const car = useMemo(() => {
    if (!cars?.length) return null
    return cars.find((c) => uniqueCarSlug(c, cars) === slug) || null
  }, [cars, slug])

  if (carsLoading && !cars?.length) {
    return <div className="page-shell page-pad py-16 text-center text-muted">Chargement…</div>
  }

  if (!car) return <Navigate to="/cars" replace />

  const path = `/cars/${slug}`
  const name = `${car.brand} ${car.model}`.trim()
  const cat = SEO_CATEGORIES.find(
    (c) => c.filterType === 'category' && c.filterValue.toLowerCase() === String(car.category || '').toLowerCase()
  )
  const title = `Location ${name} Maroc`
  const description = `Louez une ${name}${car.category ? ` (${car.category})` : ''} au Maroc avec ${SITE_NAME}. Réservation en ligne, tarifs au jour.`
  const breadcrumbs = [
    { name: 'Accueil', path: '/' },
    { name: 'Véhicules', path: '/cars' },
    ...(cat ? [{ name: cat.name, path: `/cars/${cat.slug}` }] : []),
    { name, path },
  ]

  const sections = [
    {
      heading: `Pourquoi louer une ${name} ?`,
      body: `La ${name} fait partie de notre flotte active. Consultez disponibilité, transmission (${car.transmission || '—'}) et tarif journalier sur la fiche réservation.`,
    },
    {
      heading: 'Location au Maroc',
      body: `Idéale pour vos trajets ville ou inter-villes. Combinez avec une prise en charge aéroport active (Casablanca CMN, Marrakech RAK) ou un point ville selon le calendrier.`,
    },
  ]

  return (
    <SeoPageShell
      title={title}
      description={description}
      path={path}
      h1={`Location ${name} au Maroc`}
      intro={`Réservez une ${name} avec ${SITE_NAME}. Page informative ; la réservation se finalise sur la fiche véhicule.`}
      sections={sections}
      breadcrumbs={breadcrumbs}
      ctaTo={`/car-details/${car._id}`}
      ctaLabel={`Réserver — ${name}`}
      jsonLd={[
        breadcrumbJsonLd(breadcrumbs),
        vehicleProductJsonLd(car, path),
      ]}
      related={[
        {
          title: 'Catégories',
          links: [
            ...(cat ? [{ to: `/cars/${cat.slug}`, label: cat.name }] : []),
            ...SEO_CATEGORIES.filter((c) => c.slug !== cat?.slug)
              .slice(0, 3)
              .map((c) => ({ to: `/cars/${c.slug}`, label: c.name })),
          ],
        },
      ]}
    >
      {car.image || car.images?.[0] ? (
        <figure className="mt-8 overflow-hidden rounded-2xl border border-borderColor/80 bg-sand">
          <img
            src={car.image || car.images[0]}
            alt={`${name} à louer au Maroc — ${SITE_NAME}`}
            width={960}
            height={600}
            className="mx-auto max-h-80 w-full object-contain"
            loading="eager"
            decoding="async"
          />
        </figure>
      ) : null}
      <section className="mt-8 rounded-2xl border border-borderColor/80 bg-white p-4 text-sm text-muted">
        <h2 className="text-base font-semibold text-ink">Caractéristiques</h2>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <li>Marque : <strong className="text-ink">{car.brand || '—'}</strong></li>
          <li>Modèle : <strong className="text-ink">{car.model || '—'}</strong></li>
          {car.year ? <li>Année : <strong className="text-ink">{car.year}</strong></li> : null}
          <li>Catégorie : <strong className="text-ink">{car.category || '—'}</strong></li>
          <li>Transmission : <strong className="text-ink">{car.transmission || '—'}</strong></li>
          {car.fuel_type ? <li>Carburant : <strong className="text-ink">{car.fuel_type}</strong></li> : null}
          {car.seating_capacity ? (
            <li>Places : <strong className="text-ink">{car.seating_capacity}</strong></li>
          ) : null}
          {typeof car.pricePerDay === 'number' ? (
            <li>
              À partir de <strong className="text-ink">{car.pricePerDay} MAD</strong> / jour
            </li>
          ) : null}
        </ul>
        <p className="mt-3">
          <Link to={`/car-details/${car._id}`} className="text-primary hover:underline">
            Ouvrir la fiche complète et réserver
          </Link>
        </p>
      </section>
    </SeoPageShell>
  )
}

export default VehicleSeoPage

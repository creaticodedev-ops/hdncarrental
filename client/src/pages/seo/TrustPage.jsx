import { Link, Navigate, useParams } from 'react-router-dom'
import SeoPageShell from './SeoPageShell'
import { getTrustPage, TRUST_PAGES } from '../../seo/data/trust'
import { NAP } from '../../seo/constants'
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd, organizationJsonLd } from '../../seo/jsonLd'
import { INSTAGRAM_URL } from '../../constants/brand'

const TrustPage = ({ slug: slugProp }) => {
  const { slug: slugParam } = useParams()
  const data = getTrustPage(slugProp || slugParam)
  if (!data) return <Navigate to="/" replace />

  const breadcrumbs = [
    { name: 'Accueil', path: '/' },
    { name: data.h1, path: data.path },
  ]

  const isContact = data.slug === 'contact'

  return (
    <SeoPageShell
      title={data.title}
      description={data.description}
      path={data.path}
      h1={data.h1}
      intro={data.intro}
      sections={data.sections}
      faqs={data.faqs}
      breadcrumbs={breadcrumbs}
      ctaTo="/cars"
      ctaLabel={isContact ? 'Voir les véhicules disponibles' : 'Voir les véhicules'}
      jsonLd={[
        organizationJsonLd(),
        isContact ? localBusinessJsonLd() : null,
        breadcrumbJsonLd(breadcrumbs),
        faqJsonLd(data.faqs),
      ]}
      related={[
        {
          title: 'Infos utiles',
          links: TRUST_PAGES.filter((p) => p.slug !== data.slug).map((p) => ({
            to: p.path,
            label: p.h1,
          })),
        },
      ]}
    >
      {isContact ? (
        <section className="mt-10 rounded-2xl border border-borderColor/80 bg-white p-5 text-sm leading-relaxed text-muted">
          <h2 className="text-xl font-semibold text-ink">Liens directs</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <a className="text-primary hover:underline" href={`tel:${NAP.telephone}`} data-analytics-source="contact_page">
                Téléphone {NAP.telephoneDisplay}
              </a>
            </li>
            <li>
              <a className="text-primary hover:underline" href={`mailto:${NAP.email}`} data-analytics-source="contact_page">
                {NAP.email}
              </a>
            </li>
            <li>
              <a
                className="text-primary hover:underline"
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram HDN Car
              </a>
            </li>
            <li>
              <Link className="text-primary hover:underline" to="/cars">
                Catalogue de location
              </Link>
            </li>
          </ul>
          <p className="mt-4">
            {NAP.streetAddress}, {NAP.addressLocality}, Maroc
          </p>
        </section>
      ) : null}
    </SeoPageShell>
  )
}

export default TrustPage

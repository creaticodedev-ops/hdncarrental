import { absoluteUrl, DEFAULT_OG_IMAGE, NAP, SITE_NAME, SITE_ORIGIN } from './constants'

export const organizationJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/images/logo.png`,
  email: NAP.email,
  telephone: NAP.telephone,
  address: {
    '@type': 'PostalAddress',
    streetAddress: NAP.streetAddress,
    addressLocality: NAP.addressLocality,
    addressRegion: NAP.addressRegion,
    addressCountry: NAP.addressCountry,
  },
  sameAs: [
    'https://www.instagram.com/haddane_car',
  ],
})

export const websiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_ORIGIN,
  inLanguage: 'fr-MA',
  publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_ORIGIN },
})

/** LocalBusiness / AutoRental for the Safi HQ only — do not invent other branches. */
export const localBusinessJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'AutoRental',
  name: SITE_NAME,
  image: DEFAULT_OG_IMAGE,
  url: SITE_ORIGIN,
  telephone: NAP.telephone,
  email: NAP.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: NAP.streetAddress,
    addressLocality: NAP.addressLocality,
    addressRegion: NAP.addressRegion,
    addressCountry: NAP.addressCountry,
  },
  areaServed: {
    '@type': 'Country',
    name: 'Morocco',
  },
  priceRange: '$$',
})

export const breadcrumbJsonLd = (items = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

export const faqJsonLd = (faqs = []) => {
  if (!faqs.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

/** Product/Vehicle — only with real inventory fields; never fake reviews. */
export const vehicleProductJsonLd = (car, path) => {
  if (!car?.brand || !car?.model) return null
  const name = `${car.brand} ${car.model}`.trim()
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: `Location ${name} au Maroc avec ${SITE_NAME}.`,
    brand: { '@type': 'Brand', name: car.brand },
    category: car.category || undefined,
    url: absoluteUrl(path),
  }
  if (car.image) data.image = car.image
  if (typeof car.pricePerDay === 'number' && car.pricePerDay > 0) {
    data.offers = {
      '@type': 'Offer',
      priceCurrency: 'MAD',
      price: String(car.pricePerDay),
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(path),
    }
  }
  return data
}

export const toJsonLdScript = (nodes) =>
  (Array.isArray(nodes) ? nodes : [nodes])
    .filter(Boolean)
    .map((node) => JSON.stringify(node))

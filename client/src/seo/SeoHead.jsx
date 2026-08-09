import { Helmet } from 'react-helmet-async'
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from './constants'

/**
 * Per-route SEO head. Used by SEO landing pages and noindex helpers.
 */
const SeoHead = ({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  lang = 'fr',
  type = 'website',
  jsonLd = [],
}) => {
  const fullTitle = title?.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const canonical = absoluteUrl(path)
  const robots = noindex ? 'noindex,nofollow' : 'index,follow'
  const graphs = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean)

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{fullTitle}</title>
      <meta name="description" content={description || ''} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || ''} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="fr_MA" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || ''} />
      <meta name="twitter:image" content={image} />

      {graphs.map((node, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(node)}
        </script>
      ))}
    </Helmet>
  )
}

export default SeoHead

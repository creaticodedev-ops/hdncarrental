import SeoHead from './SeoHead'

/** Apply noindex on private booking flows. */
const NoIndexHead = ({ title = 'HDN Car' }) => (
  <SeoHead
    title={title}
    description="Espace privé HDN Car"
    path="/"
    noindex
    lang="fr"
  />
)

export default NoIndexHead

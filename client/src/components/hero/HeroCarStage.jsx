import { HERO_IMAGE } from '../../assets/assets'
import { BRAND_NAME } from '../../constants/brand'
import { useI18n } from '../../i18n/I18nContext'

export default function HeroCarStage() {
  const { t } = useI18n()

  return (
    <div className="hero-stage">
      <div className="hero-stage-rig">
        <div className="hero-pool" aria-hidden="true" />
        <picture>
          <source srcSet="/images/main_car.avif" type="image/avif" />
          <source srcSet={HERO_IMAGE.webp} type="image/webp" />
          <img
            src={HERO_IMAGE.webp}
            alt={`${BRAND_NAME} premium rental`}
            width={1200}
            height={675}
            decoding="async"
            draggable={false}
            fetchPriority="high"
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 90vw, 1100px"
            className="hero-car-photo"
          />
        </picture>
        <span className="hero-sheen" aria-hidden="true" />
        <p className="hero-mark">{t('hero.callout')}</p>
      </div>
    </div>
  )
}

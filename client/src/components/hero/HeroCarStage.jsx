import { HERO_IMAGE } from '../../assets/assets'
import { BRAND_NAME } from '../../constants/brand'

export default function HeroCarStage() {
  return (
    <div className="hx-stage">
      <span className="hx-word" aria-hidden="true">HDN</span>
      <div className="hx-car">
        <span className="hx-shadow" aria-hidden="true" />
        <picture>
          <source type="image/avif" srcSet={HERO_IMAGE.avifSet} sizes={HERO_IMAGE.sizes} />
          <source type="image/webp" srcSet={HERO_IMAGE.webpSet} sizes={HERO_IMAGE.sizes} />
          <img
            src={HERO_IMAGE.webp}
            alt={`${BRAND_NAME} premium rental`}
            width={HERO_IMAGE.width}
            height={HERO_IMAGE.height}
            decoding="async"
            draggable={false}
            fetchPriority="high"
            className="hx-car-img"
          />
        </picture>
        <span className="hx-sheen" aria-hidden="true" />
      </div>
    </div>
  )
}

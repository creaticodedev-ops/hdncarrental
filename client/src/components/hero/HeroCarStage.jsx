import React from 'react'
import { motion as Motion } from 'framer-motion'
import { HERO_IMAGE } from '../../assets/assets'
import { BRAND_NAME } from '../../constants/brand'
import { useI18n } from '../../i18n/I18nContext'

const CarAsset = ({ className = '', fetchPriority, ...rest }) => (
  <picture>
    <source srcSet="/images/main_car.avif" type="image/avif" />
    <source srcSet={HERO_IMAGE.webp} type="image/webp" />
    <img
      src={HERO_IMAGE.webp}
      alt=""
      width={1200}
      height={675}
      decoding="async"
      draggable={false}
      fetchPriority={fetchPriority}
      className={className}
      {...rest}
    />
  </picture>
)

/**
 * Vehicle plate for the editorial camera. No entrance of its own —
 * the parent camera is the motion. No ground shadow.
 */
export default function HeroCarStage({ camera, reduceMotion }) {
  const { t } = useI18n()
  const {
    annotateOpacity,
    carScrollY,
    lookX,
    lookY,
    sheenX,
  } = camera

  return (
    <div className="hero-stage relative mt-2 w-full sm:mt-6 md:mt-8">
      <Motion.div
        className="hero-stage-rig relative mx-auto w-full max-w-6xl px-2 sm:px-4"
        style={
          reduceMotion
            ? undefined
            : {
                y: carScrollY,
                rotateY: lookY,
                rotateX: lookX,
                transformPerspective: 1800,
                transformOrigin: '50% 70%',
              }
        }
      >
        <div className="hero-pool" aria-hidden="true" />

        <div className="relative z-[2]">
          <CarAsset
            alt={`${BRAND_NAME} premium rental`}
            fetchPriority="high"
            className="hero-car-photo relative z-[2] mx-auto max-h-[230px] w-full select-none object-contain sm:max-h-[340px] md:max-h-[420px] lg:max-h-[460px]"
          />

          <div className="hero-car-reflection hidden md:block" aria-hidden="true">
            <CarAsset className="mx-auto max-h-[420px] w-full object-contain lg:max-h-[460px]" />
          </div>

          {!reduceMotion ? (
            <Motion.span
              className="hero-sheen"
              style={{ x: sheenX }}
              aria-hidden="true"
            />
          ) : null}
        </div>

        <Motion.div
          className="hero-callout hidden md:flex"
          style={reduceMotion ? undefined : { opacity: annotateOpacity }}
          aria-hidden="true"
        >
          <span className="hero-callout-dot" />
          <span className="hero-callout-line" />
          <span className="hero-callout-label">{t('hero.callout')}</span>
        </Motion.div>

        <Motion.div
          className="hero-fleet"
          style={reduceMotion ? undefined : { opacity: annotateOpacity }}
          aria-hidden="true"
        >
          <span />
          <span />
          <span className="is-active" />
          <span />
        </Motion.div>
      </Motion.div>
    </div>
  )
}

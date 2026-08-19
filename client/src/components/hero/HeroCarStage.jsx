import React, { useEffect, useState } from 'react'
import {
  motion as Motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { HERO_IMAGE } from '../../assets/assets'
import { BRAND_NAME } from '../../constants/brand'
import { useI18n } from '../../i18n/I18nContext'

const CINEMA = [0.16, 1, 0.3, 1]
const SPRING = { stiffness: 32, damping: 24, mass: 1.2 }

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
 * Cinematic showroom stage — the vehicle is a physical object in a room, not a PNG.
 */
export default function HeroCarStage({ heroRef }) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const [finePointer, setFinePointer] = useState(false)
  const [entered, setEntered] = useState(false)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const spx = useSpring(px, SPRING)
  const spy = useSpring(py, SPRING)

  const camY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const camScale = useTransform(scrollYProgress, [0, 1], [1, 1.16])
  const camRotateX = useTransform(scrollYProgress, [0, 1], [0, 9])
  const floorY = useTransform(scrollYProgress, [0, 1], [0, 28])
  const hazeY = useTransform(scrollYProgress, [0, 1], [0, 48])
  const hazeScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])
  const hazeX = useTransform(spx, [-0.5, 0.5], [-18, 18])

  const tiltY = useTransform(spx, [-0.5, 0.5], [3.6, -3.6])
  const tiltX = useTransform(spy, [-0.5, 0.5], [-1.5, 1.8])
  const shiftX = useTransform(spx, [-0.5, 0.5], [-10, 10])
  const shiftY = useTransform(spy, [-0.5, 0.5], [-6, 6])
  const sheenX = useTransform(spx, [-0.5, 0.5], ['-6%', '14%'])
  const lampX = useTransform(spx, [-0.5, 0.5], [-8, 10])
  const shadowScale = useTransform(spx, [-0.5, 0.5], [0.97, 1.05])
  const shadowX = useTransform(spx, [-0.5, 0.5], [-14, 14])

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (hover: hover)')
    const sync = () => setFinePointer(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const node = heroRef?.current
    if (!node || reduceMotion || !finePointer) return undefined

    const onMove = (event) => {
      const rect = node.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      px.set((event.clientX - rect.left) / rect.width - 0.5)
      py.set((event.clientY - rect.top) / rect.height - 0.5)
    }
    const onLeave = () => {
      px.set(0)
      py.set(0)
    }

    node.addEventListener('pointermove', onMove, { passive: true })
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [heroRef, reduceMotion, finePointer, px, py])

  const rest = reduceMotion ? { opacity: 1, x: 0, scale: 1, rotateY: 0, rotateX: 0 } : undefined
  const fade = (delay) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: reduceMotion ? 0 : delay, ease: CINEMA },
  })

  return (
    <div className="hero-stage relative mt-4 w-full sm:mt-6 md:mt-8">
      <Motion.div
        className="pointer-events-none absolute inset-x-[-18%] -top-16 bottom-0"
        style={reduceMotion ? undefined : { y: hazeY, x: hazeX, scale: hazeScale }}
        aria-hidden="true"
      >
        <div className="hero-arch hero-arch-a" />
        <div className="hero-arch hero-arch-b" />
        <div className="hero-haze" />
        <div className="hero-volume" />
        <div className="hero-horizon" />
        {!reduceMotion ? (
          <>
            <span className="hero-streak hero-streak-a" />
            <span className="hero-streak hero-streak-b" />
            <span className="hero-streak hero-streak-c" />
          </>
        ) : null}
      </Motion.div>

      <Motion.div
        className="hero-stage-camera relative mx-auto w-full max-w-6xl px-2 sm:px-4"
        style={
          reduceMotion
            ? undefined
            : {
                y: camY,
                scale: camScale,
                rotateX: camRotateX,
                transformPerspective: 1600,
                transformOrigin: '50% 84%',
              }
        }
      >
        <Motion.div
          className="hero-stage-rig relative mx-auto w-full"
          style={
            reduceMotion
              ? undefined
              : { rotateY: tiltY, rotateX: tiltX, x: shiftX, y: shiftY }
          }
        >
          <Motion.div
            className="relative mx-auto w-full"
            animate={reduceMotion || !entered ? undefined : { y: [0, -2.2, 0] }}
            transition={{ duration: 9.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Motion.div
              className="hero-ring"
              style={reduceMotion ? undefined : { y: floorY, x: shadowX, scaleX: shadowScale }}
              aria-hidden="true"
            />
            <Motion.div
              className="hero-floor"
              style={reduceMotion ? undefined : { y: floorY, scaleX: shadowScale, x: shadowX }}
              aria-hidden="true"
            />

            <Motion.div
              className="relative z-[2]"
              initial={
                rest || {
                  opacity: 0.15,
                  x: '-16%',
                  scale: 0.93,
                  rotateY: 12,
                  rotateX: 5,
                }
              }
              animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0, rotateX: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 1.35, ease: CINEMA, delay: 0.28 }
              }
              onAnimationComplete={() => setEntered(true)}
            >
              <CarAsset
                alt={`${BRAND_NAME} premium rental`}
                fetchPriority="high"
                className="hero-car-photo relative z-[2] mx-auto max-h-[230px] w-full select-none object-contain sm:max-h-[340px] md:max-h-[420px] lg:max-h-[460px]"
              />

              <div className="hero-car-reflection hidden md:block" aria-hidden="true">
                <CarAsset className="mx-auto max-h-[420px] w-full object-contain lg:max-h-[460px]" />
              </div>

              <Motion.span
                className="hero-sheen"
                style={reduceMotion ? undefined : { x: sheenX }}
                aria-hidden="true"
              />
              <Motion.span
                className="hero-headlamp"
                style={reduceMotion ? undefined : { x: lampX }}
                aria-hidden="true"
              />
            </Motion.div>

            <Motion.div {...fade(1.78)} className="hero-callout hidden md:flex" aria-hidden="true">
              <span className="hero-callout-dot" />
              <span className="hero-callout-line" />
              <span className="hero-callout-label">{t('hero.callout')}</span>
            </Motion.div>

            <Motion.div
              {...fade(1.88)}
              className="hero-fleet"
              aria-hidden="true"
            >
              <span />
              <span />
              <span className="is-active" />
              <span />
            </Motion.div>
          </Motion.div>
        </Motion.div>
      </Motion.div>
    </div>
  )
}

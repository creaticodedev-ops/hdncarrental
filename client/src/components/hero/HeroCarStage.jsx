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

const CINEMA = [0.16, 1, 0.3, 1]
const SPRING = { stiffness: 38, damping: 22, mass: 1.15 }

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
 * Cinematic showroom stage for the hero vehicle.
 * One photograph, sold as a physical object: arrival, light, floor, camera.
 */
export default function HeroCarStage({ heroRef }) {
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

  const camY = useTransform(scrollYProgress, [0, 1], [0, 130])
  const camScale = useTransform(scrollYProgress, [0, 1], [1, 1.2])
  const camRotateX = useTransform(scrollYProgress, [0, 1], [0, 11])
  const floorY = useTransform(scrollYProgress, [0, 1], [0, 36])
  const hazeY = useTransform(scrollYProgress, [0, 1], [0, 56])
  const hazeScale = useTransform(scrollYProgress, [0, 1], [1, 1.12])

  const tiltY = useTransform(spx, [-0.5, 0.5], [5.4, -5.4])
  const tiltX = useTransform(spy, [-0.5, 0.5], [-2.2, 2.6])
  const shiftX = useTransform(spx, [-0.5, 0.5], [-14, 14])
  const shiftY = useTransform(spy, [-0.5, 0.5], [-8, 8])
  const sheenX = useTransform(spx, [-0.5, 0.5], ['-8%', '18%'])
  const lampX = useTransform(spx, [-0.5, 0.5], [-10, 12])
  const shadowScale = useTransform(spx, [-0.5, 0.5], [0.96, 1.06])
  const shadowX = useTransform(spx, [-0.5, 0.5], [-18, 18])

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

  const rest = reduceMotion
    ? { opacity: 1, x: 0, scale: 1, rotateY: 0, rotateX: 0 }
    : undefined

  return (
    <div className="hero-stage relative mt-6 w-full sm:mt-8 md:mt-10">
      <Motion.div
        className="pointer-events-none absolute inset-x-[-12%] -top-8 bottom-0"
        style={reduceMotion ? undefined : { y: hazeY, scale: hazeScale }}
        aria-hidden="true"
      >
        <div className="hero-haze" />
        <div className="hero-horizon" />
        {!reduceMotion ? (
          <>
            <span className="hero-streak hero-streak-a" />
            <span className="hero-streak hero-streak-b" />
          </>
        ) : null}
      </Motion.div>

      <Motion.div
        className="hero-stage-camera relative mx-auto w-full max-w-5xl px-2 sm:px-4"
        style={
          reduceMotion
            ? undefined
            : {
                y: camY,
                scale: camScale,
                rotateX: camRotateX,
                transformPerspective: 1400,
                transformOrigin: '50% 82%',
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
            animate={
              reduceMotion || !entered
                ? undefined
                : { y: [0, -3.5, 0] }
            }
            transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Motion.div
              className="hero-floor"
              style={reduceMotion ? undefined : { y: floorY, scaleX: shadowScale, x: shadowX }}
              aria-hidden="true"
            />

            <Motion.div
              className="relative z-[2]"
              initial={
                rest || {
                  opacity: 0.2,
                  x: '-14%',
                  scale: 0.92,
                  rotateY: 14,
                  rotateX: 6,
                }
              }
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                rotateY: 0,
                rotateX: 0,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 1.65, ease: CINEMA, delay: 0.08 }
              }
              onAnimationComplete={() => setEntered(true)}
            >
              <CarAsset
                alt={`${BRAND_NAME} premium rental`}
                fetchPriority="high"
                className="hero-car-photo relative z-[2] mx-auto max-h-[220px] w-full select-none object-contain sm:max-h-[320px] md:max-h-[400px] lg:max-h-[440px]"
              />

              <div className="hero-car-reflection hidden md:block" aria-hidden="true">
                <CarAsset className="mx-auto max-h-[400px] w-full object-contain lg:max-h-[440px]" />
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
          </Motion.div>
        </Motion.div>
      </Motion.div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  animate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'

const CINEMA = [0.16, 1, 0.28, 1]
const LOOK = { stiffness: 18, damping: 28, mass: 1.45 }

/**
 * One motion driver for the hero: a camera that starts too close,
 * finds the editorial frame, then continues as a dolly on scroll.
 * Cursor only steers light and a trace of look-around — never the car as an object.
 */
export function useHeroCamera(heroRef) {
  const reduceMotion = useReducedMotion()
  const [finePointer, setFinePointer] = useState(false)
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )
  const [frameReady, setFrameReady] = useState(false)

  const intro = useMotionValue(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 1
      : 0,
  )
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const spx = useSpring(px, LOOK)
  const spy = useSpring(py, LOOK)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  useEffect(() => {
    const pointer = window.matchMedia('(pointer: fine) and (hover: hover)')
    const width = window.matchMedia('(max-width: 767px)')
    const sync = () => {
      setFinePointer(pointer.matches)
      setCompact(width.matches)
    }
    sync()
    pointer.addEventListener('change', sync)
    width.addEventListener('change', sync)
    return () => {
      pointer.removeEventListener('change', sync)
      width.removeEventListener('change', sync)
    }
  }, [])

  useEffect(() => {
    if (reduceMotion === true) {
      intro.set(1)
      setFrameReady(true)
      return undefined
    }
    if (reduceMotion !== false) return undefined

    intro.set(0)
    setFrameReady(false)
    const ctrl = animate(intro, 1, { duration: 1.95, ease: CINEMA, delay: 0.05 })
    const off = intro.on('change', (value) => {
      if (value >= 0.9) setFrameReady(true)
    })
    return () => {
      ctrl.stop()
      off()
    }
  }, [intro, reduceMotion])

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
  }, [finePointer, heroRef, px, py, reduceMotion])

  const introScale = useTransform(intro, [0, 1], [compact ? 1.16 : 1.52, 1])
  const introY = useTransform(intro, [0, 1], [compact ? 16 : 52, 0])
  const scrollScale = useTransform(scrollYProgress, [0, 0.9], [1, 1.12])
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, 28])

  const cameraScale = useTransform([introScale, scrollScale], ([i, s]) => i * s)
  const cameraY = useTransform([introY, scrollY], ([i, s]) => i + s)

  const worldIntroScale = useTransform(intro, [0, 1], [compact ? 1.12 : 1.2, 1])
  const worldIntroY = useTransform(intro, [0, 1], [compact ? 8 : 14, 0])
  const worldScrollScale = useTransform(scrollYProgress, [0, 1], [1, 1.05])
  const worldScrollY = useTransform(scrollYProgress, [0, 1], [0, 48])
  const worldScale = useTransform([worldIntroScale, worldScrollScale], ([i, s]) => i * s)
  const worldY = useTransform([worldIntroY, worldScrollY], ([i, s]) => i + s)
  const worldX = useTransform(spx, [-0.5, 0.5], [-12, 12])
  const farX = useTransform(spx, [-0.5, 0.5], [-6, 6])
  const farY = useTransform(spy, [-0.5, 0.5], [-4, 4])

  const lookY = useTransform(spx, [-0.5, 0.5], [1.15, -1.15])
  const lookX = useTransform(spy, [-0.5, 0.5], [-0.45, 0.55])
  const lightX = useTransform(spx, [-0.5, 0.5], ['30%', '70%'])
  const lightY = useTransform(spy, [-0.5, 0.5], ['24%', '56%'])
  const sheenX = useTransform(spx, [-0.5, 0.5], ['-7%', '11%'])
  const hazeX = useTransform(spx, [-0.5, 0.5], [-10, 10])

  const tracking = useTransform(intro, [0, 1], [compact ? '0.07em' : '0.12em', '0em'])
  const coverOpacity = useTransform(intro, [0.38, 0.82], [0, 1])
  const annotateOpacity = useTransform(intro, [0.78, 1], [0, 1])
  const uiOpacity = useTransform(scrollYProgress, [0.02, 0.34], [1, 0])
  const uiY = useTransform(scrollYProgress, [0, 0.4], [0, -40])
  const perkOpacity = useTransform([annotateOpacity, uiOpacity], ([a, u]) => a * u)
  const carScrollY = useTransform(scrollYProgress, [0.06, 1], [0, compact ? 72 : 240])
  const atmosphereY = useTransform(scrollYProgress, [0, 1], [0, 64])

  return {
    annotateOpacity,
    atmosphereY,
    cameraScale,
    cameraY,
    carScrollY,
    compact,
    coverOpacity,
    farX,
    farY,
    finePointer,
    frameReady,
    hazeX,
    intro,
    lightX,
    lightY,
    lookX,
    lookY,
    perkOpacity,
    reduceMotion,
    sheenX,
    tracking,
    uiOpacity,
    uiY,
    worldScale,
    worldX,
    worldY,
  }
}

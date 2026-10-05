import { useEffect } from 'react'

/**
 * Pointer and scroll drive CSS custom properties on the hero node.
 * No animation loops, no springs, no LCP-scaling of the vehicle.
 */
export function useHeroCamera(heroRef) {
  useEffect(() => {
    const node = heroRef?.current
    if (!node) return undefined

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = window.matchMedia('(pointer: fine) and (hover: hover)')

    const set = (x, y) => {
      node.style.setProperty('--hx', x)
      node.style.setProperty('--hy', y)
    }

    const onMove = (event) => {
      if (motion.matches || !pointer.matches) return
      const rect = node.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      set(
        ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3),
        ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3),
      )
    }

    const onLeave = () => set('0', '0')

    const onScroll = () => {
      if (motion.matches) {
        node.style.setProperty('--sy', '0')
        return
      }
      const rect = node.getBoundingClientRect()
      const span = Math.max(rect.height, 1)
      const progress = Math.min(1, Math.max(0, -rect.top / span))
      node.style.setProperty('--sy', progress.toFixed(3))
    }

    const syncMotion = () => {
      node.classList.toggle('is-still', motion.matches)
      if (motion.matches) {
        set('0', '0')
        node.style.setProperty('--sy', '0')
      }
    }

    set('0', '0')
    node.style.setProperty('--sy', '0')
    syncMotion()
    onScroll()

    node.addEventListener('pointermove', onMove, { passive: true })
    node.addEventListener('pointerleave', onLeave)
    window.addEventListener('scroll', onScroll, { passive: true })
    motion.addEventListener('change', syncMotion)

    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('scroll', onScroll)
      motion.removeEventListener('change', syncMotion)
    }
  }, [heroRef])
}

/** Tiny tactile pulse. No-ops when the API is missing or the user prefers reduced motion. */
export const haptic = (style = 'light') => {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const pattern = style === 'success' ? 16 : style === 'open' ? 12 : 8
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}

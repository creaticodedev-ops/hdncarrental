/**
 * Shared booking-flow UI tokens — keep Home / Cars / Details / Confirmation consistent.
 * Brand colors stay in CSS theme; these are spacing, control, and surface recipes only.
 */

export const booking = {
  /** Primary interactive height — 48px touch target */
  control: 'h-12',
  controlMin: 'min-h-12',

  /** Soft elevated surfaces — 16px radius on the mock, a touch more on desktop */
  card:
    'rounded-[1.15rem] sm:rounded-[1.35rem] border border-borderColor/70 bg-surface shadow-[0_18px_48px_-30px_rgba(22,18,16,0.28)]',
  cardQuiet: 'rounded-[0.95rem] border border-borderColor/70 bg-white',

  /** Field chrome used on reservation + search */
  fieldShell:
    'flex h-12 w-full items-center gap-3 rounded-[0.9rem] border border-borderColor/80 bg-white px-3.5 text-[15px] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition duration-200 hover:border-ink/15 focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_rgba(143,31,31,0.08)]',

  label: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted',
  eyebrow: 'text-[11px] font-semibold uppercase tracking-[0.16em] text-primary',
  sectionTitle: 'font-display text-2xl sm:text-3xl font-medium text-ink leading-tight',

  /** CTAs */
  btnPrimary:
    'inline-flex h-12 items-center justify-center gap-2 rounded-[0.9rem] bg-primary px-6 text-[15px] font-semibold text-white transition duration-200 hover:bg-primary-dull hover:shadow-[0_14px_28px_-16px_rgba(143,31,31,0.7)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55',
  btnSecondary:
    'inline-flex h-12 items-center justify-center gap-2 rounded-[0.9rem] border border-borderColor/90 bg-white px-6 text-[15px] font-semibold text-ink transition duration-200 hover:bg-light hover:border-ink/20 active:scale-[0.99]',
  btnGhost:
    'inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-ink/10 px-6 text-[15px] font-medium text-ink transition hover:border-primary hover:text-primary',

  chip:
    'inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs sm:text-sm font-medium transition-colors',
  chipActive: 'bg-ink text-white border-ink',
  chipIdle: 'bg-white/90 text-muted border-borderColor hover:border-ink/25 hover:text-ink',
  chipPrimaryActive: 'bg-primary text-white border-primary',

  /** Square icon slot that sits inside fieldShell and spec tiles */
  iconWrap:
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-light text-muted ring-1 ring-borderColor/60',

  /** Inline advisories: rental rules, date conflicts, loading states */
  notice:
    'flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs leading-relaxed sm:text-[13px]',
  noticeInfo: 'border-primary/15 bg-primary/[0.04] text-ink/80',
  noticeError: 'border-red-200 bg-red-50/90 text-red-700',
  noticeQuiet: 'border-borderColor/70 bg-light/70 text-muted',

  /** Category eyebrow rendered as a pill above the vehicle name */
  pill:
    'inline-flex items-center rounded-full bg-primary/[0.08] px-3 py-[5px] text-[10px] font-semibold uppercase tracking-[0.18em] text-primary',

  /** One vehicle characteristic — compact labelled tile */
  specTile:
    'flex flex-col gap-2 rounded-[0.95rem] border border-borderColor/80 bg-light/50 px-3 py-3 transition duration-200 hover:border-primary/20 hover:bg-white',

  pageBottom: 'pb-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))] sm:pb-24',
}

export default booking

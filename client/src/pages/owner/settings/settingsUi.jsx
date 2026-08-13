/** Shared Settings module presentation — uses Admin design tokens. */

export const settingsUi = {
  shell: 'relative overflow-hidden admin-card',
  card: 'admin-card',
  cardSoft: 'admin-card bg-[var(--admin-surface-2)]',
  sectionLabel: 'admin-label',
  title: 'text-xl sm:text-2xl font-semibold text-[var(--admin-ink)] leading-tight',
  subtitle: 'text-sm text-[var(--admin-muted)] leading-relaxed',
  input: 'admin-input',
  textarea: 'admin-input min-h-[6.5rem] resize-y',
  select: 'admin-input',
  btnPrimary: 'admin-btn admin-btn-primary',
  btnSecondary: 'admin-btn admin-btn-secondary',
  btnGhost: 'admin-btn admin-btn-ghost',
  btnDanger: 'admin-btn admin-btn-danger',
  chip: 'admin-badge',
  stickyBar:
    'sticky bottom-0 z-20 border-t border-[var(--admin-border)] bg-[var(--admin-navbar)] px-3 py-3 backdrop-blur-md booking-safe-bottom sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
}

export const Field = ({ label, hint, error, children, className = '' }) => (
  <div className={`space-y-1.5 min-w-0 ${className}`}>
    {label ? <label className={settingsUi.sectionLabel}>{label}</label> : null}
    {children}
    {error ? <p className="text-[12px] text-[var(--admin-danger)] leading-snug">{error}</p> : null}
    {!error && hint ? <p className="text-[12px] text-[var(--admin-muted)] leading-snug">{hint}</p> : null}
  </div>
)

export const SettingsCard = ({
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
  soft = false,
}) => (
  <section className={`${soft ? settingsUi.cardSoft : settingsUi.card} p-4 sm:p-6 ${className}`}>
    {(eyebrow || title || description || action) && (
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className={`${settingsUi.sectionLabel} text-[var(--admin-primary)]`}>{eyebrow}</p> : null}
          {title ? <h2 className={`${settingsUi.title} mt-1`}>{title}</h2> : null}
          {description ? <p className={`${settingsUi.subtitle} mt-1.5 max-w-2xl`}>{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
    )}
    {children}
  </section>
)

export const StatusPill = ({ tone = 'neutral', children }) => {
  const tones = {
    success: 'admin-badge-success',
    info: 'admin-badge-info',
    warn: 'admin-badge-warn',
    danger: 'admin-badge-danger',
    neutral: 'admin-badge-neutral',
  }
  return <span className={`${settingsUi.chip} ${tones[tone] || tones.neutral}`}>{children}</span>
}

export const EmptyState = ({ title, body, action }) => (
  <div className="rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-5 py-12 text-center">
    <p className="text-xl font-semibold text-[var(--admin-ink)]">{title}</p>
    {body ? <p className="mt-2 text-sm text-[var(--admin-muted)] max-w-md mx-auto leading-relaxed">{body}</p> : null}
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </div>
)

export const LoadingBlock = ({ label }) => (
  <div className="space-y-3" aria-busy="true">
    <div className="admin-skeleton h-4 w-40" />
    <div className="admin-skeleton h-28" />
    <div className="admin-skeleton h-28" />
    {label ? <p className="text-sm text-[var(--admin-muted)]">{label}</p> : null}
  </div>
)

export default settingsUi

import React from 'react'
import { motion as Motion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'

/** Official Google “G” mark colors — used for visual style only */
const GoogleMark = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

const Star = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" aria-hidden="true">
    <path
      fill="#FABB05"
      d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.27 5.06 16.7l.94-5.5-4-3.9 5.53-.8L10 1.5z"
    />
  </svg>
)

const AVATAR_COLORS = ['#4285F4', '#34A853', '#F9AB00', '#A142F4', '#EA4335', '#24C1E0']

const initialsFromName = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

const Testimonial = () => {
  const { t, getArray } = useI18n()
  const testimonials = getArray('testimonials.items')

  return (
    <section className="bg-white py-16 sm:py-20 md:py-24 page-pad page-shell">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-3 inline-flex items-center justify-center gap-2">
          <GoogleMark className="h-[18px] w-[18px]" />
          <span className="text-sm font-medium tracking-wide text-[#5f6368]">
            {t('testimonials.googleLabel')}
          </span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] font-medium leading-tight text-ink">
          {t('testimonials.title')}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm md:text-base font-light leading-relaxed text-muted">
          {t('testimonials.subtitle')}
        </p>

        <p className="mt-4 inline-flex items-center rounded-full border border-borderColor/80 bg-sand/40 px-3 py-1 text-[11px] font-medium tracking-wide text-muted">
          {t('testimonials.disclaimer')}
        </p>
      </div>

      <div className="mx-auto mt-10 sm:mt-12 md:mt-14 grid max-w-5xl grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((item, index) => {
          const initials = item.initials || initialsFromName(item.name)
          const color = item.color || AVATAR_COLORS[index % AVATAR_COLORS.length]

          return (
            <Motion.article
              key={`${item.name}-${index}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
              className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-[0_1px_2px_rgba(60,64,67,0.06)]"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink leading-tight">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#80868b]">{item.location}</p>
                    </div>
                    <GoogleMark className="mt-0.5 h-4 w-4 shrink-0 opacity-90" />
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="flex items-center gap-0.5" aria-label="5 out of 5 stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} />
                      ))}
                    </div>
                    {item.date && (
                      <span className="text-xs text-[#80868b]">{item.date}</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-3.5 text-[14px] leading-relaxed text-[#3c4043]">
                {item.text}
              </p>
            </Motion.article>
          )
        })}
      </div>
    </section>
  )
}

export default Testimonial

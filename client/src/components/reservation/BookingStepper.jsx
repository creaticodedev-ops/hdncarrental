import React from 'react'
import { motion as Motion, useReducedMotion } from 'framer-motion'

const Check = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
)

/**
 * Progress header for the reservation wizard.
 *
 * Steps already visited stay clickable so a customer can go back and fix a date
 * without losing what they typed; steps ahead are inert until reached.
 */
export default function BookingStepper({ steps, current, furthest = 0, onStepSelect }) {
  const reduceMotion = useReducedMotion()

  return (
    <ol className="flex items-start gap-1.5" role="list">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const reachable = i <= furthest
        const state = done ? 'done' : active ? 'active' : 'todo'

        return (
          <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center gap-1.5">
              <span
                className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                  i === 0 ? 'bg-transparent' : done || active ? 'bg-primary/70' : 'bg-borderColor'
                }`}
                aria-hidden
              />
              <button
                type="button"
                disabled={!reachable || active}
                onClick={() => reachable && !active && onStepSelect?.(i)}
                aria-current={active ? 'step' : undefined}
                aria-label={`${step.label}${done ? ' ✓' : ''}`}
                // after:-inset-2 widens the tap target to ~44px without growing the dot.
                className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition duration-200 after:absolute after:-inset-2 after:content-[''] ${
                  state === 'active'
                    ? 'bg-primary text-white shadow-[0_8px_20px_-8px_rgba(143,31,31,0.75)]'
                    : state === 'done'
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/25 hover:bg-primary/15 cursor-pointer'
                      : 'bg-light text-muted ring-1 ring-borderColor/80'
                } ${!reachable || active ? '' : 'cursor-pointer'} disabled:cursor-default`}
              >
                {active && !reduceMotion ? (
                  <Motion.span
                    layoutId="booking-step-halo"
                    className="absolute -inset-1 rounded-full ring-2 ring-primary/20"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden
                  />
                ) : null}
                <span className="relative">{done ? <Check /> : i + 1}</span>
              </button>
              <span
                className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                  i === steps.length - 1 ? 'bg-transparent' : done ? 'bg-primary/70' : 'bg-borderColor'
                }`}
                aria-hidden
              />
            </div>
            <span
              className={`w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight transition-colors duration-200 sm:text-[11px] ${
                active ? 'font-semibold text-ink' : done ? 'text-ink/55' : 'text-muted/70'
              }`}
              title={step.label}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

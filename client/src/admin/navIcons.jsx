import React from 'react'

/** Consistent monochrome nav icons — color via CSS currentColor. */
const s = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
const p = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const NavIcon = ({ id, className = '' }) => {
  const icons = {
    dashboard: (
      <svg {...s} className={className}>
        <path {...p} d="M4 11.5V20h6v-8.5H4zM14 4v16h6V4h-6zM4 4v5h6V4H4z" />
      </svg>
    ),
    reservations: (
      <svg {...s} className={className}>
        <path {...p} d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </svg>
    ),
    walkIn: (
      <svg {...s} className={className}>
        <path {...p} d="M12 5v14M5 12h14" />
      </svg>
    ),
    calendar: (
      <svg {...s} className={className}>
        <rect {...p} x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path {...p} d="M8 3.5V7M16 3.5V7M3.5 10h17" />
      </svg>
    ),
    customers: (
      <svg {...s} className={className}>
        <circle {...p} cx="9" cy="8" r="3" />
        <path {...p} d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19M17 8a2.5 2.5 0 110 5M16.5 19c.3-1.8 1.4-3 3-3.5" />
      </svg>
    ),
    cars: (
      <svg {...s} className={className}>
        <path {...p} d="M4 14l1.5-5.5A2 2 0 017.4 7h9.2a2 2 0 011.9 1.5L20 14M4 14v4h2.5M20 14v4h-2.5M6.5 18H9m6 0h2.5M7 14h10" />
        <circle {...p} cx="7.5" cy="16" r="1.2" />
        <circle {...p} cx="16.5" cy="16" r="1.2" />
      </svg>
    ),
    add: (
      <svg {...s} className={className}>
        <circle {...p} cx="12" cy="12" r="8.5" />
        <path {...p} d="M12 8v8M8 12h8" />
      </svg>
    ),
    chauffeurs: (
      <svg {...s} className={className}>
        <circle {...p} cx="12" cy="8" r="3" />
        <path {...p} d="M5 19c1-3.2 3.5-5 7-5s6 1.8 7 5" />
      </svg>
    ),
    maintenance: (
      <svg {...s} className={className}>
        <path {...p} d="M14.7 6.3a4 4 0 015 5l-7.2 7.2a2 2 0 01-1.4.6H8v-3.1c0-.5.2-1 .6-1.4l6.1-6.3z" />
      </svg>
    ),
    locations: (
      <svg {...s} className={className}>
        <path {...p} d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" />
        <circle {...p} cx="12" cy="10" r="2.2" />
      </svg>
    ),
    catalog: (
      <svg {...s} className={className}>
        <path {...p} d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
    stats: (
      <svg {...s} className={className}>
        <path {...p} d="M4 19h16M7 16V9M12 16V5M17 16v-4" />
      </svg>
    ),
    partners: (
      <svg {...s} className={className}>
        <circle {...p} cx="8" cy="9" r="2.5" />
        <circle {...p} cx="16" cy="9" r="2.5" />
        <path {...p} d="M3.5 18c.5-2.5 2.2-3.8 4.5-3.8S12 15.5 12.5 18M11.5 18c.5-2.5 2.2-3.8 4.5-3.8S20 15.5 20.5 18" />
      </svg>
    ),
    company: (
      <svg {...s} className={className}>
        <path {...p} d="M4 20V7.5L12 4l8 3.5V20M8 20v-5h3v5M14 10h3M14 13.5h3M14 17h3" />
      </svg>
    ),
    accounting: (
      <svg {...s} className={className}>
        <rect {...p} x="4" y="4" width="16" height="16" rx="2" />
        <path {...p} d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    ),
    revenue: (
      <svg {...s} className={className}>
        <path {...p} d="M4 16l5-5 3.5 3.5L20 7M15 7h5v5" />
      </svg>
    ),
    expense: (
      <svg {...s} className={className}>
        <path {...p} d="M12 3v18M16 7H9.5a2.5 2.5 0 000 5H14a2.5 2.5 0 010 5H7" />
      </svg>
    ),
    contracts: (
      <svg {...s} className={className}>
        <path {...p} d="M7 3.5h7.5L19 8v12.5H7z" />
        <path {...p} d="M14.5 3.5V8H19M9.5 12h5M9.5 15.5h5" />
      </svg>
    ),
    signature: (
      <svg {...s} className={className}>
        <path {...p} d="M4 18c2-3 3.5-4.5 5-4.5S12 16 14 14s2.5-3 4-3 2 .5 2 2" />
        <path {...p} d="M4 20h16" />
      </svg>
    ),
    invoices: (
      <svg {...s} className={className}>
        <path {...p} d="M7 3.5h10v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2z" />
        <path {...p} d="M10 8h4M10 12h4" />
      </svg>
    ),
    templates: (
      <svg {...s} className={className}>
        <path {...p} d="M5 5h14v14H5zM5 10h14M10 5v14" />
      </svg>
    ),
    analytics: (
      <svg {...s} className={className}>
        <path {...p} d="M4 19V5M4 19h16M8 15V9M12 15V7M16 15v-3" />
      </svg>
    ),
    reports: (
      <svg {...s} className={className}>
        <path {...p} d="M6 4h9l3 3v13H6zM15 4v3h3M9 11h6M9 15h6" />
      </svg>
    ),
    audit: (
      <svg {...s} className={className}>
        <circle {...p} cx="11" cy="11" r="6.5" />
        <path {...p} d="M16 16l4 4" />
      </svg>
    ),
    settings: (
      <svg {...s} className={className}>
        <circle {...p} cx="12" cy="12" r="3" />
        <path {...p} d="M12 3.5v2.2M12 18.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
      </svg>
    ),
  }

  return icons[id] || icons.reservations
}

import { useMemo } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { sameCity } from './journeyPlanner.js'

const W = 1000
const H = 700
const PAD = 70
const LABEL_SIZE = 19
const MIN_SPAN_LON = 3.4
const MIN_SPAN_LAT = 2.6
const MARGIN_DEG = 0.55

/** Equirectangular projection fitted to the served cities (aspect-correct at their mean latitude). */
const buildProjection = (points) => {
  let minLat = Math.min(...points.map((p) => p.lat)) - MARGIN_DEG
  let maxLat = Math.max(...points.map((p) => p.lat)) + MARGIN_DEG
  let minLon = Math.min(...points.map((p) => p.lon)) - MARGIN_DEG
  let maxLon = Math.max(...points.map((p) => p.lon)) + MARGIN_DEG
  if (maxLat - minLat < MIN_SPAN_LAT) {
    const grow = (MIN_SPAN_LAT - (maxLat - minLat)) / 2
    minLat -= grow
    maxLat += grow
  }
  if (maxLon - minLon < MIN_SPAN_LON) {
    const grow = (MIN_SPAN_LON - (maxLon - minLon)) / 2
    minLon -= grow
    maxLon += grow
  }
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  const scale = Math.min((W - PAD * 2) / ((maxLon - minLon) * k), (H - PAD * 2) / (maxLat - minLat))
  const offsetX = (W - (maxLon - minLon) * k * scale) / 2
  const offsetY = (H - (maxLat - minLat) * scale) / 2
  return {
    bounds: { minLat, maxLat, minLon, maxLon },
    project: ({ lat, lon }) => ({
      x: offsetX + (lon - minLon) * k * scale,
      y: offsetY + (maxLat - lat) * scale,
    }),
  }
}

/** Greedy label placement: right, left, above, below — first slot that doesn't collide. */
const placeLabels = (nodes) => {
  const boxes = []
  const overlaps = (b) => boxes.some((o) => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1)
  const out = new Map()
  for (const node of nodes) {
    const w = node.city.length * LABEL_SIZE * 0.56
    const h = LABEL_SIZE
    const slots = [
      { x: node.x + 16, y: node.y + 6, anchor: 'start', box: { x1: node.x + 14, x2: node.x + 16 + w, y1: node.y - h / 2, y2: node.y + h / 2 } },
      { x: node.x - 16, y: node.y + 6, anchor: 'end', box: { x1: node.x - 16 - w, x2: node.x - 14, y1: node.y - h / 2, y2: node.y + h / 2 } },
      { x: node.x, y: node.y - 18, anchor: 'middle', box: { x1: node.x - w / 2, x2: node.x + w / 2, y1: node.y - 18 - h, y2: node.y - 16 } },
      { x: node.x, y: node.y + 32, anchor: 'middle', box: { x1: node.x - w / 2, x2: node.x + w / 2, y1: node.y + 16, y2: node.y + 34 } },
    ]
    const slot = slots.find((s) => !overlaps(s.box)) || slots[0]
    boxes.push(slot.box)
    out.set(node.city, slot)
  }
  return out
}

const BADGE = { w: 176, h: 52, top: 40 }

/** Distance badge position: the route midpoint, nudged along the bend normal until it clears city dots and labels. */
const placeBadge = (mid, normal, nodes, obstacles) => {
  const boxAt = (x, y) => ({ x1: x - BADGE.w / 2, x2: x + BADGE.w / 2, y1: y - BADGE.top, y2: y - BADGE.top + BADGE.h })
  const blocked = (b) =>
    b.x1 < 0 || b.x2 > W || b.y1 < 0 || b.y2 > H
    || obstacles.some((o) => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1)
    || nodes.some((n) => n.x > b.x1 - 12 && n.x < b.x2 + 12 && n.y > b.y1 - 12 && n.y < b.y2 + 12)
  for (const step of [0, -45, 45, -90, 90, -135, 135, 180]) {
    const x = mid.x + normal.x * step
    const y = mid.y + normal.y * step
    if (!blocked(boxAt(x, y))) return { x, y }
  }
  return mid
}

const range = (from, to) => {
  const out = []
  for (let v = Math.ceil(from); v <= Math.floor(to); v += 1) out.push(v)
  return out
}

const JourneyMap = ({ cities, startCity, endCity, distanceKm, pickTarget, onPick, reducedMotion }) => {
  const { t, language } = useI18n()

  const layout = useMemo(() => {
    if (cities.length < 2) return null
    const { project, bounds } = buildProjection(cities.map((c) => c.coords))
    const nodes = cities.map((c) => ({ city: c.city, ...project(c.coords) }))
    const priority = (n) => (sameCity(n.city, startCity) || sameCity(n.city, endCity) ? 0 : 1)
    const labels = placeLabels([...nodes].sort((a, b) => priority(a) - priority(b)))
    return { nodes, labels, bounds, project }
  }, [cities, startCity, endCity])

  if (!layout) return null

  const { nodes, labels, bounds, project } = layout
  const ocean = project({ lat: (bounds.minLat + bounds.maxLat) / 2, lon: bounds.minLon + 0.25 })
  const obstacles = [
    ...[...labels.values()].map((slot) => slot.box),
    { x1: ocean.x - 22, x2: ocean.x + 22, y1: ocean.y - 150, y2: ocean.y + 150 },
  ]
  const start = nodes.find((n) => sameCity(n.city, startCity))
  const end = nodes.find((n) => sameCity(n.city, endCity))
  const roundTrip = Boolean(start) && (!endCity || sameCity(startCity, endCity))

  let route = null
  if (start && end && !roundTrip) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const len = Math.hypot(dx, dy) || 1
    let nx = -dy / len
    let ny = dx / len
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    const bend = Math.min(140, len * 0.28)
    const cx = (start.x + end.x) / 2 + nx * bend
    const cy = (start.y + end.y) / 2 + ny * bend
    const mid = { x: (start.x + 2 * cx + end.x) / 4, y: (start.y + 2 * cy + end.y) / 4 }
    route = {
      d: `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`,
      badge: placeBadge(mid, { x: nx, y: ny }, nodes, obstacles),
    }
  }

  const number = new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB')
  const lonLines = range(bounds.minLon, bounds.maxLon)
  const latLines = range(bounds.minLat, bounds.maxLat)
  const routeKey = `${startCity}|${endCity}`

  const handleKey = (event, city) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onPick(city)
  }

  return (
    <svg className="jc-map-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t('journey.mapLabel')}>
      <defs>
        <linearGradient id="jc-route-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e2554d" />
          <stop offset="100%" stopColor="#f3c873" />
        </linearGradient>
        <radialGradient id="jc-node-glow">
          <stop offset="0%" stopColor="rgba(226, 85, 77, 0.55)" />
          <stop offset="100%" stopColor="rgba(226, 85, 77, 0)" />
        </radialGradient>
      </defs>

      <g className="jc-grid" aria-hidden="true">
        {lonLines.map((lon) => {
          const { x } = project({ lat: bounds.maxLat, lon })
          return (
            <g key={`lon${lon}`}>
              <line x1={x} y1={0} x2={x} y2={H} />
              <text x={x + 6} y={H - 14}>{`${Math.abs(lon)}°${lon < 0 ? 'W' : 'E'}`}</text>
            </g>
          )
        })}
        {latLines.map((lat) => {
          const { y } = project({ lat, lon: bounds.minLon })
          return (
            <g key={`lat${lat}`}>
              <line x1={0} y1={y} x2={W} y2={y} />
              <text x={W - 14} y={y - 6} textAnchor="end">{`${lat}°N`}</text>
            </g>
          )
        })}
        <text className="jc-ocean" x={ocean.x} y={ocean.y} transform={`rotate(-90 ${ocean.x} ${ocean.y})`} textAnchor="middle">
          {t('journey.ocean')}
        </text>
      </g>

      {route ? (
        <g key={routeKey} className="jc-route" aria-hidden="true">
          <path className="jc-route-base" d={route.d} />
          <path className="jc-route-line" d={route.d} pathLength="1" />
          {!reducedMotion ? (
            <circle className="jc-route-dot" r="7">
              <animateMotion dur="3.6s" repeatCount="indefinite" path={route.d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.25 1" />
            </circle>
          ) : null}
          {distanceKm ? (
            <g className="jc-route-badge" transform={`translate(${route.badge.x} ${route.badge.y})`}>
              <rect x={-BADGE.w / 2} y={-BADGE.top} width={BADGE.w} height={BADGE.h} rx={BADGE.h / 2} />
              <text y="-10" textAnchor="middle" className="jc-route-km">{`≈ ${number.format(Math.round(distanceKm / 5) * 5)} km`}</text>
              <text y="6" textAnchor="middle" className="jc-route-km-note">{t('journey.straightLine')}</text>
            </g>
          ) : null}
        </g>
      ) : null}

      {roundTrip && start ? (
        <g key={`loop-${routeKey}`} className="jc-loop" aria-hidden="true">
          <circle cx={start.x} cy={start.y} r="46" />
        </g>
      ) : null}

      {nodes.map((node) => {
        const isStart = node === start
        const isEnd = node === end && !roundTrip
        const label = labels.get(node.city)
        const role = isStart ? 'is-start' : isEnd ? 'is-end' : ''
        return (
          <g
            key={node.city}
            className={`jc-node ${role}`}
            role="button"
            tabIndex={0}
            aria-label={t(pickTarget === 'start' ? 'journey.pickStartCity' : 'journey.pickEndCity', { city: node.city })}
            aria-pressed={isStart || isEnd}
            onClick={() => onPick(node.city)}
            onKeyDown={(event) => handleKey(event, node.city)}
          >
            <circle className="jc-node-hit" cx={node.x} cy={node.y} r="26" />
            {isStart || isEnd ? <circle className="jc-node-glow" cx={node.x} cy={node.y} r="34" fill="url(#jc-node-glow)" /> : null}
            {isStart && !reducedMotion ? <circle className="jc-node-pulse" cx={node.x} cy={node.y} r="10" /> : null}
            <circle className="jc-node-dot" cx={node.x} cy={node.y} r={isStart || isEnd ? 8 : 5} />
            <text className="jc-node-label" x={label.x} y={label.y} textAnchor={label.anchor}>{node.city}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default JourneyMap

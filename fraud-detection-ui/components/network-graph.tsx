'use client'

import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import { Card } from '@/components/ui/card'
import { useLanguage } from '@/lib/language-context'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  label?: string
  labelKey?: string
  type: string
  collusion: boolean
  inpplc?: Record<string, unknown> | null
}

export interface GraphEdge {
  source: string
  target: string
  weight: string
}

interface NetworkGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeSelect: (node: GraphNode) => void
  selectedNode: GraphNode | null
}

// ─── Constantes visuelles ────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  agency:   { fill: '#0f172a', stroke: '#334155', text: '#f8fafc' },
  person:   { fill: '#b91c1c', stroke: '#ef4444', text: '#fef2f2' },
  tender:   { fill: '#475569', stroke: '#94a3b8', text: '#f1f5f9' },
  supplier: { fill: '#64748b', stroke: '#94a3b8', text: '#f8fafc' },
  company:  { fill: '#1e3a5f', stroke: '#3b82f6', text: '#eff6ff' },
}

const COLLUSION_FILL   = '#991b1b'
const COLLUSION_STROKE = '#fca5a5'
const SELECTED_STROKE  = '#f59e0b'

const NODE_RADIUS: Record<string, number> = {
  agency: 18, person: 22, tender: 26, supplier: 20, company: 24,
}

const EDGE_STROKE: Record<string, string> = {
  strong: '#ef4444', medium: '#94a3b8', weak: '#cbd5e1',
}

// ─── Simulation de physique (force-directed) ─────────────────────────────────

interface SimNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
}

const SVG_W = 720
const SVG_H = 520
const PADDING = 50

function initPositions(ids: string[]): SimNode[] {
  const n = ids.length
  return ids.map((id, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const r = Math.min(SVG_W, SVG_H) * 0.35
    return {
      id,
      x: SVG_W / 2 + r * Math.cos(angle),
      y: SVG_H / 2 + r * Math.sin(angle),
      vx: 0,
      vy: 0,
    }
  })
}

interface SimEdge { source: string; target: string }

function runSimulation(nodes: SimNode[], edges: SimEdge[], iterations = 200): void {
  const idx = new Map(nodes.map((n, i) => [n.id, i]))
  const REPULSION   = 5500
  const ATTRACTION  = 0.035
  const REST_LENGTH = 110
  const DAMPING     = 0.80
  const CENTER_G    = 0.015
  // Rayon minimum entre deux nœuds pour éviter le chevauchement
  const MIN_DIST    = 55

  for (let iter = 0; iter < iterations; iter++) {
    // Répulsion nœud-nœud avec distance minimale (anti-chevauchement)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.x - a.x || 0.1
        const dy = b.y - a.y || 0.1
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const effectiveDist = Math.max(dist, MIN_DIST)
        const force = REPULSION / (effectiveDist * effectiveDist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx
        a.vy -= fy
        b.vx += fx
        b.vy += fy
      }
    }

    // Attraction le long des arêtes (ressort)
    for (const e of edges) {
      const si = idx.get(e.source)
      const ti = idx.get(e.target)
      if (si === undefined || ti === undefined) continue
      const a = nodes[si]
      const b = nodes[ti]
      const dx   = b.x - a.x
      const dy   = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const diff = (dist - REST_LENGTH) * ATTRACTION
      const fx   = (dx / dist) * diff
      const fy   = (dy / dist) * diff
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }

    // Gravité vers le centre
    for (const n of nodes) {
      n.vx += (SVG_W / 2 - n.x) * CENTER_G
      n.vy += (SVG_H / 2 - n.y) * CENTER_G
    }

    // Intégration + amortissement + limites
    for (const n of nodes) {
      n.vx *= DAMPING
      n.vy *= DAMPING
      n.x = Math.max(PADDING, Math.min(SVG_W - PADDING, n.x + n.vx))
      n.y = Math.max(PADDING, Math.min(SVG_H - PADDING, n.y + n.vy))
    }
  }
}

// ─── Composant principal ─────────────────────────────────────────────────────

const ZOOM_MIN = 0.4
const ZOOM_MAX = 3.0
const ZOOM_STEP = 0.2

export function NetworkGraph({ nodes, edges, onNodeSelect, selectedNode }: NetworkGraphProps) {
  const { t } = useLanguage()
  const svgRef  = useRef<SVGSVGElement>(null)
  const animRef = useRef<number | null>(null)
  const tickRef = useRef(0)

  // ── État zoom / pan ────────────────────────────────────────────────────────
  const [zoom, setZoom]   = useState(1)
  const [pan, setPan]     = useState({ x: 0, y: 0 })
  const isPanning         = useRef(false)
  const panStart          = useRef({ x: 0, y: 0, px: 0, py: 0 })

  const handleZoomIn  = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  const handleZoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  const handleReset   = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // Zoom à la molette
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))))
  }, [])

  // Pan par drag
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('[role="button"]')) return
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return
    setPan({
      x: panStart.current.px + (e.clientX - panStart.current.x),
      y: panStart.current.py + (e.clientY - panStart.current.y),
    })
  }, [])

  const handleMouseUp = useCallback(() => { isPanning.current = false }, [])

  // ── Simulation ─────────────────────────────────────────────────────────────
  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes])

  const simNodes = useMemo<SimNode[]>(() => {
    const sims = initPositions(nodeIds)
    runSimulation(sims, edges, 250)
    return sims
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIds.join(','), edges.length])

  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    simNodes.forEach((s) => m.set(s.id, { x: s.x, y: s.y }))
    return m
  }, [simNodes])

  // ── Animation halo pulse ───────────────────────────────────────────────────
  const renderPulse = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    tickRef.current += 1
    const tick = tickRef.current
    svg.querySelectorAll<SVGCircleElement>('[data-pulse]').forEach((el) => {
      const base = parseFloat(el.getAttribute('data-base-r') ?? '30')
      const scale = 1 + 0.18 * Math.abs(Math.sin(tick * 0.04))
      el.setAttribute('r', String(base * scale))
      el.setAttribute('opacity', String(0.15 + 0.1 * Math.abs(Math.sin(tick * 0.04))))
    })
    animRef.current = requestAnimationFrame(renderPulse)
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderPulse)
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current) }
  }, [renderPulse])

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t('graphLabels.collusionNetwork')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('graphLabels.clickNodesInfo')}</p>
        </div>

        {/* Contrôles zoom */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= ZOOM_MIN}
            className="p-1.5 rounded hover:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Dézoomer"
            title="Dézoomer"
          >
            <ZoomOut className="w-4 h-4 text-foreground" />
          </button>
          <span className="text-xs font-mono text-muted-foreground px-1 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= ZOOM_MAX}
            className="p-1.5 rounded hover:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Zoomer"
            title="Zoomer"
          >
            <ZoomIn className="w-4 h-4 text-foreground" />
          </button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <button
            onClick={handleReset}
            className="p-1.5 rounded hover:bg-background transition-colors"
            aria-label="Réinitialiser la vue"
            title="Réinitialiser la vue"
          >
            <Maximize2 className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden cursor-grab active:cursor-grabbing">
        <svg
          ref={svgRef}
          width="100%"
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full select-none"
          role="img"
          aria-label="Graphe d'analyse du réseau de collusion"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Groupe zoomable / panable */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
             style={{ transformOrigin: `${SVG_W / 2}px ${SVG_H / 2}px` }}>

            {/* ── Arêtes ───────────────────────────────────────────── */}
            <g className="edges">
              {edges.map((edge, idx) => {
                const s   = posMap.get(edge.source)
                const tgt = posMap.get(edge.target)
                if (!s || !tgt) return null
                const isStrong = edge.weight === 'strong'
                return (
                  <line
                    key={`e-${idx}`}
                    x1={s.x} y1={s.y}
                    x2={tgt.x} y2={tgt.y}
                    stroke={EDGE_STROKE[edge.weight] ?? '#cbd5e1'}
                    strokeWidth={isStrong ? 2.5 : edge.weight === 'medium' ? 1.5 : 1}
                    opacity={isStrong ? 0.75 : edge.weight === 'medium' ? 0.45 : 0.25}
                    strokeDasharray={edge.weight === 'weak' ? '4 3' : undefined}
                  />
                )
              })}
            </g>

            {/* ── Nœuds ────────────────────────────────────────────── */}
            <g className="nodes">
              {nodes.map((node) => {
                const pos = posMap.get(node.id)
                if (!pos) return null

                const colors   = TYPE_COLORS[node.type] ?? TYPE_COLORS.company
                const isSelect = selectedNode?.id === node.id
                const r        = NODE_RADIUS[node.type] ?? 22
                const fill     = node.collusion ? COLLUSION_FILL : colors.fill
                const stroke   = isSelect
                  ? SELECTED_STROKE
                  : node.collusion
                    ? COLLUSION_STROKE
                    : colors.stroke
                const label    = node.labelKey ? t(node.labelKey) : (node.label ?? node.id)
                const display  = label.length > 13 ? label.slice(0, 12) + '…' : label

                return (
                  <g
                    key={node.id}
                    onClick={() => onNodeSelect(node)}
                    onKeyDown={(e) => e.key === 'Enter' && onNodeSelect(node)}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={isSelect}
                  >
                    {node.collusion && (
                      <circle
                        data-pulse="1"
                        data-base-r={r + 10}
                        cx={pos.x} cy={pos.y}
                        r={r + 10}
                        fill="#ef4444"
                        opacity="0.15"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                    {isSelect && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={r + 8}
                        fill="none"
                        stroke={SELECTED_STROKE}
                        strokeWidth={2.5}
                        opacity={0.7}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                    <circle
                      cx={pos.x} cy={pos.y}
                      r={r}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelect ? 3 : node.collusion ? 1.5 : 1}
                      className="transition-all duration-150"
                    />
                    <text
                      x={pos.x} y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill={colors.text}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {display}
                    </text>
                    {node.collusion && (
                      <text
                        x={pos.x + r - 2}
                        y={pos.y - r + 2}
                        fontSize="11"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        ⚠
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </g>
        </svg>
      </div>

      {/* Légende nœuds */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {Object.entries(TYPE_COLORS).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.fill }} />
            <span className="text-xs text-muted-foreground">
              {type === 'person'   ? t('graph.nodeTypes.person')
               : type === 'company'  ? t('graph.nodeTypes.company')
               : type === 'tender'   ? t('graph.nodeTypes.tender')
               : type === 'supplier' ? t('graph.nodeTypes.supplier')
               : t('graph.nodeTypes.agency')}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0 bg-red-700 ring-1 ring-red-300" />
          <span className="text-xs text-red-600 font-medium">{t('graphLabels.detectedCollusion')}</span>
        </div>
      </div>

      {/* Légende arêtes */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {[
          { label: 'Lien fort (conflit)', color: '#ef4444', dash: false },
          { label: 'Lien moyen',          color: '#94a3b8', dash: false },
          { label: 'Lien faible',         color: '#cbd5e1', dash: true  },
        ].map(({ label, color, dash }) => (
          <div key={label} className="flex items-center gap-1.5">
            <svg width="20" height="8" aria-hidden>
              <line
                x1="0" y1="4" x2="20" y2="4"
                stroke={color}
                strokeWidth="2"
                strokeDasharray={dash ? '4 3' : undefined}
              />
            </svg>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Hint navigation */}
      <p className="mt-2 text-xs text-muted-foreground/60">
        Molette pour zoomer · Glisser pour déplacer
      </p>
    </Card>
  )
}

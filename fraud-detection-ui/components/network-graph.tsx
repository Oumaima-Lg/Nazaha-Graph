'use client'

import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import { Card } from '@/components/ui/card'
import { useLanguage } from '@/lib/language-context'
import { ZoomIn, ZoomOut, Maximize2, Expand, Minimize2, AlertTriangle, Users, Building2, FileText, Link2 } from 'lucide-react'

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
  relation?: string | null
}

interface NetworkGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeSelect: (node: GraphNode) => void
  selectedNode: GraphNode | null
}

// ─── Visual constants ─────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  agency:   { fill: '#1e293b', stroke: '#475569', text: '#f8fafc' },
  person:   { fill: '#1d4ed8', stroke: '#93c5fd', text: '#eff6ff' },
  tender:   { fill: '#b45309', stroke: '#fcd34d', text: '#fffbeb' },  // gold — the prize
  supplier: { fill: '#374151', stroke: '#9ca3af', text: '#f9fafb' },
  company:  { fill: '#0f172a', stroke: '#3b82f6', text: '#eff6ff' },
}

const COLLUSION_FILL   = '#991b1b'
const COLLUSION_STROKE = '#fca5a5'
const SELECTED_STROKE  = '#f59e0b'

const NODE_RADIUS: Record<string, number> = {
  agency: 19, person: 17, tender: 26, supplier: 16, company: 19,
}

const EDGE_STROKE: Record<string, string> = {
  strong: '#dc2626', medium: '#64748b', weak: '#64748b',
}

const FAMILY_RELATIONS = new Set([
  'conjoint', 'frere_soeur', 'pere_mere', 'fils_fille',
  'beau_frere_belle_soeur', 'oncle_tante', 'cousin',
])

const RELATION_LABELS: Record<string, string> = {
  conjoint: 'conjoint(e)',
  frere_soeur: 'frère/sœur',
  pere_mere: 'parent',
  fils_fille: 'enfant',
  beau_frere_belle_soeur: 'beau-frère/sœur',
  oncle_tante: 'oncle/tante',
  cousin: 'cousin(e)',
  ordonnateur: 'ordonnateur',
  president_commission: 'présid. commission',
  directeur: 'directeur',
  won_by: 'attribué à',
  awards: 'attribue',
  won: 'lauréat',
  bid_on: 'soumissionnaire',
}

// ─── Fraud summary ────────────────────────────────────────────────────────────

interface FraudSummary {
  fraudTypes: string[]
  familyLinks: GraphEdge[]
  suspectPersons: GraphNode[]
  suspectCompanies: GraphNode[]
  suspectTenders: GraphNode[]
}

function computeFraudSummary(nodes: GraphNode[], edges: GraphEdge[]): FraudSummary {
  const suspectIds = new Set(nodes.filter((n) => n.collusion).map((n) => n.id))

  const familyLinks = edges.filter(
    (e) =>
      e.relation &&
      FAMILY_RELATIONS.has(e.relation) &&
      suspectIds.has(e.source) &&
      suspectIds.has(e.target),
  )

  const bidEdges = edges.filter((e) => e.relation === 'bid_on' && suspectIds.has(e.source))

  const suspectPersons   = nodes.filter((n) => n.type === 'person'  && n.collusion)
  const suspectCompanies = nodes.filter((n) => n.type === 'company' && n.collusion)
  const suspectTenders   = nodes.filter((n) => n.type === 'tender'  && n.collusion)

  const fraudTypes: string[] = []
  if (familyLinks.length > 0)       fraudTypes.push("Conflit d'intérêt familial")
  if (bidEdges.length >= 2)          fraudTypes.push('Collusion / rotation d\'offres')
  if (suspectTenders.length >= 3)    fraudTypes.push('Fractionnement de marchés')

  const pantouflage = suspectPersons.filter(
    (p) =>
      edges.some((e) => e.source === p.id && e.weight === 'strong') &&
      edges.some((e) => e.source === p.id && e.weight === 'medium'),
  )
  if (pantouflage.length > 0) fraudTypes.push('Pantouflage (porte tournante)')

  return { fraudTypes, familyLinks, suspectPersons, suspectCompanies, suspectTenders }
}

// ─── Physics simulation ───────────────────────────────────────────────────────

interface SimNode { id: string; x: number; y: number; vx: number; vy: number }
interface SimEdge  { source: string; target: string }

const SVG_W   = 960
const SVG_H   = 640
const PADDING = 80

function initPositions(ids: string[]): SimNode[] {
  const n = ids.length
  return ids.map((id, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const r     = Math.min(SVG_W, SVG_H) * 0.32
    return { id, x: SVG_W / 2 + r * Math.cos(angle), y: SVG_H / 2 + r * Math.sin(angle), vx: 0, vy: 0 }
  })
}

function runSimulation(nodes: SimNode[], edges: SimEdge[], iterations = 350): void {
  const idx         = new Map(nodes.map((n, i) => [n.id, i]))
  const REPULSION   = 12000
  const ATTRACTION  = 0.030
  const REST_LENGTH = 160
  const DAMPING     = 0.82
  const CENTER_G    = 0.008
  const MIN_DIST    = 85

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]; const b = nodes[j]
        const dx = b.x - a.x || 0.1; const dy = b.y - a.y || 0.1
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const eff  = Math.max(dist, MIN_DIST)
        const f    = REPULSION / (eff * eff)
        const fx   = (dx / dist) * f; const fy = (dy / dist) * f
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy
      }
    }
    for (const e of edges) {
      const si = idx.get(e.source); const ti = idx.get(e.target)
      if (si === undefined || ti === undefined) continue
      const a = nodes[si]; const b = nodes[ti]
      const dx = b.x - a.x; const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const diff = (dist - REST_LENGTH) * ATTRACTION
      const fx = (dx / dist) * diff; const fy = (dy / dist) * diff
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy
    }
    for (const n of nodes) {
      n.vx += (SVG_W / 2 - n.x) * CENTER_G
      n.vy += (SVG_H / 2 - n.y) * CENTER_G
      n.vx *= DAMPING; n.vy *= DAMPING
      n.x = Math.max(PADDING, Math.min(SVG_W - PADDING, n.x + n.vx))
      n.y = Math.max(PADDING, Math.min(SVG_H - PADDING, n.y + n.vy))
    }
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

const ZOOM_MIN = 0.3
const ZOOM_MAX = 4.0
const ZOOM_STEP = 0.2

export function NetworkGraph({ nodes, edges, onNodeSelect, selectedNode }: NetworkGraphProps) {
  const { t } = useLanguage()
  const svgRef  = useRef<SVGSVGElement>(null)
  const animRef = useRef<number | null>(null)
  const tickRef = useRef(0)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan]   = useState({ x: 0, y: 0 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isPanning       = useRef(false)
  const panStart        = useRef({ x: 0, y: 0, px: 0, py: 0 })

  // Exit fullscreen with Escape
  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  const handleZoomIn  = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  const handleZoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  const handleReset   = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // Wheel zoom — attached as a NON-passive native listener so preventDefault()
  // actually stops the page from scrolling / browser-zooming underneath.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('[role="button"]')) return
    isPanning.current = true
    panStart.current  = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return
    setPan({ x: panStart.current.px + (e.clientX - panStart.current.x), y: panStart.current.py + (e.clientY - panStart.current.y) })
  }, [])

  const handleMouseUp = useCallback(() => { isPanning.current = false }, [])

  // Simulation
  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes])

  const simNodes = useMemo<SimNode[]>(() => {
    const sims = initPositions(nodeIds)
    runSimulation(sims, edges, 350)
    return sims
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIds.join(','), edges.length])

  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    simNodes.forEach((s) => m.set(s.id, { x: s.x, y: s.y }))
    return m
  }, [simNodes])

  // Adjacency: for hover highlighting (a node + its direct neighbours stay lit)
  const neighbours = useMemo(() => {
    const m = new Map<string, Set<string>>()
    const add = (a: string, b: string) => {
      if (!m.has(a)) m.set(a, new Set())
      m.get(a)!.add(b)
    }
    edges.forEach((e) => { add(e.source, e.target); add(e.target, e.source) })
    return m
  }, [edges])

  const isLit = useCallback(
    (id: string) => !hoverId || hoverId === id || (neighbours.get(hoverId)?.has(id) ?? false),
    [hoverId, neighbours],
  )
  const edgeLit = useCallback(
    (e: GraphEdge) => !hoverId || e.source === hoverId || e.target === hoverId,
    [hoverId],
  )

  // Label lookup for summary panel
  const labelMap = useMemo(() => {
    const m = new Map<string, string>()
    nodes.forEach((n) => m.set(n.id, n.label ?? n.id))
    return m
  }, [nodes])

  // Pulse animation
  const renderPulse = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    tickRef.current += 1
    const tick = tickRef.current
    svg.querySelectorAll<SVGCircleElement>('[data-pulse]').forEach((el) => {
      const base  = parseFloat(el.getAttribute('data-base-r') ?? '30')
      const scale = 1 + 0.12 * Math.abs(Math.sin(tick * 0.04))
      el.setAttribute('r', String(base * scale))
      el.setAttribute('opacity', String(0.18 + 0.08 * Math.abs(Math.sin(tick * 0.04))))
    })
    animRef.current = requestAnimationFrame(renderPulse)
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderPulse)
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current) }
  }, [renderPulse])

  // Fraud summary
  const summary = useMemo(() => computeFraudSummary(nodes, edges), [nodes, edges])

  // Quick stats
  const totalTenders   = nodes.filter((n) => n.type === 'tender').length
  const totalCompanies = nodes.filter((n) => n.type === 'company').length
  const totalSuspect   = nodes.filter((n) => n.collusion).length

  // Strong edges with relation labels (family/conflict links only)
  const labeledEdges = useMemo(
    () => edges.filter((e) => e.weight === 'strong' && e.relation && (FAMILY_RELATIONS.has(e.relation) || e.relation === 'president_commission' || e.relation === 'ordonnateur')),
    [edges],
  )

  return (
    <div className={
      isFullscreen
        ? 'fixed inset-0 z-50 bg-background overflow-auto p-4 md:p-6 space-y-4'
        : 'space-y-4'
    }>
      <Card className="p-6 bg-card border-border">

        {/* ── Header ── */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest text-red-600 uppercase">INPPLC · Nazaha-Graph</span>
            </div>
            <h3 className="text-xl font-bold text-foreground leading-tight">
              Graphe d'Analyse — Marchés Publics
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('graphLabels.clickNodesInfo')}</p>

            {/* Stat chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <FileText className="w-3 h-3" />
                {totalTenders} marchés
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                <Building2 className="w-3 h-3" />
                {totalCompanies} entreprises
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Link2 className="w-3 h-3" />
                {edges.length} liens
              </span>
              {totalSuspect > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" />
                  {totalSuspect} entités suspectes
                </span>
              )}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 flex-shrink-0">
            <button onClick={handleZoomOut} disabled={zoom <= ZOOM_MIN}
              className="p-1.5 rounded hover:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Dézoomer" title="Dézoomer">
              <ZoomOut className="w-4 h-4 text-foreground" />
            </button>
            <span className="text-xs font-mono text-muted-foreground px-1 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={handleZoomIn} disabled={zoom >= ZOOM_MAX}
              className="p-1.5 rounded hover:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Zoomer" title="Zoomer">
              <ZoomIn className="w-4 h-4 text-foreground" />
            </button>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button onClick={handleReset}
              className="p-1.5 rounded hover:bg-background transition-colors"
              aria-label="Réinitialiser la vue" title="Réinitialiser la vue">
              <Maximize2 className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={() => setIsFullscreen((v) => !v)}
              className="p-1.5 rounded hover:bg-background transition-colors"
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}>
              {isFullscreen
                ? <Minimize2 className="w-4 h-4 text-foreground" />
                : <Expand className="w-4 h-4 text-foreground" />}
            </button>
          </div>
        </div>

        {/* ── SVG Graph ── */}
        <div className="bg-slate-50 rounded-xl border border-border overflow-hidden cursor-grab active:cursor-grabbing shadow-inner">
          <svg
            ref={svgRef}
            width="100%"
            height={isFullscreen ? '80vh' : SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full select-none"
            style={isFullscreen ? { height: '80vh' } : undefined}
            role="img"
            aria-label="Graphe d'analyse du réseau de corruption dans les marchés publics"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* ── Defs: gradients, shadows, arrowheads, grid ── */}
            <defs>
              {Object.entries(TYPE_COLORS).map(([type, c]) => (
                <radialGradient key={type} id={`grad-${type}`} cx="35%" cy="30%" r="75%">
                  <stop offset="0%"  stopColor={c.stroke} stopOpacity={0.55} />
                  <stop offset="55%" stopColor={c.fill} />
                  <stop offset="100%" stopColor={c.fill} />
                </radialGradient>
              ))}
              <radialGradient id="grad-collusion" cx="35%" cy="30%" r="75%">
                <stop offset="0%"  stopColor="#ef4444" />
                <stop offset="60%" stopColor={COLLUSION_FILL} />
                <stop offset="100%" stopColor="#7f1d1d" />
              </radialGradient>

              <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.35" />
              </filter>
              <filter id="redGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.85" />
              </filter>

              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" opacity="0.7" />
              </marker>
              <marker id="arrow-strong" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
              </marker>

              <pattern id="dotGrid" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.2" fill="#cbd5e1" opacity="0.45" />
              </pattern>
            </defs>

            {/* Background dot grid */}
            <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#dotGrid)" />

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
               style={{ transformOrigin: `${SVG_W / 2}px ${SVG_H / 2}px` }}>

              {/* ── Edges (curved, with arrowheads) ── */}
              <g className="edges">
                {edges.map((edge, idx) => {
                  const s   = posMap.get(edge.source)
                  const tgt = posMap.get(edge.target)
                  if (!s || !tgt) return null
                  const isStrong = edge.weight === 'strong'
                  const lit = edgeLit(edge)
                  const baseOp = isStrong ? 0.85 : edge.weight === 'medium' ? 0.55 : 0.55
                  // Quadratic curve: bend the line slightly off the straight axis
                  const mx = (s.x + tgt.x) / 2
                  const my = (s.y + tgt.y) / 2
                  const dx = tgt.x - s.x
                  const dy = tgt.y - s.y
                  const norm = Math.sqrt(dx * dx + dy * dy) || 1
                  const curve = Math.min(28, norm * 0.12)
                  const cx = mx - (dy / norm) * curve
                  const cy = my + (dx / norm) * curve
                  return (
                    <path
                      key={`e-${idx}`}
                      d={`M ${s.x} ${s.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`}
                      fill="none"
                      stroke={EDGE_STROKE[edge.weight] ?? '#cbd5e1'}
                      strokeWidth={isStrong ? 2.5 : edge.weight === 'medium' ? 1.5 : 1.8}
                      opacity={lit ? baseOp : 0.07}
                      strokeDasharray={edge.weight === 'weak' ? '4 3' : undefined}
                      markerEnd={isStrong ? 'url(#arrow-strong)' : edge.weight === 'medium' ? 'url(#arrow)' : undefined}
                      className="transition-opacity duration-200"
                    />
                  )
                })}
              </g>

              {/* ── Edge relation labels (strong / family links only) ── */}
              <g className="edge-labels">
                {labeledEdges.map((edge, idx) => {
                  const s   = posMap.get(edge.source)
                  const tgt = posMap.get(edge.target)
                  if (!s || !tgt) return null
                  if (!edgeLit(edge)) return null
                  const mx  = (s.x + tgt.x) / 2
                  const my  = (s.y + tgt.y) / 2
                  const txt = edge.relation ? (RELATION_LABELS[edge.relation] ?? edge.relation) : ''
                  const w   = txt.length * 5 + 10
                  return (
                    <g key={`el-${idx}`} style={{ pointerEvents: 'none' }}>
                      <rect x={mx - w / 2} y={my - 8} width={w} height={14} rx={4}
                        fill="white" stroke="#fca5a5" strokeWidth={0.8} opacity={0.95} />
                      <text x={mx} y={my} fontSize="7" fontWeight="700"
                        textAnchor="middle" dominantBaseline="middle" fill="#991b1b">
                        {txt}
                      </text>
                    </g>
                  )
                })}
              </g>

              {/* ── Nodes ── */}
              <g className="nodes">
                {nodes.map((node) => {
                  const pos    = posMap.get(node.id)
                  if (!pos) return null

                  const colors  = TYPE_COLORS[node.type] ?? TYPE_COLORS.company
                  const isSelect = selectedNode?.id === node.id
                  const r       = NODE_RADIUS[node.type] ?? 19
                  const gradId  = node.collusion ? 'grad-collusion' : `grad-${node.type in TYPE_COLORS ? node.type : 'company'}`
                  const stroke  = isSelect ? SELECTED_STROKE : node.collusion ? COLLUSION_STROKE : colors.stroke
                  const label   = node.labelKey ? t(node.labelKey) : (node.label ?? node.id)
                  const display = label.length > 17 ? label.slice(0, 16) + '…' : label
                  const lit     = isLit(node.id)

                  return (
                    <g
                      key={node.id}
                      onClick={() => onNodeSelect(node)}
                      onKeyDown={(e) => e.key === 'Enter' && onNodeSelect(node)}
                      onMouseEnter={() => setHoverId(node.id)}
                      onMouseLeave={() => setHoverId(null)}
                      className="cursor-pointer transition-opacity duration-200"
                      opacity={lit ? 1 : 0.22}
                      role="button"
                      tabIndex={0}
                      aria-label={label}
                      aria-pressed={isSelect}
                    >
                      {/* Tender outer dashed ring — "le prix à remporter" */}
                      {node.type === 'tender' && (
                        <circle
                          cx={pos.x} cy={pos.y} r={r + 6}
                          fill="none" stroke="#fcd34d" strokeWidth={1.5}
                          strokeDasharray="5 3" opacity={0.7}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}

                      {/* Suspect pulsing halo */}
                      {node.collusion && (
                        <circle
                          data-pulse="1"
                          data-base-r={r + 5}
                          cx={pos.x} cy={pos.y}
                          r={r + 5}
                          fill="#ef4444"
                          opacity="0.18"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}

                      {/* Selection ring */}
                      {isSelect && (
                        <circle
                          cx={pos.x} cy={pos.y} r={r + 8}
                          fill="none" stroke={SELECTED_STROKE} strokeWidth={2.5} opacity={0.75}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}

                      {/* Main circle */}
                      <circle
                        cx={pos.x} cy={pos.y} r={r}
                        fill={`url(#${gradId})`} stroke={stroke}
                        strokeWidth={isSelect ? 3 : node.collusion ? 2 : 1.25}
                        filter={node.collusion ? 'url(#redGlow)' : 'url(#nodeShadow)'}
                        className="transition-all duration-150"
                      />

                      {/* Node type initial inside circle */}
                      <text
                        x={pos.x} y={pos.y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={node.type === 'tender' ? '11' : '9'}
                        fontWeight="800"
                        fill={node.collusion ? '#fecaca' : colors.text}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {node.type === 'tender' ? 'M' : node.type === 'agency' ? 'A' : node.type === 'person' ? 'P' : 'E'}
                      </text>

                      {/* Label below node */}
                      <text
                        x={pos.x} y={pos.y + r + 10}
                        textAnchor="middle" dominantBaseline="hanging"
                        fontSize="10" fontWeight="600"
                        fill={node.collusion ? '#991b1b' : '#1e293b'}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {display}
                      </text>

                      {/* Warning icon above suspect nodes */}
                      {node.collusion && (
                        <text
                          x={pos.x} y={pos.y - r - 6}
                          fontSize="10" textAnchor="middle" dominantBaseline="auto"
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

        {/* ── Legend ── */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Types de nœuds</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {[
                { type: 'tender',  label: 'Marché (M) — le prix',     extra: 'ring ring-amber-300' },
                { type: 'company', label: 'Entreprise (E)',            extra: '' },
                { type: 'person',  label: 'Personne (P)',              extra: '' },
                { type: 'agency',  label: 'Autorité contractante (A)', extra: '' },
              ].map(({ type, label, extra }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${extra}`}
                    style={{ backgroundColor: TYPE_COLORS[type]?.fill }} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 bg-red-800 ring-1 ring-red-300" />
                <span className="text-xs text-red-600 font-medium">Entité suspecte ⚠</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Types de liens</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {[
                { label: 'Lien familial / conflit', color: '#dc2626', dash: false },
                { label: 'Lien professionnel',      color: '#64748b', dash: false },
                { label: 'Participation AO',         color: '#64748b', dash: true  },
              ].map(({ label, color, dash }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <svg width="20" height="8" aria-hidden>
                    <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2"
                      strokeDasharray={dash ? '4 3' : undefined} />
                  </svg>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground/50">
          Molette pour zoomer · Glisser pour déplacer · Cliquer sur un nœud pour les détails
        </p>
      </Card>

      {/* ── Fraud summary panel ── */}
      {(summary.fraudTypes.length > 0 || summary.suspectPersons.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Card 1 — Fraud types */}
          <Card className="p-4 border-red-200 bg-red-50/50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <h4 className="text-sm font-bold text-red-800">Fraudes détectées</h4>
            </div>
            {summary.fraudTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune fraude identifiée</p>
            ) : (
              <ul className="space-y-1.5">
                {summary.fraudTypes.map((ft) => (
                  <li key={ft} className="flex items-start gap-1.5">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-800">{ft}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Card 2 — Entities compromised */}
          <Card className="p-4 border-orange-200 bg-orange-50/50">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <h4 className="text-sm font-bold text-orange-800">Entités compromises</h4>
            </div>
            <div className="space-y-2">
              {[
                { icon: <FileText className="w-3 h-3" />, count: summary.suspectTenders.length,   label: 'marché(s) suspect(s)',   color: 'text-amber-700'  },
                { icon: <Building2 className="w-3 h-3" />, count: summary.suspectCompanies.length, label: 'entreprise(s) impliquée(s)', color: 'text-blue-700' },
                { icon: <Users className="w-3 h-3" />,    count: summary.suspectPersons.length,   label: 'personne(s) impliquée(s)',   color: 'text-red-700'  },
              ].map(({ icon, count, label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`${color} flex-shrink-0`}>{icon}</span>
                  <span className="text-sm font-bold text-foreground">{count}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 3 — Key suspicious links */}
          <Card className="p-4 border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <h4 className="text-sm font-bold text-slate-800">Liens familiaux clés</h4>
            </div>
            {summary.familyLinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun lien familial détecté</p>
            ) : (
              <ul className="space-y-2">
                {summary.familyLinks.slice(0, 4).map((e, i) => {
                  const srcLabel = labelMap.get(e.source) ?? e.source
                  const tgtLabel = labelMap.get(e.target) ?? e.target
                  const rel      = e.relation ? (RELATION_LABELS[e.relation] ?? e.relation) : '—'
                  return (
                    <li key={i} className="text-xs leading-relaxed">
                      <span className="font-semibold text-foreground">{srcLabel}</span>
                      <span className="mx-1 text-red-600 font-bold">→ {rel} →</span>
                      <span className="font-semibold text-foreground">{tgtLabel}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

        </div>
      )}
    </div>
  )
}

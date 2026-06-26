'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { NetworkGraph, type GraphNode, type GraphEdge } from '@/components/network-graph'
import { NodeDetails } from '@/components/node-details'
import { fetchAnalyze, mapAnalyzeToGraphData } from '@/lib/api'
import { mockGraphData, mockDashboardData } from '@/lib/mock-data'
import { useLanguage } from '@/lib/language-context'
import {
  X, ArrowLeft, AlertCircle, Network,
  Search, SlidersHorizontal, AlertTriangle,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FullGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ─── Filtres ─────────────────────────────────────────────────────────────────

type DateRange = 'all' | '30d' | '90d' | '1y'

interface Filters {
  search: string
  dateRange: DateRange
  collusionOnly: boolean
}

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'Toutes les périodes' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
  { value: '1y',  label: 'Dernière année' },
]

// ─── Logique de filtrage ──────────────────────────────────────────────────────

function filterByContract(data: FullGraphData, contractId: string): FullGraphData {
  const seedIds = new Set<string>()
  for (const node of data.nodes) {
    if (
      node.id.toLowerCase().includes(contractId.toLowerCase()) ||
      (node.label ?? '').toLowerCase().includes(contractId.toLowerCase())
    ) {
      seedIds.add(node.id)
    }
  }
  if (seedIds.size === 0) {
    data.nodes.filter((n) => n.collusion).forEach((n) => seedIds.add(n.id))
  }
  return expandOneHop(data, seedIds)
}

function filterByAlert(
  data: FullGraphData,
  alertId: number,
  severity: 'high' | 'medium' | 'low',
): FullGraphData {
  const seedIds = new Set<string>()
  if (severity === 'high') {
    data.nodes.filter((n) => n.collusion).forEach((n) => seedIds.add(n.id))
  } else if (severity === 'medium') {
    data.nodes
      .filter((n) => n.type === 'person' || n.type === 'agency')
      .forEach((n) => seedIds.add(n.id))
  } else {
    return data
  }
  if (seedIds.size === 0) return data
  return expandOneHop(data, seedIds)
}

function expandOneHop(data: FullGraphData, seedIds: Set<string>): FullGraphData {
  const neighborIds = new Set<string>(seedIds)
  for (const edge of data.edges) {
    if (seedIds.has(edge.source)) neighborIds.add(edge.target)
    if (seedIds.has(edge.target)) neighborIds.add(edge.source)
  }
  return {
    nodes: data.nodes.filter((n) => neighborIds.has(n.id)),
    edges: data.edges.filter((e) => neighborIds.has(e.source) && neighborIds.has(e.target)),
  }
}

/**
 * Calcule les "Top N réseaux les plus risqués" :
 * clusters de nœuds suspects interconnectés, triés par taille décroissante.
 */
function topRiskyNetworks(data: FullGraphData, top = 5): FullGraphData {
  const suspectIds = new Set(data.nodes.filter((n) => n.collusion).map((n) => n.id))
  if (suspectIds.size === 0) return { nodes: [], edges: [] }

  // Union-Find pour grouper les suspects connectés
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id)
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!))
    return parent.get(id)!
  }
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b))
  }

  for (const edge of data.edges) {
    if (suspectIds.has(edge.source) && suspectIds.has(edge.target)) {
      union(edge.source, edge.target)
    }
  }

  // Grouper par racine
  const clusters = new Map<string, Set<string>>()
  for (const id of suspectIds) {
    const root = find(id)
    if (!clusters.has(root)) clusters.set(root, new Set())
    clusters.get(root)!.add(id)
  }

  // Prendre les Top N clusters par taille
  const sorted = [...clusters.values()].sort((a, b) => b.size - a.size).slice(0, top)
  const topIds = new Set<string>()
  sorted.forEach((cluster) => cluster.forEach((id) => topIds.add(id)))

  return expandOneHop(data, topIds)
}

/**
 * Applique les filtres de la sidebar (recherche + collusion only).
 * Le filtre de date est simulé (pas de date sur les nœuds mock).
 */
function applyFilters(data: FullGraphData, filters: Filters): FullGraphData {
  let nodes = data.nodes

  if (filters.collusionOnly) {
    nodes = nodes.filter((n) => n.collusion)
  }

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    nodes = nodes.filter(
      (n) =>
        n.id.toLowerCase().includes(q) ||
        (n.label ?? '').toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q),
    )
  }

  const nodeSet = new Set(nodes.map((n) => n.id))
  const edges = data.edges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target))
  return { nodes, edges }
}

// ─── Sidebar de contrôle ─────────────────────────────────────────────────────

interface FilterSidebarProps {
  filters: Filters
  onChange: (f: Filters) => void
  onGenerate: () => void
  onReset: () => void
  isGenerated: boolean
  nodeCount: number
  edgeCount: number
  loading: boolean
}

function FilterSidebar({
  filters, onChange, onGenerate, onReset,
  isGenerated, nodeCount, edgeCount, loading,
}: FilterSidebarProps) {
  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-foreground font-semibold">
        <SlidersHorizontal className="w-4 h-4" />
        Filtres d'exploration
      </div>

      {/* Recherche */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Rechercher une entité
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Personne, Société, ID…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filtre de date */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Période
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, dateRange: opt.value })}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors text-left ${
                filters.dateRange === opt.value
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-background border-border text-muted-foreground hover:border-amber-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle collusion uniquement */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">
              Collusions détectées
            </p>
            <p className="text-xs text-muted-foreground">Afficher uniquement</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={filters.collusionOnly}
          onClick={() => onChange({ ...filters, collusionOnly: !filters.collusionOnly })}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
            filters.collusionOnly ? 'bg-red-600' : 'bg-secondary'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              filters.collusionOnly ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Bouton Générer */}
      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Chargement…' : 'Générer la cartographie'}
      </button>

      {isGenerated && (
        <button
          onClick={onReset}
          className="w-full py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
        >
          Réinitialiser
        </button>
      )}

      {/* Compteurs */}
      {isGenerated && (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1">
          <p className="text-xs text-muted-foreground">Résultats</p>
          <p className="text-sm font-semibold text-foreground">
            {nodeCount} nœuds · {edgeCount} liens
          </p>
        </div>
      )}
    </aside>
  )
}

// ─── Contenu principal ────────────────────────────────────────────────────────

function GraphPageInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { t }        = useLanguage()

  const contractId = searchParams.get('contractId')
  const alertIdRaw = searchParams.get('alertId')
  const alertId    = alertIdRaw ? parseInt(alertIdRaw, 10) : null

  const alertMeta = alertId !== null
    ? mockDashboardData.alerts.find((a) => a.id === alertId) ?? null
    : null

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [fullData, setFullData]         = useState<FullGraphData>({ nodes: [], edges: [] })
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  // Sidebar state
  const [filters, setFilters]       = useState<Filters>({ search: '', dateRange: 'all', collusionOnly: false })
  const [isGenerated, setGenerated] = useState(false)

  // Chargement des données complètes
  useEffect(() => {
    let cancelled = false
    async function loadGraph() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchAnalyze()
        if (!cancelled) setFullData(mapAnalyzeToGraphData(data))
      } catch {
        if (!cancelled) {
          setError("Données locales utilisées (API indisponible).")
          setFullData({
            nodes: mockGraphData.nodes.map((n) => ({
              id: n.id,
              label: n.labelKey ? t(n.labelKey) : n.id,
              type: n.type,
              collusion: n.collusion,
            })),
            edges: mockGraphData.edges,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadGraph()
    return () => { cancelled = true }
  }, [t])

  useEffect(() => { setSelectedNode(null) }, [contractId, alertId])

  // Données affichées
  const displayData = useMemo<FullGraphData>(() => {
    if (fullData.nodes.length === 0) return fullData

    // Contexte de navigation (depuis contrat ou alerte)
    if (contractId) return filterByContract(fullData, contractId)
    if (alertId !== null && alertMeta) {
      return filterByAlert(fullData, alertId, alertMeta.severity as 'high' | 'medium' | 'low')
    }

    // Mode exploration libre via sidebar
    if (isGenerated) {
      const hasActiveFilter =
        filters.search.trim() || filters.collusionOnly || filters.dateRange !== 'all'

      if (hasActiveFilter) {
        return applyFilters(fullData, filters)
      }
      // Aucun filtre actif → Top 5 réseaux risqués par défaut
      return topRiskyNetworks(fullData, 5)
    }

    return { nodes: [], edges: [] }
  }, [fullData, contractId, alertId, alertMeta, isGenerated, filters])

  const isExternalFilter = !!(contractId || alertId !== null)
  const backTo    = contractId ? '/contracts' : alertId !== null ? '/' : null
  const backLabel = contractId ? 'Retour aux contrats' : 'Retour au tableau de bord'

  const handleGenerate = () => setGenerated(true)
  const handleReset    = () => {
    setGenerated(false)
    setFilters({ search: '', dateRange: 'all', collusionOnly: false })
    setSelectedNode(null)
  }

  return (
    <AppLayout>
      {/* ── En-tête ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('pages.graph.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('pages.graph.subtitle')}</p>
          </div>
          {backTo && (
            <button
              onClick={() => router.push(backTo)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </button>
          )}
        </div>

        {/* Bandeau filtre Contrat */}
        {contractId && !loading && (
          <div className="mt-4 flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <Network className="w-4 h-4 text-amber-600 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                Réseau filtré — Contrat{' '}
                <span className="font-mono bg-amber-100 px-1 rounded">{contractId}</span>
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {displayData.nodes.length} nœuds · {displayData.edges.length} liens
                {' '}(total : {fullData.nodes.length} · {fullData.edges.length})
              </p>
            </div>
            <button
              onClick={() => router.push('/graph')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              Graphe complet
            </button>
          </div>
        )}

        {/* Bandeau filtre Alerte */}
        {alertId !== null && !loading && (
          <div
            className={`mt-4 flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
              alertMeta?.severity === 'high'
                ? 'bg-red-50 border-red-200'
                : alertMeta?.severity === 'medium'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
            }`}
          >
            <AlertCircle
              className={`w-4 h-4 shrink-0 ${
                alertMeta?.severity === 'high'
                  ? 'text-red-500'
                  : alertMeta?.severity === 'medium'
                    ? 'text-yellow-500'
                    : 'text-blue-500'
              }`}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${alertMeta?.severity === 'high' ? 'text-red-800' : 'text-yellow-800'}`}>
                Alerte #{alertId}
                {alertMeta && (
                  <span className="font-normal ml-2 truncate">
                    — {alertMeta.titleKey ? t(alertMeta.titleKey) : ''}
                  </span>
                )}
              </p>
              <p className={`text-xs mt-0.5 ${alertMeta?.severity === 'high' ? 'text-red-700' : 'text-yellow-700'}`}>
                {displayData.nodes.length} nœuds · {displayData.edges.length} liens
                {' '}(total : {fullData.nodes.length} · {fullData.edges.length})
              </p>
            </div>
            <button
              onClick={() => router.push('/graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                alertMeta?.severity === 'high'
                  ? 'text-red-800 hover:bg-red-100'
                  : 'text-yellow-800 hover:bg-yellow-100'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Graphe complet
            </button>
          </div>
        )}

        {loading && (
          <p className="text-sm text-muted-foreground mt-2">Chargement de l'analyse…</p>
        )}
        {error && !loading && (
          <p className="text-sm text-yellow-700 mt-2">{error}</p>
        )}
      </div>

      {/* ── Layout principal : sidebar + graphe ──────────────────── */}
      {!loading && (
        <div className={`flex gap-6 items-start ${isExternalFilter ? '' : ''}`}>

          {/* Sidebar de filtres (masquée en mode navigation externe) */}
          {!isExternalFilter && (
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              onGenerate={handleGenerate}
              onReset={handleReset}
              isGenerated={isGenerated}
              nodeCount={displayData.nodes.length}
              edgeCount={displayData.edges.length}
              loading={loading}
            />
          )}

          {/* Zone graphe */}
          <div className="flex-1 min-w-0">
            {isExternalFilter || isGenerated ? (
              <NetworkGraph
                nodes={displayData.nodes}
                edges={displayData.edges}
                selectedNode={selectedNode}
                onNodeSelect={setSelectedNode}
              />
            ) : (
              /* État vide : invitation à utiliser les filtres */
              <div className="flex flex-col items-center justify-center h-[520px] rounded-xl border-2 border-dashed border-border bg-secondary/20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <Network className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Cartographie non générée
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Utilisez les filtres à gauche pour définir votre périmètre d'analyse,
                  puis cliquez sur{' '}
                  <span className="font-medium text-amber-600">Générer la cartographie</span>.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Sans filtre, le Top 5 des réseaux les plus risqués sera affiché.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <NodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} />
    </AppLayout>
  )
}

export default function GraphPage() {
  return (
    <Suspense fallback={null}>
      <GraphPageInner />
    </Suspense>
  )
}

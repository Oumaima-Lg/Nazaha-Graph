'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  ChevronDown, Heart, RefreshCw, DoorOpen, Scissors,
  ShieldAlert, ShieldCheck,
} from 'lucide-react'
import type { GraphNode, GraphEdge } from '@/components/network-graph'

// ─── Relation taxonomy (matches backend schema) ───────────────────────────────

const FAMILY = new Set([
  'conjoint', 'frere_soeur', 'pere_mere', 'fils_fille',
  'beau_frere_belle_soeur', 'oncle_tante', 'cousin',
])
const PUBLIC = new Set([
  'ordonnateur', 'president_commission', 'membre_commission',
  'responsable_marche', 'directeur',
])
const PRO = new Set([
  'gerant', 'directeur_general', 'associe', 'actionnaire_majoritaire',
  'actionnaire_minoritaire', 'administrateur', 'consultant',
])

const REL_FR: Record<string, string> = {
  conjoint: 'conjoint(e)', frere_soeur: 'frère/sœur', pere_mere: 'parent',
  fils_fille: 'enfant', beau_frere_belle_soeur: 'beau-frère/sœur',
  oncle_tante: 'oncle/tante', cousin: 'cousin(e)',
  ordonnateur: 'ordonnateur', president_commission: 'présidente commission',
  membre_commission: 'membre commission', directeur: 'directeur',
  gerant: 'gérant', actionnaire_majoritaire: 'actionnaire', consultant: 'consultant',
}
const relLabel = (r?: string | null) => (r ? REL_FR[r] ?? r : '—')

// ─── Detection ─────────────────────────────────────────────────────────────────

interface FraudCase { entities: string[]; detail: string }
interface FraudBlock {
  key: string
  title: string
  what: string
  icon: React.ReactNode
  cases: FraudCase[]
}

function detectFrauds(nodes: GraphNode[], edges: GraphEdge[]): FraudBlock[] {
  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id
  const typeOf  = (id: string) => nodes.find((n) => n.id === id)?.type
  const suspect = new Set(nodes.filter((n) => n.collusion).map((n) => n.id))

  // Per-person helpers
  const agencyOf  = (p: string) => edges.find((e) => e.source === p && e.relation && PUBLIC.has(e.relation))
  const companyOf = (p: string) => edges.find((e) => e.source === p && e.relation && PRO.has(e.relation))

  const blocks: FraudBlock[] = []

  // ── A/B — Conflit d'intérêt familial ──────────────────────────────────────
  const seen = new Set<string>()
  const familyCases: FraudCase[] = []
  for (const e of edges) {
    if (!e.relation || !FAMILY.has(e.relation)) continue
    const key = [e.source, e.target].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)

    const aPub = agencyOf(e.source), aBiz = companyOf(e.source)
    const bPub = agencyOf(e.target), bBiz = companyOf(e.target)
    let official: string | null = null, businessman: string | null = null
    let agencyEdge = aPub, bizEdge = bBiz
    if (aPub && bBiz) { official = e.source; businessman = e.target; agencyEdge = aPub; bizEdge = bBiz }
    else if (bPub && aBiz) { official = e.target; businessman = e.source; agencyEdge = bPub; bizEdge = aBiz }
    if (!official || !businessman) continue

    familyCases.push({
      entities: [labelOf(official), labelOf(businessman), labelOf(bizEdge!.target)],
      detail: `${labelOf(official)} (${relLabel(agencyEdge!.relation)}) est lié·e par « ${relLabel(e.relation)} » à ${labelOf(businessman)}, ${relLabel(bizEdge!.relation)} de ${labelOf(bizEdge!.target)} — entreprise attributaire.`,
    })
  }
  if (familyCases.length) {
    blocks.push({
      key: 'family',
      title: "Conflit d'intérêt familial",
      what: "Un décideur public attribue (ou influence) un marché à une entreprise dirigée par un proche.",
      icon: <Heart className="w-4 h-4" />,
      cases: familyCases,
    })
  }

  // ── C — Collusion / rotation d'offres ──────────────────────────────────────
  const tenderBidders = new Map<string, string[]>()
  for (const e of edges) {
    if (e.weight === 'weak' && typeOf(e.target) === 'tender') {
      const arr = tenderBidders.get(e.target) ?? []
      arr.push(e.source)
      tenderBidders.set(e.target, arr)
    }
  }
  const pairCount = new Map<string, number>()
  for (const comps of tenderBidders.values()) {
    if (comps.length < 3) continue
    const sorted = [...new Set(comps)].sort()
    for (let i = 0; i < sorted.length; i++)
      for (let j = i + 1; j < sorted.length; j++)
        pairCount.set(`${sorted[i]}|${sorted[j]}`, (pairCount.get(`${sorted[i]}|${sorted[j]}`) ?? 0) + 1)
  }
  const cartel = new Set<string>()
  for (const [key, c] of pairCount) if (c >= 2) key.split('|').forEach((x) => cartel.add(x))
  if (cartel.size >= 2) {
    blocks.push({
      key: 'collusion',
      title: "Collusion / rotation d'offres",
      what: "Des entreprises « concurrentes » soumissionnent toujours ensemble et se partagent les marchés à tour de rôle.",
      icon: <RefreshCw className="w-4 h-4" />,
      cases: [{
        entities: [...cartel].map(labelOf),
        detail: `${cartel.size} entreprises co-soumissionnent de façon répétée sur les mêmes marchés (offres de couverture). Les perdants attendent leur tour de gagner.`,
      }],
    })
  }

  // ── D — Pantouflage ────────────────────────────────────────────────────────
  const pantoufle: FraudCase[] = []
  for (const n of nodes) {
    if (n.type !== 'person' || !n.collusion) continue
    const pub = agencyOf(n.id), biz = companyOf(n.id)
    if (pub && biz) {
      pantoufle.push({
        entities: [n.label ?? n.id, labelOf(biz.target)],
        detail: `${n.label ?? n.id} a exercé une fonction publique (${relLabel(pub.relation)}) puis a rejoint ${labelOf(biz.target)} (${relLabel(biz.relation)}) — entreprise liée à un marché de son ancienne administration.`,
      })
    }
  }
  if (pantoufle.length) {
    blocks.push({
      key: 'pantouflage',
      title: 'Pantouflage (porte tournante)',
      what: "Un·e ex-fonctionnaire rejoint une entreprise privée qui obtient un marché de son ancienne administration.",
      icon: <DoorOpen className="w-4 h-4" />,
      cases: pantoufle,
    })
  }

  // ── E — Fractionnement ───────────────────────────────────────────────────────
  const wonByCompany = new Map<string, Set<string>>()
  for (const e of edges) {
    if (e.relation === 'won_by' || (e.weight === 'medium' && typeOf(e.source) === 'tender' && typeOf(e.target) === 'company')) {
      if (!suspect.has(e.source)) continue
      const set = wonByCompany.get(e.target) ?? new Set()
      set.add(e.source)
      wonByCompany.set(e.target, set)
    }
  }
  const fract: FraudCase[] = []
  for (const [company, tenders] of wonByCompany) {
    if (tenders.size >= 3) {
      fract.push({
        entities: [labelOf(company)],
        detail: `${labelOf(company)} remporte ${tenders.size} marchés successifs, chacun juste sous le seuil de l'appel d'offres ouvert (1M MAD) — découpage destiné à éviter la concurrence.`,
      })
    }
  }
  if (fract.length) {
    blocks.push({
      key: 'fractionnement',
      title: 'Fractionnement de marché',
      what: "Un gros marché découpé en petits lots sous le seuil légal pour éviter l'appel d'offres ouvert.",
      icon: <Scissors className="w-4 h-4" />,
      cases: fract,
    })
  }

  return blocks
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function FraudExplainer({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const blocks = useMemo(() => detectFrauds(nodes, edges), [nodes, edges])
  const [open, setOpen] = useState<string | null>(blocks[0]?.key ?? null)

  if (blocks.length === 0) {
    return (
      <Card className="p-5 border-emerald-200 bg-emerald-50/40">
        <div className="flex items-center gap-2 text-emerald-700">
          <ShieldCheck className="w-5 h-5" />
          <p className="text-sm font-semibold">Aucune fraude structurelle détectée dans ce périmètre.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5 border-red-200">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="w-5 h-5 text-red-600" />
        <h3 className="text-base font-bold text-foreground">Fraudes détectées — explication</h3>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          {blocks.length} type{blocks.length > 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Chaque fraude est prouvée par la topologie du graphe — liens et nœuds détectés ci-dessous.
      </p>

      <div className="space-y-2">
        {blocks.map((b) => {
          const isOpen = open === b.key
          return (
            <div key={b.key} className="rounded-lg border border-red-100 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : b.key)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50/60 hover:bg-red-50 transition-colors text-left"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 shrink-0">
                  {b.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-red-800">{b.title}</span>
                  <span className="block text-xs text-red-600/80">
                    {b.cases.length} cas détecté{b.cases.length > 1 ? 's' : ''}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-red-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-3.5 py-3 space-y-3 bg-white">
                  <p className="text-xs text-muted-foreground italic">{b.what}</p>
                  {b.cases.map((c, i) => (
                    <div key={i} className="border-l-2 border-red-300 pl-3 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {c.entities.map((ent, j) => (
                          <span key={j} className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {ent}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{c.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

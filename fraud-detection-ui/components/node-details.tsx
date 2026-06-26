'use client'

import { Card } from '@/components/ui/card'
import { X, AlertTriangle, Link2, ShieldAlert } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface InpplcData {
  risk_level?: string
  legal_status?: string
  sanctions?: Array<{ type: string; year: number; amount_mad?: number }>
  investigations?: Array<{ case_id: string; status: string; outcome?: string | null }>
}

interface Node {
  id: string
  label?: string
  labelKey?: string
  type: string
  collusion: boolean
  inpplc?: InpplcData | null
}

interface NodeDetailsProps {
  node: Node | null
  onClose: () => void
}

export function NodeDetails({ node, onClose }: NodeDetailsProps) {
  const { t } = useLanguage()

  if (!node) return null

  const typeLabels: Record<string, string> = {
    company: t('graph.nodeTypes.company'),
    person: t('graph.nodeTypes.person'),
    tender: t('graph.nodeTypes.tender'),
    supplier: t('graph.nodeTypes.supplier'),
    agency: t('graph.nodeTypes.agency'),
  }

  const riskColors: Record<string, string> = {
    high: 'text-red-700 bg-red-50 border-red-200',
    medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    low: 'text-green-700 bg-green-50 border-green-200',
  }

  const inpplc = node.inpplc

  return (
    <div className="fixed right-8 bottom-8 w-80 animate-in slide-in-from-right z-50">
      <Card className="bg-card border-border shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-start justify-between">
          <h3 className="font-semibold text-foreground">{t('graph.panel.title')}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Identifiant */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">ID</p>
            <p className="font-mono text-sm text-foreground">{node.id}</p>
          </div>

          {/* Nom */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('graph.panel.title')}</p>
            <p className="text-sm font-medium text-foreground">{node.label ?? node.id}</p>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('graph.panel.type')}</p>
            <span className="inline-block px-2 py-1 bg-secondary text-foreground rounded text-xs font-medium">
              {typeLabels[node.type] ?? node.type}
            </span>
          </div>

          {/* Risque de collusion */}
          {node.collusion && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-700">{t('graph.panel.collusionRisk')}</p>
                <p className="text-xs text-red-600 mt-1">
                  {t('graphLabels.detectedCollusion')}
                </p>
              </div>
            </div>
          )}

          {/* Données INPPLC */}
          {inpplc && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">INPPLC</p>
              </div>

              {inpplc.risk_level && (
                <div className={`px-3 py-2 rounded border text-xs font-medium ${riskColors[inpplc.risk_level] ?? 'text-foreground bg-secondary border-border'}`}>
                  Niveau de risque : {inpplc.risk_level === 'high' ? 'Élevé' : inpplc.risk_level === 'medium' ? 'Moyen' : 'Bas'}
                </div>
              )}

              {inpplc.sanctions && inpplc.sanctions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sanctions ({inpplc.sanctions.length})</p>
                  {inpplc.sanctions.map((s, i) => (
                    <p key={i} className="text-xs text-foreground">
                      {s.year} — {s.type}{s.amount_mad ? ` (${s.amount_mad.toLocaleString('fr-MA')} MAD)` : ''}
                    </p>
                  ))}
                </div>
              )}

              {inpplc.investigations && inpplc.investigations.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Enquêtes ({inpplc.investigations.length})</p>
                  {inpplc.investigations.map((inv, i) => (
                    <p key={i} className="text-xs text-foreground">
                      {inv.case_id} — {inv.status === 'ongoing' ? 'En cours' : 'Clôturée'}
                      {inv.outcome ? ` (${inv.outcome})` : ''}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Connexions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">{t('graph.panel.connections')}</p>
            </div>
            <p className="text-sm text-muted-foreground">{t('graph.panel.details')}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

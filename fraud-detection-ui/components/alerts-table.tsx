'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, Eye, Search } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface Alert {
  id: number
  title?: string
  titleKey?: string
  description?: string
  descriptionKey?: string
  severity: 'high' | 'medium' | 'low'
  date: string
  status: 'investigating' | 'pending' | 'resolved'
}

interface AlertsTableProps {
  alerts: Alert[]
}

const SEVERITY_COLORS = {
  high:   'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low:    'bg-green-50 text-green-700 border-green-200',
}

const STATUS_ICONS = {
  investigating: <AlertCircle className="w-4 h-4 text-red-500"  aria-hidden />,
  pending:       <Clock       className="w-4 h-4 text-yellow-500" aria-hidden />,
  resolved:      <Eye         className="w-4 h-4 text-green-500"  aria-hidden />,
}

export function AlertsTable({ alerts }: AlertsTableProps) {
  const { t }  = useLanguage()
  const router = useRouter()

  const handleInvestigate = (alertId: number) => {
    router.push(`/graph?alertId=${alertId}`)
  }

  return (
    <Card className="p-6 bg-card border-border mt-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{t('alerts.title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('alerts.subtitle')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                {t('alerts.table.title')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                {t('alerts.table.severity')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                {t('alerts.table.date')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                {t('alerts.table.status')}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                {t('alerts.table.action')}
              </th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr
                key={alert.id}
                className="border-b border-border hover:bg-secondary transition-colors"
              >
                {/* Titre + description */}
                <td className="py-3 px-4">
                  <p className="font-medium text-foreground text-sm">
                    {alert.titleKey ? t(alert.titleKey) : alert.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.descriptionKey ? t(alert.descriptionKey) : alert.description}
                  </p>
                </td>

                {/* Sévérité */}
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${SEVERITY_COLORS[alert.severity]}`}
                  >
                    {t(`alerts.severity.${alert.severity}`)}
                  </span>
                </td>

                {/* Date */}
                <td className="py-3 px-4 text-sm text-foreground tabular-nums">
                  {alert.date}
                </td>

                {/* Statut */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {STATUS_ICONS[alert.status]}
                    <span>{t(`alerts.status.${alert.status}`)}</span>
                  </div>
                </td>

                {/* Action */}
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInvestigate(alert.id)}
                    disabled={alert.status === 'resolved'}
                    aria-label={`Investiguer l'alerte ${alert.id}`}
                    className={
                      alert.status === 'resolved'
                        ? 'text-muted-foreground cursor-not-allowed opacity-40'
                        : alert.severity === 'high'
                          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                          : 'text-sidebar hover:bg-blue-50 hover:text-sidebar'
                    }
                  >
                    <Search className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                    {t('common.investigate')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

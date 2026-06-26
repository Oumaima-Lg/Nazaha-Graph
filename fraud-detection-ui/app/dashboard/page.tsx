'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { KPICard } from '@/components/dashboard-kpi'
import { DashboardChart } from '@/components/dashboard-chart'
import { AlertsTable } from '@/components/alerts-table'
import { fetchStats, type StatsResponse } from '@/lib/api'
import { mockDashboardData } from '@/lib/mock-data'
import { useLanguage } from '@/lib/language-context'

export default function Dashboard() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    {
      id: 1,
      labelKey: 'kpis.fraudCasesDetected',
      value: stats ? String(stats.stats.suspect_nodes ?? mockDashboardData.kpis[0].value) : mockDashboardData.kpis[0].value,
      change: '+5.2%',
      icon: 'AlertTriangle',
    },
    {
      id: 2,
      labelKey: 'kpis.underInvestigation',
      value: stats ? String(stats.suspect_contracts ?? mockDashboardData.kpis[1].value) : mockDashboardData.kpis[1].value,
      change: '+12%',
      icon: 'Clock',
    },
    {
      id: 3,
      labelKey: 'kpis.contractsAnalyzed',
      value: stats
        ? String(stats.stats.contracts_analyzed ?? mockDashboardData.kpis[2].value)
        : mockDashboardData.kpis[2].value,
      change: '+18.3%',
      icon: 'FileText',
    },
  ]

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('pages.dashboard.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('pages.dashboard.subtitle')}</p>
        {loading && (
          <p className="text-xs text-muted-foreground mt-1">Chargement des données temps-réel…</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            labelKey={kpi.labelKey}
            value={kpi.value}
            change={kpi.change}
            icon={kpi.icon}
          />
        ))}
      </div>

      <DashboardChart data={mockDashboardData.chartData} />
      <AlertsTable alerts={mockDashboardData.alerts} />
    </AppLayout>
  )
}

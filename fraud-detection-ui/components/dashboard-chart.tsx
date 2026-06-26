'use client'

import { Card } from '@/components/ui/card'
import { useLanguage } from '@/lib/language-context'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface ChartDataPoint {
  month: string
  cases: number
  resolved: number
  pending: number
}

interface DashboardChartProps {
  data: ChartDataPoint[]
}

export function DashboardChart({ data }: DashboardChartProps) {
  const { t } = useLanguage()

  return (
    <Card className="p-6 bg-card border-border mt-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{t('chart.title')}</h3>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.map(d => ({ ...d, month: d.monthKey ? t(d.monthKey) : d.month }))} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Bar dataKey="cases" fill="#dc143c" name={t('common.cases')} radius={[8, 8, 0, 0]} />
          <Bar dataKey="resolved" fill="#001f3f" name={t('common.resolved')} radius={[8, 8, 0, 0]} />
          <Bar dataKey="pending" fill="#94a3b8" name={t('common.pending')} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

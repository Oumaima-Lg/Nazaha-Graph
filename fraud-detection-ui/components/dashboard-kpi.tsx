'use client'

import { Card } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface KPIProps {
  labelKey: string
  value: string
  change: string
  icon: string
}

export function KPICard({ labelKey, value, change, icon }: KPIProps) {
  const { t } = useLanguage()
  // Dynamically get the icon component
  const IconComponent = (LucideIcons as any)[icon]

  return (
    <Card className="p-6 bg-card border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{t(labelKey)}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <p className="text-sm text-accent font-medium">{change}</p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
          {IconComponent && <IconComponent className="w-6 h-6 text-sidebar" />}
        </div>
      </div>
    </Card>
  )
}

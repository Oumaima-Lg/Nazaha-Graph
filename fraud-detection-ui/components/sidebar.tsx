'use client'

import { BarChart3, Database, Home, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import {
  Shield, Network, FileSearch,
  ArrowRight, AlertTriangle, CheckCircle2, TrendingUp, FileText,
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const navItems = [
    { href: '/dashboard', labelKey: 'navigation.dashboard', icon: Home },
    { href: '/graph', labelKey: 'navigation.graph', icon: BarChart3 },
    { href: '/contracts', labelKey: 'navigation.contracts', icon: Database },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground shadow-lg border-r border-sidebar-border flex flex-col">
      {/* Logo/Title */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          {/* <div className="w-8 h-8 rounded bg-sidebar-accent flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-sidebar-accent-foreground" />
          </div> */}
          <div className="w-8 h-8 rounded bg-[#dc143c] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-balance">{t('app.title')}</h1>
            <p className="text-xs opacity-70">{t('app.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'hover:bg-sidebar-border text-sidebar-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border text-xs opacity-70">
        <p>v1.0.0</p>
        <p className="mt-1">© 2024 NAZAHA</p>
      </div>
    </aside>
  )
}

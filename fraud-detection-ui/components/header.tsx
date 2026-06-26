'use client'

import { Search, Bell, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { LanguageSelector } from '@/components/language-selector'
import { useLanguage } from '@/lib/language-context'

export function Header() {
  const { t } = useLanguage()

  return (
    <header className="fixed z-30 top-0 left-64 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('header.search')}
            className="pl-10 h-9 bg-secondary border-border text-sm"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-6">
        {/* Language Selector */}
        <LanguageSelector />

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
        </button>

        {/* User Profile */}
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar text-white flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    </header>
  )
}

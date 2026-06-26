'use client'

import { useLanguage } from '@/lib/language-context'
import { Globe } from 'lucide-react'

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' }
  ]

  return (
    <div className="flex items-center gap-1">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'fr' | 'en' | 'ar')}
        className="bg-transparent text-sm font-medium text-foreground cursor-pointer border-0 outline-none"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-card text-foreground">
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}

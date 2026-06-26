'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import fr from '@/lib/translations/fr.json'
import en from '@/lib/translations/en.json'
import ar from '@/lib/translations/ar.json'

type Language = 'fr' | 'en' | 'ar'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = { fr, en, ar }

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Récupérer la langue sauvegardée ou utiliser celle du navigateur
    const savedLanguage = localStorage.getItem('language') as Language | null
    const browserLanguage = navigator.language.split('-')[0] as Language
    const defaultLanguage = savedLanguage || ((['fr', 'en', 'ar'].includes(browserLanguage) ? browserLanguage : 'fr') as Language)
    
    setLanguageState(defaultLanguage)
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations[language]
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    return value || key
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Return a default value during hydration
    return {
      language: 'fr' as Language,
      setLanguage: () => {},
      t: (key: string) => key
    }
  }
  return context
}

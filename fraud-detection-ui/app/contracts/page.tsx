'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { ContractsTable } from '@/components/contracts-table'
import { fetchAnalyze } from '@/lib/api'
import { mockContracts } from '@/lib/mock-data'
import { useLanguage } from '@/lib/language-context'

export default function ContractsPage() {
  const { t } = useLanguage()
  const [contracts, setContracts] = useState(mockContracts)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadContracts() {
      try {
        const data = await fetchAnalyze()
        if (!cancelled && data.contracts.length > 0) {
          setContracts(
            data.contracts.map((c) => ({
              id: c.id,
              titleKey: c.title,
              vendorKey: c.vendor,
              amount: c.amount,
              date: c.date,
              status: c.status,
              riskScore: c.riskScore,
            }))
          )
        }
      } catch {
        // Conserve les données mock en cas d'échec
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContracts()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('pages.contracts.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('pages.contracts.subtitle')}</p>
        {loading && (
          <p className="text-sm text-muted-foreground mt-2">Chargement des contrats OCDS...</p>
        )}
      </div>

      <ContractsTable contracts={contracts} />
    </AppLayout>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Filter, Network } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface Contract {
  id: string
  title?: string
  titleKey?: string
  vendor?: string
  vendorKey?: string
  amount: string
  date: string
  status: 'sain' | 'suspect' | 'rejete'
  riskScore: number
}

interface ContractsTableProps {
  contracts: Contract[]
}

const STATUS_COLORS = {
  sain: 'bg-green-50 text-green-700 border-green-200',
  suspect: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  rejete: 'bg-red-50 text-red-700 border-red-200',
}

export function ContractsTable({ contracts }: ContractsTableProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sain' | 'suspect' | 'rejete'>('all')

  const statusLabels = {
    sain: t('contracts.status.sain'),
    suspect: t('contracts.status.suspect'),
    rejete: t('contracts.status.rejete'),
  }

  const filtered = contracts.filter((contract) => {
    const title = contract.titleKey ? t(contract.titleKey) : contract.title
    const vendor = contract.vendorKey ? t(contract.vendorKey) : contract.vendor

    const matchesSearch =
      (title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      contract.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleViewNetwork = (contractId: string) => {
    router.push(`/graph?contractId=${encodeURIComponent(contractId)}`)
  }

  return (
    <div className="space-y-6">
      {/* Recherche et filtres */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('contracts.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <option value="all">{t('contracts.filterAll')}</option>
            <option value="sain">{t('contracts.status.sain')}</option>
            <option value="suspect">{t('contracts.status.suspect')}</option>
            <option value="rejete">{t('contracts.status.rejete')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="p-6 bg-card border-border overflow-hidden">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length} / {contracts.length} {t('contracts.table.id') === 'ID Contrat' ? 'contrats' : 'contracts'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  {t('contracts.table.id')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  {t('contracts.table.title')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  {t('contracts.table.vendor')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  {t('contracts.table.amount')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  {t('contracts.table.date')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  {t('contracts.table.status')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  {t('contracts.table.risk')}
                </th>
                {/* Nouvelle colonne action */}
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Réseau
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contract) => (
                <tr
                  key={contract.id}
                  className={`border-b border-border transition-colors ${
                    contract.status === 'suspect'
                      ? 'hover:bg-yellow-50'
                      : contract.status === 'rejete'
                        ? 'hover:bg-red-50'
                        : 'hover:bg-secondary'
                  }`}
                >
                  <td className="py-3 px-4 font-mono text-xs text-foreground">{contract.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-sm text-foreground">
                      {contract.titleKey ? t(contract.titleKey) : contract.title}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground">
                    {contract.vendorKey ? t(contract.vendorKey) : contract.vendor}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-foreground">{contract.amount}</td>
                  <td className="py-3 px-4 text-sm text-foreground">{contract.date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border inline-block ${
                        STATUS_COLORS[contract.status]
                      }`}
                    >
                      {statusLabels[contract.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            contract.riskScore >= 75
                              ? 'bg-red-500'
                              : contract.riskScore >= 50
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${contract.riskScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground tabular-nums">
                        {contract.riskScore}%
                      </span>
                    </div>
                  </td>

                  {/* Bouton "Voir le Réseau" — mis en avant pour les suspects */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleViewNetwork(contract.id)}
                      title={`Voir le réseau de ${contract.id}`}
                      aria-label={`Voir le réseau pour le contrat ${contract.id}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                        contract.status !== 'sain'
                          ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500 shadow-sm'
                          : 'bg-secondary hover:bg-sidebar hover:text-white text-muted-foreground focus-visible:ring-sidebar'
                      }`}
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Réseau</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Aucun contrat trouvé</p>
          </div>
        )}
      </Card>
    </div>
  )
}

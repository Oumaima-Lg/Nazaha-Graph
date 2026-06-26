'use client'

import { useRouter } from 'next/navigation'
import {
  Shield, Network, BarChart3, FileSearch,
  ArrowRight, AlertTriangle, CheckCircle2, TrendingUp, FileText,
} from 'lucide-react'
import { ReportForm } from '@/components/report-form'
import { submitReport, type ReportPayload } from '@/lib/api'

// ─── Feature cards data ───────────────────────────────────────────────────────

const features = [
  {
    icon: Network,
    title: 'Analyse de Réseau',
    description:
      'Visualisez les liens entre entités, fournisseurs et décideurs pour détecter les schémas de collusion.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: AlertTriangle,
    title: 'Détection en Temps Réel',
    description:
      'Alertes automatiques sur les comportements suspects : enchères identiques, fixation de prix, coalitions inhabituelles.',
    color: 'bg-red-50 text-red-600',
  },
  {
    icon: FileSearch,
    title: 'Audit des Contrats',
    description:
      'Analyse complète des marchés publics avec scoring de risque et traçabilité des anomalies documentaires.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: BarChart3,
    title: 'Tableaux de Bord',
    description:
      'KPIs consolidés, tendances temporelles et rapports anonymes pour une gouvernance transparente.',
    color: 'bg-green-50 text-green-600',
  },
]

const stats = [
  { value: '1 247', label: 'Contrats analysés', icon: CheckCircle2, color: 'text-green-600' },
  { value: '23',    label: 'Réseaux suspects détectés', icon: AlertTriangle, color: 'text-red-600' },
  { value: '98%',   label: 'Précision de détection', icon: TrendingUp, color: 'text-blue-600' },
]

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()

  const handleReportSubmit = async (data: ReportPayload) => {
    await submitReport({
      title: data.title,
      description: data.description,
      urgency: data.urgency,
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#dc143c] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-[#001f3f]">Nazaha-Graph</span>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#001f3f] text-white text-sm font-semibold hover:bg-[#1e3a5f] transition-colors"
          >
            Accéder à la plateforme
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-700 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Système actif — Analyse en temps réel
          </div>

          {/* Title */}
          <h1 className="text-5xl font-extrabold text-[#001f3f] leading-tight mb-6 tracking-tight">
            Détection de Collusion<br />
            dans les{' '}
            <span className="text-[#dc143c]">Marchés Publics</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Nazaha-Graph analyse les réseaux d'entités et de contrats pour identifier
            les schémas de fraude, de collusion et de corruption dans les appels d'offres publics.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#dc143c] text-white font-semibold text-base hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
            >
              Se connecter
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#signalement"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-[#dc143c] text-[#dc143c] font-semibold text-base hover:bg-[#dc143c] hover:text-white transition-colors"
            >
              <FileText className="w-5 h-5" />
              Faire un signalement
            </a>
            <button
              onClick={() => router.push('/graph')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-[#001f3f] text-[#001f3f] font-semibold text-base hover:bg-[#001f3f] hover:text-white transition-colors"
            >
              <Network className="w-5 h-5" />
              Explorer le graphe
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────── */}
      <section className="bg-[#001f3f] py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {stats.map(({ value, label, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className={`w-6 h-6 ${color}`} />
              <span className="text-3xl font-extrabold text-white">{value}</span>
              <span className="text-sm text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#001f3f] mb-3">
              Une plateforme complète d'intégrité
            </h2>
            <p className="text-muted-foreground">
              Tous les outils pour identifier, analyser et signaler les irrégularités dans les marchés publics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, description, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-[#001f3f] mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Report Section ────────────────────────────────────── */}
      <section id="signalement" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-700 text-xs font-medium mb-4">
              <FileText className="w-3.5 h-3.5" />
              Accès public — Aucune inscription requise
            </div>
            <h2 className="text-3xl font-bold text-[#001f3f] mb-3">
              Soumettre un Signalement
            </h2>
            <p className="text-muted-foreground">
              Signalez anonymement toute irrégularité ou suspicion de corruption dans les marchés publics.
              Votre signalement sera traité en toute confidentialité.
            </p>
          </div>

          <ReportForm onSubmit={handleReportSubmit} />
        </div>
      </section>

      {/* ── CTA bottom ────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#001f3f] to-[#1e3a5f] text-center">
        <div className="max-w-2xl mx-auto">
          <Shield className="w-12 h-12 text-[#dc143c] mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à analyser les réseaux ?
          </h2>
          <p className="text-slate-300 mb-8">
            Accédez immédiatement à la plateforme sans inscription requise.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#dc143c] text-white font-semibold text-base hover:bg-red-700 transition-colors shadow-lg"
          >
            Accéder au tableau de bord
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-[#001f3f] border-t border-[#1e3a5f] py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>© 2024 Nazaha-Graph — Système d'Analyse de Réseaux</span>
          <span>v1.0.0</span>
        </div>
      </footer>
    </div>
  )
}

'use client'

import { AppLayout } from '@/components/app-layout'
import { ReportForm } from '@/components/report-form'
import { submitReport, type ReportPayload } from '@/lib/api'
import { useLanguage } from '@/lib/language-context'

export default function ReportPage() {
  const { t } = useLanguage()

  const handleReportSubmit = async (data: ReportPayload) => {
    await submitReport({
      title: data.title,
      description: data.description,
      urgency: data.urgency,
    })
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('pages.report.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('pages.report.subtitle')}</p>
      </div>

      <ReportForm onSubmit={handleReportSubmit} />
    </AppLayout>
  )
}

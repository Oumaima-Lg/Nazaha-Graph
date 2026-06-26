'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { fetchReportHistory, type ReportHistoryItem } from '@/lib/api'
import { mockReportHistory } from '@/lib/mock-data'

interface ReportFormProps {
  onSubmit?: (data: ReportData) => Promise<void> | void
}

interface ReportData {
  title: string
  description: string
  urgency: string
  files: File[]
}

export function ReportForm({ onSubmit }: ReportFormProps) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState<ReportData>({
    title: '',
    description: '',
    urgency: 'medium',
    files: []
  })
  const [dragActive, setDragActive] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchReportHistory()
      .then(setReportHistory)
      .catch(() => {
        setReportHistory(
          mockReportHistory.map((r) => ({
            id: String(r.id),
            title: t(r.titleKey),
            status: r.status,
            submittedDate: r.submittedDate,
          }))
        )
      })
  }, [t])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...files]
    }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...files]
      }))
    }
  }

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      if (onSubmit) {
        await onSubmit(formData)
      }
      setSubmitted(true)
      const history = await fetchReportHistory().catch(() => reportHistory)
      if (history.length > 0) setReportHistory(history)
      setTimeout(() => {
        setFormData({ title: '', description: '', urgency: 'medium', files: [] })
        setSubmitted(false)
      }, 3000)
    } catch {
      setSubmitError(t('report.error') || 'Erreur lors de l\'envoi du signalement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {submitError && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="font-medium text-red-900">{submitError}</p>
          </div>
        </Card>
      )}

      {/* Success Message */}
      {submitted && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">{t('report.success')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('report.form.title')}</h3>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('report.form.titleLabel')}
              </label>
              <Input
                type="text"
                placeholder={t('report.form.titleLabel')}
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('report.form.descriptionLabel')}
              </label>
              <textarea
                placeholder={t('report.form.descriptionLabel')}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar"
                rows={5}
              />
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('report.form.urgencyLabel')}
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData((prev) => ({ ...prev, urgency: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground"
              >
                <option value="low">{t('report.form.urgencyLow')}</option>
                <option value="medium">{t('report.form.urgencyMedium')}</option>
                <option value="high">{t('report.form.urgencyHigh')}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* File Upload */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('report.form.filesLabel')}</h3>

          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-sidebar bg-blue-50'
                : 'border-border hover:border-sidebar'
            }`}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {t('report.form.dragDropText')}
              <label className="text-sidebar cursor-pointer hover:underline">
                {t('common.details')}
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                />
              </label>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('report.form.fileTypes')}
            </p>
          </div>

          {/* File List */}
          {formData.files.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">{t('report.form.filesLabel')}:</p>
              {formData.files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-sidebar text-white flex items-center justify-center text-xs font-bold">
                      {file.name.split('.').pop()?.toUpperCase().slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            className="flex-1 bg-sidebar hover:bg-blue-900 text-white h-10"
            disabled={!formData.title || isSubmitting}
          >
            {isSubmitting ? '...' : t('report.form.submitButton')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({ title: '', description: '', urgency: 'medium', files: [] })}
            className="border-border"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>

      {/* Recent Reports */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">{t('report.history.title')}</h3>
        <div className="space-y-3">
          {reportHistory.map((report) => (
            <div key={report.id} className="flex items-start justify-between p-3 bg-secondary rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">{report.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('report.history.submitted')} {report.submittedDate} • {t('report.history.status')} {report.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

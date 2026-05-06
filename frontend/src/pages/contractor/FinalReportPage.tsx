import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi, useMutation } from '@/hooks/useApi'
import { ArrowLeft, Camera, Upload, X, CheckCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepForm } from '@/components/ui/StepForm'
import { getEntrepriseTypeLabel } from '@/lib/utils'
import type { EntrepriseType } from '@/types'
import { api } from '@/lib/api'

const CHECKLIST_QUESTIONS = [
  { key: 'work_completed', label: 'Er alt arbejde udført i henhold til aftalen?' },
  { key: 'materials_removed', label: 'Er alt affald og materialer fjernet fra ejendommen?' },
  { key: 'client_informed', label: 'Er kunden informeret om afsluttet arbejde?' },
  { key: 'no_damage', label: 'Er der ingen skader på ejendommen forårsaget af arbejdet?' },
  { key: 'safety_compliant', label: 'Er alle sikkerhedskrav overholdt?' },
]

interface PhotoFile {
  file: File
  preview: string
  uploading: boolean
  uploadedUrl?: string
  uploadedName?: string
}

export default function FinalReportPage() {
  const { entrepriseId } = useParams<{ entrepriseId: string }>()
  const navigate = useNavigate()

  const { data: entreprise, loading } = useApi<any>(
    entrepriseId ? `/contractor/entreprises/${entrepriseId}` : null,
  )
  const { mutate: submit, loading: submitting, error } = useMutation('post')

  // Step 1: Checklist
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // Step 2: Photos
  const [photos, setPhotos] = useState<PhotoFile[]>([])

  // Step 3: Summary
  const [summary, setSummary] = useState('')

  const [done, setDone] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return
    const newPhotos: PhotoFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }))
    setPhotos((prev) => [...prev, ...newPhotos])

    for (const photo of newPhotos) {
      setPhotos((prev) =>
        prev.map((p) => (p.preview === photo.preview ? { ...p, uploading: true } : p)),
      )
      try {
        const result = await api.uploadFile(`/projects/${entreprise?.project?.id}/files`, photo.file, {
          attachmentCategory: 'final_report',
          isClientVisible: 'true',
        }) as any
        setPhotos((prev) =>
          prev.map((p) =>
            p.preview === photo.preview
              ? { ...p, uploading: false, uploadedUrl: result.blobUrl, uploadedName: result.fileName }
              : p,
          ),
        )
      } catch {
        setPhotos((prev) => prev.filter((p) => p.preview !== photo.preview))
      }
    }
  }

  const handleSubmit = async () => {
    const builtAnswers = CHECKLIST_QUESTIONS.map((q) => ({
      questionKey: q.key,
      questionLabel: q.label,
      answerValue: answers[q.key] ?? 'Ja',
    }))

    const uploadedAttachments = photos
      .filter((p) => p.uploadedUrl)
      .map((p) => ({
        fileName: p.uploadedName!,
        fileType: p.file.type,
        blobUrl: p.uploadedUrl!,
        fileSizeMb: p.file.size / (1024 * 1024),
      }))

    const result = await submit(`/contractor/entreprises/${entrepriseId}/final-report`, {
      summary,
      answers: builtAnswers,
      attachmentUrls: uploadedAttachments,
    })

    if (result) setDone(true)
  }

  if (loading) {
    return (
      <div className="p-4 animate-pulse space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-60 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-display font-bold text-lg text-gray-900 mb-2">Slutrapport indsendt!</h2>
        <p className="text-sm text-gray-500 mb-6">Din slutrapport er sendt til gennemgang af Sedgwick.</p>
        <Button onClick={() => navigate(-1)}>Tilbage til sagen</Button>
      </div>
    )
  }

  const allAnswered = CHECKLIST_QUESTIONS.every((q) => answers[q.key])

  const steps = [
    {
      label: 'Tjekliste',
      isValid: allAnswered,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Bekræft at alle opgaver er udført</p>
          {CHECKLIST_QUESTIONS.map((q) => (
            <div key={q.key} className="rounded-xl border border-[#e5e7eb] bg-white p-4">
              <p className="text-sm font-display font-medium text-gray-900 mb-3">{q.label}</p>
              <div className="flex gap-2">
                {['Ja', 'Nej', 'N/A'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt }))}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                      answers[q.key] === opt
                        ? opt === 'Ja'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : opt === 'Nej'
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-400 bg-gray-100 text-gray-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Billeder',
      isValid: true,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Upload afslutningsbilleder af det udførte arbejde</p>

          <button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.capture = 'environment'
              input.multiple = true
              input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files)
              input.click()
            }}
            className="w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 p-8 text-primary-700 hover:bg-primary-100 transition-colors"
          >
            <Camera className="h-10 w-10 mb-2 text-primary-500" />
            <span className="font-display font-semibold text-sm">Tag afslutningsbilleder</span>
          </button>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.preview} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                  {photo.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  ) : (
                    <button
                      onClick={() => setPhotos((p) => p.filter((x) => x.preview !== photo.preview))}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      label: 'Sammenfatning',
      isValid: summary.length > 0,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-display font-semibold text-gray-700 mb-2">
              Arbejdsbeskrivelse <span className="text-red-500">*</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              placeholder="Beskriv det udførte arbejde i detaljer..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      ),
    },
    {
      label: 'Gennemse',
      isValid: true,
      content: (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText className="h-4 w-4 text-primary-600" />
              <span className="font-semibold">{entreprise && getEntrepriseTypeLabel(entreprise.type as EntrepriseType)}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-semibold">Tjeklistespørgsmål:</span> {CHECKLIST_QUESTIONS.length} besvaret</p>
              <p><span className="font-semibold">Billeder:</span> {photos.filter((p) => p.uploadedUrl).length} uploaded</p>
              <p><span className="font-semibold">Sammenfatning:</span> {summary.length > 0 ? '✓' : 'Mangler'}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Rapporten vil blive sendt til Sedgwick for gennemgang. Du kan ikke redigere den efterfølgende.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ),
    },
  ]

  return (
    <div className="p-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Tilbage
      </button>
      <h1 className="font-display font-bold text-xl text-gray-900 mb-6">Indsend slutrapport</h1>

      <StepForm
        steps={steps}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        submitLabel="Indsend slutrapport"
      />
    </div>
  )
}

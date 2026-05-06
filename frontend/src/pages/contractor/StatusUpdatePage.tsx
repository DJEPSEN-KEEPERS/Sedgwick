import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi, useMutation } from '@/hooks/useApi'
import { ArrowLeft, Camera, Upload, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepForm } from '@/components/ui/StepForm'
import { getEntrepriseTypeLabel, getEntrepriseMilestoneLabel } from '@/lib/utils'
import type { EntrepriseType, EntrepriseMilestone } from '@/types'
import { api } from '@/lib/api'

const MILESTONES: EntrepriseMilestone[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']
const MILESTONE_LABEL: Record<string, string> = {
  SCHEDULED: 'Planlagt',
  IN_PROGRESS: 'I gang',
  COMPLETED: 'Afsluttet',
}

interface PhotoFile {
  file: File
  preview: string
  uploading: boolean
  uploadedUrl?: string
  uploadedName?: string
}

export default function StatusUpdatePage() {
  const { entrepriseId } = useParams<{ entrepriseId: string }>()
  const navigate = useNavigate()

  const { data: entreprise, loading } = useApi<any>(
    entrepriseId ? `/contractor/entreprises/${entrepriseId}` : null,
  )
  const { mutate: submit, loading: submitting, error } = useMutation('post')

  // Step 1: Photos
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Status details
  const [milestone, setMilestone] = useState<string>('')
  const [progressPercent, setProgressPercent] = useState(50)
  const [startedFlag, setStartedFlag] = useState(false)
  const [completedFlag, setCompletedFlag] = useState(false)
  const [expectedCompletion, setExpectedCompletion] = useState('')
  const [comments, setComments] = useState('')

  const [done, setDone] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return
    const newPhotos: PhotoFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }))
    setPhotos((prev) => [...prev, ...newPhotos])

    // Upload each file
    for (const photo of newPhotos) {
      setPhotos((prev) =>
        prev.map((p) => (p.preview === photo.preview ? { ...p, uploading: true } : p)),
      )
      try {
        const result = await api.uploadFile(`/projects/${entreprise?.project?.id}/files`, photo.file, {
          attachmentCategory: 'status_update',
          isClientVisible: 'false',
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

  const removePhoto = (preview: string) => {
    setPhotos((prev) => prev.filter((p) => p.preview !== preview))
  }

  const handleSubmit = async () => {
    const uploadedAttachments = photos
      .filter((p) => p.uploadedUrl)
      .map((p) => ({
        fileName: p.uploadedName!,
        fileType: p.file.type,
        blobUrl: p.uploadedUrl!,
        fileSizeMb: p.file.size / (1024 * 1024),
      }))

    const result = await submit(`/contractor/entreprises/${entrepriseId}/status-updates`, {
      milestone,
      progressPercent,
      startedFlag,
      completedFlag,
      expectedCompletion: expectedCompletion || undefined,
      comments: comments || undefined,
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
        <h2 className="font-display font-bold text-lg text-gray-900 mb-2">Opdatering sendt!</h2>
        <p className="text-sm text-gray-500 mb-6">Din statusopdatering er sendt til godkendelse.</p>
        <Button onClick={() => navigate(-1)}>Tilbage til sagen</Button>
      </div>
    )
  }

  const entrepriseType = entreprise?.type as EntrepriseType | undefined

  const steps = [
    {
      label: 'Billeder',
      isValid: true,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Tag billeder af det udførte arbejde</p>

          {/* Camera button (primary on mobile) */}
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*'
                fileInputRef.current.capture = 'environment'
                fileInputRef.current.click()
              }
            }}
            className="w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 p-8 text-primary-700 hover:bg-primary-100 transition-colors active:scale-[0.99]"
          >
            <Camera className="h-10 w-10 mb-2 text-primary-500" />
            <span className="font-display font-semibold text-sm">Tag billede</span>
            <span className="text-xs text-primary-500 mt-0.5">Kamera-first</span>
          </button>

          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*'
                fileInputRef.current.removeAttribute('capture')
                fileInputRef.current.click()
              }
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Vælg fra galleri
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.preview} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                  {photo.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                  {!photo.uploading && (
                    <button
                      onClick={() => removePhoto(photo.preview)}
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
      label: 'Status',
      isValid: !!milestone,
      content: (
        <div className="space-y-4">
          {entreprise && entrepriseType && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              Entreprise: <span className="font-semibold text-gray-900">{getEntrepriseTypeLabel(entrepriseType)}</span>
              <span className="mx-1">·</span>
              Nu: <span className="font-semibold">{getEntrepriseMilestoneLabel(entreprise.currentMilestone)}</span>
            </div>
          )}

          {/* Milestone */}
          <div>
            <label className="block text-sm font-display font-semibold text-gray-700 mb-2">
              Ny milepæl <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MILESTONES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMilestone(m)}
                  className={`rounded-lg border py-3 text-xs font-display font-semibold transition-colors ${
                    milestone === m
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {MILESTONE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-display font-semibold text-gray-700 mb-2">
              Fremgang: {progressPercent}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progressPercent}
              onChange={(e) => setProgressPercent(Number(e.target.value))}
              className="w-full accent-primary-600"
            />
          </div>

          {/* Flags */}
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={startedFlag}
                onChange={(e) => setStartedFlag(e.target.checked)}
                className="rounded accent-primary-600"
              />
              Arbejde startet
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={completedFlag}
                onChange={(e) => setCompletedFlag(e.target.checked)}
                className="rounded accent-primary-600"
              />
              Afsluttet
            </label>
          </div>

          {/* Expected completion */}
          {!completedFlag && (
            <div>
              <label className="block text-sm font-display font-semibold text-gray-700 mb-1">
                Forventet afslutning
              </label>
              <input
                type="date"
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="block text-sm font-display font-semibold text-gray-700 mb-1">
              Kommentar
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Beskriv hvad der er udført..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

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
      <h1 className="font-display font-bold text-xl text-gray-900 mb-6">Ny statusopdatering</h1>

      <StepForm
        steps={steps}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        submitLabel="Send opdatering"
      />
    </div>
  )
}

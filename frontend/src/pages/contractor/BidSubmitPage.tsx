import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi, useMutation } from '@/hooks/useApi'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepForm } from '@/components/ui/StepForm'
import { formatCurrency, getEntrepriseTypeLabel } from '@/lib/utils'
import type { Project, EntrepriseType } from '@/types'

export default function BidSubmitPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const { data: project, loading } = useApi<Project>(projectId ? `/projects/${projectId}` : null)
  const { mutate: submit, loading: submitting, error } = useMutation('post')

  // Step 1: Entreprise relevance
  const [relevance, setRelevance] = useState<Record<string, boolean>>({})

  // Step 2: Bid details
  const [bidAmount, setBidAmount] = useState('')
  const [comments, setComments] = useState('')

  const [done, setDone] = useState(false)

  const entreprises = project?.entreprises ?? []

  // Pre-populate relevance from project when loaded
  const relevanceWithDefaults = { ...Object.fromEntries(entreprises.map((e) => [e.id, e.isRelevant])), ...relevance }

  const handleSubmit = async () => {
    const result = await submit('/contractor/bids', {
      projectId,
      bidAmount: parseFloat(bidAmount),
      comments: comments || undefined,
      entrepriseRelevance: relevanceWithDefaults,
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
        <h2 className="font-display font-bold text-lg text-gray-900 mb-2">Bud afgivet!</h2>
        <p className="text-sm text-gray-500 mb-6">Dit bud er sendt til Sedgwick for vurdering.</p>
        <Button onClick={() => navigate('/contractor/invitations')}>Tilbage til invitationer</Button>
      </div>
    )
  }

  const steps = [
    {
      label: 'Entrepriser',
      isValid: true,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Marker hvilke entrepriser du kan udføre. Dette hjælper Sedgwick med at vurdere dit bud.
          </p>
          {entreprises.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen entrepriser defineret for denne sag.</p>
          ) : (
            entreprises.map((e) => (
              <label
                key={e.id}
                className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors ${
                  relevanceWithDefaults[e.id]
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div>
                  <p className="font-display font-semibold text-sm text-gray-900">
                    {getEntrepriseTypeLabel(e.type as EntrepriseType)}
                  </p>
                  {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                </div>
                <input
                  type="checkbox"
                  checked={!!relevanceWithDefaults[e.id]}
                  onChange={(ev) =>
                    setRelevance((r) => ({ ...r, [e.id]: ev.target.checked }))
                  }
                  className="h-5 w-5 rounded accent-primary-600"
                />
              </label>
            ))
          )}
        </div>
      ),
    },
    {
      label: 'Bud',
      isValid: parseFloat(bidAmount) > 0,
      content: (
        <div className="space-y-4">
          {project && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <p><span className="font-semibold">Sag:</span> {project.claimId}</p>
              <p><span className="font-semibold">Adresse:</span> {project.address}, {project.city}</p>
              {project.maxApprovedPrice && (
                <p><span className="font-semibold">Maks. godkendt:</span> {formatCurrency(project.maxApprovedPrice)}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-display font-semibold text-gray-700 mb-1">
              Budbeløb (DKK) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 pl-3 pr-12 py-3 text-lg font-display font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">DKK</span>
            </div>
            {bidAmount && parseFloat(bidAmount) > 0 && (
              <p className="mt-1 text-sm text-primary-700 font-semibold">{formatCurrency(parseFloat(bidAmount))}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-display font-semibold text-gray-700 mb-1">
              Kommentar (valgfrit)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              placeholder="Beskriv dit bud og eventuelle forbehold..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      ),
    },
    {
      label: 'Gennemse',
      isValid: parseFloat(bidAmount) > 0,
      content: (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-gray-50 p-4 space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Sag</span>
                <span className="font-semibold text-gray-900">{project?.claimId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Budbeløb</span>
                <span className="font-semibold text-primary-700 text-base">
                  {bidAmount ? formatCurrency(parseFloat(bidAmount)) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entrepriser (relevant)</span>
                <span className="font-semibold text-gray-900">
                  {Object.values(relevanceWithDefaults).filter(Boolean).length} / {entreprises.length}
                </span>
              </div>
              {comments && (
                <div>
                  <span className="text-gray-500 block mb-1">Kommentar</span>
                  <p className="text-xs text-gray-700 bg-white rounded-lg border border-gray-100 p-2">{comments}</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Når du indsender dit bud, kan Sedgwick evaluere det og vælge den bedst egnede håndværker til sagen.
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
      <h1 className="font-display font-bold text-xl text-gray-900 mb-6">Afgiv bud</h1>

      <StepForm
        steps={steps}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        submitLabel="Indsend bud"
      />
    </div>
  )
}

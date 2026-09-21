import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi, useMutation } from '@/hooks/useApi'
import { ArrowLeft, CheckCircle, Upload, X, MapPin, Phone, Mail, Paperclip, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from '@/components/ui/StatusBadges'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? '/api'
const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip'
const MAX_MB = 25

const ENTREPRISE_TYPE_DK: Record<string, string> = {
  CARPENTER: 'Tømrer', MASON: 'Murer', PLUMBER: 'VVS', GLAZIER: 'Glarmester',
  ELECTRICIAN: 'El', PAINTER: 'Maler', ROOFER: 'Tagdækker', OTHER: 'Andet',
}

async function uploadBidFile(bidId: string, file: File): Promise<void> {
  const token = localStorage.getItem('accessToken') ?? ''
  const res = await fetch(`${BASE_URL}/bids/${bidId}/attachments`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-Auth-Token': token,
    },
    body: file,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? `Upload fejlede (${res.status})`)
  }
}

export default function BidSubmitPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const { data: project, loading } = useApi<Project>(projectId ? `/projects/${projectId}` : null)
  const { mutate: submit, loading: submitting, error } = useMutation('post')

  const [materialsCost, setMaterialsCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [comments, setComments] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return
    const arr = Array.from(list).filter((f) => f.size <= MAX_MB * 1024 * 1024)
    setPendingFiles((prev) => [...prev, ...arr].slice(0, 10))
  }, [])
  const removeFile = (idx: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))

  const matVal = parseFloat(materialsCost) || 0
  const labVal = parseFloat(laborCost) || 0
  const totalBid = matVal + labVal

  const entreprises = project?.entreprises ?? []
  const relevanceWithDefaults = Object.fromEntries(entreprises.map((e) => [e.id, e.isRelevant]))

  const handleSubmit = async () => {
    setUploadError('')
    const result = await submit('/contractor/bids', {
      projectId,
      materialsCost: matVal,
      laborCost: labVal,
      comments,
      entrepriseRelevance: relevanceWithDefaults,
    }) as any

    if (result) {
      if (pendingFiles.length > 0) {
        try {
          await Promise.all(pendingFiles.map((f) => uploadBidFile(result.id, f)))
        } catch (e: unknown) {
          setUploadError(e instanceof Error ? e.message : 'Bilag kunne ikke uploades')
        }
      }
      setDone(true)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-60 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-display font-bold text-lg text-gray-900 mb-2">Bud afgivet!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Dit bud er sendt til Sedgwick for vurdering.
          {pendingFiles.length > 0 && !uploadError && ` ${pendingFiles.length} bilag er vedhæftet.`}
        </p>
        {uploadError && <p className="text-sm text-red-600 mb-4">Bilag kunne ikke uploades: {uploadError}</p>}
        <Button onClick={() => navigate('/contractor/invitations')}>Tilbage til invitationer</Button>
      </div>
    )
  }

  const p = project as any
  const relevantEntreprises = (p?.entreprises ?? []).filter((e: any) => e.isRelevant)
  const isValid = matVal > 0 && labVal > 0 && comments.trim().length > 0

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Tilbage
      </button>

      <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-[#e5e7eb] gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-primary-700">{p?.claimId}</span>
            {p?.priorityLevel && <PriorityBadge level={p.priorityLevel} />}
          </div>
          <span className="text-xs font-display font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">Afgiv bud</span>
        </div>

        {/* Project info — same as InvitationDetail */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left */}
          <div className="space-y-4">
            <Section title="Sagsinformation">
              <Row label="Forsikringsselskab" value={p?.insuranceCompany?.name} />
              {p?.insurerCaseId && <Row label="Forsikringens sags-ID" value={p.insurerCaseId} mono />}
              <Row label="Skadetype" value={p?.damageType} />
              <Row label="Bygningstype" value={p?.buildingType} />
            </Section>

            {(p?.damageDescription || p?.estimatedScope) && (
              <Section title="Skadesomfang">
                {p?.damageDescription && (
                  <p className="text-sm text-gray-700 leading-relaxed">{p.damageDescription}</p>
                )}
                {p?.estimatedScope && (
                  <div className={p?.damageDescription ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
                    <p className="text-xs font-display font-medium text-gray-500 mb-1">Estimeret omfang</p>
                    <p className="text-sm text-gray-700">{p.estimatedScope}</p>
                  </div>
                )}
              </Section>
            )}

            {relevantEntreprises.length > 0 && (
              <Section title="Entrepriser">
                <div className="flex flex-wrap gap-1.5">
                  {relevantEntreprises.map((e: any) => (
                    <span key={e.id} className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-700 font-medium border border-primary-100">
                      {ENTREPRISE_TYPE_DK[e.type] ?? e.type}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Right */}
          <div className="space-y-4">
            <Section title="Datoer">
              {p?.createdAt && <Row label="Oprettet" value={formatDate(p.createdAt)} />}
              {p?.requestedStartDate && <Row label="Ønsket start" value={formatDate(p.requestedStartDate)} />}
              {p?.requestedDeadline && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs font-display text-gray-500 shrink-0">Tilbudsfrist</span>
                  <DeadlineValue deadline={p.requestedDeadline} />
                </div>
              )}
            </Section>

            {(p?.contactName || p?.contactPhone || p?.contactEmail) && (
              <Section title="Kontakt">
                {p?.contactName && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <span className="text-xs font-display font-semibold text-gray-600">{p.contactName.charAt(0)}</span>
                    </div>
                    <p className="text-sm font-display font-medium text-gray-900">{p.contactName}</p>
                  </div>
                )}
                {p?.contactPhone && (
                  <a href={`tel:${p.contactPhone}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
                    <Phone className="h-3.5 w-3.5 shrink-0" />{p.contactPhone}
                  </a>
                )}
                {p?.contactEmail && (
                  <a href={`mailto:${p.contactEmail}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
                    <Mail className="h-3.5 w-3.5 shrink-0" />{p.contactEmail}
                  </a>
                )}
              </Section>
            )}

            {p?.address && (
              <Section title="Adresse">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-900">{p.address}</p>
                    <p className="text-sm text-gray-600">{[p.postalCode, p.city].filter(Boolean).join(' ')}</p>
                    {p?.region && <p className="text-sm text-gray-500">{p.region}</p>}
                  </div>
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Filer fra Sedgwick */}
        {p?.attachments?.length > 0 && (
          <div className="px-5 pb-4 border-t border-[#e5e7eb] pt-4">
            <p className="flex items-center gap-1.5 text-xs font-display font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <Paperclip className="h-3.5 w-3.5" />
              Filer fra Sedgwick ({p.attachments.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {p.attachments.map((f: any) => (
                <button
                  key={f.id}
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('accessToken') ?? ''
                      const res = await fetch(`/api/files/${f.id}/signed-url`, { headers: { 'X-Auth-Token': token } })
                      const { url } = res.ok ? await res.json() : {}
                      window.open(url ?? f.blobUrl, '_blank', 'noopener,noreferrer')
                    } catch { window.open(f.blobUrl, '_blank', 'noopener,noreferrer') }
                  }}
                  className="inline-flex items-center gap-1.5 rounded border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs text-primary-700 hover:bg-primary-100 truncate max-w-[200px]"
                  title={f.fileName}
                >
                  <Building2 className="h-3 w-3 shrink-0" />{f.fileName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Bid form ── */}
        <div className="border-t border-[#e5e7eb] p-5 space-y-4 bg-gray-50/50">
          <h3 className="text-sm font-display font-semibold text-gray-900">Dit bud</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display font-semibold text-gray-700 mb-1">
                Materialer (DKK) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number" inputMode="numeric"
                  value={materialsCost}
                  onChange={(e) => setMaterialsCost(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2.5 text-sm font-display font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">DKK</span>
              </div>
              {matVal > 0 && <p className="mt-0.5 text-xs text-gray-500">{formatCurrency(matVal)}</p>}
            </div>

            <div>
              <label className="block text-xs font-display font-semibold text-gray-700 mb-1">
                Håndværkertimer (DKK) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number" inputMode="numeric"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2.5 text-sm font-display font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">DKK</span>
              </div>
              {labVal > 0 && <p className="mt-0.5 text-xs text-gray-500">{formatCurrency(labVal)}</p>}
            </div>
          </div>

          {totalBid > 0 && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-display font-semibold text-primary-800">Samlet budbeløb</span>
              <span className="text-lg font-display font-bold text-primary-700">{formatCurrency(totalBid)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-display font-semibold text-gray-700 mb-1">
              Kommentar <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Beskriv dit bud og eventuelle forbehold..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-display font-semibold text-gray-700 mb-2">Bilag (valgfrit)</label>
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 transition-colors cursor-pointer',
                isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white hover:border-primary-400 hover:bg-gray-50',
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-gray-400 mb-1.5" />
              <p className="text-sm font-display font-medium text-gray-700">Træk filer hertil eller klik for at vælge</p>
              <p className="mt-0.5 text-xs text-gray-400">Maks {MAX_MB} MB · billeder, PDF, Word, Excel, ZIP</p>
              <input ref={inputRef} type="file" className="hidden" accept={ACCEPT} multiple onChange={(e) => addFiles(e.target.files)} />
            </div>

            {pendingFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5">
                    <span className="flex-1 text-xs text-gray-700 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i) }} className="text-gray-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? 'Sender...' : 'Indsend bud'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
      <div className="bg-gray-50 border-b border-[#e5e7eb] px-3 py-2">
        <h4 className="text-xs font-display font-semibold text-gray-600">{title}</h4>
      </div>
      <div className="p-3 space-y-2.5 bg-white">{children}</div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-display text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

function DeadlineValue({ deadline }: { deadline: string }) {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  const color = daysLeft < 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-yellow-600' : 'text-gray-900'
  return (
    <span className={`text-xs font-medium ${color} text-right`}>
      {formatDate(deadline)}
      {daysLeft < 0 ? ' (Overskredet)' : daysLeft <= 7 ? ` (${daysLeft}d tilbage)` : ''}
    </span>
  )
}

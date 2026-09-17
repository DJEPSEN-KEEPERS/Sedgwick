import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { ArrowLeft, CheckCircle, MapPin, Phone, Mail, Paperclip, Upload, ImageIcon } from 'lucide-react'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { WeekPlannerGrid } from '@/components/projects/WeekPlannerGrid'
import { EntreprisesTab } from '@/components/projects/tabs/EntreprisesTab'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, Bid } from '@/types'

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? '/api'

type Tab = 'overview' | 'entreprises' | 'planning' | 'documentation' | 'report'

export default function JobDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: project, loading } = useApi<Project>(projectId ? `/projects/${projectId}` : null)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-40 bg-gray-200 rounded" />
        <div className="h-60 bg-gray-200 rounded" />
      </div>
    )
  }

  if (!project) return null

  const myEntreprises = project.entreprises ?? []
  const relevantEntreprises = myEntreprises.filter((e) => e.isRelevant !== false)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="h-4 w-4" />
          Tilbage
        </button>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold text-primary-700">{project.claimId}</span>
              <MilestoneBadge milestone={project.currentMilestone} />
            </div>
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {project.address}, {project.city}
            </h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e5e7eb] mb-6">
        {([
          { key: 'overview', label: 'Overblik' },
          { key: 'entreprises', label: 'Entrepriser' },
          { key: 'planning', label: 'Planlægning' },
          { key: 'documentation', label: 'Dokumentation' },
          { key: 'report', label: 'Slutrapport' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-display font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview'    && <OverviewTab project={project} projectId={project.id} />}
        {tab === 'entreprises' && <EntreprisesTab projectId={project.id} allTypes contractorMode />}
        {tab === 'planning'  && (
          <WeekPlannerGrid
            projectId={project.id}
            entreprises={relevantEntreprises}
            canEdit
          />
        )}
        {tab === 'documentation' && <DocumentationTab projectId={project.id} />}
        {tab === 'report'        && <FinalReportTab projectId={project.id} />}
      </div>
    </div>
  )
}

function OverviewTab({ project, projectId }: { project: Project; projectId: string }) {
  const { data: bid } = useApi<Bid>(`/contractor/bids/${projectId}`)

  const downloadFile = async (fileId: string, fallbackUrl: string) => {
    try {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch(`/api/files/${fileId}/signed-url`, { headers: { 'X-Auth-Token': token } })
      const { url } = res.ok ? await res.json() : {}
      window.open(url ?? fallbackUrl, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* ── Left column ── */}
      <div className="space-y-4">

        <InfoSection title="Sagsinformation">
          <Row label="Forsikringsselskab" value={project.insuranceCompany?.name} />
          {project.insurerCaseId && <Row label="Forsikringens sags-ID" value={project.insurerCaseId} mono />}
          <Row label="Skadetype" value={project.damageType} />
          <Row label="Bygningstype" value={project.buildingType} />
          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-xs font-display text-gray-500">Status</span>
            <MilestoneBadge milestone={project.currentMilestone} />
          </div>
        </InfoSection>

        {(project.damageDescription || project.estimatedScope) && (
          <InfoSection title="Skadesomfang">
            {project.damageDescription && (
              <p className="text-sm text-gray-700 leading-relaxed">{project.damageDescription}</p>
            )}
            {project.estimatedScope && (
              <div className={project.damageDescription ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
                <p className="text-xs font-display font-medium text-gray-500 mb-1">Estimeret omfang</p>
                <p className="text-sm text-gray-700">{project.estimatedScope}</p>
              </div>
            )}
          </InfoSection>
        )}

        {bid && (
          <InfoSection title="Mit tilbud">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-display text-gray-500">Tilbudsbeløb</span>
              <span className="text-sm font-display font-bold text-primary-700">{formatCurrency(bid.bidAmount)}</span>
            </div>
            {(bid as any).materialsCost != null && (
              <Row label="Materialer" value={formatCurrency((bid as any).materialsCost)} />
            )}
            {(bid as any).laborCost != null && (
              <Row label="Håndværkertimer" value={formatCurrency((bid as any).laborCost)} />
            )}
            {bid.comments && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-display font-medium text-gray-500 mb-1">Kommentar</p>
                <p className="text-sm text-gray-700">{bid.comments}</p>
              </div>
            )}
            {bid.submittedAt && (
              <p className="text-xs text-gray-400 pt-1">Indsendt {formatDate(bid.submittedAt)}</p>
            )}
          </InfoSection>
        )}
      </div>

      {/* ── Right column ── */}
      <div className="space-y-4">

        <InfoSection title="Datoer">
          {project.createdAt && <Row label="Oprettet" value={formatDate(project.createdAt)} />}
          {project.requestedStartDate && <Row label="Ønsket start" value={formatDate(project.requestedStartDate)} />}
          {project.requestedDeadline && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs font-display text-gray-500 shrink-0">Tilbudsfrist</span>
              <DeadlineValue deadline={project.requestedDeadline} />
            </div>
          )}
        </InfoSection>

        {(project.contactName || project.contactPhone || project.contactEmail) && (
          <InfoSection title="Kontakt">
            {project.contactName && (
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <span className="text-xs font-display font-semibold text-gray-600">
                    {project.contactName.charAt(0)}
                  </span>
                </div>
                <p className="text-sm font-display font-medium text-gray-900">{project.contactName}</p>
              </div>
            )}
            {project.contactPhone && (
              <a href={`tel:${project.contactPhone}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {project.contactPhone}
              </a>
            )}
            {project.contactEmail && (
              <a href={`mailto:${project.contactEmail}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {project.contactEmail}
              </a>
            )}
          </InfoSection>
        )}

        {project.address && (
          <InfoSection title="Adresse">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-gray-900">{project.address}</p>
                <p className="text-sm text-gray-600">{[project.postalCode, project.city].filter(Boolean).join(' ')}</p>
                {project.region && <p className="text-sm text-gray-500">{project.region}</p>}
              </div>
            </div>
          </InfoSection>
        )}
      </div>

      {/* ── Uploaded files (full width) ── */}
      {bid?.attachments && bid.attachments.length > 0 && (
        <div className="lg:col-span-2">
          <InfoSection title={`Mine uploadede filer (${bid.attachments.length})`}>
            <div className="flex flex-wrap gap-2">
              {bid.attachments.map((f) => (
                <button
                  key={f.id}
                  onClick={() => downloadFile(f.id, f.blobUrl)}
                  className="inline-flex items-center gap-1.5 rounded border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-xs text-primary-700 hover:bg-primary-100 max-w-[220px] truncate"
                  title={f.fileName}
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  {f.fileName}
                  <span className="text-primary-400 shrink-0">({f.fileSizeMb.toFixed(1)} MB)</span>
                </button>
              ))}
            </div>
          </InfoSection>
        </div>
      )}
    </div>
  )
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] overflow-hidden bg-white shadow-card">
      <div className="bg-gray-50 border-b border-[#e5e7eb] px-3 py-2">
        <h4 className="text-xs font-display font-semibold text-gray-600">{title}</h4>
      </div>
      <div className="p-3 space-y-2.5">{children}</div>
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

const ACCEPT_ALL = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip'
const MAX_MB = 25

async function uploadProjectFile(projectId: string, file: File, category: string): Promise<void> {
  const token = localStorage.getItem('accessToken') ?? ''
  const res = await fetch(
    `${BASE_URL}/projects/${projectId}/files?category=${encodeURIComponent(category)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'X-Auth-Token': token,
      },
      body: file,
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? `Upload fejlede (${res.status})`)
  }
}

function FileUploadArea({
  projectId,
  category,
  accept = ACCEPT_ALL,
  maxFiles = 20,
  label = 'Træk filer hertil eller klik for at vælge',
  hint = `Maks ${MAX_MB} MB`,
  onUploaded,
}: {
  projectId: string
  category: string
  accept?: string
  maxFiles?: number
  label?: string
  hint?: string
  onUploaded: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError('')
    setUploading(true)
    try {
      const arr = Array.from(files).filter((f) => f.size <= MAX_MB * 1024 * 1024).slice(0, maxFiles)
      await Promise.all(arr.map((f) => uploadProjectFile(projectId, f, category)))
      onUploaded()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload fejlede')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [projectId, category, maxFiles, onUploaded])

  return (
    <div>
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors',
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-gray-100',
          uploading && 'opacity-60 pointer-events-none',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-6 w-6 text-gray-400 mb-2" />
        <p className="text-sm font-display font-medium text-gray-700">{uploading ? 'Uploader...' : label}</p>
        <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
        <input ref={inputRef} type="file" className="hidden" accept={accept} multiple onChange={(e) => handleFiles(e.target.files)} />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function FileList({ files }: { files: any[] }) {
  if (files.length === 0) return null
  return (
    <div className="space-y-1 mt-3">
      {files.map((f: any) => (
        <div key={f.id} className="flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-2">
          {f.fileType?.startsWith('image/') ? (
            <ImageIcon className="h-4 w-4 text-primary-500 shrink-0" />
          ) : (
            <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
          )}
          <span className="flex-1 text-xs text-gray-700 truncate">{f.fileName}</span>
          <span className="text-xs text-gray-400 shrink-0">{formatDate(f.createdAt)}</span>
        </div>
      ))}
    </div>
  )
}

function DocumentationTab({ projectId }: { projectId: string }) {
  const { data: files, refetch } = useApi<any>(`/projects/${projectId}/files`)
  const uploaded = Object.values(files?.statusUpdatePhotos ?? {}).flat() as any[]

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-sm font-display font-semibold text-gray-900 mb-1">Dokumentation</h3>
        <p className="text-xs text-gray-500">Upload billeder og filer som dokumentation for arbejdet på denne sag.</p>
      </div>
      <FileUploadArea
        projectId={projectId}
        category="status-update"
        accept="image/*,.pdf,.doc,.docx"
        label="Træk billeder eller filer hertil"
        hint="Billeder, PDF, Word · maks 25 MB per fil"
        onUploaded={refetch}
      />
      <FileList files={uploaded} />
    </div>
  )
}

function FinalReportTab({ projectId }: { projectId: string }) {
  const { data: files, refetch } = useApi<any>(`/projects/${projectId}/files`)
  const uploaded = Object.values(files?.finalReportFiles ?? {}).flat() as any[]
  const hasReport = uploaded.length > 0

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-sm font-display font-semibold text-gray-900 mb-1">Slutrapport</h3>
        <p className="text-xs text-gray-500">Upload slutrapporten for sagen som ét samlet dokument eller billede.</p>
      </div>

      {hasReport ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3 mb-4">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-display font-semibold text-green-900">Slutrapport indsendt</p>
            <p className="text-xs text-green-700 mt-0.5">{uploaded.length} fil{uploaded.length !== 1 ? 'er' : ''} uploadet</p>
          </div>
        </div>
      ) : null}

      <FileUploadArea
        projectId={projectId}
        category="final-report"
        accept=".pdf,.doc,.docx,image/*"
        label={hasReport ? 'Upload yderligere filer' : 'Upload slutrapport'}
        hint="PDF, Word, billeder · maks 25 MB"
        onUploaded={refetch}
      />
      <FileList files={uploaded} />
    </div>
  )
}

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { EntrepriseBadge, ApprovalBadge } from '@/components/ui/StatusBadges'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ImageGallery } from '@/components/files/ImageGallery'
import { WeekPlannerGrid } from '@/components/projects/WeekPlannerGrid'
import { formatDate, formatDateTime, getEntrepriseTypeLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, Entreprise } from '@/types'

const TABS = ['Oversigt', 'Fremgang', 'Beskeder', 'Filer']

export default function InsurerProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(parseInt(searchParams.get('tab') ?? '0'))

  const { data: project, loading } = useApi<Project>(`/projects/${projectId}`)
  const { data: entreprises } = useApi<Entreprise[]>(`/projects/${projectId}/entreprises`, { enabled: tab === 1 })

  useEffect(() => {
    setSearchParams(tab > 0 ? { tab: String(tab) } : {}, { replace: true })
  }, [tab, setSearchParams])

  if (loading) return <Skeleton />
  if (!project) return <div className="text-center py-16 text-gray-500">Sag ikke fundet</div>

  return (
    <div>
      <button onClick={() => navigate('/insurer/projects')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Mine sager
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-card p-4 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-mono text-xl font-bold text-gray-900">{project.claimId}</h1>
              <MilestoneBadge milestone={project.currentMilestone} />
            </div>
            <p className="text-base font-display font-semibold text-gray-700">{project.damageType}</p>
            <p className="text-sm text-gray-500">{project.address}, {project.postalCode} {project.city}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#e5e7eb] mb-6">
        <nav className="flex gap-0">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={cn('px-4 py-2.5 text-sm font-display font-medium border-b-2 transition-colors',
                tab === i ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >{t}</button>
          ))}
        </nav>
      </div>

      {tab === 0 && <InsurerOverviewTab project={project} />}
      {tab === 1 && <InsurerProgressTab project={project} entreprises={entreprises ?? []} />}
      {tab === 2 && <InsurerMessagesTab projectId={project.id} />}
      {tab === 3 && <InsurerFilesTab projectId={project.id} />}
    </div>
  )
}

function InsurerOverviewTab({ project }: { project: Project }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Sagsreference</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <Row label="Sags-ID" value={project.claimId} mono />
          <Row label="Forsikrings sags-ID" value={project.insurerCaseId} mono />
          <Row label="Police-nr." value={project.insurancePolicyNumber} mono />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Ejendom</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <Row label="Adresse" value={`${project.address}, ${project.postalCode} ${project.city}`} />
          <Row label="Bygningstype" value={project.buildingType} />
          <Row label="Skadetype" value={project.damageType} />
          <p className="text-xs text-gray-700 mt-2">{project.damageDescription}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Datoer</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <Row label="Oprettet" value={formatDate(project.createdAt)} />
          {project.requestedStartDate && <Row label="Ønsket start" value={formatDate(project.requestedStartDate)} />}
          {project.requestedDeadline && <Row label="Frist" value={formatDate(project.requestedDeadline)} />}
          {project.finalCompletionDate && <Row label="Afsluttet" value={formatDate(project.finalCompletionDate)} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Kontakt</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <p className="font-display font-medium text-sm text-gray-900">{project.contactName}</p>
          <a href={`tel:${project.contactPhone}`} className="flex items-center gap-2 text-xs text-primary-700 hover:underline">
            <Phone className="h-3.5 w-3.5" /> {project.contactPhone}
          </a>
          <a href={`mailto:${project.contactEmail}`} className="flex items-center gap-2 text-xs text-primary-700 hover:underline">
            <Mail className="h-3.5 w-3.5" /> {project.contactEmail}
          </a>
        </CardContent>
      </Card>

      {project.selectedContractor && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Valgt håndværker</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="font-display font-semibold text-gray-900">{project.selectedContractor.companyName}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InsurerProgressTab({ project, entreprises }: { project: Project; entreprises: Entreprise[] }) {
  const relevant = entreprises.filter((e) => e.isRelevant)
  const showWeekPlanner = project.currentMilestone === 'WORK_SCHEDULED' || project.currentMilestone === 'WORK_STARTED'

  return (
    <div className="space-y-6">
      {showWeekPlanner && (
        <WeekPlannerGrid
          projectId={project.id}
          entreprises={relevant}
          canEdit={false}
        />
      )}

      {!showWeekPlanner && relevant.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Ugeplanlægning er tilgængelig når arbejdet er planlagt
        </div>
      )}

      {relevant.length > 0 && (
        <div className="space-y-3">
          {relevant.map((e) => (
            <div key={e.id} className="bg-white rounded-lg border border-[#e5e7eb] shadow-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-display font-medium text-sm text-gray-900">{getEntrepriseTypeLabel(e.type)}</span>
                  <EntrepriseBadge milestone={e.currentMilestone} />
                </div>
              </div>
              {e.statusUpdates?.filter((u) => u.approvalStatus === 'APPROVED').map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-xs text-gray-600 py-1 border-t border-gray-100 first:border-0">
                  <span className="text-gray-400">{formatDateTime(u.createdAt)}</span>
                  <EntrepriseBadge milestone={u.milestone} />
                  {u.comments && <span className="text-gray-500 truncate">{u.comments}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InsurerMessagesTab({ projectId }: { projectId: string }) {
  return <ChatPanel projectId={projectId} singleChannel className="h-[560px]" />
}

function InsurerFilesTab({ projectId }: { projectId: string }) {
  const { data, loading } = useApi<{ files: { id: string; fileName: string; fileType: string; blobUrl: string; fileSizeMb: number }[] }>(
    `/projects/${projectId}/files?clientVisible=true`,
  )
  const images = data?.files.filter(f => f.fileType.startsWith('image/')) ?? []
  const others = data?.files.filter(f => !f.fileType.startsWith('image/')) ?? []

  if (loading) return <div className="h-32 bg-gray-200 animate-pulse rounded-lg" />

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div>
          <h3 className="text-sm font-display font-semibold text-gray-900 mb-2">Billeder</h3>
          <ImageGallery images={images} />
        </div>
      )}
      {others.length > 0 && (
        <div>
          <h3 className="text-sm font-display font-semibold text-gray-900 mb-2">Dokumenter</h3>
          <div className="divide-y divide-[#e5e7eb] rounded-lg border border-[#e5e7eb] bg-white shadow-card">
            {others.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-900">{f.fileName}</span>
                <a href={f.blobUrl} download className="text-xs text-primary-600 hover:underline">Download</a>
              </div>
            ))}
          </div>
        </div>
      )}
      {!images.length && !others.length && (
        <div className="text-center py-8 text-sm text-gray-400">Ingen filer tilgængelige</div>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-display text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

function Skeleton() {
  return <div className="space-y-6 animate-pulse"><div className="h-8 w-32 bg-gray-200 rounded" /><div className="h-24 bg-gray-200 rounded-lg" /><div className="h-64 bg-gray-200 rounded-lg" /></div>
}

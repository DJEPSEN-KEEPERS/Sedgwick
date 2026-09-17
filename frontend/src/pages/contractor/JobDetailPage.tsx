import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { ArrowLeft, Camera, FileText, CheckCircle, Clock, MapPin, Phone, Mail, AlertCircle, Paperclip, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MilestoneBadge, ApprovalBadge } from '@/components/ui/StatusBadges'
import { EmptyState } from '@/components/ui/EmptyState'
import { WeekPlannerGrid } from '@/components/projects/WeekPlannerGrid'
import { EntreprisesTab } from '@/components/projects/tabs/EntreprisesTab'
import { formatDate, formatCurrency, formatRelativeTime, getEntrepriseTypeLabel, getEntrepriseMilestoneLabel } from '@/lib/utils'
import type { Project, EntrepriseType, EntrepriseMilestone, Bid } from '@/types'

type Tab = 'overview' | 'entreprises' | 'planning' | 'updates' | 'report'

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
          { key: 'updates', label: 'Statusopdateringer' },
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
        {tab === 'entreprises' && <EntreprisesTab projectId={project.id} allTypes />}
        {tab === 'planning'  && (
          <WeekPlannerGrid
            projectId={project.id}
            entreprises={myEntreprises.filter((e) => e.isRelevant !== false)}
            canEdit
          />
        )}
        {tab === 'updates'   && <UpdatesTab entreprises={myEntreprises} navigate={navigate} />}
        {tab === 'report'    && <ReportTab entreprises={myEntreprises} navigate={navigate} />}
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

function UpdatesTab({ entreprises, navigate }: { entreprises: any[]; navigate: ReturnType<typeof useNavigate> }) {
  if (entreprises.length === 0) {
    return <EmptyState icon={Camera} title="Ingen entrepriser" description="Du har ingen entrepriser på denne sag." />
  }

  return (
    <div className="space-y-4">
      {entreprises.map((e) => {
        const latestUpdate = e.statusUpdates?.[0]
        const canSubmit = e.currentMilestone !== 'SIGNED_OFF'

        return (
          <div key={e.id} className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-card">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-[#e5e7eb]">
              <span className="font-display font-semibold text-sm text-gray-900">
                {getEntrepriseTypeLabel(e.type as EntrepriseType)}
              </span>
              <Badge variant="info">{getEntrepriseMilestoneLabel(e.currentMilestone)}</Badge>
            </div>

            <div className="p-4 space-y-3">
              {latestUpdate ? (
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-900">Seneste opdatering: </span>
                  {latestUpdate.comments || getEntrepriseMilestoneLabel(latestUpdate.milestone)}
                  <span className="text-gray-400 ml-1">· {formatRelativeTime(latestUpdate.createdAt)}</span>
                  {latestUpdate.approvalStatus && (
                    <span className="ml-2">
                      <ApprovalBadge status={latestUpdate.approvalStatus} />
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Ingen opdateringer endnu</p>
              )}

              {canSubmit && (
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => navigate(`/contractor/status-update/${e.id}`)}
                >
                  <Camera className="h-4 w-4" />
                  Ny statusopdatering
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ReportTab({ entreprises, navigate }: { entreprises: any[]; navigate: ReturnType<typeof useNavigate> }) {
  if (entreprises.length === 0) {
    return <EmptyState icon={FileText} title="Ingen entrepriser" />
  }

  return (
    <div className="space-y-4">
      {entreprises.map((e) => {
        const report = e.finalReport
        const canSubmit = e.currentMilestone === 'COMPLETED' || e.currentMilestone === 'IN_PROGRESS'

        return (
          <div key={e.id} className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-card">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-[#e5e7eb]">
              <span className="font-display font-semibold text-sm text-gray-900">
                {getEntrepriseTypeLabel(e.type as EntrepriseType)}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {report ? (
                <div className="space-y-2">
                  {report.approvalStatus === 'REJECTED' ? (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-red-800">Slutrapport afvist af Sedgwick</p>
                        {report.submittedAt && (
                          <p className="text-xs text-red-700 mt-0.5">Indsendt {formatDate(report.submittedAt)}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-gray-900">Slutrapport indsendt</span>
                    </div>
                  )}
                  {report.approvalStatus !== 'REJECTED' && report.submittedAt && (
                    <p className="text-xs text-gray-500">{formatDate(report.submittedAt)}</p>
                  )}
                  <ApprovalBadge status={report.approvalStatus} />
                  {report.approvalStatus === 'REJECTED' && (
                    <Button
                      size="sm"
                      className="w-full gap-2 mt-1 border-red-300 text-red-700 hover:bg-red-50"
                      variant="secondary"
                      onClick={() => navigate(`/contractor/final-report/${e.id}`)}
                    >
                      <AlertCircle className="h-4 w-4" />
                      Rediger og genindsend
                    </Button>
                  )}
                </div>
              ) : canSubmit ? (
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => navigate(`/contractor/final-report/${e.id}`)}
                >
                  <FileText className="h-4 w-4" />
                  Indsend slutrapport
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="h-4 w-4" />
                  Entreprisen skal være afsluttet før slutrapport kan indsendes
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { ArrowLeft, Camera, FileText, CheckCircle, Clock, MapPin, Phone, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MilestoneBadge, ApprovalBadge } from '@/components/ui/StatusBadges'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatRelativeTime, getEntrepriseTypeLabel, getEntrepriseMilestoneLabel } from '@/lib/utils'
import type { Project, EntrepriseType, EntrepriseMilestone } from '@/types'

type Tab = 'overview' | 'updates' | 'report'

export default function JobDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: project, loading } = useApi<Project>(projectId ? `/projects/${projectId}` : null)

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="h-60 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!project) return null

  const myEntreprises = project.entreprises ?? []

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e5e7eb] px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Tilbage
        </button>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary-700">{project.claimId}</span>
              <MilestoneBadge milestone={project.currentMilestone} />
            </div>
            <h1 className="font-display font-bold text-gray-900 text-base mt-0.5 leading-tight">
              {project.address}, {project.city}
            </h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e5e7eb] bg-white sticky top-[84px] z-10">
        {([
          { key: 'overview', label: 'Overblik' },
          { key: 'updates', label: 'Statusopdateringer' },
          { key: 'report', label: 'Slutrapport' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-xs font-display font-semibold border-b-2 transition-colors ${
              tab === key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'overview' && <OverviewTab project={project} />}
        {tab === 'updates' && <UpdatesTab entreprises={myEntreprises} navigate={navigate} />}
        {tab === 'report' && <ReportTab entreprises={myEntreprises} navigate={navigate} />}
      </div>
    </div>
  )
}

function OverviewTab({ project }: { project: Project }) {
  const myEntreprises = project.entreprises ?? []

  return (
    <div className="space-y-4">
      {/* Project info */}
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 space-y-3">
        <h3 className="font-display font-semibold text-sm text-gray-900">Sagsinfo</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2 text-gray-600">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
            {project.address}, {project.postalCode} {project.city}
          </div>
          {project.contactPhone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 shrink-0 text-gray-400" />
              <a href={`tel:${project.contactPhone}`} className="text-primary-600">{project.contactPhone}</a>
              <span className="text-gray-400">({project.contactName})</span>
            </div>
          )}
          {project.requestedDeadline && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 shrink-0 text-gray-400" />
              Frist: {formatDate(project.requestedDeadline)}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Samlet fremgang</span>
            <span className="text-xs font-semibold text-gray-900">{project.progressPercent}%</span>
          </div>
          <Progress value={project.progressPercent} className="h-2" />
        </div>
      </div>

      {/* My entreprises */}
      {myEntreprises.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-sm text-gray-900">Mine entrepriser</h3>
          {myEntreprises.map((e) => (
            <div key={e.id} className="rounded-xl border border-[#e5e7eb] bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-sm text-gray-900">
                  {getEntrepriseTypeLabel(e.type)}
                </span>
                <Badge variant="info">{getEntrepriseMilestoneLabel(e.currentMilestone as EntrepriseMilestone)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={e.progressPercent} className="h-1.5 flex-1" />
                <span className="text-xs text-gray-500">{e.progressPercent}%</span>
              </div>
              {e.scheduledStart && (
                <p className="text-xs text-gray-500">Start: {formatDate(e.scheduledStart)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
          <div key={e.id} className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
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
          <div key={e.id} className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-[#e5e7eb]">
              <span className="font-display font-semibold text-sm text-gray-900">
                {getEntrepriseTypeLabel(e.type as EntrepriseType)}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {report ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-900">Slutrapport indsendt</span>
                  </div>
                  {report.submittedAt && (
                    <p className="text-xs text-gray-500">{formatDate(report.submittedAt)}</p>
                  )}
                  <ApprovalBadge status={report.approvalStatus} />
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

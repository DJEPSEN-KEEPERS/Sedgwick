import { useNavigate } from 'react-router-dom'
import { useApi, useMutation } from '@/hooks/useApi'
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getEntrepriseTypeLabel, formatDateTime, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { EntrepriseType } from '@/types'

interface PendingApproval {
  statusUpdates: StatusUpdateItem[]
  finalReports: FinalReportItem[]
}

interface StatusUpdateItem {
  id: string
  projectId: string
  projectClaimId: string
  entrepriseType: EntrepriseType
  contractorName: string
  milestone: string
  progressPercent: number
  comments?: string
  attachments: { id: string; blobUrl: string; fileType: string; fileName: string }[]
  submittedAt: string
}

interface FinalReportItem {
  id: string
  projectId: string
  projectClaimId: string
  entrepriseType: EntrepriseType
  contractorName: string
  summary?: string
  answers: { questionLabel: string; answerValue: string }[]
  attachments: { id: string; blobUrl: string; fileType: string; fileName: string }[]
  submittedAt: string
}

export default function ApprovalsPage() {
  const navigate = useNavigate()
  const { data, loading, refetch } = useApi<PendingApproval>('/approvals/pending')
  const { mutate: approve } = useMutation('post')
  const { mutate: reject } = useMutation('post')

  const handleApproveUpdate = async (id: string) => { await approve(`/status-updates/${id}/approve`); refetch() }
  const handleRejectUpdate = async (id: string) => { await reject(`/status-updates/${id}/reject`); refetch() }
  const handleApproveReport = async (id: string) => { await approve(`/final-reports/${id}/approve`); refetch() }
  const handleRejectReport = async (id: string) => { await reject(`/final-reports/${id}/reject`); refetch() }

  const totalPending = (data?.statusUpdates.length ?? 0) + (data?.finalReports.length ?? 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Godkendelseskø</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalPending > 0 ? `${totalPending} elementer afventer` : 'Ingen ventende godkendelser'}
          </p>
        </div>
        {totalPending > 0 && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-white text-sm font-display font-bold">
            {totalPending}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton />
      ) : totalPending === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
          <p className="font-display font-semibold text-gray-700">Ingen ventende godkendelser</p>
          <p className="text-sm text-gray-400 mt-1">Alle opdateringer er behandlet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Status updates */}
          {(data?.statusUpdates.length ?? 0) > 0 && (
            <section>
              <h2 className="text-base font-display font-semibold text-gray-900 mb-4">
                Statusopdateringer ({data!.statusUpdates.length})
              </h2>
              <div className="space-y-4">
                {data!.statusUpdates
                  .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
                  .map((item) => (
                    <StatusUpdateCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApproveUpdate(item.id)}
                      onReject={() => handleRejectUpdate(item.id)}
                      onView={() => navigate(`/sedgwick/projects/${item.projectId}?tab=progress`)}
                    />
                  ))}
              </div>
            </section>
          )}

          {/* Final reports */}
          {(data?.finalReports.length ?? 0) > 0 && (
            <section>
              <h2 className="text-base font-display font-semibold text-gray-900 mb-4">
                Slutrapporter ({data!.finalReports.length})
              </h2>
              <div className="space-y-4">
                {data!.finalReports
                  .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
                  .map((item) => (
                    <FinalReportCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApproveReport(item.id)}
                      onReject={() => handleRejectReport(item.id)}
                      onView={() => navigate(`/sedgwick/projects/${item.projectId}?tab=progress`)}
                    />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

const TYPE_ICON: Record<string, string> = {
  CARPENTER: '🪚', MASON: '🧱', PLUMBER: '🔧', GLAZIER: '🪟',
  ELECTRICIAN: '⚡', PAINTER: '🎨', ROOFER: '🏠', OTHER: '📋',
}

function ApprovalActions({ onApprove, onReject, onView }: { onApprove: () => void; onReject: () => void; onView: () => void }) {
  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#e5e7eb]">
      <button
        onClick={onApprove}
        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-200 font-display font-semibold transition-colors"
      >
        <CheckCircle2 className="h-4 w-4" /> Godkend
      </button>
      <button
        onClick={onReject}
        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 font-display font-semibold transition-colors"
      >
        <XCircle className="h-4 w-4" /> Afvis
      </button>
      <button
        onClick={onView}
        className="ml-auto flex items-center gap-1 text-xs text-primary-600 hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Se fuld sag
      </button>
    </div>
  )
}

function StatusUpdateCard({ item, onApprove, onReject, onView }: { item: StatusUpdateItem; onApprove: () => void; onReject: () => void; onView: () => void }) {
  return (
    <Card className="border-l-4 border-l-warning">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{TYPE_ICON[item.entrepriseType]}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-gray-900">
                  {getEntrepriseTypeLabel(item.entrepriseType)}
                </span>
                <span className="font-mono text-xs text-primary-700">#{item.projectClaimId}</span>
              </div>
              <p className="text-xs text-gray-500">{item.contractorName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{formatRelativeTime(item.submittedAt)}</p>
            <Badge variant="warning" className="mt-0.5">Afventer</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <p className="text-xs text-gray-500">Milestone</p>
            <p className="font-display font-medium text-gray-900">{item.milestone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fremgang</p>
            <p className="font-display font-medium text-gray-900">{item.progressPercent}%</p>
          </div>
        </div>

        {item.comments && (
          <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mb-3">{item.comments}</p>
        )}

        {item.attachments.filter(a => a.fileType.startsWith('image/')).length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {item.attachments.filter(a => a.fileType.startsWith('image/')).map((a) => (
              <a key={a.id} href={a.blobUrl} target="_blank" rel="noopener noreferrer">
                <img src={a.blobUrl} alt={a.fileName} className="h-16 w-16 object-cover rounded border border-gray-200 hover:opacity-80" />
              </a>
            ))}
          </div>
        )}

        <ApprovalActions onApprove={onApprove} onReject={onReject} onView={onView} />
      </CardContent>
    </Card>
  )
}

function FinalReportCard({ item, onApprove, onReject, onView }: { item: FinalReportItem; onApprove: () => void; onReject: () => void; onView: () => void }) {
  return (
    <Card className="border-l-4 border-l-info">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{TYPE_ICON[item.entrepriseType]}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-gray-900">Slutrapport — {getEntrepriseTypeLabel(item.entrepriseType)}</span>
                <span className="font-mono text-xs text-primary-700">#{item.projectClaimId}</span>
              </div>
              <p className="text-xs text-gray-500">{item.contractorName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{formatRelativeTime(item.submittedAt)}</p>
            <Badge variant="info" className="mt-0.5">Slutrapport</Badge>
          </div>
        </div>

        {item.summary && (
          <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mb-3">{item.summary}</p>
        )}

        {item.answers.length > 0 && (
          <div className="space-y-1 mb-3">
            {item.answers.map((a, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-gray-500 shrink-0 w-32 text-xs">{a.questionLabel}</span>
                <span className="text-gray-900 text-xs">{a.answerValue}</span>
              </div>
            ))}
          </div>
        )}

        <ApprovalActions onApprove={onApprove} onReject={onReject} onView={onView} />
      </CardContent>
    </Card>
  )
}

function Skeleton() {
  return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-lg" />)}</div>
}

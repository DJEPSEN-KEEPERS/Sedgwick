import { useApi, useMutation } from '@/hooks/useApi'
import { ProjectProgressBar } from '@/components/ui/ProjectProgressBar'
import { EntrepriseBadge, ApprovalBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { getEntrepriseTypeLabel, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, Entreprise, EntrepriseStatusUpdate } from '@/types'

export function ProgressTab({ project }: { project: Project }) {
  const { data: entreprises, loading, refetch } = useApi<Entreprise[]>(
    `/projects/${project.id}/entreprises`,
  )
  const { mutate: approve } = useMutation('post')
  const { mutate: reject } = useMutation('post')

  const relevant = entreprises?.filter((e) => e.isRelevant) ?? []
  const pendingCount = relevant.reduce(
    (n, e) => n + (e.statusUpdates?.filter((u) => u.approvalStatus === 'PENDING').length ?? 0),
    0,
  )

  const handleApprove = async (updateId: string) => {
    await approve(`/status-updates/${updateId}/approve`)
    refetch()
  }
  const handleReject = async (updateId: string) => {
    await reject(`/status-updates/${updateId}/reject`)
    refetch()
  }

  const overallProgress = relevant.length
    ? Math.round(relevant.reduce((s, e) => s + e.progressPercent, 0) / relevant.length)
    : 0

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
          <span className="text-orange-600 font-display font-semibold text-sm">
            {pendingCount} statusopdatering{pendingCount > 1 ? 'er' : ''} afventer godkendelse
          </span>
          <a href="/sedgwick/approvals" className="text-xs text-orange-700 underline hover:no-underline">
            Åbn godkendelseskø
          </a>
        </div>
      )}

      {/* Overall milestone stepper */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-display font-semibold text-gray-900">Samlet fremgang</h3>
          <span className="text-sm font-display font-bold text-primary-700">{overallProgress}%</span>
        </div>
        <ProjectProgressBar currentMilestone={project.currentMilestone} className="mb-4" />
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Entreprise accordions */}
      {loading ? (
        <Skeleton />
      ) : relevant.length === 0 ? (
        <Empty />
      ) : (
        relevant.map((e) => (
          <EntrepriseAccordion
            key={e.id}
            entreprise={e}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))
      )}
    </div>
  )
}

const TYPE_ICON: Record<string, string> = {
  CARPENTER: '🪚', MASON: '🧱', PLUMBER: '🔧', GLAZIER: '🪟',
  ELECTRICIAN: '⚡', PAINTER: '🎨', ROOFER: '🏠', OTHER: '📋',
}

function EntrepriseAccordion({
  entreprise,
  onApprove,
  onReject,
}: {
  entreprise: Entreprise
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const updates = entreprise.statusUpdates ?? []
  const hasPending = updates.some((u) => u.approvalStatus === 'PENDING')

  return (
    <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e5e7eb]">
        <span className="text-lg">{TYPE_ICON[entreprise.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-gray-900 text-sm">
              {getEntrepriseTypeLabel(entreprise.type)}
            </span>
            <EntrepriseBadge milestone={entreprise.currentMilestone} />
            {hasPending && (
              <Badge variant="warning" className="text-xs">Afventer godkendelse</Badge>
            )}
          </div>
          {entreprise.contractor && (
            <p className="text-xs text-gray-500">{entreprise.contractor.companyName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Progress value={entreprise.progressPercent} className="h-1.5 w-16" />
          <span className="text-xs font-display font-semibold text-gray-700 w-8 text-right">
            {entreprise.progressPercent}%
          </span>
        </div>
      </div>

      {updates.length > 0 && (
        <div className="px-4 py-3 space-y-3">
          {updates.map((u) => (
            <UpdateItem key={u.id} update={u} onApprove={onApprove} onReject={onReject} />
          ))}
        </div>
      )}

      {updates.length === 0 && (
        <div className="px-4 py-4 text-center text-xs text-gray-400">Ingen opdateringer endnu</div>
      )}
    </div>
  )
}

function UpdateItem({
  update,
  onApprove,
  onReject,
}: {
  update: EntrepriseStatusUpdate
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        update.approvalStatus === 'PENDING'
          ? 'border-orange-200 bg-orange-50'
          : update.approvalStatus === 'APPROVED'
            ? 'border-green-200 bg-green-50'
            : 'border-gray-200 bg-gray-50',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <EntrepriseBadge milestone={update.milestone} />
          <span className="text-xs text-gray-600">{update.progressPercent}%</span>
          <ApprovalBadge status={update.approvalStatus} />
        </div>
        {update.comments && (
          <p className="text-xs text-gray-700 mb-1">{update.comments}</p>
        )}
        {update.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {update.attachments.filter(a => a.fileType.startsWith('image/')).slice(0, 4).map((a) => (
              <a key={a.id} href={a.blobUrl} target="_blank" rel="noopener noreferrer"
                className="block h-12 w-12 rounded overflow-hidden border border-gray-200 hover:opacity-80">
                <img src={a.blobUrl} alt={a.fileName} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatDateTime(update.createdAt)}</p>
      </div>
      {update.approvalStatus === 'PENDING' && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onApprove(update.id)}
            className="rounded px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 font-display font-medium"
          >
            Godkend
          </button>
          <button
            onClick={() => onReject(update.id)}
            className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 font-display font-medium"
          >
            Afvis
          </button>
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return <div className="space-y-3 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-lg" />)}</div>
}

function Empty() {
  return <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">Ingen relevante entrepriser registreret</div>
}

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/useApi'
import { EntrepriseBadge, ApprovalBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getEntrepriseTypeLabel, formatDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Entreprise, EntrepriseType, EntrepriseMilestone } from '@/types'

const ALL_TYPES: EntrepriseType[] = [
  'CARPENTER', 'MASON', 'PLUMBER', 'GLAZIER', 'ELECTRICIAN', 'PAINTER', 'ROOFER', 'OTHER',
]

const TYPE_ICON: Record<EntrepriseType, string> = {
  CARPENTER: '🪚', MASON: '🧱', PLUMBER: '🔧', GLAZIER: '🪟',
  ELECTRICIAN: '⚡', PAINTER: '🎨', ROOFER: '🏠', OTHER: '📋',
}

const MILESTONE_OPTIONS: { value: EntrepriseMilestone; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Ikke startet' },
  { value: 'SCHEDULED', label: 'Planlagt' },
  { value: 'IN_PROGRESS', label: 'I gang' },
  { value: 'COMPLETED', label: 'Afsluttet' },
  { value: 'SIGNED_OFF', label: 'Godkendt' },
]

export function EntreprisesTab({ projectId, allTypes = false }: { projectId: string; allTypes?: boolean }) {
  const { data: entreprises, loading, refetch } = useApi<Entreprise[]>(
    `/projects/${projectId}/entreprises${allTypes ? '?all=true' : ''}`,
  )
  const { mutate: toggleRelevanceMutation } = useMutation('patch')
  const { mutate: approveMutation } = useMutation('post')
  const { mutate: rejectMutation } = useMutation('post')
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) return <Skeleton />

  const entrepriseMap = new Map(entreprises?.map((e) => [e.type, e]) ?? [])

  const toggleRelevance = async (type: EntrepriseType, currentValue: boolean) => {
    await toggleRelevanceMutation(`/projects/${projectId}/entreprises/${type}/relevance`, { isRelevant: !currentValue })
    refetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-semibold text-gray-900">Entrepriser (8 typer)</h3>
        <Badge variant="gray" className="text-xs">
          {entreprises?.filter((e) => e.isRelevant).length ?? 0} relevante
        </Badge>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500 w-8" />
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Fag</th>
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Relevant</th>
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Håndværker</th>
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500 w-32">Fremgang</th>
            </tr>
          </thead>
          <tbody>
            {ALL_TYPES.map((type) => {
              const e = entrepriseMap.get(type)
              const isExpanded = expanded === type
              return (
                <EntrepriseRow
                  key={type}
                  type={type}
                  entreprise={e}
                  isExpanded={isExpanded}
                  onToggleExpand={() => setExpanded(isExpanded ? null : type)}
                  onToggleRelevance={() => toggleRelevance(type, e?.isRelevant ?? false)}
                  onApprove={async (updateId) => { await approveMutation(`/status-updates/${updateId}/approve`); refetch() }}
                  onReject={async (updateId) => { await rejectMutation(`/status-updates/${updateId}/reject`); refetch() }}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EntrepriseRow({
  type,
  entreprise,
  isExpanded,
  onToggleExpand,
  onToggleRelevance,
  onApprove,
  onReject,
}: {
  type: EntrepriseType
  entreprise?: Entreprise
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleRelevance: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const isRelevant = entreprise?.isRelevant ?? false

  return (
    <>
      <tr
        className={cn(
          'border-b border-[#e5e7eb] hover:bg-gray-50',
          isRelevant && 'cursor-pointer',
        )}
        onClick={isRelevant ? onToggleExpand : undefined}
      >
        <td className="px-4 py-3">
          {isRelevant && (
            <span className="text-gray-400">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span>{TYPE_ICON[type]}</span>
            <span className="text-sm font-display font-medium text-gray-900">{getEntrepriseTypeLabel(type)}</span>
          </div>
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleRelevance}
            className={cn(
              'flex items-center gap-1.5 text-xs font-display font-medium rounded-full px-2 py-0.5 transition-colors',
              isRelevant
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            )}
          >
            {isRelevant ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Ja</>
            ) : (
              <><XCircle className="h-3.5 w-3.5" /> Nej</>
            )}
          </button>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">
          {entreprise?.contractor?.companyName ?? '—'}
        </td>
        <td className="px-4 py-3">
          {isRelevant && entreprise ? (
            <EntrepriseBadge milestone={entreprise.currentMilestone} />
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isRelevant && entreprise ? (
            <div className="flex items-center gap-2">
              <Progress value={entreprise.progressPercent} className="h-1.5 w-20" />
              <span className="text-xs text-gray-500 w-8">{entreprise.progressPercent}%</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
      </tr>

      {isExpanded && entreprise && (
        <tr>
          <td colSpan={6} className="bg-gray-50 border-b border-[#e5e7eb] px-8 py-4">
            <EntrepriseDetail
              entreprise={entreprise}
              onApprove={onApprove}
              onReject={onReject}
            />
          </td>
        </tr>
      )}
    </>
  )
}

function EntrepriseDetail({
  entreprise,
  onApprove,
  onReject,
}: {
  entreprise: Entreprise
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-sm">
        {entreprise.scheduledStart && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Planlagt start</p>
            <p className="font-display font-medium">{formatDate(entreprise.scheduledStart)}</p>
          </div>
        )}
        {entreprise.scheduledEnd && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Planlagt slut</p>
            <p className="font-display font-medium">{formatDate(entreprise.scheduledEnd)}</p>
          </div>
        )}
        {entreprise.description && (
          <div className="col-span-3">
            <p className="text-xs text-gray-500 mb-0.5">Beskrivelse</p>
            <p className="text-sm text-gray-700">{entreprise.description}</p>
          </div>
        )}
      </div>

      {entreprise.statusUpdates && entreprise.statusUpdates.length > 0 && (
        <div>
          <p className="text-xs font-display font-semibold text-gray-700 mb-2">Statusopdateringer</p>
          <div className="space-y-2">
            {entreprise.statusUpdates.map((u) => (
              <div key={u.id} className="flex items-start gap-3 rounded-lg border border-[#e5e7eb] bg-white p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <EntrepriseBadge milestone={u.milestone} />
                    <span className="text-xs text-gray-500">{u.progressPercent}%</span>
                    <ApprovalBadge status={u.approvalStatus} />
                  </div>
                  {u.comments && <p className="text-xs text-gray-700">{u.comments}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(u.createdAt)}</p>
                </div>
                {u.approvalStatus === 'PENDING' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onApprove(u.id)}
                      className="rounded px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 font-display font-medium"
                    >
                      Godkend
                    </button>
                    <button
                      onClick={() => onReject(u.id)}
                      className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 font-display font-medium"
                    >
                      Afvis
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
    </div>
  )
}

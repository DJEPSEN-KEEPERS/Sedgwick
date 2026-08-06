import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi, useMutation } from '@/hooks/useApi'
import { Mail, ChevronRight, MapPin, Calendar, CheckCircle, XCircle, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { BidInvitation } from '@/types'

const ENTREPRISE_TYPE_DK: Record<string, string> = {
  CARPENTER: 'Tømrer',
  MASON: 'Murer',
  PLUMBER: 'VVS',
  GLAZIER: 'Glarmester',
  ELECTRICIAN: 'El',
  PAINTER: 'Maler',
  ROOFER: 'Tagdækker',
  OTHER: 'Andet',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Afventer',
  INTERESTED: 'Interesseret',
  NOT_INTERESTED: 'Ikke interesseret',
}

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  INTERESTED: 'success',
  NOT_INTERESTED: 'danger',
}

export default function InvitationsPage() {
  const navigate = useNavigate()
  const { data: invitations, loading, refetch } = useApi<BidInvitation[]>('/contractor/invitations')
  const { mutate: respond, loading: responding } = useMutation('post')
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const handleRespond = async (id: string, status: 'INTERESTED' | 'NOT_INTERESTED') => {
    setRespondingId(id)
    await respond(`/contractor/invitations/${id}/respond`, { status })
    setRespondingId(null)
    refetch()
  }

  const pending = invitations?.filter((i) => i.status === 'PENDING') ?? []
  const responded = invitations?.filter((i) => i.status !== 'PENDING') ?? []

  return (
    <div className="p-4 space-y-5">
      <div>
        <h1 className="text-xl font-display font-bold text-gray-900">Invitationer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sager du er inviteret til at byde på</p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-gray-200 rounded-xl" />)}
        </div>
      ) : !invitations?.length ? (
        <EmptyState
          icon={Mail}
          title="Ingen invitationer"
          description="Du har ikke modtaget invitationer til at byde på sager endnu."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h2 className="font-display font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
                Afventer svar ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    onRespond={handleRespond}
                    responding={respondingId === inv.id || responding}
                    onBidSubmit={() => navigate(`/contractor/bids/submit/${inv.projectId}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {responded.length > 0 && (
            <section>
              <h2 className="font-display font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">
                Tidligere svar ({responded.length})
              </h2>
              <div className="space-y-3">
                {responded.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    onRespond={handleRespond}
                    responding={false}
                    onBidSubmit={() => navigate(`/contractor/bids/submit/${inv.projectId}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function InvitationCard({
  invitation,
  onRespond,
  responding,
  onBidSubmit,
}: {
  invitation: BidInvitation
  onRespond: (id: string, status: 'INTERESTED' | 'NOT_INTERESTED') => void
  responding: boolean
  onBidSubmit: () => void
}) {
  const project = invitation.project as any
  const hasBid = !!invitation.bid

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-[#e5e7eb]">
        <span className="font-mono text-xs font-semibold text-primary-700">{project?.claimId}</span>
        <Badge variant={STATUS_VARIANT[invitation.status] ?? 'gray'}>
          {STATUS_LABEL[invitation.status] ?? invitation.status}
        </Badge>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        <p className="font-display font-semibold text-sm text-gray-900">
          {project?.damageType} — {project?.buildingType ?? ''}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {project?.address}, {project?.city}
        </div>

        {project?.requestedDeadline && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Frist: {formatDate(project.requestedDeadline)}
          </div>
        )}

        {project?.maxApprovedPrice && (
          <div className="text-xs text-gray-500">
            Maks. godkendt beløb: <span className="font-semibold text-gray-900">{formatCurrency(project.maxApprovedPrice)}</span>
          </div>
        )}

        {project?.entreprises?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {project.entreprises.map((e: any) => (
              <span key={e.id} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700 font-medium">
                {ENTREPRISE_TYPE_DK[e.type] ?? e.type}
              </span>
            ))}
          </div>
        )}

        {project?.attachments?.length > 0 && (
          <div className="pt-1">
            <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Paperclip className="h-3.5 w-3.5" />
              Filer fra Sedgwick ({project.attachments.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {project.attachments.map((f: any) => (
                <a
                  key={f.id}
                  href={f.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs text-primary-700 hover:bg-primary-100 truncate max-w-[180px]"
                  title={f.fileName}
                >
                  {f.fileName}
                </a>
              ))}
            </div>
          </div>
        )}

        {invitation.bid && (
          <p className="text-xs text-green-700 font-semibold">
            Bud afgivet: {formatCurrency((invitation.bid as any).bidAmount)}
          </p>
        )}
      </div>

      {/* Actions */}
      {invitation.status === 'PENDING' && (
        <div className="flex gap-2 px-4 pb-4">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onRespond(invitation.id, 'NOT_INTERESTED')}
            disabled={responding}
          >
            <XCircle className="h-4 w-4" />
            Ikke interesseret
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => onRespond(invitation.id, 'INTERESTED')}
            disabled={responding}
          >
            <CheckCircle className="h-4 w-4" />
            Interesseret
          </Button>
        </div>
      )}

      {invitation.status === 'INTERESTED' && !hasBid && (
        <div className="px-4 pb-4">
          <Button size="sm" className="w-full gap-1.5" onClick={onBidSubmit}>
            <ChevronRight className="h-4 w-4" />
            Afgiv bud
          </Button>
        </div>
      )}
    </div>
  )
}

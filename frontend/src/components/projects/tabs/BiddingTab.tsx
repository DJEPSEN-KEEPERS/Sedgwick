import { useState } from 'react'
import { Star, Plus, X, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/useApi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Contractor, BidInvitation, Bid } from '@/types'

interface Recommendation {
  contractorId: string
  companyName: string
  totalScore: number
  matchReasons: string[]
  breakdown: { regionScore: number; skillScore: number; ratingScore: number; workloadScore: number }
  contractor: Contractor
}

export function BiddingTab({ projectId }: { projectId: string }) {
  const { data: recommendations, loading: recLoading, refetch: refetchRec } =
    useApi<Recommendation[]>(`/projects/${projectId}/recommendations`)
  const { data: invitations, loading: invLoading, refetch: refetchInv } =
    useApi<BidInvitation[]>(`/projects/${projectId}/invitations`)
  const { data: bids, loading: bidsLoading, refetch: refetchBids } =
    useApi<Bid[]>(`/projects/${projectId}/bids`)

  const { mutate: invite } = useMutation('post')
  const { mutate: cancelInvite } = useMutation('delete')
  const { mutate: selectBid, loading: selecting } = useMutation('post')
  const [expandedBid, setExpandedBid] = useState<string | null>(null)
  const [confirmSelect, setConfirmSelect] = useState<string | null>(null)

  const handleInvite = async (contractorId: string) => {
    await invite(`/projects/${projectId}/invite`, { contractorId })
    refetchInv()
    refetchRec()
  }

  const handleCancelInvite = async (invitationId: string) => {
    await cancelInvite(`/invitations/${invitationId}`)
    refetchInv()
  }

  const handleSelectBid = async (bidId: string) => {
    await selectBid(`/bids/${bidId}/select`)
    setConfirmSelect(null)
    refetchBids()
  }

  const selectedBid = bids?.find((b) => b.isSelected)
  const invitedIds = new Set(invitations?.map((i) => i.contractorId) ?? [])

  return (
    <div className="space-y-8">
      {/* Section 1: Selected Contractor */}
      {selectedBid && (
        <section>
          <h3 className="text-sm font-display font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Valgt håndværker
          </h3>
          <Card className="ring-2 ring-success">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 font-display font-semibold text-sm">
                    {getInitials(selectedBid.contractor?.companyName ?? '')}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-gray-900">{selectedBid.contractor?.companyName}</p>
                    <p className="text-sm text-success font-medium">{formatCurrency(selectedBid.bidAmount, selectedBid.currency)}</p>
                  </div>
                </div>
                <Badge variant="success">Valgt</Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Section 2: Recommendations */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-display font-semibold text-gray-900">
            Anbefalede håndværkere
          </h3>
          <Button variant="secondary" size="sm" onClick={refetchRec}>
            Opdater
          </Button>
        </div>
        {recLoading ? (
          <Skeleton count={3} />
        ) : !recommendations?.length ? (
          <Empty message="Ingen anbefalinger tilgængelige" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.contractorId}
                rec={rec}
                alreadyInvited={invitedIds.has(rec.contractorId)}
                onInvite={() => handleInvite(rec.contractorId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Invitations */}
      <section>
        <h3 className="text-sm font-display font-semibold text-gray-900 mb-3">
          Inviterede ({invitations?.length ?? 0})
        </h3>
        {invLoading ? <Skeleton count={2} /> : !invitations?.length ? (
          <Empty message="Ingen invitationer endnu" />
        ) : (
          <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  {['Håndværker', 'Status', 'Inviteret', 'Svar'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                  ))}
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#e5e7eb]">
                    <td className="px-4 py-2.5 text-xs font-display font-medium text-gray-900">
                      {inv.contractor?.companyName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <InvitationBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{formatDateTime(inv.invitedAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {inv.respondedAt ? formatDateTime(inv.respondedAt) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="text-gray-400 hover:text-danger transition-colors"
                        title="Annuller invitation"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 4: Bids */}
      {!selectedBid && (
        <section>
          <h3 className="text-sm font-display font-semibold text-gray-900 mb-3">
            Modtagne tilbud ({bids?.filter((b) => !b.isSelected).length ?? 0})
          </h3>
          {bidsLoading ? <Skeleton count={2} /> : !bids?.filter((b) => !b.isSelected).length ? (
            <Empty message="Ingen tilbud modtaget endnu" />
          ) : (
            <div className="space-y-3">
              {bids!.filter((b) => !b.isSelected).map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  expanded={expandedBid === bid.id}
                  onToggle={() => setExpandedBid(expandedBid === bid.id ? null : bid.id)}
                  onSelect={() => setConfirmSelect(bid.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Confirm modal */}
      {confirmSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-elevated p-6 max-w-sm w-full">
            <h3 className="font-display font-bold text-gray-900 mb-2">Bekræft valg</h3>
            <p className="text-sm text-gray-600 mb-4">
              Er du sikker på, at du vil vælge dette tilbud? Alle andre tilbud afvises automatisk.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => handleSelectBid(confirmSelect)} disabled={selecting} className="flex-1">
                {selecting ? 'Vælger...' : 'Bekræft'}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmSelect(null)} className="flex-1">
                Annuller
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecommendationCard({
  rec,
  alreadyInvited,
  onInvite,
}: {
  rec: Recommendation
  alreadyInvited: boolean
  onInvite: () => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-display font-semibold">
              {getInitials(rec.companyName)}
            </div>
            <div>
              <p className="text-sm font-display font-semibold text-gray-900">{rec.companyName}</p>
              {rec.contractor && (
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={cn('h-3 w-3', s <= Math.round(rec.contractor.sedgwickRatingAvg) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <Badge variant={rec.totalScore >= 70 ? 'success' : rec.totalScore >= 40 ? 'warning' : 'gray'}>
            {rec.totalScore} pt
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {rec.matchReasons.map((r, i) => (
            <span key={i} className="text-xs bg-primary-50 text-primary-700 rounded px-1.5 py-0.5">{r}</span>
          ))}
        </div>
        <Button
          size="sm"
          className="w-full"
          variant={alreadyInvited ? 'secondary' : 'default'}
          disabled={alreadyInvited}
          onClick={onInvite}
        >
          {alreadyInvited ? '✓ Inviteret' : <><Plus className="h-3.5 w-3.5 mr-1" />Inviter</>}
        </Button>
      </CardContent>
    </Card>
  )
}

function BidCard({
  bid,
  expanded,
  onToggle,
  onSelect,
}: {
  bid: Bid
  expanded: boolean
  onToggle: () => void
  onSelect: () => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-display font-semibold">
              {getInitials(bid.contractor?.companyName ?? '')}
            </div>
            <div>
              <p className="font-display font-semibold text-gray-900">{bid.contractor?.companyName}</p>
              <p className="text-xs text-gray-500">{formatDateTime(bid.submittedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-lg font-display font-bold text-gray-900">{formatCurrency(bid.bidAmount, bid.currency)}</p>
            <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {bid.comments && <p className="text-sm text-gray-700">{bid.comments}</p>}
            {bid.attachments.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{bid.attachments.length} bilag</p>
                <div className="flex flex-wrap gap-1">
                  {bid.attachments.map((a) => (
                    <a key={a.id} href={a.blobUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline border border-primary-200 rounded px-2 py-0.5">
                      {a.fileName}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <Button size="sm" onClick={onSelect} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Vælg dette tilbud
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InvitationBadge({ status }: { status: string }) {
  const config = {
    PENDING: { label: 'Afventer', variant: 'warning' as const },
    INTERESTED: { label: 'Interesseret', variant: 'success' as const },
    NOT_INTERESTED: { label: 'Ikke interesseret', variant: 'danger' as const },
  }
  const c = config[status as keyof typeof config] ?? { label: status, variant: 'gray' as const }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

function Skeleton({ count }: { count: number }) {
  return <div className="space-y-2 animate-pulse">{[...Array(count)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-lg" />)}</div>
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">{message}</div>
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi, useMutation } from '@/hooks/useApi'
import { Mail, MapPin, Calendar, Phone, CheckCircle, XCircle, ChevronRight, Paperclip, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PriorityBadge } from '@/components/ui/StatusBadges'
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Invitationer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sager du er inviteret til at byde på</p>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-xl" />)}
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
            <section className="mb-6">
              <h2 className="font-display font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">
                Afventer svar ({pending.length})
              </h2>
              <div className="space-y-4">
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
              <h2 className="font-display font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">
                Tidligere svar ({responded.length})
              </h2>
              <div className="space-y-4">
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
  const p = invitation.project as any
  const hasBid = !!invitation.bid

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-[#e5e7eb] gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-semibold text-primary-700">{p?.claimId}</span>
          {p?.priorityLevel && <PriorityBadge level={p.priorityLevel} />}
        </div>
        <Badge variant={STATUS_VARIANT[invitation.status] ?? 'gray'}>
          {STATUS_LABEL[invitation.status] ?? invitation.status}
        </Badge>
      </div>

      {/* ── Body: 2-column layout matching OverviewTab ── */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left column */}
        <div className="space-y-4">
          {/* Sagsinformation */}
          <Section title="Sagsinformation">
            <Row label="Forsikringsselskab" value={p?.insuranceCompany?.name} />
              {p?.insurerCaseId && <Row label="Forsikringens sags-ID" value={p.insurerCaseId} mono />}
            <Row label="Skadetype" value={p?.damageType} />
            <Row label="Bygningstype" value={p?.buildingType} />
          </Section>

          {/* Skadesomfang */}
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

          {/* Krævede entrepriser */}
          {p?.entreprises?.filter((e: any) => e.isRelevant).length > 0 && (
            <Section title="Entrepriser">
              <div className="flex flex-wrap gap-1.5">
                {p.entreprises.filter((e: any) => e.isRelevant).map((e: any) => (
                  <span key={e.id} className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-700 font-medium border border-primary-100">
                    {ENTREPRISE_TYPE_DK[e.type] ?? e.type}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Datoer */}
          <Section title="Datoer">
            {p?.createdAt && <Row label="Oprettet" value={formatDate(p.createdAt)} />}
            {p?.requestedStartDate && <Row label="Ønsket start" value={formatDate(p.requestedStartDate)} />}
            {p?.requestedDeadline && (
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-xs font-display text-gray-500 shrink-0">Tilbudsfrist</span>
                <DeadlineValue deadline={p.requestedDeadline} />
              </div>
            )}
          </Section>

          {/* Kontakt */}
          {(p?.contactName || p?.contactPhone || p?.contactEmail) && (
            <Section title="Kontakt">
              {p?.contactName && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <span className="text-xs font-display font-semibold text-gray-600">
                      {p.contactName.charAt(0)}
                    </span>
                  </div>
                  <p className="text-sm font-display font-medium text-gray-900">{p.contactName}</p>
                </div>
              )}
              {p?.contactPhone && (
                <a href={`tel:${p.contactPhone}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {p.contactPhone}
                </a>
              )}
              {p?.contactEmail && (
                <a href={`mailto:${p.contactEmail}`} className="flex items-center gap-2 text-sm text-primary-700 hover:underline">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {p.contactEmail}
                </a>
              )}
            </Section>
          )}

          {/* Adresse */}
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

      {/* ── Vedhæftede filer ── */}
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
                    const res = await fetch(`/api/files/${f.id}/signed-url`, {
                      headers: { 'X-Auth-Token': token },
                    })
                    const { url } = res.ok ? await res.json() : {}
                    window.open(url ?? f.blobUrl, '_blank', 'noopener,noreferrer')
                  } catch {
                    window.open(f.blobUrl, '_blank', 'noopener,noreferrer')
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs text-primary-700 hover:bg-primary-100 truncate max-w-[200px]"
                title={f.fileName}
              >
                <Building2 className="h-3 w-3 shrink-0" />
                {f.fileName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bud afgivet ── */}
      {invitation.bid && (
        <div className="px-5 pb-3 border-t border-[#e5e7eb] pt-3">
          <p className="text-sm text-green-700 font-semibold">
            Bud afgivet: {formatCurrency((invitation.bid as any).bidAmount)}
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      {(invitation.status === 'PENDING' || (invitation.status === 'INTERESTED' && !hasBid)) && (
        <div className="flex gap-2 px-5 py-4 border-t border-[#e5e7eb] bg-gray-50">
          {invitation.status === 'PENDING' && (
            <>
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
            </>
          )}
          {invitation.status === 'INTERESTED' && !hasBid && (
            <Button size="sm" className="w-full gap-1.5" onClick={onBidSubmit}>
              <ChevronRight className="h-4 w-4" />
              Afgiv bud
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
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

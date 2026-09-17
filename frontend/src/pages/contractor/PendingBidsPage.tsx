import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { ClipboardList, MapPin, Phone, Mail, Paperclip, ChevronRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PriorityBadge } from '@/components/ui/StatusBadges'
import { formatDate } from '@/lib/utils'
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

export default function PendingBidsPage() {
  const navigate = useNavigate()
  const { data: invitations, loading } = useApi<BidInvitation[]>('/contractor/invitations')

  const pending = (invitations ?? []).filter(
    (inv) => inv.status === 'INTERESTED' && !inv.bid,
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Afventende tilbud</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sager du har accepteret — tilbud mangler stadig at blive indsendt</p>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-xl" />)}
        </div>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Ingen afventende tilbud"
          description="Du har ingen accepterede invitationer med manglende tilbud."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((inv) => (
            <PendingBidCard
              key={inv.id}
              invitation={inv}
              onSubmitBid={() => navigate(`/contractor/bids/submit/${inv.projectId}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PendingBidCard({
  invitation,
  onSubmitBid,
}: {
  invitation: BidInvitation
  onSubmitBid: () => void
}) {
  const p = invitation.project as any

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-[#e5e7eb] gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-semibold text-primary-700">{p?.claimId}</span>
          {p?.priorityLevel && <PriorityBadge level={p.priorityLevel} />}
        </div>
        <span className="inline-flex items-center rounded-full bg-yellow-100 border border-yellow-200 px-2.5 py-0.5 text-xs font-display font-semibold text-yellow-800">
          Afventer tilbud
        </span>
      </div>

      {/* Body */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left */}
        <div className="space-y-4">
          <Section title="Sagsinformation">
            <Row label="Forsikringsselskab" value={p?.insuranceCompany?.name} />
            {p?.insurerCaseId && <Row label="Forsikringens sags-ID" value={p.insurerCaseId} mono />}
            <Row label="Skadetype" value={p?.damageType} />
            <Row label="Bygningstype" value={p?.buildingType} />
          </Section>

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

        {/* Right */}
        <div className="space-y-4">
          <Section title="Datoer">
            {p?.createdAt && <Row label="Oprettet" value={formatDate(p.createdAt)} />}
            {p?.requestedStartDate && <Row label="Ønsket start" value={formatDate(p.requestedStartDate)} />}
            {p?.requestedDeadline && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-display text-gray-500 shrink-0">Tilbudsfrist</span>
                <DeadlineValue deadline={p.requestedDeadline} />
              </div>
            )}
          </Section>

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

      {/* Vedhæftede filer */}
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

      {/* Action */}
      <div className="px-5 py-4 border-t border-[#e5e7eb] bg-gray-50">
        <Button size="sm" className="w-full gap-1.5" onClick={onSubmitBid}>
          <ChevronRight className="h-4 w-4" />
          Afgiv tilbud
        </Button>
      </div>
    </div>
  )
}

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

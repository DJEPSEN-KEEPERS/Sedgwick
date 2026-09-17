import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { FileText, ChevronRight, Clock, CheckCircle2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PriorityBadge } from '@/components/ui/StatusBadges'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { BidInvitation } from '@/types'

export default function BidsOverviewPage() {
  const navigate = useNavigate()
  const { data: invitations, loading } = useApi<BidInvitation[]>('/contractor/invitations')

  const accepted = (invitations ?? []).filter(
    (inv) => inv.status === 'INTERESTED' && !inv.bid,
  )
  const submitted = (invitations ?? []).filter(
    (inv) => inv.status === 'INTERESTED' && !!inv.bid,
  )

  if (loading) {
    return (
      <div>
        <PageHeader />
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  const hasAny = accepted.length > 0 || submitted.length > 0

  return (
    <div>
      <PageHeader />

      {!hasAny ? (
        <EmptyState
          icon={FileText}
          title="Ingen tilbud"
          description="Du har endnu ikke accepteret invitationer eller afgivet tilbud."
        />
      ) : (
        <div className="space-y-8">
          {/* Section 1: Accepted invitations without a bid */}
          <section>
            <SectionHeader
              icon={Clock}
              label="Accepteret invitation"
              count={accepted.length}
              color="yellow"
              description="Invitationer du har accepteret — tilbud mangler stadig"
            />
            {accepted.length === 0 ? (
              <p className="text-sm text-gray-400 italic px-1">Ingen sager i denne kategori</p>
            ) : (
              <BidTable
                rows={accepted}
                onRowClick={(inv) => navigate(`/contractor/bids/submit/${inv.projectId}`)}
                showBidAmount={false}
              />
            )}
          </section>

          {/* Section 2: Submitted bids */}
          <section>
            <SectionHeader
              icon={CheckCircle2}
              label="Afleveret tilbud"
              count={submitted.length}
              color="green"
              description="Sager hvor du har indsendt et tilbud"
            />
            {submitted.length === 0 ? (
              <p className="text-sm text-gray-400 italic px-1">Ingen sager i denne kategori</p>
            ) : (
              <BidTable
                rows={submitted}
                onRowClick={(inv) => navigate(`/contractor/bids/submit/${inv.projectId}`)}
                showBidAmount
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function PageHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Tilbud</h1>
      <p className="text-sm text-gray-500 mt-0.5">
        Overblik over sager du har accepteret eller indsendt tilbud på
      </p>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  color,
  description,
}: {
  icon: React.ElementType
  label: string
  count: number
  color: 'yellow' | 'green'
  description: string
}) {
  const colors = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      badge: 'bg-green-100 text-green-800 border-green-200',
    },
  }[color]

  return (
    <div className={`flex items-center gap-3 mb-3 rounded-lg px-3 py-2.5 border ${colors.bg} ${colors.border}`}>
      <Icon className={`h-4 w-4 shrink-0 ${colors.icon}`} />
      <div className="flex-1 min-w-0">
        <span className="font-display font-semibold text-sm text-gray-900">{label}</span>
        <span className="text-xs text-gray-500 ml-2">{description}</span>
      </div>
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${colors.badge}`}>
        {count}
      </span>
    </div>
  )
}

function BidTable({
  rows,
  onRowClick,
  showBidAmount,
}: {
  rows: BidInvitation[]
  onRowClick: (inv: BidInvitation) => void
  showBidAmount: boolean
}) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-[#e5e7eb]">
            <th className="px-4 py-3 text-left text-xs font-display font-semibold text-gray-500 uppercase tracking-wide">
              Sag
            </th>
            <th className="px-4 py-3 text-left text-xs font-display font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
              Forsikringsselskab
            </th>
            <th className="px-4 py-3 text-left text-xs font-display font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
              Skadetype
            </th>
            <th className="px-4 py-3 text-left text-xs font-display font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
              Tilbudsfrist
            </th>
            {showBidAmount && (
              <th className="px-4 py-3 text-right text-xs font-display font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                Tilbudsbeløb
              </th>
            )}
            <th className="px-4 py-3 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e5e7eb]">
          {rows.map((inv) => (
            <BidRow
              key={inv.id}
              invitation={inv}
              onClick={() => onRowClick(inv)}
              showBidAmount={showBidAmount}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BidRow({
  invitation,
  onClick,
  showBidAmount,
}: {
  invitation: BidInvitation
  onClick: () => void
  showBidAmount: boolean
}) {
  const p = invitation.project as any
  const bid = invitation.bid as any

  const deadline = p?.requestedDeadline
  const daysLeft = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    : null
  const deadlineColor =
    daysLeft === null ? '' : daysLeft < 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-yellow-600' : 'text-gray-700'

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors group"
    >
      {/* Sag */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-semibold text-primary-700">{p?.claimId ?? '—'}</span>
          {p?.priorityLevel && <PriorityBadge level={p.priorityLevel} />}
        </div>
        {/* Show insurer on mobile */}
        {p?.insuranceCompany?.name && (
          <p className="text-xs text-gray-500 mt-0.5 sm:hidden">{p.insuranceCompany.name}</p>
        )}
      </td>

      {/* Forsikringsselskab */}
      <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">
        {p?.insuranceCompany?.name ?? '—'}
      </td>

      {/* Skadetype */}
      <td className="px-4 py-3 text-gray-700 hidden md:table-cell">
        {p?.damageType ?? '—'}
      </td>

      {/* Tilbudsfrist */}
      <td className={`px-4 py-3 hidden lg:table-cell ${deadlineColor}`}>
        {deadline ? (
          <span className="text-xs">
            {formatDate(deadline)}
            {daysLeft !== null && daysLeft < 0 && (
              <span className="ml-1 text-red-500">(Overskredet)</span>
            )}
            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
              <span className="ml-1 text-yellow-600">({daysLeft}d)</span>
            )}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      {/* Tilbudsbeløb */}
      {showBidAmount && (
        <td className="px-4 py-3 text-right hidden sm:table-cell">
          {bid?.bidAmount != null ? (
            <span className="font-semibold text-gray-900">{formatCurrency(bid.bidAmount)}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
      )}

      {/* Arrow */}
      <td className="px-4 py-3 text-right">
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors ml-auto" />
      </td>
    </tr>
  )
}

import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Briefcase, Mail, MessageSquare, User, ChevronRight, Clock } from 'lucide-react'
import { useCurrentUser } from '@/stores/authStore'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { formatDate } from '@/lib/utils'

interface ContractorDashboardData {
  stats: { activeJobs: number; pendingInvitations: number; unreadMessages: number }
  recentJobs: Array<{
    id: string
    claimId: string
    address: string
    city: string
    currentMilestone: string
    progressPercent: number
    requestedDeadline?: string
    entreprises: Array<{ id: string; type: string; currentMilestone: string; progressPercent: number }>
  }>
}

interface ActionCard {
  label: string
  sublabel: string
  icon: React.ElementType
  to: string
  badge?: number
  accent?: boolean
}

export default function ContractorDashboard() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { data, loading } = useApi<ContractorDashboardData>('/contractor/dashboard')

  const stats = data?.stats ?? { activeJobs: 0, pendingInvitations: 0, unreadMessages: 0 }
  const recentJobs = data?.recentJobs ?? []

  const actions: ActionCard[] = [
    {
      label: 'Mine sager',
      sublabel: `${stats.activeJobs} aktive`,
      icon: Briefcase,
      to: '/contractor/jobs',
    },
    {
      label: 'Invitationer',
      sublabel: stats.pendingInvitations > 0 ? `${stats.pendingInvitations} afventer svar` : 'Ingen nye',
      icon: Mail,
      to: '/contractor/invitations',
      badge: stats.pendingInvitations,
      accent: stats.pendingInvitations > 0,
    },
    {
      label: 'Beskeder',
      sublabel: stats.unreadMessages > 0 ? `${stats.unreadMessages} nye` : 'Ingen nye',
      icon: MessageSquare,
      to: '/contractor/chat',
      badge: stats.unreadMessages,
    },
    {
      label: 'Min profil',
      sublabel: 'Virksomhedsinfo & indstillinger',
      icon: User,
      to: '/contractor/profile',
    },
  ]

  return (
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-display font-bold text-gray-900">
          Hej, {user.fullName.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Her er din dagens overblik</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((card) => (
          <button
            key={card.to}
            onClick={() => navigate(card.to)}
            className={`relative flex flex-col items-start rounded-xl p-4 text-left shadow-sm border transition-all active:scale-95 ${
              card.accent
                ? 'bg-primary-600 border-primary-700 text-white'
                : 'bg-white border-[#e5e7eb] text-gray-900 hover:border-primary-300'
            }`}
          >
            {card.badge != null && card.badge > 0 && (
              <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {card.badge > 9 ? '9+' : card.badge}
              </span>
            )}
            <card.icon className={`h-6 w-6 mb-2 ${card.accent ? 'text-white/80' : 'text-primary-600'}`} />
            <span className={`font-display font-semibold text-sm ${card.accent ? 'text-white' : 'text-gray-900'}`}>
              {card.label}
            </span>
            <span className={`text-xs mt-0.5 ${card.accent ? 'text-white/75' : 'text-gray-500'}`}>
              {card.sublabel}
            </span>
          </button>
        ))}
      </div>

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm text-gray-900">Seneste sager</h2>
          <button onClick={() => navigate('/contractor/jobs')} className="text-xs text-primary-600 hover:underline">
            Se alle
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 text-center text-sm text-gray-400">
            Ingen aktive sager
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => navigate(`/contractor/jobs/${job.id}`)}
                className="w-full flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white p-4 text-left hover:border-primary-300 transition-colors active:scale-[0.99]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-primary-700">{job.claimId}</span>
                    <MilestoneBadge milestone={job.currentMilestone as never} />
                  </div>
                  <p className="text-sm font-display font-medium text-gray-900 truncate">
                    {job.address}, {job.city}
                  </p>
                  {job.requestedDeadline && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Clock className="h-3 w-3" />
                      Frist: {formatDate(job.requestedDeadline)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

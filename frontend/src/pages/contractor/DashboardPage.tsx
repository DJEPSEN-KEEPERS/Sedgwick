import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Briefcase, Mail, MessageSquare, User, ChevronRight, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/stores/authStore'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { formatDate, formatRelativeTime } from '@/lib/utils'

interface InboxItem {
  projectId: string
  claimId: string
  address: string
  city: string
  latestMessage: { messageBody: string; senderName: string; createdAt: string } | null
}

interface InboxData {
  items: InboxItem[]
}

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
  const { t } = useTranslation()
  const user = useCurrentUser()
  const { data, loading } = useApi<ContractorDashboardData>('/contractor/dashboard')
  const { data: inboxData } = useApi<InboxData>('/messages/inbox')

  const stats = data?.stats ?? { activeJobs: 0, pendingInvitations: 0, unreadMessages: 0 }
  const recentJobs = data?.recentJobs ?? []
  const inboxItems = inboxData?.items?.filter((i) => i.latestMessage) ?? []

  const actions: ActionCard[] = [
    {
      label: t('dashboard.myJobs'),
      sublabel: t('dashboard.activeJobs', { count: stats.activeJobs }),
      icon: Briefcase,
      to: '/contractor/jobs',
    },
    {
      label: t('nav.invitations'),
      sublabel: stats.pendingInvitations > 0 ? t('dashboard.pendingReply', { count: stats.pendingInvitations }) : t('dashboard.noNew'),
      icon: Mail,
      to: '/contractor/invitations',
      badge: stats.pendingInvitations,
      accent: stats.pendingInvitations > 0,
    },
    {
      label: t('nav.messages'),
      sublabel: stats.unreadMessages > 0 ? t('dashboard.newMessages', { count: stats.unreadMessages }) : t('dashboard.noNew'),
      icon: MessageSquare,
      to: '/contractor/chat',
      badge: stats.unreadMessages,
    },
    {
      label: t('nav.profile'),
      sublabel: t('dashboard.companyInfo'),
      icon: User,
      to: '/contractor/profile',
    },
  ]

  return (
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-display font-bold text-gray-900">
          {t('dashboard.greeting', { name: user.fullName.split(' ')[0] })}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.todayOverview')}</p>
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

      {/* Messages inbox */}
      {inboxItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <h2 className="font-display font-semibold text-sm text-gray-900">Seneste beskeder</h2>
          </div>
          <div className="space-y-2">
            {inboxItems.slice(0, 3).map((item) => (
              <button
                key={item.projectId}
                onClick={() => navigate(`/contractor/jobs/${item.projectId}`)}
                className="w-full flex items-start gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 text-left hover:border-primary-300 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-display font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-xs font-semibold text-primary-700">{item.claimId}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{item.latestMessage!.messageBody}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(item.latestMessage!.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm text-gray-900">{t('dashboard.recentJobs')}</h2>
          <button onClick={() => navigate('/contractor/jobs')} className="text-xs text-primary-600 hover:underline">
            {t('common.seeAll')}
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 text-center text-sm text-gray-400">
            {t('dashboard.noActiveJobs')}
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
                      {t('common.deadline')}: {formatDate(job.requestedDeadline)}
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

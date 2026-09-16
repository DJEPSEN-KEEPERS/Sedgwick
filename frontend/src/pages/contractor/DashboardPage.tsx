import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Briefcase, Mail, MessageSquare, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { StatCard } from '@/components/ui/StatCard'
import { formatDate, formatRelativeTime, getInitials } from '@/lib/utils'

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

export default function ContractorDashboard() {
  const navigate = useNavigate()
  const { data, loading } = useApi<ContractorDashboardData>('/contractor/dashboard')
  const { data: inboxData } = useApi<InboxData>('/messages/inbox')

  const stats = data?.stats ?? { activeJobs: 0, pendingInvitations: 0, unreadMessages: 0 }
  const recentJobs = data?.recentJobs ?? []
  const inboxItems = inboxData?.items?.filter((i) => i.latestMessage) ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Oversigt</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dine aktive sager og aktivitet</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Aktive sager" value={stats.activeJobs} icon={Briefcase} />
        <StatCard label="Afventende invitationer" value={stats.pendingInvitations} icon={Mail} accent={stats.pendingInvitations > 0} />
        <StatCard label="Ulæste beskeder" value={stats.unreadMessages} icon={MessageSquare} accent={stats.unreadMessages > 0} />
      </div>

      {/* Messages inbox */}
      {inboxItems.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <CardTitle className="text-sm">Seneste beskeder</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#e5e7eb]">
              {inboxItems.slice(0, 5).map((item) => (
                <div
                  key={item.projectId}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/contractor/jobs/${item.projectId}`)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-display font-semibold">
                    {getInitials(item.latestMessage!.senderName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-display font-semibold text-gray-900">#{item.claimId}</span>
                      <span className="text-xs text-gray-500 truncate">{item.address}, {item.city}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{item.latestMessage!.messageBody}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(item.latestMessage!.createdAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent jobs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-sm">Senest opdaterede sager</CardTitle>
            </div>
            <button
              onClick={() => navigate('/contractor/jobs')}
              className="text-xs text-primary-600 hover:underline"
            >
              Se alle
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-1 p-4 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Ingen sager endnu</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-gray-50">
                    {['Sag ID', 'Adresse', 'Status', 'Tilbudsfrist'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((j) => (
                    <tr
                      key={j.id}
                      className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/contractor/jobs/${j.id}`)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-700">{j.claimId}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{j.address}, {j.city}</td>
                      <td className="px-4 py-2.5"><MilestoneBadge milestone={j.currentMilestone as never} /></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {j.requestedDeadline ? formatDate(j.requestedDeadline) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

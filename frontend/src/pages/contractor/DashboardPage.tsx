import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Briefcase, Mail, MessageSquare, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/StatCard'
import { formatRelativeTime, getInitials } from '@/lib/utils'

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
  stats: { activeJobs: number; pendingInvitations: number; awaitingBid: number; unreadMessages: number }
}

export default function ContractorDashboard() {
  const navigate = useNavigate()
  const { data } = useApi<ContractorDashboardData>('/contractor/dashboard')
  const { data: inboxData } = useApi<InboxData>('/messages/inbox')

  const stats = data?.stats ?? { activeJobs: 0, pendingInvitations: 0, awaitingBid: 0, unreadMessages: 0 }
  const inboxItems = inboxData?.items?.filter((i) => i.latestMessage) ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Oversigt</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dine aktive sager og aktivitet</p>
      </div>

      {/* Stats — 2×2 grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Top-left */}
        <StatCard label="Afventende invitationer" value={stats.pendingInvitations} icon={Mail} accent={stats.pendingInvitations > 0}
          onClick={() => navigate('/contractor/invitations')} />
        {/* Top-right */}
        <StatCard label="Afventende tilbud" value={stats.awaitingBid} icon={ClipboardList} accent={stats.awaitingBid > 0}
          onClick={() => navigate('/contractor/pending-bids')} />
        {/* Bottom-left */}
        <StatCard label="Aktive sager" value={stats.activeJobs} icon={Briefcase}
          onClick={() => navigate('/contractor/jobs')} />
        {/* Bottom-right */}
        <StatCard label="Ulæste beskeder" value={stats.unreadMessages} icon={MessageSquare} accent={stats.unreadMessages > 0}
          onClick={() => navigate('/contractor/chat')} />
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

    </div>
  )
}

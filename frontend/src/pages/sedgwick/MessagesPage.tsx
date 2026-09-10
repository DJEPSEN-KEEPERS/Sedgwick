import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { formatRelativeTime, getInitials } from '@/lib/utils'

interface InboxItem {
  projectId: string
  claimId: string
  address: string
  city: string
  currentMilestone: string
  latestMessage: { messageBody: string; senderName: string; createdAt: string } | null
}

export default function MessagesPage() {
  const navigate = useNavigate()
  const { data, loading } = useApi<{ items: InboxItem[] }>('/messages/inbox')

  const items = data?.items ?? []

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">Beskeder</h1>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-1 p-4 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <MessageSquare className="h-10 w-10 text-gray-300" />
              <p className="text-sm">Ingen beskeder endnu</p>
              <p className="text-xs">Beskeder oprettes automatisk når sager er aktive</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e7eb]">
              {items.map((item) => (
                <div
                  key={item.projectId}
                  className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/sedgwick/projects/${item.projectId}?tab=messages`)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-display font-semibold">
                    {item.latestMessage ? getInitials(item.latestMessage.senderName) : '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-primary-700">#{item.claimId}</span>
                      <span className="text-xs text-gray-500 truncate">{item.address}, {item.city}</span>
                      <MilestoneBadge milestone={item.currentMilestone} />
                    </div>
                    {item.latestMessage ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-display font-medium text-gray-700">{item.latestMessage.senderName}:</span>
                        <p className="text-xs text-gray-500 truncate">{item.latestMessage.messageBody}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Ingen beskeder endnu</p>
                    )}
                  </div>
                  {item.latestMessage && (
                    <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(item.latestMessage.createdAt)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { ChatMessage } from '@/types'

interface ThreadResponse {
  channelId: string
  messages: ChatMessage[]
}

interface ChatPanelProps {
  projectId?: string
  // Legacy props kept for call-site compatibility
  defaultChannelId?: string
  singleChannel?: boolean
  className?: string
}

export function ChatPanel({ projectId, className }: ChatPanelProps) {
  const user = useAuthStore((s) => s.user)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: thread, loading, refetch } = useApi<ThreadResponse>(
    projectId ? `/projects/${projectId}/thread` : null,
  )

  const { mutate: sendMsg } = useMutation('post')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages])

  // Auto-refresh every 15s when we have a channel
  useEffect(() => {
    if (!thread?.channelId) return
    const interval = setInterval(refetch, 15000)
    return () => clearInterval(interval)
  }, [thread?.channelId, refetch])

  const handleSend = async () => {
    if (!messageText.trim() || !thread?.channelId) return
    setSending(true)
    await sendMsg(`/channels/${thread.channelId}/messages`, { messageBody: messageText.trim() })
    setMessageText('')
    setSending(false)
    refetch()
  }

  return (
    <div className={cn('flex flex-col rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-gray-50 shrink-0">
        <MessageSquare className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-display font-semibold text-gray-900">Sagsbeskeder</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3 min-h-0">
        {!projectId ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Vælg en sag for at se beskeder
          </div>
        ) : loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !thread?.messages?.length ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Ingen beskeder endnu. Skriv den første!
          </div>
        ) : (
          thread.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.senderUserId === user?.id} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {projectId && (
        <div className="border-t border-[#e5e7eb] p-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Skriv en besked... (Enter for at sende)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm font-body placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !messageText.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={cn('flex items-start gap-2', isOwn && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-display font-semibold',
        isOwn ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600',
      )}>
        {message.sender ? getInitials(message.sender.fullName) : '?'}
      </div>
      <div className={cn('max-w-[75%]', isOwn && 'items-end flex flex-col')}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {!isOwn && <span className="text-xs font-display font-medium text-gray-700">{message.sender?.fullName}</span>}
          <span className="text-xs text-gray-400">{formatRelativeTime(message.createdAt)}</span>
        </div>
        <div className={cn(
          'rounded-xl px-3 py-2 text-sm',
          isOwn
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-900 rounded-tl-sm',
        )}>
          {message.messageBody}
        </div>
        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.attachments.map((a) => (
              <a key={a.id} href={a.blobUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:underline">
                📎 {a.fileName}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

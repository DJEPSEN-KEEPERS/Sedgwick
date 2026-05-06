import { useState, useRef, useEffect } from 'react'
import { Send, Plus, Paperclip, MessageSquare } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { ChatChannel, ChatMessage } from '@/types'

interface ChatPanelProps {
  projectId?: string
  defaultChannelId?: string
  singleChannel?: boolean
  className?: string
}

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  SEDGWICK_CONTRACTOR: 'Håndværker',
  SEDGWICK_INSURER: 'Forsikring',
  SEDGWICK_BIDDER: 'Tilbudsgiver',
}

export function ChatPanel({ projectId, defaultChannelId, singleChannel, className }: ChatPanelProps) {
  const user = useAuthStore((s) => s.user)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(defaultChannelId ?? null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: channels, refetch: refetchChannels } = useApi<ChatChannel[]>(
    projectId ? `/projects/${projectId}/channels` : null,
  )

  const { data: messages, loading: messagesLoading, refetch: refetchMessages } = useApi<ChatMessage[]>(
    activeChannelId ? `/channels/${activeChannelId}/messages` : null,
  )

  const { mutate: sendMsg } = useMutation('post')

  useEffect(() => {
    if (channels?.length && !activeChannelId) {
      setActiveChannelId(channels[0].id)
    }
  }, [channels, activeChannelId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-refresh messages every 15s
  useEffect(() => {
    if (!activeChannelId) return
    const interval = setInterval(refetchMessages, 15000)
    return () => clearInterval(interval)
  }, [activeChannelId, refetchMessages])

  const handleSend = async () => {
    if (!messageText.trim() || !activeChannelId) return
    setSending(true)
    await sendMsg(`/channels/${activeChannelId}/messages`, { messageBody: messageText.trim() })
    setMessageText('')
    setSending(false)
    refetchMessages()
  }

  const activeChannel = channels?.find((c) => c.id === activeChannelId)

  return (
    <div className={cn('flex h-[600px] rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden', className)}>
      {/* Channel list (hidden in single-channel mode) */}
      {!singleChannel && (
        <div className="w-60 shrink-0 border-r border-[#e5e7eb] flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-[#e5e7eb]">
            <span className="text-xs font-display font-semibold text-gray-700">Kanaler</span>
            {projectId && (
              <button className="text-gray-400 hover:text-primary-600 transition-colors" title="Ny kanal">
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {!channels?.length ? (
              <div className="p-4 text-xs text-gray-400 text-center">Ingen kanaler</div>
            ) : (
              channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b border-[#e5e7eb] hover:bg-gray-50 transition-colors',
                    activeChannelId === ch.id && 'bg-primary-50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="text-xs font-display font-medium text-gray-900 truncate">{ch.name}</span>
                  </div>
                  <Badge variant="gray" className="mt-0.5 text-xs">
                    {CHANNEL_TYPE_LABEL[ch.channelType] ?? ch.channelType}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages pane */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-gray-50 shrink-0">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-display font-semibold text-gray-900">
            {activeChannel?.name ?? 'Vælg en kanal'}
          </span>
          {activeChannel && (
            <Badge variant="gray" className="text-xs">
              {CHANNEL_TYPE_LABEL[activeChannel.channelType] ?? activeChannel.channelType}
            </Badge>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
          {!activeChannelId ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Vælg en kanal for at se beskeder
            </div>
          ) : messagesLoading ? (
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
          ) : !messages?.length ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Ingen beskeder endnu. Skriv den første!
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isOwn={msg.senderUserId === user?.id} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeChannelId && (
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
              <div className="flex flex-col gap-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-600 transition-colors" title="Vedhæft fil">
                  <Paperclip className="h-4 w-4" />
                </button>
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={sending || !messageText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
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

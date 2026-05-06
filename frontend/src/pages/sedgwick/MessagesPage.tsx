import { ChatPanel } from '@/components/chat/ChatPanel'

export default function MessagesPage() {
  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">Beskeder</h1>
      <ChatPanel className="h-[calc(100vh-220px)]" />
    </div>
  )
}

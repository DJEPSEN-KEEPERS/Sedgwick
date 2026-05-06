import { ChatPanel } from '@/components/chat/ChatPanel'

export function MessagesTab({ projectId }: { projectId: string }) {
  return <ChatPanel projectId={projectId} className="h-[620px]" />
}

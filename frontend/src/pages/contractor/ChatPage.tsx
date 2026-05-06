import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChatPanel } from '@/components/chat/ChatPanel'
import type { Project } from '@/types'

export default function ContractorChatPage() {
  const { data: jobs, loading } = useApi<Project[]>('/contractor/jobs')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const activeJobs = jobs?.filter((j) => j.status === 'ACTIVE') ?? []

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project selector */}
      {!selectedProjectId ? (
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-display font-bold text-gray-900">Beskeder</h1>

          {activeJobs.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Ingen aktive sager"
              description="Du har ingen aktive sager at chatte om."
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Vælg en sag for at se beskeder</p>
              {activeJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedProjectId(job.id)}
                  className="w-full flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 text-left hover:border-primary-300 transition-colors active:scale-[0.99]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-primary-700">{job.claimId}</p>
                    <p className="text-sm font-display font-medium text-gray-900 truncate">
                      {job.address}, {job.city}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Back button */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-white shrink-0">
            <button
              onClick={() => setSelectedProjectId(null)}
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              ← Tilbage
            </button>
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm font-display font-semibold text-gray-900">
              {activeJobs.find((j) => j.id === selectedProjectId)?.claimId}
            </span>
          </div>

          <div className="flex-1 p-4 min-h-0">
            <ChatPanel
              projectId={selectedProjectId}
              className="h-full max-h-[calc(100vh-180px)]"
            />
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Briefcase, ChevronRight, Clock, CheckCircle2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { getEntrepriseTypeLabel, formatDate } from '@/lib/utils'
import type { Project, EntrepriseType } from '@/types'

type Tab = 'active' | 'completed'

export default function JobsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('active')
  const { data: jobs, loading } = useApi<Project[]>('/contractor/jobs')

  const active = jobs?.filter((j) => j.status === 'ACTIVE') ?? []
  const completed = jobs?.filter((j) => j.status !== 'ACTIVE') ?? []
  const displayed = tab === 'active' ? active : completed

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-display font-bold text-gray-900">Mine sager</h1>

      {/* Tabs */}
      <div className="flex rounded-lg bg-gray-100 p-0.5 gap-0.5">
        {([
          { key: 'active', label: 'Aktive', count: active.length },
          { key: 'completed', label: 'Afsluttede', count: completed.length },
        ] as { key: Tab; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md py-2 text-xs font-display font-semibold transition-colors ${
              tab === key
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label} {count > 0 && <span className="ml-1 text-[10px] text-gray-400">({count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={tab === 'active' ? Briefcase : CheckCircle2}
          title={tab === 'active' ? 'Ingen aktive sager' : 'Ingen afsluttede sager'}
          description={tab === 'active' ? 'Du er endnu ikke tildelt nogen aktive sager.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {displayed.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => navigate(`/contractor/jobs/${job.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function JobCard({ job, onClick }: { job: Project; onClick: () => void }) {
  const myEntreprises = (job as any).entreprises ?? []

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-[#e5e7eb] bg-white p-4 text-left hover:border-primary-300 transition-colors active:scale-[0.99] space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-xs font-semibold text-primary-700">{job.claimId}</span>
            <MilestoneBadge milestone={job.currentMilestone} />
          </div>
          <p className="text-sm font-display font-semibold text-gray-900 truncate">
            {job.address}, {job.city}
          </p>
          <p className="text-xs text-gray-500">{job.damageType}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <Progress value={job.progressPercent} className="h-1.5 flex-1" />
        <span className="text-xs text-gray-500 w-8 text-right">{job.progressPercent}%</span>
      </div>

      {/* Entreprises */}
      {myEntreprises.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {myEntreprises.map((e: any) => (
            <span key={e.id} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700 font-medium">
              {getEntrepriseTypeLabel(e.type as EntrepriseType)}
            </span>
          ))}
        </div>
      )}

      {job.requestedDeadline && (
        <p className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          Frist: {formatDate(job.requestedDeadline)}
        </p>
      )}
    </button>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Briefcase, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { getEntrepriseTypeLabel } from '@/lib/utils'
import type { Project, EntrepriseType } from '@/types'
import { cn } from '@/lib/utils'

type Tab = 'active' | 'completed'

export default function JobsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('active')
  const { data: jobs, loading } = useApi<Project[]>('/contractor/jobs')

  const active = jobs?.filter((j) => j.status === 'ACTIVE') ?? []
  const completed = jobs?.filter((j) => j.status !== 'ACTIVE') ?? []
  const displayed = tab === 'active' ? active : completed

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">{t('jobs.title')}</h1>
        <span className="text-sm text-gray-500">{displayed.length} sager</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'active', label: t('common.active'), count: active.length },
          { key: 'completed', label: t('projects.milestones.WORK_COMPLETED'), count: completed.length },
        ] as { key: Tab; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-display font-medium border transition-colors',
              tab === key
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white border-[#e5e7eb] text-gray-600 hover:border-primary-400',
            )}
          >
            {label}
            {count > 0 && <span className="ml-1.5 text-[10px] opacity-75">({count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={tab === 'active' ? Briefcase : CheckCircle2}
          title={tab === 'active' ? t('jobs.noJobs') : t('dashboard.noActiveJobs')}
          description={tab === 'active' ? t('jobs.noJobs') : undefined}
        />
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  {['Sag ID', 'Adresse', 'Skadetype', 'Status', 'Entrepriser'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((job) => {
                  const relevantEntreprises = ((job as any).entreprises ?? []).filter((e: any) => e.isRelevant)
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/contractor/jobs/${job.id}`)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-700">{job.claimId}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        <div>{job.address}</div>
                        <div className="text-gray-400">{job.postalCode} {job.city}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{job.damageType}</td>
                      <td className="px-4 py-2.5"><MilestoneBadge milestone={job.currentMilestone} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {relevantEntreprises.length > 0 ? relevantEntreprises.map((e: any) => (
                            <span key={e.id} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700 font-medium">
                              {getEntrepriseTypeLabel(e.type as EntrepriseType)}
                            </span>
                          )) : <span className="text-gray-400 text-xs">—</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { Briefcase, CheckCircle2, Search, SlidersHorizontal, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getEntrepriseTypeLabel } from '@/lib/utils'
import type { Project, EntrepriseType, ProjectMilestone } from '@/types'
import { cn } from '@/lib/utils'

type Tab = 'active' | 'completed'

interface Filters {
  search: string
  milestones: ProjectMilestone[]
  damageType: string
  region: string
  responsibleUser: string
}

const EMPTY_FILTERS: Filters = { search: '', milestones: [], damageType: '', region: '', responsibleUser: '' }

export default function JobsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('active')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const { data: jobs, loading } = useApi<Project[]>('/contractor/jobs')

  const options = useMemo(() => {
    if (!jobs) return { damageTypes: [], regions: [], responsibleUsers: [] }
    const uniq = <T,>(arr: (T | undefined | null)[]): T[] =>
      [...new Set(arr.filter((v): v is T => v != null))].sort((a, b) => String(a).localeCompare(String(b)))
    return {
      damageTypes: uniq(jobs.map((j) => j.damageType)),
      regions: uniq(jobs.map((j) => j.region)),
      responsibleUsers: uniq(jobs.map((j) => (j as any).contractorProjectManager?.fullName)),
    }
  }, [jobs])

  const filtered = useMemo(() => {
    if (!jobs) return { active: [], completed: [] }
    let list = [...jobs] as Project[]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (j) =>
          j.claimId.toLowerCase().includes(q) ||
          j.address.toLowerCase().includes(q) ||
          j.city.toLowerCase().includes(q),
      )
    }
    if (filters.damageType)     list = list.filter((j) => j.damageType === filters.damageType)
    if (filters.region)         list = list.filter((j) => j.region === filters.region)
    if (filters.responsibleUser) list = list.filter((j) => (j as any).contractorProjectManager?.fullName === filters.responsibleUser)
    if (filters.milestones.length) list = list.filter((j) => filters.milestones.includes(j.currentMilestone))

    return {
      active: list.filter((j) => j.status === 'ACTIVE'),
      completed: list.filter((j) => j.status !== 'ACTIVE'),
    }
  }, [jobs, filters])

  const displayed = tab === 'active' ? filtered.active : filtered.completed
  const activeFilterCount = [filters.damageType, filters.region, filters.responsibleUser].filter(Boolean).length + filters.milestones.length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">{t('jobs.title')}</h1>
        <span className="text-sm text-gray-500">{displayed.length} sager</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Søg sag-ID, adresse..."
            className="pl-8"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Filtre
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-white text-primary-700 px-1.5 text-xs font-display font-semibold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 mb-4 shadow-card">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <FilterSelect
              label="Skadetype"
              value={filters.damageType}
              onChange={(v) => setFilters((f) => ({ ...f, damageType: v }))}
            >
              {options.damageTypes.map((v) => <option key={v} value={v}>{v}</option>)}
            </FilterSelect>
            <FilterSelect
              label="Region"
              value={filters.region}
              onChange={(v) => setFilters((f) => ({ ...f, region: v }))}
            >
              {options.regions.map((v) => <option key={v} value={v}>{v}</option>)}
            </FilterSelect>
            <FilterSelect
              label="Projektleder"
              value={filters.responsibleUser}
              onChange={(v) => setFilters((f) => ({ ...f, responsibleUser: v }))}
            >
              {options.responsibleUsers.map((v) => <option key={v} value={v}>{v}</option>)}
            </FilterSelect>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-gray-500"
              >
                <X className="h-4 w-4 mr-1" /> Ryd filtre
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'active', label: t('common.active'), count: filtered.active.length },
          { key: 'completed', label: t('projects.milestones.WORK_COMPLETED'), count: filtered.completed.length },
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
                  {['Sag ID', 'Adresse', 'Skadetype', 'Status', 'Projektleder', 'Entrepriser'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((job) => {
                  const relevantEntreprises = ((job as any).entreprises ?? []).filter((e: any) => e.isRelevant)
                  const pm = (job as any).contractorProjectManager
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
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        {pm ? (
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-display font-semibold text-primary-700 shrink-0">
                              {(pm as any).fullName.charAt(0).toUpperCase()}
                            </span>
                            {(pm as any).fullName}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Ikke tildelt</span>
                        )}
                      </td>
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

function FilterSelect({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input-field text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Alle</option>
        {children}
      </select>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { Input } from '@/components/ui/input'
import { MilestoneBadge, PriorityBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

// Milestones that require action from the insurer
const ACTION_MILESTONES = new Set([
  'BIDDING_IN_PROGRESS',
  'BID_SELECTED',
  'AWAITING_APPROVAL',
  'FINAL_REPORT_SUBMITTED',
])

type QuickFilter = 'all' | 'active' | 'action' | 'completed'

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'all',       label: 'Alle sager' },
  { value: 'active',    label: 'Aktive' },
  { value: 'action',    label: 'Kræver handling' },
  { value: 'completed', label: 'Afsluttede' },
]

export default function InsurerProjectsPage() {
  const navigate = useNavigate()
  const { data: projects, loading } = useApi<Project[]>('/projects?pageSize=200')

  const [search, setSearch]               = useState('')
  const [quickFilter, setQuickFilter]     = useState<QuickFilter>('all')
  const [damageFilter, setDamageFilter]   = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const filtered = useMemo(() => {
    if (!projects) return []
    return projects.filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.claimId.toLowerCase().includes(q) &&
          !p.address.toLowerCase().includes(q) &&
          !p.city.toLowerCase().includes(q) &&
          !p.contactName.toLowerCase().includes(q)
        ) return false
      }
      if (quickFilter === 'active'    && p.status !== 'ACTIVE')    return false
      if (quickFilter === 'completed' && p.status !== 'COMPLETED') return false
      if (quickFilter === 'action'    && !ACTION_MILESTONES.has(p.currentMilestone)) return false
      if (damageFilter && !p.damageType.toLowerCase().includes(damageFilter.toLowerCase())) return false
      if (priorityFilter && p.priorityLevel !== priorityFilter) return false
      return true
    })
  }, [projects, search, quickFilter, damageFilter, priorityFilter])

  const actionCount = useMemo(
    () => (projects ?? []).filter((p) => ACTION_MILESTONES.has(p.currentMilestone)).length,
    [projects],
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Sager</h1>
        <span className="text-sm text-gray-500">{filtered.length} sager</span>
      </div>

      {/* Quick-filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setQuickFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-display font-medium border transition-colors',
              quickFilter === f.value
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white border-[#e5e7eb] text-gray-600 hover:border-primary-400',
            )}
          >
            {f.label}
            {f.value === 'action' && actionCount > 0 && (
              <span className={cn(
                'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                quickFilter === 'action' ? 'bg-white/20 text-white' : 'bg-warning text-white',
              )}>
                {actionCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + advanced filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Sag ID, adresse, kontakt..." className="pl-8"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input placeholder="Skadetype..." className="w-36"
          value={damageFilter} onChange={(e) => setDamageFilter(e.target.value)} />
        <select className="input-field w-36 text-sm" value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">Alle prioriteter</option>
          <option value="NORMAL">Normal</option>
          <option value="FASTTRACK">Fasttrack</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  {['Sag ID', 'Adresse', 'Skadetype', 'Prioritet', 'Status', 'Fremgang', 'Håndværker', 'Deadline'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                      Ingen sager matcher filteret
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/insurer/projects/${p.id}`)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-700">{p.claimId}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        <div>{p.address}</div>
                        <div className="text-gray-400">{p.postalCode} {p.city}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{p.damageType}</td>
                      <td className="px-4 py-2.5"><PriorityBadge level={p.priorityLevel} /></td>
                      <td className="px-4 py-2.5"><MilestoneBadge milestone={p.currentMilestone} /></td>
                      <td className="px-4 py-2.5 w-28">
                        <div className="flex items-center gap-1.5">
                          <Progress value={p.progressPercent} className="h-1.5 flex-1" />
                          <span className="text-xs text-gray-500 w-8">{p.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        {p.selectedContractor?.companyName ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {p.requestedDeadline ? (
                          <span className={new Date(p.requestedDeadline) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {formatDate(p.requestedDeadline)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

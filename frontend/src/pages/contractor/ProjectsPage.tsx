import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Briefcase } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MilestoneBadge, PriorityBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'
import { getEntrepriseTypeLabel } from '@/lib/utils'
import type { Project } from '@/types'

const MILESTONE_FILTERS = [
  { value: '', label: 'Alle stadier' },
  { value: 'CONTRACTOR_ASSIGNED', label: 'Tildelt' },
  { value: 'WORK_IN_PROGRESS',    label: 'Under arbejde' },
  { value: 'WORK_COMPLETED',      label: 'Afsluttet' },
]

export default function ContractorProjectsPage() {
  const navigate  = useNavigate()
  const { data: projects, loading } = useApi<Project[]>('/projects?pageSize=200')

  const [search, setSearch]             = useState('')
  const [milestoneFilter, setMilestoneFilter] = useState('')
  const [priorityFilter, setPriorityFilter]   = useState('')

  const filtered = useMemo(() => {
    if (!projects) return []
    return projects.filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.claimId.toLowerCase().includes(q) &&
          !p.address.toLowerCase().includes(q) &&
          !p.city.toLowerCase().includes(q) &&
          !p.damageType.toLowerCase().includes(q)
        ) return false
      }
      if (milestoneFilter && p.currentMilestone !== milestoneFilter) return false
      if (priorityFilter  && p.priorityLevel    !== priorityFilter)  return false
      return true
    })
  }, [projects, search, milestoneFilter, priorityFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Mine sager</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sager tildelt dit firma</p>
        </div>
        <span className="text-sm text-gray-500">{filtered.length} sager</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Sag ID, adresse, skadetype..." className="pl-8"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-40 text-sm" value={milestoneFilter}
          onChange={(e) => setMilestoneFilter(e.target.value)}>
          {MILESTONE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select className="input-field w-36 text-sm" value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">Alle prioriteter</option>
          <option value="NORMAL">Normal</option>
          <option value="FASTTRACK">Fasttrack</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-12 text-center">
          <Briefcase className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-display font-medium text-gray-500">
            {projects?.length === 0 ? 'Ingen sager er tildelt dit firma endnu' : 'Ingen sager matcher filteret'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  {['Sag ID', 'Adresse', 'Skadetype', 'Prioritet', 'Status', 'Fremgang', 'Entrepriser', 'Deadline'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/contractor/jobs/${p.id}`)}
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
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(p.entreprises ?? []).slice(0, 3).map((e) => (
                          <Badge key={e.id} variant="gray" className="text-xs">
                            {getEntrepriseTypeLabel(e.type as never)}
                          </Badge>
                        ))}
                        {(p.entreprises ?? []).length > 3 && (
                          <span className="text-xs text-gray-400">+{p.entreprises!.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {p.requestedDeadline ? (
                        <span className={new Date(p.requestedDeadline) < new Date() ? 'text-red-600 font-medium' : ''}>
                          {formatDate(p.requestedDeadline)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/types'

export default function InsurerProjectsPage() {
  const navigate = useNavigate()
  const { data: projects, loading } = useApi<Project[]>('/projects?pageSize=200')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [damageFilter, setDamageFilter] = useState('')
  const [recentFilter, setRecentFilter] = useState<'all' | '7d' | '30d'>('all')

  const filtered = useMemo(() => {
    if (!projects) return []
    const now = Date.now()
    return projects.filter((p) => {
      if (search && !p.claimId.toLowerCase().includes(search.toLowerCase()) &&
          !p.address.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (damageFilter && !p.damageType.toLowerCase().includes(damageFilter.toLowerCase())) return false
      if (recentFilter === '7d' && now - new Date(p.updatedAt).getTime() > 7 * 86400000) return false
      if (recentFilter === '30d' && now - new Date(p.updatedAt).getTime() > 30 * 86400000) return false
      return true
    })
  }, [projects, search, statusFilter, damageFilter, recentFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Mine sager</h1>
        <span className="text-sm text-gray-500">{filtered.length} sager</span>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Sag ID, adresse..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-36 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}>
          <option value="">Alle statusser</option>
          <option value="ACTIVE">Aktive</option>
          <option value="COMPLETED">Afsluttede</option>
        </select>
        <Input placeholder="Skadetype..." className="w-36" value={damageFilter} onChange={(e) => setDamageFilter(e.target.value)} />
        <select className="input-field w-36 text-sm" value={recentFilter} onChange={(e) => setRecentFilter(e.target.value as 'all' | '7d' | '30d')}>
          <option value="all">Alle perioder</option>
          <option value="7d">Seneste 7 dage</option>
          <option value="30d">Seneste 30 dage</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}</div>
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  {['Sag ID', 'Adresse', 'Skadetype', 'Status', 'Fremgang', 'Håndværker', 'Forventet afslutning'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Ingen sager matcher</td></tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/insurer/projects/${p.id}`)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-700">{p.claimId}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{p.address}, {p.city}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{p.damageType}</td>
                      <td className="px-4 py-2.5"><MilestoneBadge milestone={p.currentMilestone} /></td>
                      <td className="px-4 py-2.5 w-28">
                        <div className="flex items-center gap-1.5">
                          <Progress value={p.progressPercent} className="h-1.5 flex-1" />
                          <span className="text-xs text-gray-500 w-8">{p.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{p.selectedContractor?.companyName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.requestedDeadline ? formatDate(p.requestedDeadline) : '—'}</td>
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

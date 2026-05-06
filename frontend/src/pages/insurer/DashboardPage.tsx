import { useNavigate } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { FolderOpen, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MilestoneBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { StatCard } from '@/components/ui/StatCard'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { Project } from '@/types'

interface InsurerDashboardData {
  stats: { active: number; completed: number; delayed: number; recentlyUpdated: number }
  recentProjects: Project[]
}

export default function InsurerDashboard() {
  const navigate = useNavigate()
  const { data, loading } = useApi<InsurerDashboardData>('/insurer/dashboard')

  const stats = data?.stats ?? { active: 0, completed: 0, delayed: 0, recentlyUpdated: 0 }
  const recentProjects = data?.recentProjects ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Sagsoversigt</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dine aktive reparationssager hos Sedgwick Denmark</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <StatCard label="Aktive sager" value={stats.active} icon={FolderOpen} />
        <StatCard label="Afsluttede sager" value={stats.completed} icon={CheckCircle} />
        <StatCard label="Forsinkede" value={stats.delayed} icon={Clock} accent />
        <StatCard label="Opdateret for nylig" value={stats.recentlyUpdated} icon={RefreshCw} />
      </div>

      {/* Recent projects */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Senest opdaterede sager</CardTitle>
            <button
              onClick={() => navigate('/insurer/projects')}
              className="text-xs text-primary-600 hover:underline"
            >
              Se alle
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-1 p-4 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Ingen sager endnu</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-gray-50">
                    {['Sag ID', 'Adresse', 'Skadetype', 'Status', 'Fremgang', 'Forventet afslutning'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-display font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((p) => (
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
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {p.requestedDeadline ? formatDate(p.requestedDeadline) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

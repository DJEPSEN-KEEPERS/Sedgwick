import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, LayoutGrid, List, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MilestoneBadge, PriorityBadge } from '@/components/ui/StatusBadges'
import { ProjectProgressBar } from '@/components/ui/ProjectProgressBar'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus, PriorityLevel, ProjectMilestone } from '@/types'

const MILESTONES: { value: ProjectMilestone; label: string }[] = [
  { value: 'CASE_RECEIVED', label: 'Sag modtaget' },
  { value: 'BIDDING_IN_PROGRESS', label: 'Tilbud indhentes' },
  { value: 'CONTRACTOR_SELECTED', label: 'Håndværker valgt' },
  { value: 'WORK_SCHEDULED', label: 'Arbejde planlagt' },
  { value: 'WORK_STARTED', label: 'Arbejde startet' },
  { value: 'WORK_COMPLETED', label: 'Arbejde afsluttet' },
  { value: 'FINAL_REPORT_SUBMITTED', label: 'Slutrapport indsendt' },
  { value: 'CASE_CLOSED', label: 'Sag lukket' },
]

const PRIORITIES: { value: PriorityLevel; label: string }[] = [
  { value: 'LOW', label: 'Lav' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Høj' },
  { value: 'URGENT', label: 'Akut' },
]

interface Filters {
  search: string
  status: ProjectStatus | ''
  milestones: ProjectMilestone[]
  priority: PriorityLevel | ''
  region: string
  sla: 'all' | 'at_risk' | 'breached'
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<keyof Project>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: (searchParams.get('status') as ProjectStatus | '') ?? '',
    milestones: [],
    priority: '',
    region: '',
    sla: (searchParams.get('sla') as Filters['sla']) ?? 'all',
  })

  const { data: projects, loading } = useApi<Project[]>('/projects?pageSize=200')

  const filtered = useMemo(() => {
    if (!projects) return []
    let list = [...projects] as Project[]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (p) =>
          p.claimId.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.insuranceCompany?.name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q),
      )
    }
    if (filters.status) list = list.filter((p) => p.status === filters.status)
    if (filters.milestones.length) list = list.filter((p) => filters.milestones.includes(p.currentMilestone))
    if (filters.priority) list = list.filter((p) => p.priorityLevel === filters.priority)
    if (filters.region) list = list.filter((p) => p.region.toLowerCase().includes(filters.region.toLowerCase()))

    if (filters.sla !== 'all') {
      const now = Date.now()
      list = list.filter((p) => {
        if (!p.requestedDeadline) return false
        const daysLeft = Math.ceil((new Date(p.requestedDeadline).getTime() - now) / 86400000)
        if (filters.sla === 'breached') return daysLeft < 0
        if (filters.sla === 'at_risk') return daysLeft >= 0 && daysLeft <= 7
        return false
      })
    }

    // Sort
    list.sort((a, b) => {
      const av = a[sortField] as string ?? ''
      const bv = b[sortField] as string ?? ''
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    return list
  }, [projects, filters, sortField, sortDir])

  const hasFilters = filters.status || filters.milestones.length || filters.priority || filters.region || filters.sla !== 'all'

  const setSort = (field: keyof Project) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: keyof Project }) =>
    sortField === field ? (
      <span className="ml-0.5 text-primary-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Sager</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{filtered.length} sager</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Søg sag-ID, adresse, forsikring..."
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
          {hasFilters && <span className="ml-1 rounded-full bg-white text-primary-700 px-1.5 text-xs font-display font-semibold">{[filters.status, ...filters.milestones, filters.priority].filter(Boolean).length}</span>}
        </Button>

        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          <button
            className={cn('px-3 py-1.5', view === 'table' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-500 hover:bg-gray-50')}
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            className={cn('px-3 py-1.5 border-l border-gray-300', view === 'cards' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-500 hover:bg-gray-50')}
            onClick={() => setView('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 mb-4 shadow-card">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className="label">Status</label>
              <select
                className="input-field text-sm"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ProjectStatus | '' }))}
              >
                <option value="">Alle</option>
                <option value="ACTIVE">Aktiv</option>
                <option value="COMPLETED">Afsluttet</option>
                <option value="ARCHIVED">Arkiveret</option>
                <option value="CANCELLED">Annulleret</option>
              </select>
            </div>
            <div>
              <label className="label">Prioritet</label>
              <select
                className="input-field text-sm"
                value={filters.priority}
                onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as PriorityLevel | '' }))}
              >
                <option value="">Alle</option>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">SLA</label>
              <select
                className="input-field text-sm"
                value={filters.sla}
                onChange={(e) => setFilters((f) => ({ ...f, sla: e.target.value as Filters['sla'] }))}
              >
                <option value="all">Alle</option>
                <option value="at_risk">I risiko (&lt;7 dage)</option>
                <option value="breached">Overskredet</option>
              </select>
            </div>
            <div>
              <label className="label">Region</label>
              <Input
                placeholder="Filtrer region..."
                value={filters.region}
                onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ search: '', status: '', milestones: [], priority: '', region: '', sla: 'all' })}
                className="text-gray-500"
              >
                <X className="h-4 w-4 mr-1" />
                Ryd
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="font-display font-medium text-gray-500">Ingen sager matcher dine filtre</p>
          <p className="text-sm text-gray-400 mt-1">Sager oprettes via forsikringsselskabernes API</p>
        </div>
      ) : view === 'table' ? (
        <ProjectsTable projects={filtered} onRowClick={(id) => navigate(`/sedgwick/projects/${id}`)} sortField={sortField} setSort={setSort} SortIcon={SortIcon} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => <ProjectCardFull key={p.id} project={p} onClick={() => navigate(`/sedgwick/projects/${p.id}`)} />)}
        </div>
      )}
    </div>
  )
}

function ProjectsTable({
  projects,
  onRowClick,
  sortField,
  setSort,
  SortIcon,
}: {
  projects: Project[]
  onRowClick: (id: string) => void
  sortField: keyof Project
  setSort: (f: keyof Project) => void
  SortIcon: React.FC<{ field: keyof Project }>
}) {
  const cols: { key: keyof Project; label: string; sortable?: boolean }[] = [
    { key: 'claimId', label: 'Sag ID', sortable: true },
    { key: 'insuranceCompanyId', label: 'Forsikring' },
    { key: 'damageType', label: 'Skadetype', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    { key: 'priorityLevel', label: 'Prioritet' },
    { key: 'currentMilestone', label: 'Status' },
    { key: 'selectedContractorId', label: 'Håndværker' },
    { key: 'requestedDeadline', label: 'SLA' },
    { key: 'updatedAt', label: 'Opdateret', sortable: true },
  ]

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              {cols.map((c) => (
                <th
                  key={String(c.key)}
                  className={cn(
                    'px-4 py-2.5 text-left text-xs font-display font-medium text-gray-500',
                    c.sortable && 'cursor-pointer hover:text-gray-700',
                  )}
                  onClick={() => c.sortable && setSort(c.key)}
                >
                  {c.label}
                  {c.sortable && <SortIcon field={c.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick(p.id)}
              >
                <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-700">{p.claimId}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.insuranceCompany?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.damageType}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.region}</td>
                <td className="px-4 py-2.5"><PriorityBadge level={p.priorityLevel} /></td>
                <td className="px-4 py-2.5"><MilestoneBadge milestone={p.currentMilestone} /></td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{p.selectedContractor?.companyName ?? '—'}</td>
                <td className="px-4 py-2.5"><SlaCell deadline={p.requestedDeadline} /></td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{formatRelativeTime(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SlaCell({ deadline }: { deadline?: string }) {
  if (!deadline) return <span className="text-xs text-gray-400">—</span>
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return <Badge variant="danger">Brud</Badge>
  if (daysLeft <= 7) return <Badge variant="warning">{daysLeft}d</Badge>
  return <Badge variant="success">OK</Badge>
}

function ProjectCardFull({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <Card className="hover:shadow-elevated transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs font-mono text-gray-400">#{project.claimId}</p>
            <h3 className="font-display font-semibold text-gray-900">{project.damageType}</h3>
          </div>
          <PriorityBadge level={project.priorityLevel} />
        </div>
        <p className="text-xs text-gray-500 mb-2">{project.address}, {project.city}</p>
        <div className="flex items-center justify-between mb-2">
          <MilestoneBadge milestone={project.currentMilestone} />
          {project.selectedContractor && (
            <span className="text-xs text-gray-500">{project.selectedContractor.companyName}</span>
          )}
        </div>
        <ProjectProgressBar currentMilestone={project.currentMilestone} compact />
        <p className="text-xs text-gray-400 mt-2">{formatRelativeTime(project.updatedAt)}</p>
      </CardContent>
    </Card>
  )
}

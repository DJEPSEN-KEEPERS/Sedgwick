import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi, useMutation } from '@/hooks/useApi'
import { FolderOpen, Gavel, CheckSquare, AlertTriangle, Clock, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MilestoneBadge, PriorityBadge, ApprovalBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { formatDateTime, formatRelativeTime, getInitials, formatCurrency, getEntrepriseTypeLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, EntrepriseStatusUpdate, FinalReport } from '@/types'

interface DashboardStats {
  activeProjects: number
  newThisWeek: number
  bidsAwaiting: number
  urgentBids: number
  pendingApprovals: number
  oldestApprovalDays: number
  slaBreaches: number
}

interface RecentMessage {
  id: string
  channelId: string
  projectId: string
  claimId: string
  senderName: string
  senderRole: string
  messageBody: string
  createdAt: string
}

interface ContractorStat {
  id: string
  companyName: string
  sedgwickRatingAvg: number
  currentWorkload: number
  maxParallelProjects: number
}

interface PendingItem {
  type: 'statusUpdate' | 'finalReport'
  id: string
  projectClaimId: string
  entrepriseType: string
  contractorName: string
  submittedAt: string
  milestone?: string
  progressPercent?: number
  comments?: string
}

interface DashboardData {
  stats: DashboardStats
  recentProjects: Project[]
  pendingItems: PendingItem[]
  slaProjects: Project[]
  recentMessages: RecentMessage[]
  topContractors: ContractorStat[]
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  borderColor,
  onClick,
}: {
  label: string
  value: number | string
  sub: string
  icon: React.ElementType
  borderColor: string
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-card border border-[#e5e7eb] p-4 border-l-4 cursor-pointer hover:shadow-elevated transition-shadow',
        borderColor,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-display font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-display font-bold text-gray-900">{value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
          <Icon className="h-5 w-5 text-gray-500" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}

export default function SedgwickDashboard() {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi<DashboardData>('/dashboard')
  const { mutate: approve } = useMutation('post')
  const { mutate: reject } = useMutation('post')

  const handleApprove = async (item: PendingItem) => {
    const path =
      item.type === 'statusUpdate'
        ? `/status-updates/${item.id}/approve`
        : `/final-reports/${item.id}/approve`
    await approve(path)
    refetch()
  }

  const handleReject = async (item: PendingItem) => {
    const path =
      item.type === 'statusUpdate'
        ? `/status-updates/${item.id}/reject`
        : `/final-reports/${item.id}/reject`
    await reject(path)
    refetch()
  }

  if (loading) return <PageSkeleton />

  const stats = data?.stats ?? {
    activeProjects: 0,
    newThisWeek: 0,
    bidsAwaiting: 0,
    urgentBids: 0,
    pendingApprovals: 0,
    oldestApprovalDays: 0,
    slaBreaches: 0,
  }

  const recentProjects = data?.recentProjects ?? []
  const pendingItems = data?.pendingItems ?? []
  const slaProjects = data?.slaProjects ?? []
  const recentMessages = data?.recentMessages ?? []
  const topContractors = data?.topContractors ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sedgwick operationscentral</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-2">
          <p><span className="font-semibold">API-fejl:</span> {error}</p>
          <DebugPanel />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-6">
        <StatCard
          label="Aktive sager"
          value={stats.activeProjects}
          sub={`↑ ${stats.newThisWeek} denne uge`}
          icon={FolderOpen}
          borderColor="border-l-primary-600"
          onClick={() => navigate('/sedgwick/projects?status=ACTIVE')}
        />
        <StatCard
          label="Afventer tilbud"
          value={stats.bidsAwaiting}
          sub={`Akut: ${stats.urgentBids}`}
          icon={Gavel}
          borderColor="border-l-accent"
          onClick={() => navigate('/sedgwick/bids')}
        />
        <StatCard
          label="Afventer godkendelse"
          value={stats.pendingApprovals}
          sub={`Ældste: ${stats.oldestApprovalDays}d`}
          icon={CheckSquare}
          borderColor="border-l-warning"
          onClick={() => navigate('/sedgwick/approvals')}
        />
        <StatCard
          label="SLA-brud"
          value={stats.slaBreaches}
          sub="⚠ Gennemgå straks"
          icon={AlertTriangle}
          borderColor="border-l-danger"
          onClick={() => navigate('/sedgwick/projects?sla=breached')}
        />
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left — 3 cols */}
        <div className="xl:col-span-3 space-y-6">
          {/* Active Projects Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Senest opdaterede sager</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/sedgwick/projects')}>
                  Se alle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentProjects.length === 0 ? (
                <EmptyTableRow message="Ingen aktive sager" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb] bg-gray-50">
                        {['Sag ID', 'Forsikring', 'Region', 'Prioritet', 'Status', 'SLA'].map((h) => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-display font-medium text-gray-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentProjects.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/sedgwick/projects/${p.id}`)}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs font-medium text-primary-700">{p.claimId}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{p.insuranceCompany?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{p.region}</td>
                          <td className="px-4 py-2.5"><PriorityBadge level={p.priorityLevel} /></td>
                          <td className="px-4 py-2.5"><MilestoneBadge milestone={p.currentMilestone} /></td>
                          <td className="px-4 py-2.5">
                            <SlaIndicator project={p} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals Queue */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Godkendelseskø
                  {pendingItems.length > 0 && (
                    <span className="ml-2 rounded-full bg-warning px-2 py-0.5 text-xs text-white">
                      {pendingItems.length}
                    </span>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/sedgwick/approvals')}>
                  Åbn kø
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingItems.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  Ingen ventende godkendelser ✓
                </div>
              ) : (
                <div className="divide-y divide-[#e5e7eb]">
                  {pendingItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/10 text-xs font-display font-semibold text-warning">
                        {getInitials(item.contractorName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-display font-semibold text-gray-900">
                            {item.contractorName}
                          </span>
                          <Badge variant="gray" className="text-xs">
                            {getEntrepriseTypeLabel(item.entrepriseType as never)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            #{item.projectClaimId}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{formatRelativeTime(item.submittedAt)}</p>
                        {item.comments && (
                          <p className="text-xs text-gray-600 truncate mt-0.5">{item.comments}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleApprove(item)}
                          className="rounded px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 font-display font-medium"
                        >
                          Godkend
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 font-display font-medium"
                        >
                          Afvis
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — 2 cols */}
        <div className="xl:col-span-2 space-y-6">
          {/* SLA Breaches */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-danger">SLA-advarsler</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {slaProjects.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">Ingen SLA-brud ✓</div>
              ) : (
                <div className="divide-y divide-[#e5e7eb]">
                  {slaProjects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/sedgwick/projects/${p.id}`)}
                    >
                      <div className="h-2 w-2 rounded-full bg-danger shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-display font-medium text-gray-900">#{p.claimId}</p>
                        <p className="text-xs text-gray-500 truncate">{p.address}</p>
                      </div>
                      <PriorityBadge level={p.priorityLevel} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Seneste beskeder</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/sedgwick/messages')}>
                  Alle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentMessages.length === 0 ? (
                <div className="px-4 py-4 text-center text-sm text-gray-400">Ingen beskeder</div>
              ) : (
                <div className="divide-y divide-[#e5e7eb]">
                  {recentMessages.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/sedgwick/projects/${m.projectId}?tab=messages`)}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-display font-semibold">
                        {getInitials(m.senderName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-display font-medium text-gray-900">{m.senderName}</span>
                          <span className="text-xs text-gray-400">#{m.claimId}</span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{m.messageBody}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contractor Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top håndværkere</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topContractors.length === 0 ? (
                <div className="px-4 py-4 text-center text-sm text-gray-400">Ingen data</div>
              ) : (
                <div className="divide-y divide-[#e5e7eb]">
                  {topContractors.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/sedgwick/contractors/${c.id}`)}
                    >
                      <span className="text-xs font-display font-bold text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-medium text-gray-900 truncate">{c.companyName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-500">{c.sedgwickRatingAvg.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="w-20">
                        <div className="text-xs text-gray-500 text-right mb-0.5">
                          {c.currentWorkload}/{c.maxParallelProjects}
                        </div>
                        <Progress
                          value={(c.currentWorkload / c.maxParallelProjects) * 100}
                          className="h-1.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SlaIndicator({ project }: { project: Project }) {
  if (!project.requestedDeadline) return <span className="text-xs text-gray-400">—</span>
  const deadline = new Date(project.requestedDeadline)
  const now = new Date()
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000)
  if (daysLeft < 0) return <span className="text-xs text-danger font-medium">Overskredet</span>
  if (daysLeft <= 7) return <span className="text-xs text-warning font-medium">Risiko ({daysLeft}d)</span>
  return <span className="text-xs text-success">OK</span>
}

function EmptyTableRow({ message }: { message: string }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-gray-400">{message}</div>
  )
}

function DebugPanel() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [ran, setRan] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? ''
    fetch('/api/auth/debug-token', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setResult(d); setRan(true) })
      .catch((e) => { setResult({ fetchError: String(e) }); setRan(true) })
  }, [])

  if (!ran) return <p className="text-xs text-red-500 italic">Kører diagnostik…</p>

  return (
    <pre className="mt-1 rounded bg-red-100 p-2 text-xs text-red-800 overflow-auto whitespace-pre-wrap break-all">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="h-64 bg-gray-200 rounded-lg" />
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
        <div className="col-span-2 space-y-6">
          <div className="h-40 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

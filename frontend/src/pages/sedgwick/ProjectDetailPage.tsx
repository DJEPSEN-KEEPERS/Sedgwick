import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Edit2, Archive, FileDown, X } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { MilestoneBadge, PriorityBadge } from '@/components/ui/StatusBadges'
import { OverviewTab } from '@/components/projects/tabs/OverviewTab'
import { EntreprisesTab } from '@/components/projects/tabs/EntreprisesTab'
import { BiddingTab } from '@/components/projects/tabs/BiddingTab'
import { ProgressTab } from '@/components/projects/tabs/ProgressTab'
import { MessagesTab } from '@/components/projects/tabs/MessagesTab'
import { FilesTab } from '@/components/projects/tabs/FilesTab'
import { AuditTab } from '@/components/projects/tabs/AuditTab'
import { EditProjectPanel } from '@/components/projects/EditProjectPanel'
import { exportProjectPdf } from '@/lib/exportProjectPdf'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

const TABS = [
  { key: 'overview',     label: 'Oversigt' },
  { key: 'entreprises',  label: 'Entrepriser' },
  { key: 'bidding',      label: 'Tilbud' },
  { key: 'progress',     label: 'Fremgang' },
  { key: 'messages',     label: 'Beskeder' },
  { key: 'files',        label: 'Filer' },
  { key: 'audit',        label: 'Audit' },
]

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') ?? 'overview')
  const [confirmClose, setConfirmClose] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const { data: project, loading, refetch } = useApi<Project>(`/projects/${projectId}`)
  const { mutate: closeProject, loading: closing } = useMutation('delete')

  // Allow child tabs to trigger a refetch after inline updates
  const handleProjectUpdate = () => refetch()

  const handleProjectSaved = (updated: Project) => {
    refetch()
    setEditOpen(false)
  }

  const handleClose = async () => {
    const result = await closeProject(`/projects/${projectId}`)
    if (result) {
      setConfirmClose(false)
      refetch()
    }
  }

  useEffect(() => {
    setSearchParams(activeTab !== 'overview' ? { tab: activeTab } : {}, { replace: true })
  }, [activeTab, setSearchParams])

  if (loading) return <PageSkeleton />

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="font-display font-semibold text-gray-500">Sag ikke fundet</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/sedgwick/projects')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Tilbage
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <button
          onClick={() => navigate('/sedgwick/projects')}
          className="flex items-center gap-1 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Sager
        </button>
        <span>/</span>
        <span className="font-mono text-gray-700">{project.claimId}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-card p-4 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-display font-bold text-gray-900 font-mono">{project.claimId}</h1>
              <PriorityBadge level={project.priorityLevel} />
              <MilestoneBadge milestone={project.currentMilestone} />
            </div>
            <p className="text-base font-display font-semibold text-gray-700">{project.damageType} — {project.buildingType}</p>
            <p className="text-sm text-gray-500">{project.address}, {project.postalCode} {project.city}, {project.region}</p>
          </div>
          <div className="flex gap-2 shrink-0 items-center flex-wrap">
            {confirmClose ? (
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-1.5">
                <span className="text-xs font-medium text-red-700">Luk sag permanent?</span>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-red-600 h-7 text-xs"
                  onClick={handleClose} disabled={closing}>
                  {closing ? '...' : 'Ja, luk sag'}
                </Button>
                <button onClick={() => setConfirmClose(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                  <Edit2 className="h-4 w-4 mr-1" /> Rediger
                </Button>
                <Button variant="secondary" size="sm" onClick={() => exportProjectPdf(project)}>
                  <FileDown className="h-4 w-4 mr-1" /> Eksporter
                </Button>
                {project.status !== 'CLOSED' && (
                  <Button variant="secondary" size="sm" className="text-gray-500 hover:text-red-600 hover:border-red-300"
                    onClick={() => setConfirmClose(true)}>
                    <Archive className="h-4 w-4 mr-1" /> Luk sag
                  </Button>
                )}
                {project.status === 'CLOSED' && (
                  <span className="text-xs font-medium text-gray-400 border border-gray-200 rounded-md px-2 py-1">Lukket</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#e5e7eb] mb-6 -mx-0">
        <nav className="flex gap-0 overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-shrink-0 px-4 py-2.5 text-sm font-display font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview'    && <OverviewTab project={project} onProjectUpdate={handleProjectUpdate} />}
      {activeTab === 'entreprises' && <EntreprisesTab projectId={project.id} />}
      {activeTab === 'bidding'     && <BiddingTab projectId={project.id} />}
      {activeTab === 'progress'    && <ProgressTab project={project} onProjectUpdate={handleProjectUpdate} />}
      {activeTab === 'messages'    && <MessagesTab projectId={project.id} />}
      {activeTab === 'files'       && <FilesTab projectId={project.id} />}
      {activeTab === 'audit'       && <AuditTab projectId={project.id} />}

      <EditProjectPanel
        project={project}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleProjectSaved}
      />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded" />
      <div className="h-28 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-64 bg-gray-200 rounded-lg" />
    </div>
  )
}

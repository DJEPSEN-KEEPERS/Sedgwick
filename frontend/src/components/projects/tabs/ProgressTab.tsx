import { useMemo } from 'react'
import { Receipt } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/useApi'
import { ProjectProgressBar } from '@/components/ui/ProjectProgressBar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getEntrepriseTypeLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, Entreprise } from '@/types'

// ─── ISO week helpers ─────────────────────────────────────────────────────────

function startOfISOWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ─── Gantt week grid ──────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  CARPENTER: '🪚', MASON: '🧱', PLUMBER: '🔧', GLAZIER: '🪟',
  ELECTRICIAN: '⚡', PAINTER: '🎨', ROOFER: '🏠', OTHER: '📋',
}

const TYPE_COLOR: Record<string, string> = {
  CARPENTER: 'bg-amber-400',
  MASON:     'bg-stone-400',
  PLUMBER:   'bg-blue-400',
  GLAZIER:   'bg-cyan-400',
  ELECTRICIAN: 'bg-yellow-400',
  PAINTER:   'bg-purple-400',
  ROOFER:    'bg-orange-400',
  OTHER:     'bg-gray-400',
}

function WeekGanttGrid({ entreprises }: { entreprises: Entreprise[] }) {
  const weeks = useMemo(() => {
    const todayWeekStart = startOfISOWeek(new Date())
    return Array.from({ length: 16 }, (_, i) => {
      const d = new Date(todayWeekStart)
      d.setDate(d.getDate() + (i - 4) * 7)
      return d
    })
  }, [])

  const currentWeekMs = startOfISOWeek(new Date()).getTime()

  const scheduled = entreprises.filter((e) => e.scheduledStart || e.scheduledEnd)
  if (scheduled.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e5e7eb]">
        <h3 className="text-sm font-display font-semibold text-gray-900">Entreprise-plan</h3>
        <p className="text-xs text-gray-500 mt-0.5">4 uger tilbage · aktuel uge fremhævet · 12 uger frem</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs select-none" style={{ minWidth: `${40 + 16 * 48}px` }}>
          <thead>
            {/* Month row */}
            <tr>
              <th className="w-44 min-w-[11rem] px-3 py-1.5 text-left text-gray-400 font-normal bg-gray-50 border-b border-gray-100" />
              {weeks.map((w, i) => {
                const showMonth = i === 0 || w.getMonth() !== weeks[i - 1].getMonth()
                return (
                  <th key={i} className="px-0 py-1 text-center text-gray-400 font-normal bg-gray-50 border-b border-gray-100 w-12">
                    {showMonth
                      ? <span className="text-[10px] font-display font-medium text-gray-500 uppercase tracking-wide">
                          {w.toLocaleString('da-DK', { month: 'short' })}
                        </span>
                      : null}
                  </th>
                )
              })}
            </tr>
            {/* Week number row */}
            <tr>
              <th className="px-3 py-1.5 text-left text-gray-400 font-normal bg-gray-50 border-b border-gray-200" />
              {weeks.map((w, i) => {
                const isCurrent = w.getTime() === currentWeekMs
                return (
                  <th key={i} className={cn(
                    'py-1 text-center font-display font-semibold w-12 border-b border-gray-200',
                    isCurrent ? 'text-primary-600 bg-primary-50' : 'text-gray-400 bg-gray-50',
                  )}>
                    {getISOWeekNumber(w)}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {scheduled.map((e, rowIdx) => {
              const start = e.scheduledStart ? new Date(e.scheduledStart) : null
              const end   = e.scheduledEnd   ? new Date(e.scheduledEnd)   : null
              const color = TYPE_COLOR[e.type] ?? 'bg-primary-400'

              return (
                <tr key={e.id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                  {/* Label */}
                  <td className="px-3 py-2 border-b border-gray-100 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-display font-medium text-gray-700">
                      <span>{TYPE_ICON[e.type]}</span>
                      <span>{getEntrepriseTypeLabel(e.type)}</span>
                    </div>
                    {e.contractor && (
                      <div className="text-[10px] text-gray-400 mt-0.5 pl-5">{e.contractor.companyName}</div>
                    )}
                  </td>

                  {/* Week cells */}
                  {weeks.map((w, i) => {
                    const weekEnd = new Date(w)
                    weekEnd.setDate(weekEnd.getDate() + 6)
                    weekEnd.setHours(23, 59, 59, 999)

                    const isCurrent = w.getTime() === currentWeekMs
                    const active  = !!(start && end && start <= weekEnd && end >= w)
                    const isFirst = !!(active && start && start >= w && start <= weekEnd)
                    const isLast  = !!(active && end   && end   >= w && end   <= weekEnd)

                    return (
                      <td key={i} className={cn(
                        'w-12 py-2 px-0.5 border-b border-gray-100',
                        isCurrent && 'bg-primary-50/40',
                      )}>
                        {active && (
                          <div className={cn(
                            'h-5',
                            color,
                            isFirst && isLast ? 'rounded-full mx-1.5'
                              : isFirst       ? 'rounded-l-full ml-1.5 mr-0'
                              : isLast        ? 'rounded-r-full ml-0 mr-1.5'
                                              : 'mx-0',
                          )} />
                        )}
                        {!active && isCurrent && (
                          <div className="h-5" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function ProgressTab({ project, onProjectUpdate }: { project: Project; onProjectUpdate?: () => void }) {
  const { data: entreprises, loading } = useApi<Entreprise[]>(
    `/projects/${project.id}/entreprises`,
  )
  const { mutate: updateProject, loading: invoicing } = useMutation('patch')

  const relevant = entreprises?.filter((e) => e.isRelevant) ?? []
  const overallProgress = relevant.length
    ? Math.round(relevant.reduce((s, e) => s + e.progressPercent, 0) / relevant.length)
    : 0

  const handleMarkInvoiced = async () => {
    const result = await updateProject(`/projects/${project.id}`, {
      currentMilestone: 'CASE_CLOSED',
      status: 'COMPLETED',
      finalCompletionDate: new Date().toISOString(),
    })
    if (result) onProjectUpdate?.()
  }

  return (
    <div className="space-y-6">
      {/* 9-step milestone timeline */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-display font-semibold text-gray-900">Samlet fremgang</h3>
          <span className="text-sm font-display font-bold text-primary-700">{overallProgress}%</span>
        </div>
        <ProjectProgressBar currentMilestone={project.currentMilestone} className="mb-4" />
        <Progress value={overallProgress} className="h-2 mt-2" />
      </div>

      {/* Entreprise week Gantt — only shown when entreprises have scheduled dates */}
      {!loading && <WeekGanttGrid entreprises={relevant} />}

      {/* Invoice gate */}
      {project.currentMilestone === 'CASE_INVOICED' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Receipt className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-display font-semibold text-blue-900">Klar til fakturering</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Slutrapporten er godkendt. Marker sagen som faktureret for at lukke den.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleMarkInvoiced} disabled={invoicing} className="shrink-0">
            <Receipt className="h-4 w-4 mr-1.5" />
            {invoicing ? 'Gemmer...' : 'Marker som faktureret og luk sag'}
          </Button>
        </div>
      )}

    </div>
  )
}

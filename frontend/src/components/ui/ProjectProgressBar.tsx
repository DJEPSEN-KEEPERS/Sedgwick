import { cn } from '@/lib/utils'
import { projectMilestoneToStep, getProjectMilestoneLabel } from '@/lib/utils'
import type { ProjectMilestone } from '@/types'

const MILESTONES: ProjectMilestone[] = [
  'CASE_RECEIVED',
  'BIDDING_IN_PROGRESS',
  'CONTRACTOR_SELECTED',
  'WORK_SCHEDULED',
  'WORK_STARTED',
  'WORK_COMPLETED',
  'FINAL_REPORT_SUBMITTED',
  'CASE_CLOSED',
]

interface ProjectProgressBarProps {
  currentMilestone: ProjectMilestone
  className?: string
  compact?: boolean
}

export function ProjectProgressBar({ currentMilestone, className, compact = false }: ProjectProgressBarProps) {
  const currentStep = projectMilestoneToStep(currentMilestone)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {MILESTONES.map((m, i) => (
          <div
            key={m}
            title={getProjectMilestoneLabel(m)}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < currentStep
                ? 'bg-primary-600'
                : i === currentStep
                  ? 'bg-primary-400'
                  : 'bg-gray-200',
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center">
        {MILESTONES.map((m, i) => (
          <div key={m} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-display font-semibold transition-colors',
                  i < currentStep
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : i === currentStep
                      ? 'border-primary-600 bg-white text-primary-600'
                      : 'border-gray-300 bg-white text-gray-400',
                )}
              >
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'mt-1 hidden text-xs font-display text-center max-w-[70px] leading-tight xl:block',
                  i <= currentStep ? 'text-primary-700 font-medium' : 'text-gray-400',
                )}
              >
                {getProjectMilestoneLabel(m)}
              </span>
            </div>
            {i < MILESTONES.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 transition-colors',
                  i < currentStep ? 'bg-primary-600' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

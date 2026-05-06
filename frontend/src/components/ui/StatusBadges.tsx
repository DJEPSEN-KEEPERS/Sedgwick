import { Badge } from './badge'
import { cn } from '@/lib/utils'
import {
  getProjectMilestoneLabel,
  getEntrepriseMilestoneLabel,
  getPriorityLabel,
} from '@/lib/utils'
import type {
  ProjectMilestone,
  EntrepriseMilestone,
  PriorityLevel,
  ApprovalStatus,
} from '@/types'

export function MilestoneBadge({ milestone }: { milestone: ProjectMilestone }) {
  const variant =
    milestone === 'CASE_CLOSED'
      ? 'success'
      : milestone === 'CASE_RECEIVED'
        ? 'gray'
        : milestone === 'WORK_STARTED' || milestone === 'WORK_COMPLETED'
          ? 'info'
          : 'default'

  return <Badge variant={variant}>{getProjectMilestoneLabel(milestone)}</Badge>
}

export function EntrepriseBadge({ milestone }: { milestone: EntrepriseMilestone }) {
  const variantMap: Record<EntrepriseMilestone, 'gray' | 'info' | 'warning' | 'success' | 'default'> = {
    NOT_STARTED: 'gray',
    SCHEDULED: 'info',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    SIGNED_OFF: 'success',
  }

  return <Badge variant={variantMap[milestone]}>{getEntrepriseMilestoneLabel(milestone)}</Badge>
}

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  const variantMap: Record<PriorityLevel, 'gray' | 'info' | 'warning' | 'danger'> = {
    LOW: 'gray',
    NORMAL: 'info',
    HIGH: 'warning',
    URGENT: 'danger',
  }

  return (
    <Badge variant={variantMap[level]} className={cn(level === 'URGENT' && 'animate-pulse')}>
      {getPriorityLabel(level)}
    </Badge>
  )
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const config: Record<ApprovalStatus, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
    PENDING: { label: 'Afventer', variant: 'warning' },
    APPROVED: { label: 'Godkendt', variant: 'success' },
    REJECTED: { label: 'Afvist', variant: 'danger' },
  }
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}

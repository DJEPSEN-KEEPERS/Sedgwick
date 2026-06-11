import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EntrepriseType, PriorityLevel, ProjectMilestone, EntrepriseMilestone } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'DKK'): string {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('da-DK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('da-DK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Lige nu'
  if (diffMins < 60) return `${diffMins} min siden`
  if (diffHours < 24) return `${diffHours} timer siden`
  if (diffDays < 7) return `${diffDays} dage siden`
  return formatDate(dateString)
}

export function getEntrepriseTypeLabel(type: EntrepriseType): string {
  const labels: Record<EntrepriseType, string> = {
    CARPENTER: 'Tømrer',
    MASON: 'Murer',
    PLUMBER: 'VVS',
    GLAZIER: 'Glarmester',
    ELECTRICIAN: 'Elektriker',
    PAINTER: 'Maler',
    ROOFER: 'Tækker/Tag',
    OTHER: 'Andet',
  }
  return labels[type]
}

export function getProjectMilestoneLabel(milestone: ProjectMilestone): string {
  const labels: Record<ProjectMilestone, string> = {
    CASE_RECEIVED: 'Sag modtaget',
    BIDDING_IN_PROGRESS: 'Tilbud indhentes',
    CONTRACTOR_SELECTED: 'Håndværker valgt',
    WORK_SCHEDULED: 'Arbejde planlagt',
    WORK_STARTED: 'Arbejde startet',
    WORK_COMPLETED: 'Arbejde afsluttet',
    FINAL_REPORT_SUBMITTED: 'Slutrapport indsendt',
    CASE_CLOSED: 'Sag lukket',
  }
  return labels[milestone]
}

export function getEntrepriseMilestoneLabel(milestone: EntrepriseMilestone): string {
  const labels: Record<EntrepriseMilestone, string> = {
    NOT_STARTED: 'Ikke startet',
    SCHEDULED: 'Planlagt',
    IN_PROGRESS: 'I gang',
    COMPLETED: 'Afsluttet',
    SIGNED_OFF: 'Godkendt',
  }
  return labels[milestone]
}

export function getPriorityLabel(level: PriorityLevel): string {
  const labels: Record<PriorityLevel, string> = {
    NORMAL: 'Normal',
    FASTTRACK: 'Fasttrack',
  }
  return labels[level] ?? level
}

export function projectMilestoneToStep(milestone: ProjectMilestone): number {
  const steps: Record<ProjectMilestone, number> = {
    CASE_RECEIVED: 0,
    BIDDING_IN_PROGRESS: 1,
    CONTRACTOR_SELECTED: 2,
    WORK_SCHEDULED: 3,
    WORK_STARTED: 4,
    WORK_COMPLETED: 5,
    FINAL_REPORT_SUBMITTED: 6,
    CASE_CLOSED: 7,
  }
  return steps[milestone]
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

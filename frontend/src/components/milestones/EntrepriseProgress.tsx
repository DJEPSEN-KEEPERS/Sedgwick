import { cn, getEntrepriseTypeLabel, getEntrepriseMilestoneLabel } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { EntrepriseBadge } from '@/components/ui/StatusBadges'
import type { Entreprise } from '@/types'

interface EntrepriseProgressProps {
  entreprises: Entreprise[]
  className?: string
}

const ENTREPRISE_ICONS: Record<string, string> = {
  CARPENTER: '🪚',
  MASON: '🧱',
  PLUMBER: '🔧',
  GLAZIER: '🪟',
  ELECTRICIAN: '⚡',
  PAINTER: '🎨',
  ROOFER: '🏠',
  OTHER: '📋',
}

export function EntrepriseProgress({ entreprises, className }: EntrepriseProgressProps) {
  const relevant = entreprises.filter((e) => e.isRelevant)

  return (
    <div className={cn('space-y-3', className)}>
      {relevant.map((e) => (
        <div key={e.id} className="flex items-center gap-3">
          <span className="text-base shrink-0 w-5 text-center">{ENTREPRISE_ICONS[e.type]}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-display font-medium text-gray-700 truncate">
                {getEntrepriseTypeLabel(e.type)}
              </span>
              <EntrepriseBadge milestone={e.currentMilestone} />
            </div>
            <Progress value={e.progressPercent} className="h-1.5" />
          </div>
          <span className="text-xs text-gray-500 shrink-0 w-8 text-right">{e.progressPercent}%</span>
        </div>
      ))}

      {relevant.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">Ingen entrepriser registreret</p>
      )}
    </div>
  )
}

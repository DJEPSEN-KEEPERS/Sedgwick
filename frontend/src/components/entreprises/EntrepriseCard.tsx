import { Card, CardContent } from '@/components/ui/card'
import { EntrepriseBadge } from '@/components/ui/StatusBadges'
import { Progress } from '@/components/ui/progress'
import { getEntrepriseTypeLabel, formatDate } from '@/lib/utils'
import type { Entreprise } from '@/types'

interface EntrepriseCardProps {
  entreprise: Entreprise
  onClick?: () => void
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

export function EntrepriseCard({ entreprise, onClick }: EntrepriseCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-elevated transition-shadow duration-150' : ''}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{ENTREPRISE_ICONS[entreprise.type]}</span>
            <div>
              <h4 className="font-display font-semibold text-gray-900 text-sm">
                {getEntrepriseTypeLabel(entreprise.type)}
              </h4>
              {entreprise.contractor && (
                <p className="text-xs text-gray-500">{entreprise.contractor.companyName}</p>
              )}
            </div>
          </div>
          <EntrepriseBadge milestone={entreprise.currentMilestone} />
        </div>

        {entreprise.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{entreprise.description}</p>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Fremgang</span>
            <span>{entreprise.progressPercent}%</span>
          </div>
          <Progress value={entreprise.progressPercent} className="h-1.5" />
        </div>

        {entreprise.scheduledStart && (
          <p className="mt-2 text-xs text-gray-500">
            Planlagt start: {formatDate(entreprise.scheduledStart)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

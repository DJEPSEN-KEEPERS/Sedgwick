import { Star, Phone, Mail, Briefcase } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, getInitials } from '@/lib/utils'
import type { Contractor } from '@/types'

interface ContractorCardProps {
  contractor: Contractor
  onSelect?: (id: string) => void
  selected?: boolean
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-3.5 w-3.5',
            star <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
          )}
        />
      ))}
      <span className="ml-1 text-xs text-gray-600">{value.toFixed(1)}</span>
    </div>
  )
}

export function ContractorCard({ contractor, onSelect, selected }: ContractorCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-150',
        onSelect && 'cursor-pointer hover:shadow-elevated',
        selected && 'ring-2 ring-primary-500',
      )}
      onClick={() => onSelect?.(contractor.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-display font-semibold text-sm">
            {getInitials(contractor.companyName)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-gray-900 truncate">{contractor.companyName}</h3>
            <p className="text-xs text-gray-500 mb-1">CVR: {contractor.cvrNumber}</p>
            <StarRating value={contractor.sedgwickRatingAvg} />
          </div>
          <Badge
            variant={contractor.currentWorkload < contractor.maxParallelProjects ? 'success' : 'warning'}
          >
            {contractor.currentWorkload}/{contractor.maxParallelProjects} sager
          </Badge>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Phone className="h-3 w-3 text-gray-400" />
            {contractor.contactPhone}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="truncate">{contractor.contactEmail}</span>
          </div>
        </div>

        {contractor.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {contractor.skills.slice(0, 4).map((skill) => (
              <Badge key={skill.id} variant="gray" className="text-xs">
                {skill.name}
              </Badge>
            ))}
            {contractor.skills.length > 4 && (
              <Badge variant="gray" className="text-xs">
                +{contractor.skills.length - 4}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

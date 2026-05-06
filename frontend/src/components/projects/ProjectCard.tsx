import { Link } from 'react-router-dom'
import { MapPin, Calendar, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MilestoneBadge, PriorityBadge } from '@/components/ui/StatusBadges'
import { ProjectProgressBar } from '@/components/ui/ProjectProgressBar'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
  linkPrefix?: string
}

export function ProjectCard({ project, linkPrefix = '/sedgwick' }: ProjectCardProps) {
  return (
    <Link to={`${linkPrefix}/projects/${project.id}`}>
      <Card className="hover:shadow-elevated transition-shadow duration-150 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-body text-gray-500 mb-0.5">#{project.claimId}</p>
              <h3 className="font-display font-semibold text-gray-900 truncate">{project.damageType}</h3>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <PriorityBadge level={project.priorityLevel} />
              <MilestoneBadge milestone={project.currentMilestone} />
            </div>
          </div>

          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="truncate">
                {project.address}, {project.postalCode} {project.city}
              </span>
            </div>
            {project.requestedDeadline && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>Frist: {formatDate(project.requestedDeadline)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span>{project.buildingType}</span>
            </div>
          </div>

          <ProjectProgressBar currentMilestone={project.currentMilestone} compact />
        </CardContent>
      </Card>
    </Link>
  )
}

import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Icon className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <p className="font-display font-semibold text-gray-900 text-sm">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

import { Card, CardContent } from './card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; label: string }
  className?: string
  accent?: boolean
  onClick?: () => void
}

export function StatCard({ label, value, icon: Icon, trend, className, accent, onClick }: StatCardProps) {
  return (
    <Card
      className={cn('relative overflow-hidden', onClick && 'cursor-pointer hover:shadow-elevated transition-shadow', className)}
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col justify-between min-h-[140px]">
        <div className="flex items-start justify-between">
          <p className="text-xs font-display font-medium uppercase tracking-wide text-gray-500 leading-tight max-w-[calc(100%-3rem)]">
            {label}
          </p>
          {Icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                accent ? 'bg-accent-light' : 'bg-primary-50',
              )}
            >
              <Icon
                className={cn('h-5 w-5', accent ? 'text-accent' : 'text-primary-600')}
                strokeWidth={2}
              />
            </div>
          )}
        </div>
        <div>
          <p className={cn('text-3xl font-display font-bold', accent ? 'text-accent' : 'text-gray-900')}>
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-0.5 text-xs font-body',
                trend.value >= 0 ? 'text-success' : 'text-danger',
              )}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

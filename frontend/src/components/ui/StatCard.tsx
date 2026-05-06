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
}

export function StatCard({ label, value, icon: Icon, trend, className, accent }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-display font-medium uppercase tracking-wide text-gray-500">
              {label}
            </p>
            <p className={cn('mt-1 text-2xl font-display font-bold', accent ? 'text-accent' : 'text-gray-900')}>
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
          {Icon && (
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
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
      </CardContent>
    </Card>
  )
}

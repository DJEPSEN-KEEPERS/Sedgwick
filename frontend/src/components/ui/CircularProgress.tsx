import { cn } from '@/lib/utils'

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 6,
  className,
  label,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2563b8"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-sm font-display font-semibold text-gray-900">{value}%</span>
        {label && <span className="text-xs text-gray-500">{label}</span>}
      </div>
    </div>
  )
}

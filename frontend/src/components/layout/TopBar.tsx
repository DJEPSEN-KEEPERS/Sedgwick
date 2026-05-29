import { Menu } from 'lucide-react'
import { useCurrentUser } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'
import { NotificationBell } from '@/components/ui/NotificationBell'

interface TopBarProps {
  portalName: string
  onMenuClick?: () => void
}

export default function TopBar({ portalName, onMenuClick }: TopBarProps) {
  const user = useCurrentUser()

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 shrink-0 shadow-sm">
      {/* Left: hamburger on mobile, empty on desktop */}
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Åbn menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <span className="hidden text-sm text-gray-500 font-body lg:block">{portalName}</span>
      </div>

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-display font-semibold text-white select-none"
          title={user.fullName}
        >
          {getInitials(user.fullName)}
        </div>
      </div>
    </header>
  )
}

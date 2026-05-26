import { Bell } from 'lucide-react'
import { useCurrentUser } from '@/stores/authStore'

interface TopBarProps {
  portalName: string
}

export default function TopBar({ portalName }: TopBarProps) {
  const user = useCurrentUser()

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-white px-6 shrink-0 shadow-sm">
      <div />

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-gray-500 font-body md:block">{portalName}</span>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Notifikationer"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-display font-semibold text-white">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}

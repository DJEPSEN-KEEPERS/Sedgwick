import { Bell, Search } from 'lucide-react'
import { useCurrentUser } from '@/stores/authStore'

interface TopBarProps {
  portalName: string
}

export default function TopBar({ portalName }: TopBarProps) {
  const user = useCurrentUser()

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-white px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Søg sager, håndværkere..."
            className="h-8 w-64 rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm font-body placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

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

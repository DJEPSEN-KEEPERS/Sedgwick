import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore, useCurrentUser } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

interface SidebarProps {
  navItems: NavItem[]
  portalName: string
}

export default function Sidebar({ navItems, portalName }: SidebarProps) {
  const { logout } = useAuthStore()
  const user = useCurrentUser()

  return (
    <aside className="flex w-60 flex-col bg-white border-r border-[#e5e7eb] shadow-card shrink-0">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 border-b border-[#e5e7eb] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-800">
          <span className="text-xs font-display font-bold text-white">S</span>
        </div>
        <div>
          <p className="text-sm font-display font-bold text-primary-900">Sedgwick</p>
          <p className="text-xs text-gray-500 font-body">{portalName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('sidebar-link', isActive && 'sidebar-link-active')
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#e5e7eb] px-3 py-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-display font-semibold">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-display font-medium text-gray-900">{user.fullName}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            title="Log ud"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

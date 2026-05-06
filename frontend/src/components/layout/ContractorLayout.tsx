import { Outlet } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'
import { NotificationBell } from '@/components/ui/NotificationBell'

const bottomNavItems = [
  { to: '/contractor/dashboard', label: 'Hjem', icon: LayoutDashboard },
  { to: '/contractor/jobs', label: 'Sager', icon: FolderOpen },
  { to: '/contractor/chat', label: 'Beskeder', icon: MessageSquare },
  { to: '/contractor/profile', label: 'Profil', icon: User },
]

export default function ContractorLayout() {
  const user = useCurrentUser()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f6f9]">
      {/* Mobile TopBar */}
      <header className="flex h-14 items-center justify-between bg-primary-800 px-4 text-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-lg tracking-tight">Sedgwick</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-display font-semibold"
            title={user.fullName}
          >
            {getInitials(user.fullName)}
          </div>
        </div>
      </header>

      {/* Main scrollable area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin pb-16">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-gray-200 bg-white px-2 shadow-elevated z-50">
        {bottomNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-display font-medium transition-colors',
                isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn('h-5 w-5', isActive ? 'text-primary-600' : 'text-gray-400')}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

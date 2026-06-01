import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ navItems, portalName, isOpen = true, onClose }: SidebarProps) {
  const { logout } = useAuthStore()
  const { t } = useTranslation()
  const user = useCurrentUser()
  const location = useLocation()

  // Close drawer on navigation
  useEffect(() => {
    onClose?.()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile backdrop */}
      {onClose && (
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden',
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Layout
          'flex flex-col bg-white border-r border-[#e5e7eb] shadow-card shrink-0',
          // Mobile: fixed overlay drawer
          'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ease-in-out',
          // Desktop: static, always visible
          'lg:static lg:z-auto lg:w-60 lg:translate-x-0',
          // Mobile visibility driven by isOpen
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 border-b border-[#e5e7eb] px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-800">
            <span className="text-xs font-display font-bold text-white">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-bold text-primary-900">Sedgwick</p>
            <p className="text-xs text-gray-500 font-body truncate">{portalName}</p>
          </div>
          {/* Close button – mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label={t('common.closeMenu')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
              title={t('common.logOut')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

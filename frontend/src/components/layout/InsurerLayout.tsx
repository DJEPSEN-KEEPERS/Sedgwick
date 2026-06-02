import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import { LayoutDashboard, FolderOpen, Bell, User } from 'lucide-react'

export default function InsurerLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { to: '/insurer/dashboard',     label: t('nav.dashboard'),     icon: LayoutDashboard },
    { to: '/insurer/projects',      label: t('nav.projects'),      icon: FolderOpen },
    { to: '/insurer/notifications', label: t('nav.notifications'), icon: Bell },
    { to: '/insurer/account',       label: 'Min konto',            icon: User },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      <Sidebar
        navItems={navItems}
        portalName={t('portal.insurer')}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar
          portalName={t('portal.insurer')}
          onMenuClick={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

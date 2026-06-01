import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import {
  LayoutDashboard,
  FolderOpen,
  HardHat,
  Gavel,
  CheckSquare,
  MessageSquare,
  Settings,
} from 'lucide-react'

export default function SedgwickLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { to: '/sedgwick/dashboard',   label: t('nav.dashboard'),   icon: LayoutDashboard },
    { to: '/sedgwick/projects',    label: t('nav.projects'),    icon: FolderOpen },
    { to: '/sedgwick/contractors', label: t('nav.contractors'), icon: HardHat },
    { to: '/sedgwick/bids',        label: t('nav.bids'),        icon: Gavel },
    { to: '/sedgwick/approvals',   label: t('nav.approvals'),   icon: CheckSquare },
    { to: '/sedgwick/messages',    label: t('nav.messages'),    icon: MessageSquare },
    { to: '/sedgwick/settings',    label: t('nav.settings'),    icon: Settings },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      <Sidebar
        navItems={navItems}
        portalName={t('portal.sedgwick')}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar
          portalName={t('portal.sedgwickIntern')}
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

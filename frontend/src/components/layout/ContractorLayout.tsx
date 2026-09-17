import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import { LayoutDashboard, Briefcase, Mail, ClipboardList, MessageSquare, User } from 'lucide-react'

export default function ContractorLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { to: '/contractor/dashboard',    label: t('nav.home'),          icon: LayoutDashboard },
    { to: '/contractor/jobs',         label: t('nav.jobs'),          icon: Briefcase },
    { to: '/contractor/invitations',  label: t('nav.invitations'),   icon: Mail },
    { to: '/contractor/pending-bids', label: 'Tilbud',               icon: ClipboardList },
    { to: '/contractor/chat',         label: t('nav.chat'),          icon: MessageSquare },
    { to: '/contractor/profile',      label: t('nav.profile'),       icon: User },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      <Sidebar
        navItems={navItems}
        portalName={t('portal.contractor')}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar
          portalName={t('portal.contractor')}
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

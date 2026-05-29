import { useState } from 'react'
import { Outlet } from 'react-router-dom'
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

const navItems = [
  { to: '/sedgwick/dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/sedgwick/projects',    label: 'Sager',         icon: FolderOpen },
  { to: '/sedgwick/contractors', label: 'Håndværkere',   icon: HardHat },
  { to: '/sedgwick/bids',        label: 'Tilbud',        icon: Gavel },
  { to: '/sedgwick/approvals',   label: 'Godkendelser',  icon: CheckSquare },
  { to: '/sedgwick/messages',    label: 'Beskeder',      icon: MessageSquare },
  { to: '/sedgwick/settings',    label: 'Indstillinger', icon: Settings },
]

export default function SedgwickLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      <Sidebar
        navItems={navItems}
        portalName="Sedgwick"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar
          portalName="Sedgwick Intern"
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

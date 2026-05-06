import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import { LayoutDashboard, FolderOpen, Bell } from 'lucide-react'

const navItems = [
  { to: '/insurer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/insurer/projects', label: 'Sager', icon: FolderOpen },
  { to: '/insurer/notifications', label: 'Notifikationer', icon: Bell },
]

export default function InsurerLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      <Sidebar navItems={navItems} portalName="Forsikringsportal" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar portalName="Forsikringsportal" />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

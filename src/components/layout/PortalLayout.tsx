import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Package, Image,
  Settings, Menu, X, LogOut, BookOpen
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { to: '/portal/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portal/bookings', icon: BookOpen, label: 'Bookings' },
  { to: '/portal/availability', icon: CalendarDays, label: 'Availability' },
  { to: '/portal/packages', icon: Package, label: 'Packages' },
  { to: '/portal/gallery', icon: Image, label: 'Gallery' },
  { to: '/portal/settings', icon: Settings, label: 'Settings' },
]

export function PortalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/portal/login')
  }

  const NavItems = () => (
    <>
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            isActive
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed h-full z-20">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <img src="/fotoconvologo.svg" alt="FotoConvo Logo" className="h-8 w-auto object-contain" />
            <div className="border-l border-gray-200 pl-2 ml-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavItems />
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-sky-700">
                {user?.email?.[0]?.toUpperCase() ?? 'P'}
              </span>
            </div>
            <p className="text-xs text-gray-600 truncate flex-1">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/fotoconvologo.svg" alt="FotoConvo Logo" className="h-8 w-auto object-contain" />
                <span className="font-bold text-sm text-gray-900 ml-1">Portal</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              <NavItems />
            </nav>
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 -ml-1"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/fotoconvologo.svg" alt="FotoConvo Logo" className="h-7 w-auto object-contain" />
            <span className="font-semibold text-sm ml-1">Portal</span>
          </div>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

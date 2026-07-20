import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, BookOpen, Menu, X, LogOut, Link2, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'

const FLAT_NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/photographers', icon: Users, label: 'Photographers' },
  { to: '/admin/bookings', icon: BookOpen, label: 'All Bookings' },
]

const AFFILIATE_SUB = [
  { to: '/admin/affiliates', label: 'Manage Affiliates' },
]

function NavItems({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const isOnAffiliate = location.pathname.startsWith('/admin/affiliates')
  const [affiliateOpen, setAffiliateOpen] = useState(isOnAffiliate)

  return (
    <>
      {FLAT_NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClose}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            isActive
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}

      {/* Affiliates expandable group */}
      <div>
        <button
          onClick={() => setAffiliateOpen(v => !v)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            isOnAffiliate
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Link2 size={18} />
          <span className="flex-1 text-left">Affiliates</span>
          <ChevronDown
            size={15}
            className={cn('transition-transform duration-200', affiliateOpen && 'rotate-180')}
          />
        </button>

        {affiliateOpen && (
          <div className="ml-6 mt-0.5 space-y-0.5 border-l-2 border-indigo-100 pl-3">
            {AFFILIATE_SUB.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'flex items-center px-2 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'text-indigo-700 font-semibold bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                )}
              >
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/portal/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed h-full z-20">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <img src="/fotoconvologo.svg" alt="FotoConvo Logo" className="h-8 w-auto object-contain" />
            <div className="border-l border-gray-200 pl-2 ml-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
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

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-sm">Admin Panel</span>
              <button onClick={() => setSidebarOpen(false)}><X size={18} /></button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              <NavItems onClose={() => setSidebarOpen(false)} />
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 -ml-1">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm">Admin Panel</span>
          <div className="w-8" />
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { Camera } from 'lucide-react'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Camera size={16} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">GradSnap</span>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="max-w-2xl mx-auto px-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} GradSnap · Graduation Photography Booking
        </div>
      </footer>
    </div>
  )
}

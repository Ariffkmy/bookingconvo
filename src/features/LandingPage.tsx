import { Link } from 'react-router-dom'
import { Camera, Calendar, CheckCircle, Star } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
            <Camera size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">GradSnap</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/signin">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
          <Link to="/signup">
            <Button variant="primary" size="sm">Sign Up</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="bg-gradient-to-br from-purple-50 to-indigo-100 px-6 py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Camera size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Your Graduation,<br />Beautifully Captured
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              GradSnap connects you with talented graduation photographers.
              Book your session, manage your schedule, and deliver stunning memories.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started — It's Free
                </Button>
              </Link>
              <Link to="/signin">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Everything you need to manage bookings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar size={22} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Scheduling</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Set your availability, manage timeslots, and let clients book with ease.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={22} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Booking Management</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Review, confirm, and track every booking from a single dashboard.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={22} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Portfolio Gallery</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Showcase your work and attract more clients with a stunning gallery.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-purple-600 px-6 py-14 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to grow your photography business?</h2>
            <p className="text-purple-200 mb-7 text-sm">Join photographers already using GradSnap to manage their graduation bookings.</p>
            <Link to="/signup">
              <Button variant="secondary" size="lg">
                Create Your Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} GradSnap. All rights reserved.</p>
      </footer>
    </div>
  )
}

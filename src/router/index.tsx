import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { PublicLayout } from '../components/layout/PublicLayout'
import { PortalLayout } from '../components/layout/PortalLayout'
import { AdminLayout } from '../components/layout/AdminLayout'
import { ProtectedRoute } from '../components/shared/ProtectedRoute'
import { PageLoader } from '../components/ui/Spinner'

// Public pages
const PhotographerPage = lazy(() => import('../features/public/PhotographerPage').then(m => ({ default: m.PhotographerPage })))
const BookPage = lazy(() => import('../features/public/BookPage').then(m => ({ default: m.BookPage })))
const PaymentPage = lazy(() => import('../features/public/PaymentPage').then(m => ({ default: m.PaymentPage })))
const BookingDetailPage = lazy(() => import('../features/public/BookingDetailPage').then(m => ({ default: m.BookingDetailPage })))

// Landing + auth pages
const LandingPage = lazy(() => import('../features/LandingPage').then(m => ({ default: m.LandingPage })))
const SignInPage = lazy(() => import('../features/auth/SignInPage').then(m => ({ default: m.SignInPage })))
const SignUpPage = lazy(() => import('../features/auth/SignUpPage').then(m => ({ default: m.SignUpPage })))

// Portal pages
const LoginPage = lazy(() => import('../features/portal/LoginPage').then(m => ({ default: m.LoginPage })))
const PortalDashboard = lazy(() => import('../features/portal/DashboardPage').then(m => ({ default: m.DashboardPage })))
const PortalBookings = lazy(() => import('../features/portal/BookingsPage').then(m => ({ default: m.BookingsPage })))
const PortalBookingDetail = lazy(() => import('../features/portal/BookingDetailPage').then(m => ({ default: m.BookingDetailPage })))
const PortalAvailability = lazy(() => import('../features/portal/AvailabilityPage').then(m => ({ default: m.AvailabilityPage })))
const PortalPackages = lazy(() => import('../features/portal/PackagesPage').then(m => ({ default: m.PackagesPage })))
const PortalGallery = lazy(() => import('../features/portal/GalleryPage').then(m => ({ default: m.GalleryPage })))
const PortalSettings = lazy(() => import('../features/portal/SettingsPage').then(m => ({ default: m.SettingsPage })))

// Admin pages
const AdminDashboard = lazy(() => import('../features/admin/DashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminPhotographers = lazy(() => import('../features/admin/PhotographersPage').then(m => ({ default: m.AdminPhotographersPage })))
const AdminBookings = lazy(() => import('../features/admin/BookingsPage').then(m => ({ default: m.AdminBookingsPage })))

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public booking routes */}
      <Route element={<PublicLayout />}>
        <Route path="/p/:slug" element={<Lazy><PhotographerPage /></Lazy>} />
        <Route path="/p/:slug/book" element={<Lazy><BookPage /></Lazy>} />
        <Route path="/booking/:bookingCode" element={<Lazy><BookingDetailPage /></Lazy>} />
        <Route path="/booking/:bookingCode/payment" element={<Lazy><PaymentPage /></Lazy>} />
      </Route>

      {/* Auth routes */}
      <Route path="/signin" element={<Lazy><SignInPage /></Lazy>} />
      <Route path="/signup" element={<Lazy><SignUpPage /></Lazy>} />

      {/* Legacy login (kept for compatibility) */}
      <Route path="/portal/login" element={<Lazy><LoginPage /></Lazy>} />

      {/* Photographer portal */}
      <Route element={<ProtectedRoute allowedRoles={['photographer', 'admin']} />}>
        <Route element={<PortalLayout />}>
          <Route path="/portal/dashboard" element={<Lazy><PortalDashboard /></Lazy>} />
          <Route path="/portal/bookings" element={<Lazy><PortalBookings /></Lazy>} />
          <Route path="/portal/bookings/:id" element={<Lazy><PortalBookingDetail /></Lazy>} />
          <Route path="/portal/availability" element={<Lazy><PortalAvailability /></Lazy>} />
          <Route path="/portal/packages" element={<Lazy><PortalPackages /></Lazy>} />
          <Route path="/portal/gallery" element={<Lazy><PortalGallery /></Lazy>} />
          <Route path="/portal/settings" element={<Lazy><PortalSettings /></Lazy>} />
        </Route>
      </Route>

      {/* Admin panel */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<Lazy><AdminDashboard /></Lazy>} />
          <Route path="/admin/photographers" element={<Lazy><AdminPhotographers /></Lazy>} />
          <Route path="/admin/bookings" element={<Lazy><AdminBookings /></Lazy>} />
        </Route>
      </Route>

      {/* Landing page */}
      <Route path="/" element={<Lazy><LandingPage /></Lazy>} />
      <Route path="*" element={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-300 mb-2">404</h1>
          <p className="text-gray-500 mb-4">Page not found</p>
          <a href="/" className="text-purple-600 hover:text-purple-700 text-sm font-medium">Go Home</a>
        </div>
      } />
    </Routes>
  )
}

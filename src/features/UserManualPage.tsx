import { Link } from 'react-router-dom'
import { ChevronLeft, BookOpen, Settings, LayoutDashboard, Share2 } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function UserManualPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/">
                            <img src="/logoconvo.png" alt="Logo" className="h-8 w-auto object-contain" />
                        </Link>
                        <div className="border-l border-gray-200 pl-3">
                            <span className="font-semibold text-gray-900 text-sm tracking-wide uppercase">Manual</span>
                        </div>
                    </div>
                    <Link to="/">
                        <Button variant="outline" size="sm" className="gap-2 rounded-full shadow-sm">
                            <ChevronLeft size={16} /> Back to Home
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-200/60">
                    <div className="flex items-center gap-4 mb-4 pb-8 border-b border-gray-100">
                        <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shrink-0">
                            <BookOpen size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">GradSnap User Manual</h1>
                            <p className="text-gray-500 mt-1">Version 1.0. Comprehensive setup guide for independent photographers.</p>
                        </div>
                    </div>

                    <div className="space-y-16 pt-8">
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Settings size={22} className="text-[#0ea5e9]" />
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">1. Account Setup</h2>
                            </div>
                            <div className="prose max-w-none text-gray-600 leading-relaxed ml-9">
                                <p>Welcome to GradSnap! First, you should configure your basic profile settings.</p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li>Navigate to <strong>Settings</strong> in your Portal side menu.</li>
                                    <li>Upload a professional Avatar photograph representing your brand.</li>
                                    <li>Link your Google Calendar to activate automatic conflict prevention features (prevents double bookings).</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <LayoutDashboard size={22} className="text-[#0ea5e9]" />
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">2. Creating Packages</h2>
                            </div>
                            <div className="prose max-w-none text-gray-600 leading-relaxed ml-9">
                                <p>Packages define what clients can actively book from your public page.</p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li>Navigate to the <strong>Packages</strong> tab on the left sidebar.</li>
                                    <li>Select "Create New Package" and insert your titles, e.g., "Basic Ceremony", "Premium Master's Pack".</li>
                                    <li>Add custom duration times and specify buffer times if you require a breakdown period between shoots.</li>
                                    <li>Set distinct pricing models globally for seamless invoicing.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Share2 size={22} className="text-[#0ea5e9]" />
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">3. Sharing Your Booking Link</h2>
                            </div>
                            <div className="prose max-w-none text-gray-600 leading-relaxed ml-9">
                                <p>Your custom link is instantly generated the moment you register an account.</p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li>Locate your unique booking URL dynamically shown on the main <strong>Dashboard</strong>.</li>
                                    <li>Simply click <strong>Copy Link</strong>.</li>
                                    <li>Securely paste your booking URL natively into your Instagram, Twitter, or WhatsApp biography.</li>
                                    <li>Clients clicking this link will immediately see your active timeslots based precisely on your calendar configuration.</li>
                                </ul>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 py-6 mt-12">
                <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} GradSnap · Documentation
                </div>
            </footer>
        </div>
    )
}

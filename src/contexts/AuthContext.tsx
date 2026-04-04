import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, type User, type Session } from '../lib/supabase'
import { type UserRole } from '../types'

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole | null
  photographerId: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ user: User; session: Session }>
  signUp: (email: string, password: string, fullName: string) => Promise<unknown>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    photographerId: null,
    loading: true,
  })

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately with the persisted session
    // from localStorage, covering both fresh loads and browser-close/reopen scenarios.
    // This replaces the separate getSession() + onAuthStateChange pattern that caused
    // duplicate fetchProfile() calls on every mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user, session)
      } else {
        setState({ user: null, session: null, role: null, photographerId: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(user: User, session: Session) {
    let role: UserRole | null = null
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (!error && profile?.role) {
        role = profile.role
      }
    } catch {
      // profiles query failed — fall through to metadata fallback
    }

    // Fallback: read role from user metadata set at signup
    if (!role) {
      const metaRole = user.user_metadata?.role as UserRole | undefined
      role = metaRole ?? 'photographer'
    }

    let photographerId: string | null = null
    if (role === 'photographer') {
      const { data: photographer } = await supabase
        .from('photographers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      photographerId = photographer?.id ?? null
    }

    setState({ user, session, role, photographerId, loading: false })
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'photographer' },
      },
    })
    if (error) throw error

    // Ensure a photographers row exists (DB trigger handles this too, but belt-and-suspenders)
    if (data.user) {
      const slug = 'studio-' + data.user.id.replace(/-/g, '').slice(0, 8)
      await supabase.from('photographers').insert({
        user_id: data.user.id,
        slug,
        display_name: fullName || 'My Studio',
        is_active: true,
      }).select().maybeSingle() // ignore conflict if trigger already created it
    }

    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}

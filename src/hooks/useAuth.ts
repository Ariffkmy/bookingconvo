import { useEffect, useState } from 'react'
import { supabase, type User, type Session } from '../lib/supabase'
import { type UserRole } from '../types'

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole | null
  photographerId: string | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    photographerId: null,
    loading: true,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user, session)
      } else {
        setState({ user: null, session: null, role: null, photographerId: null, loading: false })
      }
    })

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
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      let photographerId: string | null = null
      if (profile?.role === 'photographer') {
        const { data: photographer } = await supabase
          .from('photographers')
          .select('id')
          .eq('user_id', user.id)
          .single()
        photographerId = photographer?.id ?? null
      }

      setState({
        user,
        session,
        role: profile?.role ?? null,
        photographerId,
        loading: false,
      })
    } catch {
      setState({ user, session, role: null, photographerId: null, loading: false })
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { ...state, signIn, signOut }
}

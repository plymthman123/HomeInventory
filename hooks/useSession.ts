import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Returns the current Supabase auth session and a loading flag.
 * Subscribes to auth state changes so the UI reacts automatically.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get the current session synchronously on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Subscribe to future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}

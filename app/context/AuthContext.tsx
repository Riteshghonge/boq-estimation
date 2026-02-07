'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type UserProfile = {
  id: string
  name: string
  role: 'architect' | 'vendor'
}

type AuthContextType = {
  user: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        setUser(null)
        setLoading(false)
        return
      }

      const userId = sessionData.session.user.id

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', userId)
        .single()

      setUser(profile ?? null)
      setLoading(false)
    }

    getSessionAndProfile()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getSessionAndProfile()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

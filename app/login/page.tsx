'use client'

import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    setLoading(true)

    // 1️⃣ Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    // 2️⃣ Fetch role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      alert('Role not found')
      setLoading(false)
      return
    }

    // 3️⃣ Redirect by role
    if (profile.role === 'architect') {
      router.push('/architect')
    } else {
      router.push('/vendor')
    }

    // 4️⃣ Sync cookies with server
    router.refresh()
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: 10 }}
      />

      <button onClick={login} disabled={loading}>
        {loading ? 'Logging in…' : 'Login'}
      </button>
    </div>
  )
}

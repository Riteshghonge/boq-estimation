'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()

    // Important: sync server cookies
    router.refresh()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '8px 14px',
        backgroundColor: '#ef4444',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      Logout
    </button>
  )
}

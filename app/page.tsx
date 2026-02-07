'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (user.role === 'architect') {
      router.push('/architect')
    } else {
      router.push('/vendor')
    }
  }, [user, loading, router])

  return <div>Loading...</div>
}

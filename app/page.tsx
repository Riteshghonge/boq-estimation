'use client'

import { useEffect } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Home() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log('Session:', data.session)
    })
  }, [])

  return <div>Supabase connected (check console)</div>
}

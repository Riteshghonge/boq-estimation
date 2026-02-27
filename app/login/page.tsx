// 🟢 This is a client component because it uses state and effects for login functionalit
// 🟢 It also interacts with the Supabase client which requires client-side execution
// 🟢 The component handles user login, role-based redirection, and network error handling
// 🟢 It also includes fixes for hydration mismatch and offline detection to improve user experience
// 🟢 The styles are imported from a CSS module for scoped styling of the login page
'use client'
import { supabase } from '../lib/supabaseClient' 
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // 🟢 Fix Hydration Mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 🟢 Detect if user goes offline while on page
  useEffect(() => {
    const handleOffline = () => {
      setErrorMsg("You are offline. Please check your internet connection.")
    }

    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.")
      return
    }

    // ✅ Internet check BEFORE calling Supabase
    if (!navigator.onLine) {
      setErrorMsg("No internet connection. Please check your network and try again.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      if (!data.user) throw new Error("Authentication failed. No user found.")

      // Fetch Role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        throw new Error("User profile or role not found in database.")
      }

      // Redirect based on role
      if (profile.role === 'architect') {
        router.push('/architect')
      } else {
        router.push('/vendor')
      }

      router.refresh()

    } catch (err: any) {

      // ✅ Handle network-level failure
      if (err?.message?.includes('Failed to fetch')) {
        setErrorMsg("Unable to connect. Please check your internet connection.")
      } else {
        setErrorMsg(err.message || "An unexpected error occurred.")
      }

      setLoading(false)
    }
  }

  // Prevent rendering until hydration complete
  if (!isMounted) return null

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <h2 className={styles.loginTitle}>Welcome Back</h2>
          <p className={styles.loginSubtitle}>
            Sign in to your procurement dashboard
          </p>
        </div>

        {errorMsg && (
          <div className={styles.errorBanner}>
            {errorMsg}
          </div>
        )}

        <div
          className={styles.formContainer}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        >
          <div className={styles.inputGroup}>
            <label className={styles.fieldLabel}>Email Address</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.inputField}
              suppressHydrationWarning
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.fieldLabel}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.inputField}
              suppressHydrationWarning
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? (
              <span className={styles.loaderText}>Verifying...</span>
            ) : (
              'Sign In'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
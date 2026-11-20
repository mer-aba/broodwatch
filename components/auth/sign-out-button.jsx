'use client'

import { useState } from 'react'
import { LoaderCircle, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await createClient().auth.signOut()
      if (authError) throw authError
      window.location.assign('/')
    } catch {
      setError('Unable to sign out. Try again.')
      setLoading(false)
    }
  }
  return (
    <span className="signout-control">
      <button
        className="sidebar-signout"
        type="button"
        onClick={signOut}
        disabled={loading}
        aria-label="Sign out"
      >
        {loading ? <LoaderCircle className="auth-spinner" size={15} /> : <LogOut size={15} />}
        <span>{loading ? 'Signing out' : 'Sign out'}</span>
      </button>
      {error && (
        <span className="signout-error" role="alert">
          {error}
        </span>
      )}
    </span>
  )
}

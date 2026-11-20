'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

const copy = {
  login: {
    kicker: 'WELCOME BACK',
    title: 'Sign in to your farm.',
    description: 'Pick up where you left off with your flock.',
  },
  signup: {
    kicker: 'GET STARTED',
    title: 'Create your account.',
    description: 'Set up your BroodWatch access to get started.',
  },
  forgot: {
    kicker: 'ACCOUNT RECOVERY',
    title: 'Reset your password.',
    description: 'We’ll send a secure password reset link if the account is eligible.',
  },
  reset: {
    kicker: 'ACCOUNT RECOVERY',
    title: 'Choose a new password.',
    description: 'Use a strong password you have not used elsewhere.',
  },
}

function safeNextPath(fallback) {
  if (typeof window === 'undefined') return fallback
  const candidate = new URLSearchParams(window.location.search).get('next')
  return candidate?.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\')
    ? candidate
    : fallback
}

function getAuthRedirectUrl(next) {
  const fallback = `${window.location.origin}/auth/callback`
  const target = new URL(process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || fallback)
  target.searchParams.set('next', next)
  return target.toString()
}

function authErrorMessage(error, mode) {
  const code = error?.code
  const status = error?.status
  if (code === 'email_not_confirmed')
    return 'Please confirm your email address. Check your inbox for the verification link.'
  if (mode === 'login' && code === 'invalid_credentials') return 'Invalid email or password.'
  if (code === 'weak_password') return 'Please choose a stronger password.'
  if (code === 'email_address_invalid') return 'Please enter a valid email address.'
  if (code === 'email_address_not_authorized')
    return 'The current email service cannot send to that address. Use an authorized address or configure project email delivery.'
  if (mode === 'reset' && (code === 'session_not_found' || code === 'otp_expired'))
    return 'This reset link has expired. Request a new password reset link.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429)
    return 'Too many attempts. Please wait a little and try again.'
  return mode === 'login'
    ? 'We could not sign you in right now. Please try again.'
    : 'We could not complete that request. Please try again.'
}

export default function AuthForm({ mode }) {
  const router = useRouter()
  const content = copy[mode] || copy.login
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!isSupabaseConfigured()) {
      setError(
        'Supabase Auth is not configured for this preview. No demo sign-in is being simulated.',
      )
      return
    }
    if ((mode === 'signup' || mode === 'reset') && password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        router.replace(safeNextPath('/dashboard'))
        router.refresh()
        return
      }


      if (mode === 'signup') {
        const { data, error: authError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: getAuthRedirectUrl('/onboarding'),
              data: {
                full_name: fullName.trim(),
              },
            },
          })

        if (authError) throw authError

        if (data.session) {
          router.replace('/onboarding')
          router.refresh()
          return
        }

        router.push('/auth/sign-up-success')
        return
      }


      if (mode === 'reset') {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
        setNotice('Your password has been updated. You can now continue to your dashboard.')
        return
      }
    } catch (authError) {
      setError(authErrorMessage(authError, mode))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-form-card">
      <span className="auth-form-icon">
        {mode === 'reset' ? <LockKeyhole size={19} /> : <ShieldCheck size={19} />}
      </span>
      <p className="auth-eyebrow">{content.kicker}</p>
      <h1>{content.title}</h1>
      <p className="auth-description">{content.description}</p>
      {!isSupabaseConfigured() && (
        <p className="auth-config-note" role="status">
          Demo-only notice: Supabase environment configuration is unavailable; authentication
          actions are disabled.
        </p>
      )}
      {notice && (
        <p className="auth-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <label>
            Farmer name
            <input
              autoComplete="name"
              name="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your name"
              required
            />
          </label>
        )}
        {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
          <label>
            Email address
            <span className="auth-input-wrap">
              <Mail size={16} />
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </span>
          </label>
        )}
        {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
          <label>
            {mode === 'reset' ? 'New password' : 'Password'}
            <span className="auth-input-wrap">
              <LockKeyhole size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
        )}
        {(mode === 'signup' || mode === 'reset') && (
          <label>
            Confirm password
            <span className="auth-input-wrap">
              <LockKeyhole size={16} />
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                placeholder="Re-enter your password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={
                  showConfirm ? 'Hide confirmation password' : 'Show confirmation password'
                }
                aria-pressed={showConfirm}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
        )}
        {mode === 'login' && (
          <div className="auth-form-between">
            <span>Use your farm account</span>
            <Link href="/auth/forgot-password">Forgot password?</Link>
          </div>
        )}
        <button className="auth-submit" type="submit" disabled={loading || !isSupabaseConfigured()}>
          {loading ? (
            <>
              <LoaderCircle size={17} className="auth-spinner" /> Please wait…
            </>
          ) : mode === 'login' ? (
            'Login'
          ) : mode === 'signup' ? (
            'Create account'
          ) : mode === 'forgot' ? (
            'Send reset link'
          ) : (
            'Update password'
          )}
        </button>
      </form>
      {mode === 'login' ? (
        <p className="auth-switch">
          New to BroodWatch?{' '}
          <Link href="/auth/sign-up">
            Create an account <span>→</span>
          </Link>
        </p>
      ) : mode === 'signup' ? (
        <p className="auth-switch">
          Already have an account?{' '}
          <Link href="/auth/login">
            Login <span>→</span>
          </Link>
        </p>
      ) : mode === 'forgot' || mode === 'reset' ? (
        <p className="auth-switch">
          <Link href="/auth/login">
            Back to login <span>→</span>
          </Link>
        </p>
      ) : null}
    </section>
  )
}

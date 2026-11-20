import Link from 'next/link'
import { ArrowLeft, Check, Mail, ShieldCheck } from 'lucide-react'

export function AuthNotice({ type = 'verify', reason = '' }) {
  const details = {
    verify: {
      icon: Mail,
      kicker: 'CHECK YOUR INBOX',
      title: 'Verify your email address',
      text: 'If your address is eligible, Supabase Auth will send a confirmation link. Open it on this device to continue to your farm setup.',
    },
    signup: {
      icon: Check,
      kicker: 'ACCOUNT REQUEST RECEIVED',
      title: 'Check your email to continue',
      text: '',
    },
    error: {
      icon: ShieldCheck,
      kicker: 'AUTHENTICATION',
      title: 'We could not complete that step',
      text:
        reason === 'callback'
          ? 'The sign-in link may be expired or already used. Request a new link and try again.'
          : 'Please try again or return to the login page.',
    },
  }
  const item = details[type] || details.error
  const Icon = item.icon
  return (
    <section className="auth-notice-card">
      <span className="auth-form-icon">
        <Icon size={19} />
      </span>
      <p className="auth-eyebrow">{item.kicker}</p>
      <h1>{item.title}</h1>
      <p className="auth-description">{item.text}</p>
      <div className="auth-notice-actions">
        <Link className="auth-submit auth-submit-link" href="/auth/login">
          <ArrowLeft size={15} /> Back to login
        </Link>
        <Link className="auth-secondary-link" href="/auth/sign-up">
          Create an account
        </Link>
      </div>
      <p className="auth-integration-note">
        Authentication is handled by Supabase Auth. Farm records are not stored by this setup
        preview.
      </p>
    </section>
  )
}

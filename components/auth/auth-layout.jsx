import Link from 'next/link'
import { ArrowLeft, BookOpen, Leaf, ShieldCheck } from 'lucide-react'

export default function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-side">
        <Link className="site-brand auth-brand" href="/">
          <span className="site-brand-mark">
            <Leaf size={19} />
          </span>
          <span>
            brood<span>watch</span>
            <small>FLOCK MANAGEMENT</small>
          </span>
        </Link>
        <div className="auth-side-copy">
          <span className="auth-side-kicker">
            <span /> BROODWATCH FARM WORKSPACE
          </span>
          <h1>Care for your flock with more confidence.</h1>
          <p>Keep farm routines organised and see practical flock context in one place.</p>
          <div className="auth-benefit">
            <span>
              <BookOpen size={16} />
            </span>
            <div>
              <strong>Guidance with context</strong>
              <small>Sources and flock applicability stay in view.</small>
            </div>
          </div>
          <div className="auth-benefit">
            <span>
              <ShieldCheck size={16} />
            </span>
            <div>
              <strong>Your account, your workspace</strong>
              <small>Sign in securely with Supabase Auth.</small>
            </div>
          </div>
        </div>
        <Link className="auth-side-back" href="/">
          <ArrowLeft size={14} /> Back to BroodWatch
        </Link>
        <span className="auth-side-note">Smarter Flock Monitoring. Better Farming Decisions.</span>
      </section>
      <section className="auth-main">
        <div className="auth-mobile-brand">
          <Link className="site-brand" href="/">
            <span className="site-brand-mark">
              <Leaf size={18} />
            </span>
            <span>
              brood<span>watch</span>
              <small>FLOCK MANAGEMENT</small>
            </span>
          </Link>
          <Link href="/" aria-label="Back to home">
            <ArrowLeft size={16} />
          </Link>
        </div>
        <div className="auth-card-wrap">{children}</div>
        <div className="auth-main-footer">
          <span>
            Need help? <Link href="/contact">Contact BroodWatch</Link>
          </span>
          <Link href="/privacy">Privacy</Link>
        </div>
      </section>
    </main>
  )
}

import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bird,
  BookOpen,
  Check,
  CircleAlert,
  Droplets,
  Leaf,
  MessageCircle,
  ShieldCheck,
  Sprout,
  Thermometer,
} from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Flock and batch management',
    text: 'Organise your farm into houses, pens and batches. Keep current and initial bird counts easy to understand.',
  },
  {
    icon: Thermometer,
    title: 'Environmental monitoring',
    text: 'Review temperature and humidity readings from ESP32 and DHT22 devices, with data freshness in view.',
  },
  {
    icon: BookOpen,
    title: 'MAAIF-guided references',
    text: 'Find practical poultry guidance with its source and flock applicability clearly identified.',
  },
  {
    icon: CircleAlert,
    title: 'Explainable alerts',
    text: 'Understand what triggered a flag, what it was compared with and what to check next.',
  },
  {
    icon: MessageCircle,
    title: 'Poultry farming assistant',
    text: 'Explore source-grounded questions and straightforward next steps for your flock.',
  },
  {
    icon: Droplets,
    title: 'Daily farm routines',
    text: 'Record feed, water, health and production observations in one consistent workflow.',
  },
]

export function MarketingHeader() {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label="BroodWatch home">
        <span className="site-brand-mark">
          <Leaf size={19} />
        </span>
        <span>
          brood<span>watch</span>
          <small>FLOCK MANAGEMENT</small>
        </span>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/#features">Features</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/about">About</Link>
      </nav>
      <div className="site-actions">
        <Link className="site-login" href="/auth/login">
          Login
        </Link>
        <Link className="site-button" href="/auth/sign-up">
          Get started <ArrowRight size={15} />
        </Link>
      </div>
      <details className="site-mobile-menu">
        <summary aria-label="Open site navigation">
          <span />
          <span />
          <span />
        </summary>
        <nav aria-label="Mobile navigation">
          <Link href="/#features">Features</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/auth/login">Login</Link>
          <Link href="/auth/sign-up">Get started</Link>
        </nav>
      </details>
    </header>
  )
}

export function MarketingFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-brand">
          <Link className="site-brand" href="/">
            <span className="site-brand-mark">
              <Leaf size={19} />
            </span>
            <span>
              brood<span>watch</span>
              <small>FLOCK MANAGEMENT</small>
            </span>
          </Link>
          <p>
            Smarter flock monitoring.
            <br />
            Better farming decisions.
          </p>
        </div>
        <div className="site-footer-column">
          <strong>Explore</strong>
          <Link href="/#features">Features</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/about">About BroodWatch</Link>
        </div>
        <div className="site-footer-column">
          <strong>Get started</strong>
          <Link href="/auth/sign-up">Create account</Link>
          <Link href="/auth/login">Login</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div className="site-footer-column">
          <strong>Information</strong>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© 2026 BroodWatch. Built for practical poultry management.</span>
        <span className="site-footer-note">
          <i /> Platform preview
        </span>
      </div>
    </footer>
  )
}

export function MarketingLayout({ children }) {
  return (
    <div className="marketing-shell">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  )
}

export function MarketingHomePage() {
  return (
    <main className="marketing-home">
      <section className="site-hero">
        <div className="site-hero-copy">
          <span className="site-eyebrow">
            <span /> POULTRY FARMING, MADE CLEARER
          </span>
          <h1>
            Smarter Flock Monitoring. <em>Better Farming Decisions.</em>
          </h1>
          <p>
            Bring flock records, environmental monitoring and practical poultry guidance together in
            one calm, farmer-friendly workspace.
          </p>
          <div className="site-hero-actions">
            <Link className="site-button site-button-large" href="/auth/sign-up">
              Get started <ArrowRight size={17} />
            </Link>
            <Link className="site-secondary-link" href="/auth/login">
              Already have an account? <span>Login</span>
            </Link>
          </div>
          <div className="site-trust-row">
            <span>
              <Check size={14} /> Built for everyday farm routines
            </span>
            <span>
              <Check size={14} /> Clear, source-aware guidance
            </span>
          </div>
        </div>
        <div className="site-hero-art">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="farm-preview">
            <div className="farm-preview-top">
              <div className="preview-brand">
                <span className="preview-leaf">
                  <Leaf size={14} />
                </span>
                <strong>Good morning, James</strong>
              </div>
              <span className="preview-live">
                <i /> DEMO VIEW
              </span>
            </div>
            <div className="preview-farm-name">
              <span>YOUR FARM</span>
              <strong>Green Valley Poultry Farm</strong>
              <small>Wakiso District · Uganda</small>
            </div>
            <div className="preview-metrics">
              <div>
                <span>Live birds</span>
                <strong>306</strong>
                <small>2 active flocks</small>
              </div>
              <div>
                <span>Today’s feed</span>
                <strong>
                  30 <small>kg</small>
                </strong>
                <small>Demo record</small>
              </div>
            </div>
            <div className="preview-chart-label">
              <span>Feed & water this week</span>
              <small>EXAMPLE DATA</small>
            </div>
            <div className="preview-chart">
              <div className="preview-y-axis">
                <span>60</span>
                <span>40</span>
                <span>20</span>
                <span>0</span>
              </div>
              <div className="preview-chart-lines">
                <div className="preview-chart-grid" />
                <svg aria-hidden="true" viewBox="0 0 300 116" preserveAspectRatio="none">
                  <path
                    className="preview-water-line"
                    d="M0 36 C26 31 36 44 64 40 S98 45 126 29 168 39 197 24 230 34 260 19 284 22 300 15"
                  />
                  <path
                    className="preview-feed-line"
                    d="M0 79 C26 82 40 73 64 77 S98 81 126 66 168 72 197 60 231 67 260 50 284 55 300 47"
                  />
                </svg>
                <div className="preview-days">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
            <div className="preview-alert">
              <span>
                <CircleAlert size={15} />
              </span>
              <p>
                <strong>One item to review</strong>
                <small>Example alert · no live sensors</small>
              </p>
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div className="hero-note note-top">
            <span>
              <Bird size={16} />
            </span>
            <div>
              <strong>Flock records</strong>
              <small>All in one place</small>
            </div>
          </div>
          <div className="hero-note note-bottom">
            <span>
              <Sprout size={16} />
            </span>
            <div>
              <strong>Farm-first tools</strong>
              <small>Simple daily routines</small>
            </div>
          </div>
        </div>
      </section>
      <section className="site-proof">
        <p>DESIGNED AROUND THE DAILY WORK OF POULTRY FARMERS</p>
        <div>
          <span>
            <Bird size={17} /> Flocks & batches
          </span>
          <span>
            <Thermometer size={17} /> Environment
          </span>
          <span>
            <BookOpen size={17} /> Practical references
          </span>
          <span>
            <Activity size={17} /> Farm records
          </span>
        </div>
      </section>
      <section className="site-section features-section" id="features">
        <div className="site-section-heading">
          <span className="site-eyebrow">ONE FARM WORKSPACE</span>
          <h2>Everything you need to make the next decision clearer.</h2>
          <p>
            Practical tools for the records, routines and observations that keep a flock moving
            forward.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article className="feature-card" key={title}>
              <span className="feature-icon">
                <Icon size={19} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link href="/auth/sign-up" aria-label={`Explore ${title}`}>
                Explore <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="site-section how-section" id="how-it-works">
        <div className="site-section-heading">
          <span className="site-eyebrow">A SIMPLE RHYTHM</span>
          <h2>From daily observation to a more confident next step.</h2>
        </div>
        <div className="how-grid">
          <article>
            <span>01</span>
            <h3>Set up your flock</h3>
            <p>
              Organise your farm into houses, pens, batches and bird placements, then make optional
              setup steps as you’re ready.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Record what you see</h3>
            <p>
              Capture daily feed, water, weight, health and production details in a straightforward
              way.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Review and respond</h3>
            <p>
              See trends, follow up on explainable alerts and consult guidance with its source in
              view.
            </p>
          </article>
        </div>
      </section>
      <section className="site-feature-band">
        <div className="feature-band-copy">
          <span className="site-eyebrow">BUILT FOR THE REAL FARM</span>
          <h2>Small signals matter when you know what to look for.</h2>
          <p>
            BroodWatch brings manual records and environmental readings into the same view, so
            farmers can notice changes and decide what to check next.
          </p>
          <ul>
            <li>
              <Check size={15} /> Review temperature and humidity trends
            </li>
            <li>
              <Check size={15} /> Keep batch and pen counts organised
            </li>
            <li>
              <Check size={15} /> Separate missing data from health concerns
            </li>
          </ul>
          <Link className="site-text-link" href="/about">
            Learn about BroodWatch <ArrowRight size={15} />
          </Link>
        </div>
        <div className="feature-band-card">
          <div className="band-card-top">
            <span>
              <Thermometer size={18} />
            </span>
            <div>
              <strong>House A environment</strong>
              <small>SIMULATED PREVIEW</small>
            </div>
            <span className="band-status">Example</span>
          </div>
          <div className="band-readings">
            <div>
              <span>Temperature</span>
              <strong>
                28.4 <small>°C</small>
              </strong>
            </div>
            <div>
              <span>Relative humidity</span>
              <strong>
                64 <small>%</small>
              </strong>
            </div>
          </div>
          <div className="band-info">
            <ShieldCheck size={15} />
            <p>No sensors are connected in this preview. Readings are illustrative.</p>
          </div>
        </div>
      </section>
      <section className="site-cta">
        <div>
          <span className="site-eyebrow">YOUR FARM, MORE ORGANISED</span>
          <h2>Make room for better decisions.</h2>
          <p>Set up your farm and explore BroodWatch with a guided, farmer-friendly start.</p>
        </div>
        <Link className="site-button site-button-large" href="/auth/sign-up">
          Get started <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  )
}

const articlePages = {
  about: {
    eyebrow: 'ABOUT BROODWATCH',
    title: 'Tools shaped around practical poultry care.',
    intro:
      'BroodWatch is a poultry farm management platform concept for smallholder farmers, starting with clear records, flock organisation and source-aware guidance.',
    sections: [
      [
        'Designed for everyday work',
        'Farms are organised into houses, pens, batches and bird placements, with daily workflows for feed, water, health and production.',
      ],
      [
        'Monitoring with context',
        'Environmental readings and anomaly flags are presented with freshness, history and plain-language explanations. Missing data is not presented as a confirmed health emergency.',
      ],
      [
        'Guidance with sources',
        'The product is designed to make applicable poultry references easier to find. Numerical guidance should only be shown when the source and flock category have been verified.',
      ],
      [
        'A transparent preview',
        'This current application is an interactive prototype. Sample farm values are demonstration data; farm records, sensor feeds and assistant answers are not yet connected to production services.',
      ],
    ],
  },
  privacy: {
    eyebrow: 'PRIVACY',
    title: 'Privacy policy',
    intro:
      'This draft explains how a future BroodWatch service is intended to handle account and farm information. It is a product preview, not reviewed legal advice.',
    sections: [
      [
        'Account information',
        'Authentication is handled through the connected Supabase Auth service. Account data is governed by the project’s Supabase configuration and applicable privacy terms.',
      ],
      [
        'Farm information',
        'Farm, flock and sensor records in this preview are sample data. No farm management database tables have been added by this frontend build.',
      ],
      [
        'Contact forms',
        'The contact page is a local demonstration. Submitting it does not send or store a message.',
      ],
      [
        'Before production',
        'The operator should review retention, support access, regional privacy requirements, subprocessors and user deletion workflows before enabling real farm data.',
      ],
    ],
  },
  terms: {
    eyebrow: 'TERMS',
    title: 'Terms of use',
    intro:
      'These draft terms describe the intended boundaries of the BroodWatch preview. They need legal review before any production service is offered.',
    sections: [
      [
        'Preview use',
        'This interface is provided to demonstrate product workflows. Example metrics, alerts and assistant answers are not live farm data or professional advice.',
      ],
      [
        'Farming guidance',
        'MAAIF references must be checked against the applicable manual section, production category and local veterinary advice. BroodWatch does not diagnose disease or prescribe medication.',
      ],
      [
        'No live services in this preview',
        'Farm record persistence, contact delivery, sensor ingestion and assistant generation are not connected in this frontend build.',
      ],
      [
        'Production launch',
        'Before launch, publish reviewed privacy and service terms, define support obligations, availability, acceptable use and data export/deletion procedures.',
      ],
    ],
  },
}

export function MarketingArticlePage({ kind }) {
  const page = articlePages[kind] || articlePages.about
  return (
    <main className="site-content-page">
      <div className="site-content-hero">
        <span className="site-eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
      </div>
      <div className="site-article-body">
        {page.sections.map(([title, text], index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="site-content-cta">
        <span>Want to explore the platform?</span>
        <Link className="site-button" href="/auth/sign-up">
          Get started <ArrowRight size={15} />
        </Link>
      </div>
    </main>
  )
}

import ContactForm from '@/components/marketing/contact-form'

export const metadata = { title: 'Contact BroodWatch' }
export default function ContactPage() {
  return (
    <main className="site-content-page contact-page">
      <div className="site-content-hero">
        <span className="site-eyebrow">CONTACT</span>
        <h1>Let’s talk about your farm.</h1>
        <p>
          Send a note about your flock, your daily routine or what you would like BroodWatch to help
          with.
        </p>
      </div>
      <div className="contact-layout">
        <div className="contact-aside">
          <span className="contact-icon">BW</span>
          <h2>We’re building for practical farm work.</h2>
          <p>
            Tell us what would make it easier to manage your flock. This preview form shows the
            interface only and does not transmit your message.
          </p>
          <div className="contact-aside-note">
            <strong>Demo form</strong>
            <span>No message is sent or stored.</span>
          </div>
        </div>
        <ContactForm />
      </div>
    </main>
  )
}

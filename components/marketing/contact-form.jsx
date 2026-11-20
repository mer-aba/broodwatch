'use client'

import { useState } from 'react'
import { Check, Send } from 'lucide-react'

export default function ContactForm() {
  const [sent, setSent] = useState(false)
  if (sent)
    return (
      <div className="contact-confirmation" role="status">
        <span>
          <Check size={18} />
        </span>
        <strong>Thanks for your interest.</strong>
        <p>
          This preview does not send or store messages yet. Your form was not submitted to a
          service.
        </p>
        <button type="button" onClick={() => setSent(false)}>
          Back to the form
        </button>
      </div>
    )
  return (
    <form
      className="contact-form"
      onSubmit={(event) => {
        event.preventDefault()
        setSent(true)
      }}
    >
      <div className="contact-form-grid">
        <label>
          Full name
          <input required name="name" autoComplete="name" placeholder="Your name" />
        </label>
        <label>
          Email address
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label>
        What would you like to discuss?
        <select defaultValue="Product question">
          <option>Product question</option>
          <option>Farm onboarding</option>
          <option>Partnership</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        Message
        <textarea
          required
          name="message"
          rows="5"
          placeholder="Tell us a little about what you need."
        />
      </label>
      <p className="contact-demo-note">Preview form only. No message is sent or stored.</p>
      <button className="site-button" type="submit">
        Send message <Send size={15} />
      </button>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { Activity, BookOpen, MoreHorizontal, Send, ShieldCheck, Sparkles } from 'lucide-react'

import { ScreenHeader } from '../shared/intelligence-ui'

import { suggestionQuestions } from '../data/intelligence-demo-data'

export function AssistantChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello James. I can help you find poultry guidance and understand your farm records. What would you like to look into?',
      cite: 'BroodWatch source-grounded assistant · demonstration response',
    },
  ])
  const [draft, setDraft] = useState('')
  const [flock, setFlock] = useState('BR-2026-001 · Broiler')
  const send = (text) => {
    const value = (text || draft).trim()
    if (!value) return
    setMessages((previous) => [
      ...previous,
      { role: 'user', text: value },
      {
        role: 'assistant',
        text: 'Start with the observable checks: confirm clean water is available, check drinker access, and compare the next complete daily record with this flock’s recent history. A change in a record is a prompt to investigate, not a diagnosis.',
        cite: 'General farm-practice guidance · verify any feeding or health standard in the applicable MAAIF manual section or with a veterinary professional.',
      },
    ])
    setDraft('')
  }
  return (
    <div className="intelligence-page assistant-page">
      <ScreenHeader
        kicker="BROODWATCH ASSISTANT"
        title="Ask about your flock"
        description="A source-grounded guidance interface. Responses shown here are examples, not live AI advice."
      />
      <div className="assistant-workspace">
        <aside className="assistant-context">
          <div className="assistant-context-head">
            <span className="assistant-spark">
              <Sparkles size={17} />
            </span>
            <div>
              <strong>Your flock context</strong>
              <small>Optional · demo data</small>
            </div>
          </div>
          <label>
            Ask with a flock in mind
            <select value={flock} onChange={(event) => setFlock(event.target.value)}>
              <option>BR-2026-001 · Broiler</option>
              <option>LY-2026-002 · Layer</option>
              <option>No flock context</option>
            </select>
          </label>
          <div className="context-flock-card">
            <span className="context-bird">
              <Activity size={15} />
            </span>
            <div>
              <strong>
                {flock === 'No flock context' ? 'General guidance' : flock.split(' · ')[0]}
              </strong>
              <small>
                {flock === 'No flock context'
                  ? 'No flock data attached'
                  : `${flock.split(' · ')[1]} · 28 days · House A`}
              </small>
            </div>
          </div>
          <p>Only the demonstration flock profile is available in this preview.</p>
        </aside>
        <section className="assistant-chat">
          <div className="assistant-chat-head">
            <span className="assistant-online">
              <Sparkles size={16} />
            </span>
            <div>
              <strong>BroodWatch Assistant</strong>
              <small>
                <i /> Available · mock conversation
              </small>
            </div>
            <button className="quiet-icon" aria-label="Conversation options">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div
            className="assistant-messages"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <article
                className={`assistant-message ${message.role}`}
                key={`${index}-${message.role}`}
              >
                <span className="message-avatar">
                  {message.role === 'assistant' ? <Sparkles size={14} /> : 'JM'}
                </span>
                <div className="message-content">
                  <span className="message-author">
                    {message.role === 'assistant' ? 'BroodWatch' : 'You'}{' '}
                    <small>{message.role === 'assistant' ? 'Demo response' : 'Just now'}</small>
                  </span>
                  <p>{message.text}</p>
                  {message.cite && (
                    <div className="message-citation">
                      <BookOpen size={13} />
                      {message.cite}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="suggested-questions">
            <span>TRY ASKING</span>
            {suggestionQuestions.map((question) => (
              <button key={question} onClick={() => send(question)}>
                {question}
                <span>→</span>
              </button>
            ))}
          </div>
          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault()
              send()
            }}
          >
            <label htmlFor="assistant-prompt" className="sr-only">
              Ask BroodWatch a question
            </label>
            <textarea
              id="assistant-prompt"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return
                  event.preventDefault()
                  send()
                }
              }}
              placeholder="Ask a question about your flock..."
              rows={2}
            />
            <div>
              <span>Enter to send · Shift + Enter for a new line</span>
              <button
                className="button-primary"
                type="submit"
                aria-label="Send message"
                disabled={!draft.trim()}
              >
                <Send size={15} />
              </button>
            </div>
          </form>
          <p className="assistant-caution">
            <ShieldCheck size={13} /> No diagnosis or medication advice. Check cited guidance with a
            qualified professional.
          </p>
        </section>
      </div>
    </div>
  )
}

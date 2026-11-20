'use client'

import { useState } from 'react'
import { MessageCircle, Send, Sparkles, X } from 'lucide-react'

export default function FloatingAssistant({ onOpen, active }) {
  const [expanded, setExpanded] = useState(false)
  const [question, setQuestion] = useState('')
  const [sent, setSent] = useState(false)
  const submit = (event) => {
    event.preventDefault()
    if (question.trim()) setSent(true)
  }
  if (active === 'BroodWatch Assistant') return null
  return (
    <div className="assistant-launcher">
      {expanded && (
        <section
          className="assistant-popover"
          role="dialog"
          aria-labelledby="assistant-popover-title"
        >
          <header>
            <span className="assistant-spark">
              <Sparkles size={16} />
            </span>
            <div>
              <strong id="assistant-popover-title">Ask BroodWatch</strong>
              <small>Demo assistant · source-grounded guidance</small>
            </div>
            <button
              className="quiet-icon"
              aria-label="Close assistant"
              onClick={() => setExpanded(false)}
            >
              <X size={16} />
            </button>
          </header>
          {sent ? (
            <div className="popover-answer">
              <span className="message-author">Demo response</span>
              <p>
                Check water availability and drinker function, then compare a complete daily record
                with the flock’s recent pattern. This is a prompt to investigate, not a health
                diagnosis.
              </p>
              <small>General farm-practice guidance · verify against applicable references.</small>
            </div>
          ) : (
            <div className="popover-welcome">
              <p>Questions about flock records or practical poultry guidance?</p>
              <button
                onClick={() => {
                  setQuestion('What should I check if water use changes?')
                  setSent(true)
                }}
              >
                What should I check if water use changes? <span>→</span>
              </button>
            </div>
          )}
          <form className="popover-composer" onSubmit={submit}>
            <label htmlFor="quick-assistant-question" className="sr-only">
              Ask a question
            </label>
            <input
              id="quick-assistant-question"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value)
                setSent(false)
              }}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  (event.nativeEvent.isComposing || event.keyCode === 229)
                )
                  event.preventDefault()
              }}
              placeholder="Ask a question..."
            />
            <button type="submit" aria-label="Send question" disabled={!question.trim()}>
              <Send size={14} />
            </button>
          </form>
          <button className="popover-full-link" onClick={onOpen}>
            Open full assistant <span>→</span>
          </button>
        </section>
      )}
      <button
        className={`assistant-fab ${expanded ? 'open' : ''}`}
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? 'Close BroodWatch assistant' : 'Open BroodWatch assistant'}
        aria-expanded={expanded}
      >
        {expanded ? <X size={18} /> : <MessageCircle size={19} />}
      </button>
    </div>
  )
}

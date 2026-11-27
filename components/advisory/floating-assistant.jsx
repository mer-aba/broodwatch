'use client'

import { useRef, useState } from 'react'
import { MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { askAssistant } from '@/lib/assistant/client'

function AnswerBody({ busy, answer, error }) {
  if (busy) return <p>Preparing response…</p>

  if (answer) {
    return (
      <>
        <small>{answer.mode === 'gemini' ? 'AI response' : 'Reference fallback'}</small>
        <p style={{ whiteSpace: 'pre-wrap' }}>{answer.text}</p>
        {answer.sources?.map((s, i) => (
          <div key={i}>
            <small>
              {s.url
                ? <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
                : s.label}
            </small>
          </div>
        ))}
      </>
    )
  }

  if (error) return <p role="alert">{error}</p>

  return <p>Ask about poultry guidance. Do not enter confidential information.</p>
}

function AssistantPopover({ question, setQuestion, answer, busy, error, onSubmit, onClose, onOpenFull, flockId }) {
  return (
    <section className="assistant-popover" role="dialog" aria-labelledby="assistant-popover-title">
      <header>
        <span className="assistant-spark"><Sparkles size={16} /></span>
        <div>
          <strong id="assistant-popover-title">Ask BroodWatch</strong>
          <small>{flockId ? 'Selected flock context' : 'General guidance'}</small>
        </div>
        <button className="quiet-icon" aria-label="Close assistant" onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      <div className="popover-answer" style={{ maxHeight: 280, overflowY: 'auto' }}>
        <AnswerBody busy={busy} answer={answer} error={error} />
      </div>

      <form className="popover-composer" onSubmit={onSubmit}>
        <input
          aria-label="Ask a question"
          maxLength={2000}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question…"
        />
        <button type="submit" aria-label="Send question" disabled={busy || !question.trim()}>
          <Send size={14} />
        </button>
      </form>

      <button className="popover-full-link" onClick={onOpenFull}>
        Open full assistant →
      </button>
    </section>
  )
}

export default function FloatingAssistant({ onOpen, active, farmId, flockId }) {
  const [expanded, setExpanded] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  async function submit(q) {
    if (!q.trim() || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setAnswer(null)

    try {
      setAnswer(await askAssistant(q, { farmId, flockId }))
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    submit(question)
  }

  function handleOpenFull() {
    setExpanded(false)
    onOpen?.()
  }

  if (active === 'BroodWatch Assistant') return null

  return (
    <div className="assistant-launcher">
      {expanded && (
        <AssistantPopover
          question={question}
          setQuestion={setQuestion}
          answer={answer}
          busy={busy}
          error={error}
          onSubmit={handleSubmit}
          onClose={() => setExpanded(false)}
          onOpenFull={handleOpenFull}
          flockId={flockId}
        />
      )}

      <button
        className={`assistant-fab ${expanded ? 'open' : ''}`}
        onClick={() => setExpanded(x => !x)}
        aria-label={expanded ? 'Close assistant' : 'Open assistant'}
        aria-expanded={expanded}
      >
        {expanded ? <X size={18} /> : <MessageCircle size={19} />}
      </button>
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, BookOpen, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { ScreenHeader } from '../shared/intelligence-ui'
import { createClient } from '@/lib/supabase/client'
import { askAssistant } from '@/lib/assistant/client'

const WELCOME = {
  role: 'assistant',
  text: 'Hello! Ask about poultry guidance or select a flock to review its recorded observations.',
}

const SUGGESTED_QUESTIONS = [
  'Summarise my flock records',
  'What should I check if water use changes?',
  'What does MAAIF say about broiler feeding?',
]

const modeLabel = mode =>
  mode === 'gemini' ? 'AI response' : mode === 'reference' ? 'Reference fallback' : ''

async function fetchFarms() {
  const { data, error } = await createClient().from('farms').select('id,name').order('name')
  if (error) throw error
  return data || []
}

async function fetchActiveFlocks(farmId) {
  const { data, error } = await createClient()
    .from('flocks')
    .select('id,name,current_count')
    .eq('farm_id', farmId)
    .is('archived_at', null)
  if (error) throw error
  return data || []
}

function useFarmsAndFlocks(id) {
  const [farms, setFarms] = useState([])
  const [flocks, setFlocks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    fetchFarms()
      .then(list => { if (live) setFarms(list) })
      .catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    setFlocks([])
    if (!id) return () => { live = false }

    fetchActiveFlocks(id)
      .then(list => { if (live) setFlocks(list) })
      .catch(e => { if (live) setError(e.message) })

    return () => { live = false }
  }, [id])

  return { farms, flocks, error, setError }
}

function ContextPanel({ farms, flocks, id, flock, busy, onFarmChange, onFlockChange }) {
  const selected = flocks.find(f => f.id === flock)

  return (
    <aside className="assistant-context">
      <div className="assistant-context-head">
        <span className="assistant-spark"><Sparkles size={17} /></span>
        <div>
          <strong>Your flock context</strong>
          <small>Optional · live records</small>
        </div>
      </div>

      <label>
        Farm
        <select disabled={busy} value={id} onChange={e => onFarmChange(e.target.value)}>
          <option value="">General guidance</option>
          {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>

      <label>
        Flock
        <select disabled={busy} value={flock} onChange={e => onFlockChange(e.target.value)}>
          <option value="">No flock context</option>
          {flocks.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>

      <div className="context-flock-card">
        <Activity size={15} />
        <div>
          <strong>{selected?.name || 'General guidance'}</strong>
          <small>{flock ? 'Selected flock records' : 'No flock records attached'}</small>
        </div>
      </div>

      <p>
        Selected flock summaries and your question may be sent to Gemini. Do not enter personal or confidential information.
      </p>
    </aside>
  )
}

function Message({ message }) {
  const isAssistant = message.role === 'assistant'

  return (
    <article className={`assistant-message ${message.role}`}>
      <span className="message-avatar">{isAssistant ? <Sparkles size={14} /> : 'You'}</span>
      <div className="message-content">
        <span className="message-author">
          {isAssistant ? 'BroodWatch' : 'You'} <small>{modeLabel(message.mode)}</small>
        </span>
        <p style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>
        {message.sources?.map((s, i) => (
          <div key={i} className="message-citation">
            <BookOpen size={13} />
            {s.url
              ? <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
              : s.label}
          </div>
        ))}
      </div>
    </article>
  )
}

function ChatHeader({ busy, onClear }) {
  return (
    <div className="assistant-chat-head">
      <span className="assistant-online"><Sparkles size={16} /></span>
      <div>
        <strong>BroodWatch Assistant</strong>
        <small>AI + reference fallback</small>
      </div>
      <button className="quiet-action" disabled={busy} onClick={onClear}>Clear chat</button>
    </div>
  )
}

function SuggestedQuestions({ busy, onAsk }) {
  return (
    <div className="suggested-questions">
      <span>TRY ASKING</span>
      {SUGGESTED_QUESTIONS.map(q => (
        <button key={q} disabled={busy} onClick={() => onAsk(q)}>{q} →</button>
      ))}
    </div>
  )
}

function Composer({ draft, setDraft, busy, onSend }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <form
      className="assistant-composer"
      onSubmit={e => { e.preventDefault(); onSend() }}
    >
      <textarea
        aria-label="Ask BroodWatch"
        maxLength={2000}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about your flock…"
        rows={2}
      />
      <div>
        <span>Enter to send · Shift + Enter for a new line</span>
        <button className="button-primary" disabled={busy || !draft.trim()} type="submit" aria-label="Send message">
          <Send size={15} />
        </button>
      </div>
    </form>
  )
}

export function AssistantChat({ farmId, farm }) {
  const [selected, setSelected] = useState('')
  const [flock, setFlock] = useState('')
  const [messages, setMessages] = useState([WELCOME])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [chatError, setChatError] = useState('')

  const lock = useRef(false)
  const bottom = useRef(null)

  const id = selected || farmId || farm?.id || ''
  const { farms, flocks, error, setError } = useFarmsAndFlocks(id)

  useEffect(() => { setFlock('') }, [id])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }) }, [messages, busy])

  async function send(value = draft) {
    const q = value.trim()
    if (!q || lock.current) return

    lock.current = true
    setBusy(true)
    setChatError('')
    setDraft('')
    setMessages(m => [...m, { role: 'user', text: q }])

    try {
      const answer = await askAssistant(q, { farmId: id, flockId: flock })
      setMessages(m => [...m, { role: 'assistant', ...answer }])
    } catch (e) {
      setChatError(e.message)
      setDraft(q)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function changeFarm(value) {
    setSelected(value)
    setFlock('')
    setMessages([WELCOME])
  }

  function changeFlock(value) {
    setFlock(value)
    setMessages([WELCOME])
  }

  function clearChat() {
    setMessages([WELCOME])
  }

  return (
    <div className="intelligence-page assistant-page">
      <ScreenHeader
        kicker="BROODWATCH ASSISTANT"
        title="Ask about your flock"
        description="AI guidance grounded in curated references and selected flock records."
      />

      <div className="assistant-workspace">
        <ContextPanel
          farms={farms}
          flocks={flocks}
          id={id}
          flock={flock}
          busy={busy}
          onFarmChange={changeFarm}
          onFlockChange={changeFlock}
        />

        <section className="assistant-chat">
          <ChatHeader busy={busy} onClear={clearChat} />

          <div className="assistant-messages" role="log" aria-live="polite">
            {messages.map((m, i) => <Message key={i} message={m} />)}
            {busy && <p>Preparing response…</p>}
            <div ref={bottom} />
          </div>

          {(chatError || error) && <p role="alert">{chatError || error}</p>}

          <SuggestedQuestions busy={busy} onAsk={send} />

          <Composer draft={draft} setDraft={setDraft} busy={busy} onSend={send} />

          <p className="assistant-caution">
            <ShieldCheck size={13} /> Educational guidance, not veterinary diagnosis.
          </p>
        </section>
      </div>
    </div>
  )
}
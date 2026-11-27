'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Bird, Check, MoveRight, Plus, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeading, OpsFilters, OpsPanel, SuccessNote, DataTable } from '../shared/operations-ui'

const EVENT_LIMIT = 1000
const TABLES = ['flocks', 'batches', 'houses', 'pens', 'flock_placements', 'flock_events']

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

const blank = () => ({
  flock_id: '',
  source_pen_id: '?',
  destination_pen_id: '?',
  bird_count: '',
  event_date: today(),
  notes: '',
  reason: 'mortality',
})

const empty = () => ({ flocks: [], batches: [], houses: [], pens: [], placements: [], events: [] })
const n = x => Number(x) || 0
const sum = xs => xs.reduce((s, x) => s + n(x.bird_count), 0)

const REASON_ACTIONS = {
  mortality: 'record_mortality',
  sale: 'record_sale',
  culling: 'record_culling',
  removal: 'record_removal',
}

const REASONS = [
  ['mortality', 'Mortality'],
  ['sale', 'Bird sale'],
  ['culling', 'Culling'],
  ['removal', 'Other removal'],
]

const TABS = [
  ['Transfer between pens', 'Transfer'],
  ['Sale or removal', 'Sale or removal'],
  ['History', 'History'],
]

function Field({ label, children }) {
  return <label className="ops-field"><span>{label}</span>{children}</label>
}

async function fetchFarms() {
  const { data, error } = await createClient().from('farms').select('id,name').order('name')
  if (error) throw error
  return data || []
}

async function fetchFarmData(farmId) {
  const db = createClient()
  const results = await Promise.all(
    TABLES.map(table => {
      let query = db.from(table).select('*').eq('farm_id', farmId)
      if (table === 'flock_events') {
        query = query.order('event_date', { ascending: false }).order('created_at', { ascending: false }).limit(EVENT_LIMIT)
      }
      return query
    })
  )

  const failed = results.find(r => r.error)
  if (failed) throw failed.error

  return Object.fromEntries(Object.keys(empty()).map((key, i) => [key, results[i].data || []]))
}

async function saveMovement(farmId, form, isTransfer, qty) {
  const action = isTransfer ? 'move_birds' : REASON_ACTIONS[form.reason]
  const { error } = await createClient().rpc('manage_farm', {
    p_farm_id: farmId,
    p_action: action,
    p_data: {
      flock_id: form.flock_id,
      source_pen_id: form.source_pen_id,
      destination_pen_id: isTransfer ? form.destination_pen_id : '',
      bird_count: qty,
      event_date: form.event_date,
      notes: form.notes,
    },
  })
  if (error) throw error
}

function FarmSelector({ options, value, disabled, onChange }) {
  return (
    <OpsFilters>
      <Field label="Farm">
        <select disabled={disabled} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Select farm</option>
          {options.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </Field>
    </OpsFilters>
  )
}

function HistoryPanel({ history, farmData, flockName, penName, penById, search, setSearch, onRefresh }) {
  return (
    <OpsPanel
      title="Movement history"
      action={<button className="quiet-action" onClick={onRefresh}><RefreshCw size={14} /> Refresh</button>}
    >
      <Field label="Search history">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flock, reason or date" />
      </Field>

      <DataTable
        headings={['DATE', 'TYPE', 'FLOCK', 'FROM', 'TO', 'BIRDS', 'REASON']}
        rows={history.map(e => [
          e.event_date,
          e.event_type,
          flockName(farmData.flocks.find(f => f.id === e.flock_id)),
          e.source_pen_id
            ? (penById(e.source_pen_id) ? penName(penById(e.source_pen_id)) : 'Historical pen')
            : 'Unassigned birds',
          e.event_type === 'movement'
            ? (e.destination_pen_id
              ? (penById(e.destination_pen_id) ? penName(penById(e.destination_pen_id)) : 'Historical pen')
              : 'Unassigned birds')
            : 'Outside live flock',
          e.bird_count,
          e.notes || '—',
        ])}
      />

      {!history.length && <p>No matching movements.</p>}
      <p className="ops-aside-caption">Latest {EVENT_LIMIT.toLocaleString('en-UG')} events.</p>
    </OpsPanel>
  )
}

function MovementPreview({ form, sourceLabel, destLabel, available, destCount, qty, valid }) {
  return (
    <div className="movement-preview">
      <span>
        {form.source_pen_id === '?' ? 'Source' : sourceLabel}
        <small>{available} → {valid ? available - qty : available} birds</small>
      </span>
      <MoveRight size={20} />
      <span>
        {form.destination_pen_id === '?' ? 'Destination' : destLabel}
        <small>
          {form.destination_pen_id === '?' ? '—' : `${destCount} → ${destCount + (valid ? qty : 0)} birds`}
        </small>
      </span>
      <em>{valid ? qty : 0} birds to transfer</em>
    </div>
  )
}

function MovementForm({
  tab, form, set, activeFlocks, flockName, batch, pens, penName, unassigned, count, occupancy,
  available, remaining, dest, qty, valid, transfer, busy, onSave,
}) {
  const maxQty = Math.max(0, Math.min(available, transfer ? remaining : Infinity))

  return (
    <OpsPanel title={tab}>
      <form onSubmit={onSave}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div className="ops-form-grid">
            <Field label="Flock or batch">
              <select required value={form.flock_id} onChange={e => set('flock_id', e.target.value)}>
                <option value="">Choose flock</option>
                {activeFlocks.map(f => (
                  <option key={f.id} value={f.id}>
                    {flockName(f)} · {batch(f)?.category} ({f.current_count} live)
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Movement date">
              <input type="date" required max={today()} value={form.event_date} onChange={e => set('event_date', e.target.value)} />
            </Field>

            <Field label={transfer ? 'From pen' : 'Current pen'}>
              <select value={form.source_pen_id} onChange={e => set('source_pen_id', e.target.value)}>
                <option value="?">Select source</option>
                {unassigned > 0 && <option value="">Unassigned birds ({unassigned})</option>}
                {pens.filter(p => count(p.id) > 0).map(p => (
                  <option key={p.id} value={p.id}>{penName(p)} ({count(p.id)} birds)</option>
                ))}
              </select>
            </Field>

            {transfer ? (
              <Field label="To pen">
                <select value={form.destination_pen_id} onChange={e => set('destination_pen_id', e.target.value)}>
                  <option value="?">Select destination</option>
                  {form.source_pen_id !== '' && <option value="">Unassigned birds</option>}
                  {pens.filter(p => p.id !== form.source_pen_id).map(p => (
                    <option key={p.id} value={p.id}>{penName(p)} ({occupancy(p.id)}/{p.capacity})</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Reason">
                <select value={form.reason} onChange={e => set('reason', e.target.value)}>
                  {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            )}

            <Field label="Number of birds">
              <input
                required
                type="number"
                min="1"
                step="1"
                max={maxQty}
                value={form.bird_count}
                onChange={e => set('bird_count', e.target.value)}
              />
            </Field>

            <Field label="Movement note / reference">
              <input value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </div>

          {transfer && (
            <MovementPreview
              form={form}
              sourceLabel={penName(penByIdSafe(form.source_pen_id, pens))}
              destLabel={penName(dest)}
              available={available}
              destCount={count(form.destination_pen_id)}
              qty={qty}
              valid={valid}
            />
          )}

          <div className="ops-form-footer">
            <span>
              Available: {available} birds
              {transfer && dest ? ` · Destination free: ${remaining}` : ''}
            </span>
            <button type="submit" className="button-primary" disabled={!valid || busy}>
              <Check size={15} />{busy ? 'Saving…' : 'Save movement'}
            </button>
          </div>
        </fieldset>
      </form>
    </OpsPanel>
  )
}

function penByIdSafe(id, pens) {
  return pens.find(p => p.id === id)
}

function LiveCountsPanel({ placements, filter, flocks, flockName, penName, penById, activeFlocks }) {
  return (
    <OpsPanel title="Current live counts">
      {placements
        .filter(p => !filter || p.flock_id === filter)
        .map(p => (
          <div className="count-row" key={p.id || `${p.flock_id}-${p.pen_id}`}>
            <span><Bird size={15} />{flockName(flocks.find(f => f.id === p.flock_id))} · {penName(penById(p.pen_id))}</span>
            <strong>{p.bird_count} <small>birds</small></strong>
          </div>
        ))}
      <p className="ops-aside-caption">
        Active live population: {activeFlocks.reduce((s, f) => s + n(f.current_count), 0)} birds.
      </p>
    </OpsPanel>
  )
}

function TipsPanel() {
  return (
    <OpsPanel title="Record keeping tip">
      <p className="plain-tip">
        Save each transfer once. Both pen counts are updated together. Do not record mortality here if it was already recorded in Daily Records.
      </p>
    </OpsPanel>
  )
}

export function BirdMovements({ farmId, farm, farms = [], onFarmChange, onFarmRefresh }) {
  const [local, setLocal] = useState('')
  const [found, setFound] = useState([])
  const [tab, setTab] = useState('Transfer between pens')
  const [form, setForm] = useState(blank)
  const [data, setData] = useState(empty)
  const [loaded, setLoaded] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const lock = useRef(false)

  const options = useMemo(
    () => [...new Map([...farms, ...found, ...(farm?.id ? [farm] : [])].map(f => [f.id, f])).values()],
    [farms, found, farm]
  )

  const id = local || farmId || farm?.id || options[0]?.id || ''

  useEffect(() => { setLocal('') }, [farmId])

  useEffect(() => {
    let live = true
    fetchFarms()
      .then(list => { if (live) setFound(list) })
      .catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [])

  useEffect(() => {
    setForm(blank())
    setFilter('')
    setSaved('')
  }, [id])

  useEffect(() => {
    let live = true
    setLoaded('')
    setError('')
    if (!id) return () => { live = false }

    fetchFarmData(id)
      .then(rows => {
        if (!live) return
        setData(rows)
        setLoaded(id)
      })
      .catch(e => { if (live) setError(e.message) })

    return () => { live = false }
  }, [id, reload])

  const ready = !!id && loaded === id
  const d = ready ? data : empty()
  const active = d.flocks.filter(f => !f.archived_at)
  const flock = d.flocks.find(f => f.id === form.flock_id && !f.archived_at)

  const batch = f => d.batches.find(b => b.id === f?.batch_id)
  const flockName = f => batch(f)?.batch_number || f?.name || 'Unknown flock'
  const penById = pid => d.pens.find(p => p.id === pid)
  const penName = p => p ? `${d.houses.find(h => h.id === p.house_id)?.name || 'House'} · ${p.name}` : 'Unassigned birds'

  const own = d.placements.filter(p => p.flock_id === flock?.id)
  const unassigned = n(flock?.current_count) - sum(own)
  const count = pid => pid === '' ? unassigned : sum(own.filter(p => p.pen_id === pid))
  const occupancy = pid => sum(d.placements.filter(p => p.pen_id === pid))

  const available = count(form.source_pen_id)
  const qty = Number(form.bird_count)
  const transfer = tab === 'Transfer between pens'
  const dest = penById(form.destination_pen_id)
  const remaining = dest ? n(dest.capacity) - occupancy(dest.id) : Infinity

  const set = (key, value) => setForm(f => ({
    ...f,
    [key]: value,
    ...(key === 'flock_id' ? { source_pen_id: '?', destination_pen_id: '?' }
      : key === 'source_pen_id' ? { destination_pen_id: '?' }
      : {}),
  }))

  const valid = ready &&
    flock &&
    form.source_pen_id !== '?' &&
    Number.isSafeInteger(qty) &&
    qty > 0 &&
    qty <= available &&
    qty <= n(flock.current_count) &&
    form.event_date &&
    form.event_date <= today() &&
    (!transfer || (form.destination_pen_id !== '?' && form.destination_pen_id !== form.source_pen_id && qty <= remaining))

  const history = d.events.filter(e =>
    (!filter || e.flock_id === filter) &&
    [e.event_type, e.notes, flockName(d.flocks.find(f => f.id === e.flock_id)), e.event_date]
      .join(' ').toLowerCase()
      .includes(search.toLowerCase())
  )

  function changeFarm(next) {
    setLocal(next)
    onFarmChange?.(next)
  }

  async function save(e) {
    e.preventDefault()
    if (!valid || lock.current) return
    if (!window.confirm(`${transfer ? 'Transfer' : 'Record removal of'} ${qty} birds? This updates live counts.`)) return

    lock.current = true
    setBusy(true)
    setError('')
    setSaved('')

    try {
      await saveMovement(id, form, transfer, qty)
      setSaved('Movement saved. Live counts updated.')
      setForm(blank())
      setLoaded('')
      setReload(x => x + 1)
      setTab('History')
      try {
        await onFarmRefresh?.()
      } catch {
        setError('Movement saved, but dashboard refresh failed. Reload the dashboard.')
      }
    } catch (e) {
      setError(e.message || 'Save failed. Check history before retrying.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function startMovement() {
    if (busy) return
    setTab('Transfer between pens')
    setSaved('')
  }

  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK OPERATIONS"
        title="Bird movements"
        description="Keep an accurate record when birds move into, between or out of pens."
        action={{ label: 'Record movement', icon: Plus, onClick: startMovement }}
      />

      <div className="ops-callout">
        <ArrowLeftRight size={17} />
        <p>
          <strong>Movement records update the live count.</strong> Initial placement stays in your batch history. Review each entry before saving.
        </p>
      </div>

      {saved && <SuccessNote>{saved}</SuccessNote>}
      {error && <p role="alert" className="wizard-validation">{error}</p>}

      <OpsFilters>
        <Field label="Farm">
          <select disabled={busy} value={id} onChange={e => changeFarm(e.target.value)}>
            <option value="">Select farm</option>
            {options.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>

        <Field label="Flock">
          <select
            disabled={busy}
            value={filter}
            onChange={e => { setFilter(e.target.value); set('flock_id', e.target.value) }}
          >
            <option value="">All flocks</option>
            {(tab === 'History' ? d.flocks : active).map(f => (
              <option key={f.id} value={f.id}>{flockName(f)}</option>
            ))}
          </select>
        </Field>

        <span className="ops-filter-spacer" />

        {TABS.map(([value, label]) => (
          <button
            key={value}
            disabled={busy}
            className={`ops-tab ${tab === value ? 'selected' : ''}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </OpsFilters>

      {!ready ? (
        <p>
          {id ? 'Loading farm records…' : 'Select a farm to begin.'}{' '}
          <button className="quiet-action" onClick={() => setReload(x => x + 1)}>Retry</button>
        </p>
      ) : tab === 'History' ? (
        <HistoryPanel
          history={history}
          farmData={d}
          flockName={flockName}
          penName={penName}
          penById={penById}
          search={search}
          setSearch={setSearch}
          onRefresh={() => setReload(x => x + 1)}
        />
      ) : (
        <div className="ops-columns movement-layout">
          <div className="ops-main-column">
            <MovementForm
              tab={tab}
              form={form}
              set={set}
              activeFlocks={active}
              flockName={flockName}
              batch={batch}
              pens={d.pens}
              penName={penName}
              unassigned={unassigned}
              count={count}
              occupancy={occupancy}
              available={available}
              remaining={remaining}
              dest={dest}
              qty={qty}
              valid={valid}
              transfer={transfer}
              busy={busy}
              onSave={save}
            />
          </div>
          <aside className="ops-aside-column">
            <LiveCountsPanel
              placements={d.placements}
              filter={filter}
              flocks={d.flocks}
              flockName={flockName}
              penName={penName}
              penById={penById}
              activeFlocks={active}
            />
            <TipsPanel />
          </aside>
        </div>
      )}
    </div>
  )
}
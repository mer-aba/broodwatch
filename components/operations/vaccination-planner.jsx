'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ClipboardCheck, Plus, ShieldCheck } from 'lucide-react'
import { PageHeading, OpsFilters, OpsPanel, Status, SuccessNote, BookIcon } from '../shared/operations-ui'
import { createClient } from '@/lib/supabase/client'

const SOURCE_URL = 'https://www.agriculture.go.ug/wp-content/uploads/2020/07/MAAIF-Poultry-Manual.pdf'
const PAGE_SIZE = 500

const BROILER_SCHEDULE = [
  [7, 'Newcastle disease'],
  [14, 'Gumboro'],
  [21, 'Gumboro'],
  [28, 'Infectious bronchitis / Newcastle'],
]

const LAYER_SCHEDULE = [
  ...BROILER_SCHEDULE,
  [42, 'Fowl pox', 'Wing stab'],
  [56, 'Typhoid', 'Intramuscular'],
  [63, 'Newcastle (Lasota)', 'Injection'],
  [70, 'Fowl pox', 'Injection / wing web'],
  [77, 'Fowl cholera', 'Subcutaneous'],
  [98, 'Infectious bronchitis 2', 'Water / eye drop'],
  [119, 'Newcastle (Lasota)', 'Water'],
  [126, 'Fowl cholera', 'Subcutaneous'],
  [287, 'Infectious bronchitis 2', 'Water'],
  [294, 'Newcastle (Lasota)', 'Water'],
  [329, 'Infectious bronchitis 2', 'Water'],
  [336, 'Newcastle (Lasota)', 'Water'],
  [371, 'Infectious bronchitis 2', 'Water'],
  [378, 'Newcastle (Lasota)', 'Water'],
  [406, 'Infectious bronchitis 2', 'Water'],
  [413, 'Newcastle (Lasota)', 'Water'],
]

const style = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid #d9e2dc',
  borderRadius: 9,
  background: 'var(--surface, white)',
  color: 'inherit',
}

const today = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10)

const addDays = (d, n) => {
  const x = new Date(d + 'T12:00:00Z')
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}

const empty = () => ({
  flock_id: '',
  activity: '',
  kind: 'task',
  planned_on: today(),
  assigned_to: '',
  source: '',
  reminder_days: '',
  notes: '',
})

const flockLabel = f =>
  f ? `${f.batch?.batch_number || f.name} · ${f.batch?.breed || f.batch?.category || 'Unknown breed'}` : 'Farm-wide'

const activeStatuses = ['reference', 'planned']

function Input({ label, children }) {
  return (
    <label className="ops-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function resolveProgramme(category, purpose) {
  const c = String(category || '').toLowerCase()
  if (c === 'broiler') return 'broiler'
  if (c === 'layer') return 'layer'
  if (c === 'dual-purpose') return purpose
  return ''
}

function milestonesFor(programme) {
  if (programme === 'broiler') return BROILER_SCHEDULE
  if (programme === 'layer') return LAYER_SCHEDULE
  if (programme === 'meat') return LAYER_SCHEDULE.filter(x => x[0] <= 28)
  return []
}

function sourceFor(programme, category) {
  if (category === 'dual-purpose') return 'MAAIF §4.6.1 / Table 29'
  if (programme === 'broiler') return 'MAAIF Table 30'
  return 'MAAIF Table 29'
}

function routeFor(route, programme) {
  return route || (programme === 'broiler' ? 'See veterinary product guidance' : 'Water / eye drop')
}

async function fetchFarmOptions() {
  const { data, error } = await createClient().from('farms').select('id,name').order('name')
  if (error) throw error
  return data || []
}

async function fetchPlannerData(farmId) {
  const db = createClient()
  const [flocks, batches] = await Promise.all([
    db.from('flocks').select('id,name,batch_id,archived_at').eq('farm_id', farmId),
    db.from('batches').select('id,batch_number,breed,category,hatch_date').eq('farm_id', farmId),
  ])

  if (flocks.error) throw flocks.error
  if (batches.error) throw batches.error

  const allTasks = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const r = await db
      .from('bw_flock_tasks')
      .select('*')
      .eq('farm_id', farmId)
      .order('planned_on')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (r.error) throw r.error
    allTasks.push(...r.data)
    if (r.data.length < PAGE_SIZE) break
  }

  const flockRows = (flocks.data || []).map(f => ({
    ...f,
    batch: (batches.data || []).find(b => b.id === f.batch_id),
  }))

  return { flocks: flockRows, tasks: allTasks }
}

async function generateReferenceSchedule(db, farmId, flock, milestones, programme, category) {
  const rows = milestones.map(([day, activity, route]) => ({
    farm_id: farmId,
    flock_id: flock.id,
    activity,
    kind: 'vaccination',
    status: 'reference',
    planned_on: addDays(flock.batch.hatch_date, day),
    milestone: `maaif-v1:${day}:${activity}`,
    source: sourceFor(programme, category),
    route_reference: routeFor(route, programme),
    reminder_days: 1,
  }))

  const { error } = await db
    .from('bw_flock_tasks')
    .upsert(rows, { onConflict: 'flock_id,milestone', ignoreDuplicates: true })
  if (error) throw error
}

async function insertTask(db, farmId, form) {
  const { error } = await db.from('bw_flock_tasks').insert({
    ...form,
    farm_id: farmId,
    flock_id: form.flock_id || null,
    reminder_days: form.reminder_days === '' ? null : Number(form.reminder_days),
    status: form.kind === 'vaccination' ? 'reference' : 'planned',
  })
  if (error) throw error
}

async function updateTask(db, farmId, task, patch) {
  const { data, error } = await db
    .from('bw_flock_tasks')
    .update(patch)
    .eq('farm_id', farmId)
    .eq('id', task.id)
    .eq('status', task.status)
    .select('id')
    .single()
  if (error) throw error
  if (!data) throw new Error('Task changed or permission denied')
}

function FarmSelector({ farms, value, onChange }) {
  return (
    <OpsFilters>
      <Input label="Farm">
        <select
          style={style}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select farm</option>
          {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </Input>
    </OpsFilters>
  )
}

function PlannerCallouts({ error, notice }) {
  return (
    <>
      <div className="ops-callout">
        <ShieldCheck size={17} />
        <p>
          <strong>Schedules are references, not prescriptions.</strong> Confirm previous vaccinations, product, timing and route with a veterinarian. Missed reference dates require review.
        </p>
      </div>
      {error && <div className="ops-callout" role="alert">{error}</div>}
      {notice && <SuccessNote>{notice}</SuccessNote>}
    </>
  )
}

function PlannerSummary({ loading, upcoming, completed, overdue }) {
  return (
    <div className="health-summary">
      <div><span>Upcoming activities</span><strong>{loading ? '—' : upcoming}</strong><small>Next 14 days</small></div>
      <div><span>Completed this month</span><strong>{loading ? '—' : completed}</strong><small>Recorded activities</small></div>
      <div><span>Overdue / review</span><strong>{loading ? '—' : overdue}</strong><small>Do not automatically administer missed vaccines</small></div>
    </div>
  )
}

function PlannerTabs({ tab, setTab, flocks, filter, setFilter, onFilterChange }) {
  return (
    <OpsFilters>
      {['Schedule', 'Reference', 'Add task', 'History'].map(t => (
        <button
          key={t}
          className={`ops-tab ${tab === t ? 'selected' : ''}`}
          onClick={() => setTab(t)}
        >
          {t === 'Reference' ? 'Reference notes' : t}
        </button>
      ))}
      <span className="ops-filter-spacer" />
      <Input label="Flock">
        <select
          style={style}
          value={filter}
          onChange={e => {
            setFilter(e.target.value)
            onFilterChange?.()
          }}
        >
          <option value="">All flocks</option>
          {flocks.map(f => <option key={f.id} value={f.id}>{flockLabel(f)}</option>)}
        </select>
      </Input>
    </OpsFilters>
  )
}

function ReferencePanel() {
  return (
    <OpsPanel title="MAAIF reference schedules">
      <div className="reference-notes">
        <div>
          <span className="reference-mark"><BookIcon /></span>
          <div>
            <strong>Tables 29 and 30 · Section 4.6.1</strong>
            <p>
              Commercial layers and broilers have separate schedules. Improved meat birds use the early layer programme; improved egg birds use the layer programme. Indigenous and breeder stock require a professional programme.
            </p>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer">Open MAAIF manual</a>
          </div>
        </div>
      </div>
    </OpsPanel>
  )
}

function AddTaskPanel({ flocks, form, set, busy, loading, onSave }) {
  return (
    <OpsPanel title="Add a vaccination or farm task">
      <div className="ops-form-grid">
        <Input label="Flock">
          <select style={style} value={form.flock_id} onChange={e => set('flock_id', e.target.value)}>
            <option value="">Farm-wide</option>
            {flocks.filter(f => !f.archived_at).map(f => <option key={f.id} value={f.id}>{flockLabel(f)}</option>)}
          </select>
        </Input>

        <Input label="Activity type">
          <select style={style} value={form.kind} onChange={e => set('kind', e.target.value)}>
            <option value="task">Farm task</option>
            <option value="vaccination">Vaccination</option>
          </select>
        </Input>

        {[
          ['activity', 'Activity'],
          ['planned_on', 'Planned date'],
          ['assigned_to', 'Assigned to'],
          ['source', 'Reference or source'],
          ['notes', 'Notes'],
        ].map(([key, label]) => (
          <Input key={key} label={label}>
            <input
              style={style}
              type={key === 'planned_on' ? 'date' : 'text'}
              value={form[key]}
              onChange={e => set(key, e.target.value)}
            />
          </Input>
        ))}

        <Input label="Reminder">
          <select style={style} value={form.reminder_days} onChange={e => set('reminder_days', e.target.value)}>
            <option value="">No reminder</option>
            <option value="0">On planned date</option>
            <option value="1">One day before</option>
          </select>
        </Input>
      </div>

      <div className="ops-form-footer">
        <span>Vaccinations require confirmation.</span>
        <button className="button-primary" disabled={busy || loading} onClick={onSave}>
          <Check size={15} /> Save task
        </button>
      </div>
    </OpsPanel>
  )
}

function AutoSchedulePanel({ flock, category, hatch, purpose, setPurpose, milestones, busy, loading, onGenerate }) {
  const age = hatch && hatch <= today()
    ? Math.round((Date.parse(today()) - Date.parse(hatch)) / 86400000) + ' days'
    : 'Unknown'

  return (
    <OpsPanel title="Automatic MAAIF schedule">
      <p>
        {flock
          ? `${flockLabel(flock)} · Hatch date: ${hatch || 'Missing'} · Age: ${age}`
          : 'Select a flock above.'}
      </p>

      {category === 'dual-purpose' && (
        <Input label="Production purpose">
          <select style={style} value={purpose} onChange={e => setPurpose(e.target.value)}>
            <option value="">Choose purpose</option>
            <option value="meat">Meat</option>
            <option value="layer">Eggs</option>
          </select>
        </Input>
      )}

      <p>
        {milestones.length
          ? `${milestones.length} reference milestones available. Review hatchery history before confirmation.`
          : 'No automatic programme selected or supported.'}
      </p>

      <button
        className="button-primary"
        disabled={busy || loading || !hatch || hatch > today() || flock?.archived_at || !milestones.length}
        onClick={onGenerate}
      >
        <Plus size={15} /> Generate reference schedule
      </button>
    </OpsPanel>
  )
}

function TaskRow({ task, now, busy, flocks, onConfirm, onComplete, onCancel }) {
  const isOverdue = task.status === 'planned' && task.planned_on < now
  const inReminderWindow = task.status === 'planned' &&
    task.reminder_days !== null &&
    now >= addDays(task.planned_on, -task.reminder_days) &&
    now <= task.planned_on

  return (
    <article className="vaccination-row">
      <div className="vaccine-date">
        <CalendarDays size={16} />
        <span>{task.planned_on.slice(8)}</span>
        <small>{task.planned_on.slice(0, 7)}</small>
      </div>

      <div className="vaccine-main">
        <div className="vaccine-title">
          <strong>{task.activity}</strong>
          <Status tone={task.status === 'completed' ? 'blue' : isOverdue ? 'gold' : 'sage'}>
            {task.status === 'reference' ? 'Needs confirmation' : isOverdue ? 'Overdue' : task.status}
          </Status>
        </div>
        <p>{flockLabel(flocks.find(f => f.id === task.flock_id))} · {task.source || 'Custom activity'}</p>
        {task.route_reference && <small>Reference route: {task.route_reference} · verify product</small>}
        {inReminderWindow && <p>Reminder: due {task.planned_on}</p>}
        {task.completed_on && <p>Completed {task.completed_on} · {task.administrator} · {task.product}</p>}
        {task.confirmed_by && <p>Confirmed by {task.confirmed_by}</p>}
      </div>

      {task.status === 'reference' && (
        <button className="complete-task" disabled={busy} onClick={onConfirm}>Confirm plan</button>
      )}
      {task.status === 'planned' && (
        <button className="complete-task" disabled={busy} onClick={onComplete}>
          <ClipboardCheck size={14} /> Mark complete
        </button>
      )}
      {activeStatuses.includes(task.status) && (
        <button className="quiet-action" disabled={busy} onClick={onCancel}>Cancel task</button>
      )}
    </article>
  )
}

function TaskListPanel({
  tab, month, setMonth, loading, visible, now, busy, flocks,
  onConfirm, onComplete, onCancel,
}) {
  const statuses = tab === 'History' ? ['completed', 'cancelled'] : activeStatuses
  const rows = visible.filter(i => statuses.includes(i.status))

  return (
    <OpsPanel
      title={tab === 'History' ? 'Completed and cancelled activities' : 'Flock activity schedule'}
      action={
        <input
          aria-label="Filter month"
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
        />
      }
    >
      {month && <button className="quiet-action" onClick={() => setMonth('')}>All dates</button>}

      {loading ? (
        <p>Loading activities…</p>
      ) : (
        <div className="vaccination-list">
          {rows.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              now={now}
              busy={busy}
              flocks={flocks}
              onConfirm={() => onConfirm(task)}
              onComplete={() => onComplete(task)}
              onCancel={() => onCancel(task)}
            />
          ))}
        </div>
      )}

      {!loading && !rows.length && <p>No activities match these filters.</p>}
    </OpsPanel>
  )
}

function ActionPanel({ action, details, detail, busy, loading, onBack, onApply }) {
  const fields = action.mode === 'confirm'
    ? [['confirmed_by', 'Veterinary professional'], ['planned_on', 'Confirmed date']]
    : action.mode === 'complete'
      ? [['completed_on', 'Actual completion date'], ['administrator', 'Administered by'], ['product', 'Product / batch details']]
      : []

  const allFields = [...fields, ['notes', 'Notes / reason']]
  const title = action.mode === 'confirm'
    ? 'Confirm plan'
    : action.mode === 'complete'
      ? 'Record completion'
      : 'Cancel task'

  return (
    <OpsPanel title={`${title} · ${action.i.activity}`}>
      <div className="ops-form-grid">
        {allFields.map(([key, label]) => (
          <Input key={key} label={label}>
            <input
              style={style}
              type={key.endsWith('_on') ? 'date' : 'text'}
              value={details[key] || ''}
              onChange={e => detail(key, e.target.value)}
            />
          </Input>
        ))}
      </div>

      <div className="ops-form-footer">
        <button className="quiet-action" onClick={onBack}>Back</button>
        <button className="button-primary" disabled={busy || loading} onClick={onApply}>
          Save {action.mode}
        </button>
      </div>
    </OpsPanel>
  )
}

export function VaccinationPlanner({ farmId, farm, farms = [], onFarmChange }) {
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(farmId || farm?.id || '')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    fetchFarmOptions()
      .then(data => { if (live) setOptions(data) })
      .catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [])

  useEffect(() => { if (farmId) setSelected(farmId) }, [farmId])

  const allFarms = useMemo(
    () => [...new Map([...farms, ...options, ...(farm?.id ? [farm] : [])].map(f => [f.id, f])).values()],
    [farms, options, farm]
  )

  const active = selected || allFarms[0]?.id || ''

  function changeFarm(id) {
    setSelected(id)
    onFarmChange?.(id)
  }

  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK HEALTH"
        title="Vaccination & tasks"
        description="Plan flock activities and keep a record of what has been completed."
      />

      <FarmSelector farms={allFarms} value={active} onChange={changeFarm} />

      {error && <div role="alert">{error}</div>}

      {active
        ? <Planner key={active} farmId={active} />
        : <p>Select a farm to continue.</p>}
    </div>
  )
}

function Planner({ farmId }) {
  const [tab, setTab] = useState('Schedule')
  const [items, setItems] = useState([])
  const [flocks, setFlocks] = useState([])
  const [filter, setFilter] = useState('')
  const [purpose, setPurpose] = useState('')
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [month, setMonth] = useState('')
  const [revision, setRevision] = useState(0)
  const [action, setAction] = useState(null)
  const [details, setDetails] = useState({})

  useEffect(() => {
    let live = true
    setLoading(true)

    fetchPlannerData(farmId)
      .then(data => {
        if (!live) return
        setFlocks(data.flocks)
        setItems(data.tasks)
      })
      .catch(e => { if (live) setError(e.message) })
      .finally(() => { if (live) setLoading(false) })

    return () => { live = false }
  }, [farmId, revision])

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }))
  const detail = (key, value) => setDetails(p => ({ ...p, [key]: value }))
  const refresh = () => setRevision(x => x + 1)

  const flock = flocks.find(f => f.id === filter)
  const category = String(flock?.batch?.category || '').toLowerCase()
  const hatch = flock?.batch?.hatch_date
  const programme = resolveProgramme(category, purpose)
  const milestones = milestonesFor(programme)

  const now = today()
  const visible = items.filter(i =>
    (!filter || i.flock_id === filter) &&
    (!month || i.planned_on.startsWith(month))
  )

  const open = items.filter(i => activeStatuses.includes(i.status))
  const upcoming = open.filter(i => i.planned_on >= now && i.planned_on <= addDays(now, 14))
  const overdue = open.filter(i => i.planned_on < now)
  const completed = items.filter(i => i.status === 'completed' && i.completed_on?.startsWith(now.slice(0, 7)))

  async function run(fn, message) {
    if (busy || loading) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn(createClient())
      setNotice(message)
      refresh()
    } catch (e) {
      setError(e.message || 'Database operation failed')
    } finally {
      setBusy(false)
    }
  }

  async function generate() {
    if (!flock || flock.archived_at || !hatch || hatch > now || !milestones.length) return
    await run(
      db => generateReferenceSchedule(db, farmId, flock, milestones, programme, category),
      'Reference schedule generated. Existing milestones preserved.'
    )
  }

  async function save() {
    if (!form.activity.trim() || !form.planned_on) {
      setError('Activity and planned date are required.')
      return
    }
    if (form.kind === 'vaccination' && !form.flock_id) {
      setError('Choose a flock for vaccination.')
      return
    }
    await run(async db => {
      await insertTask(db, farmId, form)
      setForm(empty())
      setTab('Schedule')
    }, 'Task saved.')
  }

  function begin(task, mode) {
    setAction({ i: task, mode })
    setDetails({
      planned_on: task.planned_on,
      confirmed_by: '',
      completed_on: now,
      administrator: '',
      product: '',
      notes: task.notes || '',
    })
  }

  async function apply() {
    const { i, mode } = action
    let patch

    if (mode === 'confirm') {
      if (!details.confirmed_by.trim() || !details.planned_on) {
        setError('Enter veterinary professional and confirmed date.')
        return
      }
      patch = {
        status: 'planned',
        confirmed_by: details.confirmed_by,
        confirmed_at: new Date().toISOString(),
        planned_on: details.planned_on,
        notes: details.notes,
      }
    } else if (mode === 'complete') {
      if (
        !details.administrator.trim() ||
        !details.completed_on ||
        details.completed_on > now ||
        (i.kind === 'vaccination' && !details.product.trim())
      ) {
        setError('Enter actual date, administrator and vaccine product where applicable.')
        return
      }
      patch = {
        status: 'completed',
        completed_on: details.completed_on,
        administrator: details.administrator,
        product: details.product,
        notes: details.notes,
      }
    } else {
      patch = { status: 'cancelled', notes: details.notes }
    }

    await run(async db => {
      await updateTask(db, farmId, i, patch)
      setAction(null)
    }, 'Task updated.')
  }

  function clearOnFilterChange() {
    setPurpose('')
    setAction(null)
  }

  return (
    <>
      <PlannerCallouts error={error} notice={notice} />

      <PlannerSummary
        loading={loading}
        upcoming={upcoming.length}
        completed={completed.length}
        overdue={overdue.length}
      />

      <PlannerTabs
        tab={tab}
        setTab={t => { setTab(t); setAction(null) }}
        flocks={flocks}
        filter={filter}
        setFilter={setFilter}
        onFilterChange={clearOnFilterChange}
      />

      {tab === 'Reference' && <ReferencePanel />}

      {tab === 'Add task' && (
        <AddTaskPanel
          flocks={flocks}
          form={form}
          set={set}
          busy={busy}
          loading={loading}
          onSave={save}
        />
      )}

      {(tab === 'Schedule' || tab === 'History') && (
        <>
          {tab === 'Schedule' && (
            <AutoSchedulePanel
              flock={flock}
              category={category}
              hatch={hatch}
              purpose={purpose}
              setPurpose={setPurpose}
              milestones={milestones}
              busy={busy}
              loading={loading}
              onGenerate={generate}
            />
          )}

          <TaskListPanel
            tab={tab}
            month={month}
            setMonth={setMonth}
            loading={loading}
            visible={visible}
            now={now}
            busy={busy}
            flocks={flocks}
            onConfirm={task => begin(task, 'confirm')}
            onComplete={task => begin(task, 'complete')}
            onCancel={task => begin(task, 'cancel')}
          />
        </>
      )}

      {action && (
        <ActionPanel
          action={action}
          details={details}
          detail={detail}
          busy={busy}
          loading={loading}
          onBack={() => setAction(null)}
          onApply={apply}
        />
      )}
    </>
  )
}
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CircleAlert, Download, HeartPulse, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeading, OpsFilters, OpsPanel, Status, SuccessNote } from '../shared/operations-ui'

const RECORD_LIMIT = 1000
const TABLES = ['flocks', 'batches', 'houses', 'pens', 'flock_placements', 'health_observations']

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const initial = () => ({
  observed_on: today(),
  flock_id: '',
  pen_id: '',
  affected_count: '0',
  deaths_count: '0',
  symptoms: '',
  consultation_status: 'not_consulted',
  follow_up_on: '',
  follow_up_status: 'open',
  treatment_notes: '',
  notes: '',
})

const fieldStyle = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid var(--border, #d9e2dc)',
  borderRadius: 9,
  background: 'var(--surface, #fff)',
  color: 'inherit',
  font: 'inherit',
}

const num = x => Number(x || 0)
const fmt = x => Number(x || 0).toLocaleString('en-UG')

const dateDisplay = d =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const csvEscape = x => `"${String(x ?? '').replaceAll('"', '""')}"`

const cutoffDate = days => {
  const d = new Date(`${today()}T12:00:00`)
  d.setDate(d.getDate() - days + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function InputField({ label, children, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
      <span>{label}</span>
      {children}
      {hint && <small style={{ fontWeight: 400, opacity: 0.7 }}>{hint}</small>}
    </label>
  )
}

function validate(form, activeFarmId, penPopulation) {
  if (!activeFarmId) return 'Select a farm.'
  if (!form.flock_id || !form.pen_id) return 'Select a flock and occupied pen.'
  if (!form.observed_on || form.observed_on > today()) return 'Choose today or an earlier observation date.'

  const a = Number(form.affected_count)
  const d = Number(form.deaths_count)
  if (!Number.isInteger(a) || !Number.isInteger(d) || a < 0 || d < 0 || d > a) {
    return 'Enter whole-number counts. Deaths must not exceed affected birds.'
  }
  if (a > penPopulation) return 'Affected birds exceed the selected pen population.'
  if (a === 0 && !form.symptoms.trim()) return 'Describe symptoms or enter affected birds.'
  return ''
}

async function fetchHealthData(farmId) {
  const db = createClient()
  const results = await Promise.all([
    db.from('flocks').select('id,name,batch_id,current_count,archived_at').eq('farm_id', farmId),
    db.from('batches').select('id,batch_number,category,breed').eq('farm_id', farmId),
    db.from('houses').select('id,name').eq('farm_id', farmId),
    db.from('pens').select('id,name,house_id').eq('farm_id', farmId),
    db.from('flock_placements').select('flock_id,pen_id,bird_count').eq('farm_id', farmId),
    db.from('health_observations').select('*').eq('farm_id', farmId).order('observed_on', { ascending: false }).order('created_at', { ascending: false }).limit(RECORD_LIMIT),
  ])

  const warnings = results.flatMap((r, i) => r.error ? [`${TABLES[i]}: ${r.error.message}`] : [])

  const [fs, bs, hs, ps, pls, rs] = results.map(r => r.data || [])
  const batchMap = new Map(bs.map(b => [b.id, b]))

  return {
    flocks: fs.map(f => ({ ...f, batch: batchMap.get(f.batch_id) })),
    houses: hs,
    pens: ps,
    placements: pls,
    records: rs,
    warnings,
  }
}

async function saveObservation(farmId, form, editingId) {
  const { error } = await createClient().rpc('bw_save_health_observation', {
    p_farm_id: farmId,
    p_record_id: editingId || null,
    p_data: form,
  })
  if (error) throw error
}

async function deleteObservation(farmId, recordId) {
  const { error } = await createClient().rpc('bw_delete_health_observation', {
    p_farm_id: farmId,
    p_record_id: recordId,
  })
  if (error) throw error
}

function useFarmSelection({ farmId, farm, farms }) {
  const [discovered, setDiscovered] = useState([])
  const [localFarm, setLocalFarm] = useState('')
  const [lookupError, setLookupError] = useState('')

  const options = useMemo(
    () => [...new Map(
      [...(Array.isArray(farms) ? farms : []), ...discovered, ...(farm?.id ? [farm] : [])]
        .filter(f => f?.id)
        .map(f => [f.id, f])
    ).values()],
    [farms, discovered, farm]
  )

  const activeFarmId = localFarm || farmId || ''
  const selectedFarm = options.find(f => f.id === activeFarmId)

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data, error } = await createClient().from('farms').select('id,name').order('name')
      if (!live) return
      if (error) setLookupError(error.message)
      else { setDiscovered(data || []); setLookupError('') }
    })()
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (options.length && !options.some(f => f.id === activeFarmId)) {
      setLocalFarm(farmId && options.some(f => f.id === farmId) ? farmId : options[0].id)
    }
  }, [options, activeFarmId, farmId])

  return { options, activeFarmId, selectedFarm, setLocalFarm, lookupError }
}

function useHealthData(farmId) {
  const [flocks, setFlocks] = useState([])
  const [houses, setHouses] = useState([])
  const [pens, setPens] = useState([])
  const [placements, setPlacements] = useState([])
  const [records, setRecords] = useState([])
  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  const refresh = useCallback(async () => {
    if (!farmId) {
      setRecords([]); setFlocks([]); setPens([]); setPlacements([])
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await fetchHealthData(farmId)
      setFlocks(data.flocks)
      setHouses(data.houses)
      setPens(data.pens)
      setPlacements(data.placements)
      setRecords(data.records)
      setWarnings(data.warnings)
    } catch (e) {
      setError(e.message || 'Unable to load health register')
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => { void refresh() }, [refresh, reload])

  return {
    flocks, houses, pens, placements, records,
    warnings, loading, error, setError,
    refresh: () => setReload(v => v + 1),
  }
}

function useHealthForm(farmId) {
  const [form, setForm] = useState(initial)
  const [editingId, setEditingId] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }))

  useEffect(() => {
    setForm(initial())
    setEditingId(null)
    setNotice('')
  }, [farmId])

  return {
    form, setForm, set, editingId, setEditingId,
    expanded, setExpanded, busy, setBusy, notice, setNotice,
  }
}

function HealthFilters({
  options, activeFarmId, onChooseFarm,
  flocks, names, flockFilter, setFlockFilter,
  period, setPeriod,
  tab, setTab, visibleCount, editingId,
}) {
  return (
    <OpsFilters>
      <InputField label="Farm">
        <select style={{ ...fieldStyle, minWidth: 190 }} value={activeFarmId} onChange={e => onChooseFarm(e.target.value)}>
          <option value="">Select farm</option>
          {options.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </InputField>

      <InputField label="Flock">
        <select style={{ ...fieldStyle, minWidth: 180 }} value={flockFilter} onChange={e => setFlockFilter(e.target.value)}>
          <option value="">All active flocks</option>
          {flocks.map(f => <option key={f.id} value={f.id}>{names.get(f.id)}</option>)}
        </select>
      </InputField>

      <InputField label="Period">
        <select style={fieldStyle} value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All loaded</option>
        </select>
      </InputField>

      <span className="ops-filter-spacer" />

      <button type="button" className={`ops-tab ${tab === 'Observations' ? 'selected' : ''}`} onClick={() => setTab('Observations')}>
        Observations <span>{visibleCount}</span>
      </button>
      <button type="button" className={`ops-tab ${tab === 'New observation' ? 'selected' : ''}`} onClick={() => setTab('New observation')}>
        {editingId ? 'Edit observation' : 'New observation'}
      </button>
    </OpsFilters>
  )
}

function HealthCallouts({ lookupError, warnings, error, notice }) {
  return (
    <>
      {lookupError && <div className="ops-callout" role="alert">Farm lookup: {lookupError}</div>}
      {warnings.length > 0 && (
        <div className="ops-callout" role="alert">
          <CircleAlert size={16} />
          <div>
            <strong>Database setup needs attention</strong>
            {warnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        </div>
      )}
      {error && <div className="ops-callout" role="alert"><CircleAlert size={16} /><p>{error}</p></div>}
      {notice && <SuccessNote>{notice}</SuccessNote>}
    </>
  )
}

function HealthSummary({ visibleCount, openCount, deaths }) {
  return (
    <div className="health-summary">
      <div><span>Recorded observations</span><strong>{fmt(visibleCount)}</strong><small>Selected period and flock</small></div>
      <div><span>Follow-ups to review</span><strong>{fmt(openCount)}</strong><small>Not yet resolved</small></div>
      <div><span>Mortality recorded</span><strong>{fmt(deaths)} birds</strong><small>Observational; not deducted from flock</small></div>
    </div>
  )
}

function ObservationTable({ visible, loading, names, penNames, deleting, onEdit, onDelete, search, setSearch, onExport }) {
  return (
    <OpsPanel
      title="Health observation register"
      action={
        <button type="button" className="quiet-action" onClick={onExport} disabled={!visible.length}>
          <Download size={15} /> Export CSV
        </button>
      }
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <Search size={16} />
        <input
          style={fieldStyle}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search symptoms, flock, pen or notes"
          aria-label="Search health observations"
        />
      </div>

      {loading ? (
        <p>Loading health records…</p>
      ) : !visible.length ? (
        <p className="subtle">No observations found. Choose a different period or record your first observation.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr>
                {['DATE', 'FLOCK · PEN', 'OBSERVATION', 'AFFECTED', 'DEATHS', 'FOLLOW-UP', 'ACTIONS'].map(h => (
                  <th key={h} style={{ padding: 10, borderBottom: '1px solid #d9e2dc', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf0ec', whiteSpace: 'nowrap' }}>{dateDisplay(r.observed_on)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf0ec' }}>
                    <strong>{names.get(r.flock_id) || 'Archived flock'}</strong>
                    <div style={{ opacity: 0.7 }}>{penNames.get(r.pen_id) || 'Unknown pen'}</div>
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf0ec', maxWidth: 260 }}>{r.symptoms || 'No symptom description'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf0ec' }}>{fmt(r.affected_count)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf0ec' }}>{fmt(r.deaths_count)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf0ec' }}>
                    <Status tone={r.follow_up_status === 'resolved' ? 'sage' : 'gold'}>
                      {r.follow_up_status === 'resolved' ? 'Resolved' : 'Open'}
                    </Status>
                    <div style={{ opacity: 0.7 }}>{dateDisplay(r.follow_up_on)}</div>
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #edf0ec', whiteSpace: 'nowrap' }}>
                    <button type="button" className="quiet-action" onClick={() => onEdit(r)}><Pencil size={14} /> Edit</button>
                    <button type="button" className="quiet-action" disabled={deleting === r.id} onClick={() => void onDelete(r)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="chart-caption">
        Showing up to {RECORD_LIMIT.toLocaleString('en-UG')} latest observations. Deaths entered here are observational and must be reconciled with the authoritative daily mortality register to avoid double-counting.
      </p>
    </OpsPanel>
  )
}

function ObservationForm({
  editingId, form, set, setForm, flocks, penOptions, names, penNames, penPopulation,
  expanded, setExpanded, busy, loading, activeFarmId, onSave, onCancelEdit,
}) {
  return (
    <OpsPanel title={editingId ? 'Edit health observation' : 'Record a health observation'}>
      <div className="ops-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        <InputField label="Observation date">
          <input style={fieldStyle} type="date" max={today()} value={form.observed_on} onChange={e => set('observed_on', e.target.value)} />
        </InputField>

        <InputField label="Flock or batch">
          <select style={fieldStyle} value={form.flock_id} onChange={e => setForm(p => ({ ...p, flock_id: e.target.value, pen_id: '' }))}>
            <option value="">Select flock</option>
            {flocks.filter(f => !f.archived_at || f.id === form.flock_id).map(f => (
              <option key={f.id} value={f.id}>{names.get(f.id)}</option>
            ))}
          </select>
        </InputField>

        <InputField label="House and pen">
          <select style={fieldStyle} value={form.pen_id} onChange={e => set('pen_id', e.target.value)}>
            <option value="">Select occupied pen</option>
            {penOptions.map(p => <option key={p.id} value={p.id}>{penNames.get(p.id)}</option>)}
          </select>
        </InputField>

        <InputField
          label="Birds affected"
          hint={penPopulation ? `${fmt(penPopulation)} birds currently placed in this pen` : undefined}
        >
          <input style={fieldStyle} type="number" min="0" max={penPopulation || undefined} step="1" value={form.affected_count} onChange={e => set('affected_count', e.target.value)} />
        </InputField>

        <InputField label="Bird deaths observed" hint="Observational only; does not change flock count">
          <input style={fieldStyle} type="number" min="0" step="1" value={form.deaths_count} onChange={e => set('deaths_count', e.target.value)} />
        </InputField>

        <InputField label="Symptoms or changes observed">
          <textarea style={fieldStyle} rows={3} value={form.symptoms} onChange={e => set('symptoms', e.target.value)} placeholder="What did you observe?" />
        </InputField>
      </div>

      <button type="button" className="optional-toggle" style={{ margin: '16px 0' }} onClick={() => setExpanded(x => !x)}>
        {expanded ? '− Hide' : '+ Add'} consultation and follow-up details <span>Optional</span>
      </button>

      {expanded && (
        <div className="ops-form-grid optional-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          <InputField label="Veterinary consultation">
            <select style={fieldStyle} value={form.consultation_status} onChange={e => set('consultation_status', e.target.value)}>
              <option value="not_consulted">Not yet consulted</option>
              <option value="requested">Consultation requested</option>
              <option value="consulted">Consulted</option>
            </select>
          </InputField>

          <InputField label="Follow-up date">
            <input style={fieldStyle} type="date" value={form.follow_up_on} onChange={e => set('follow_up_on', e.target.value)} />
          </InputField>

          <InputField label="Follow-up status">
            <select style={fieldStyle} value={form.follow_up_status} onChange={e => set('follow_up_status', e.target.value)}>
              <option value="open">Open / needs review</option>
              <option value="resolved">Resolved</option>
            </select>
          </InputField>

          <InputField label="Veterinary advice or treatment notes">
            <textarea style={fieldStyle} rows={3} value={form.treatment_notes} onChange={e => set('treatment_notes', e.target.value)} placeholder="Record advice received; do not prescribe" />
          </InputField>

          <InputField label="Additional notes">
            <textarea style={fieldStyle} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Follow-up actions or context" />
          </InputField>
        </div>
      )}

      <div className="ops-form-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
        <span>Saved securely to Supabase · no demonstration data</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {editingId && (
            <button type="button" className="quiet-action" onClick={onCancelEdit}>Cancel edit</button>
          )}
          <button type="button" className="button-primary" disabled={busy || loading || !activeFarmId} onClick={() => void onSave()}>
            <Check size={15} />
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Save observation'}
          </button>
        </div>
      </div>
    </OpsPanel>
  )
}

export function HealthRegister({ farmId, farm, farms = [], onFarmChange }) {
  const selection = useFarmSelection({ farmId, farm, farms })
  const data = useHealthData(selection.activeFarmId)
  const healthForm = useHealthForm(selection.activeFarmId)

  const { activeFarmId, selectedFarm } = selection
  const { form, setForm, set, editingId, setEditingId, expanded, setExpanded, busy, setBusy, notice, setNotice } = healthForm

  const [tab, setTab] = useState('Observations')
  const [flockFilter, setFlockFilter] = useState('')
  const [period, setPeriod] = useState('30')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState('')

  useEffect(() => {
    setTab('Observations')
    setFlockFilter('')
    setSearch('')
    setNotice('')
    data.setError('')
  }, [activeFarmId])

  const names = useMemo(
    () => new Map(data.flocks.map(f => [f.id, `${f.batch?.batch_number || f.name} · ${f.batch?.category || 'Poultry'}`])),
    [data.flocks]
  )

  const houseNames = useMemo(() => new Map(data.houses.map(h => [h.id, h.name])), [data.houses])

  const penNames = useMemo(
    () => new Map(data.pens.map(p => [p.id, `${houseNames.get(p.house_id) || 'House'} · ${p.name}`])),
    [data.pens, houseNames]
  )

  const penOptions = useMemo(
    () => data.pens.filter(p =>
      data.placements.some(pl => pl.flock_id === form.flock_id && pl.pen_id === p.id && num(pl.bird_count) > 0) ||
      (editingId && p.id === form.pen_id)
    ),
    [data.pens, data.placements, form.flock_id, form.pen_id, editingId]
  )

  const penPopulation = data.placements
    .filter(p => p.flock_id === form.flock_id && p.pen_id === form.pen_id)
    .reduce((s, p) => s + num(p.bird_count), 0)

  const visible = useMemo(
    () => data.records.filter(r => {
      if (flockFilter && r.flock_id !== flockFilter) return false
      if (period !== 'all' && r.observed_on < cutoffDate(Number(period))) return false
      const hay = [r.observed_on, names.get(r.flock_id), penNames.get(r.pen_id), r.symptoms, r.notes, r.treatment_notes]
        .join(' ').toLowerCase()
      return hay.includes(search.trim().toLowerCase())
    }),
    [data.records, flockFilter, period, search, names, penNames]
  )

  const open = visible.filter(r => r.follow_up_status !== 'resolved')
  const deaths = visible.reduce((s, r) => s + num(r.deaths_count), 0)

  function chooseFarm(id) {
    selection.setLocalFarm(id)
    onFarmChange?.(id)
  }

  async function save() {
    const problem = validate(form, activeFarmId, penPopulation)
    if (problem) {
      data.setError(problem)
      return
    }

    setBusy(true)
    data.setError('')
    setNotice('')

    try {
      await saveObservation(activeFarmId, form, editingId)
      setNotice(editingId ? 'Observation updated.' : 'Observation saved.')
      setForm(initial())
      setEditingId(null)
      setTab('Observations')
      data.refresh()
    } catch (e) {
      data.setError(`${e.message || 'Could not save'}${e.code ? ` (${e.code})` : ''}`)
    } finally {
      setBusy(false)
    }
  }

  function edit(r) {
    setForm({
      observed_on: r.observed_on,
      flock_id: r.flock_id,
      pen_id: r.pen_id,
      affected_count: String(r.affected_count),
      deaths_count: String(r.deaths_count),
      symptoms: r.symptoms || '',
      consultation_status: r.consultation_status || 'not_consulted',
      follow_up_on: r.follow_up_on || '',
      follow_up_status: r.follow_up_status || 'open',
      treatment_notes: r.treatment_notes || '',
      notes: r.notes || '',
    })
    setEditingId(r.id)
    setExpanded(true)
    data.setError('')
    setTab('New observation')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(initial())
    setTab('Observations')
  }

  async function remove(r) {
    if (!window.confirm(`Delete observation dated ${dateDisplay(r.observed_on)}? This cannot be undone.`)) return
    setDeleting(r.id)
    data.setError('')
    try {
      await deleteObservation(activeFarmId, r.id)
      setNotice('Observation deleted.')
      data.refresh()
    } catch (e) {
      data.setError(e.message)
    } finally {
      setDeleting('')
    }
  }

  function exportCsv() {
    const cols = ['Date', 'Flock', 'Pen', 'Affected', 'Deaths (observational)', 'Symptoms', 'Consultation', 'Follow-up date', 'Follow-up status', 'Treatment notes', 'Notes']
    const rows = visible.map(r => [
      r.observed_on,
      names.get(r.flock_id),
      penNames.get(r.pen_id),
      r.affected_count,
      r.deaths_count,
      r.symptoms,
      r.consultation_status,
      r.follow_up_on,
      r.follow_up_status,
      r.treatment_notes,
      r.notes,
    ])
    const csv = [cols, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'broodwatch-health-observations.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function startNew() {
    setEditingId(null)
    setForm(initial())
    data.setError('')
    setTab('New observation')
  }

  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK HEALTH"
        title="Mortality & health"
        description={`Track observations, veterinary consultations and follow-ups${selectedFarm?.name ? ` at ${selectedFarm.name}` : ''}.`}
        action={{ label: 'Add observation', icon: Plus, onClick: startNew }}
      />

      <div className="ops-callout health">
        <HeartPulse size={18} />
        <p>
          <strong>Observe and record—don't self-diagnose.</strong> Seek veterinary advice for illness, sudden deaths or unusual flock behavior.
        </p>
      </div>

      <HealthFilters
        options={selection.options}
        activeFarmId={activeFarmId}
        onChooseFarm={chooseFarm}
        flocks={data.flocks}
        names={names}
        flockFilter={flockFilter}
        setFlockFilter={setFlockFilter}
        period={period}
        setPeriod={setPeriod}
        tab={tab}
        setTab={setTab}
        visibleCount={visible.length}
        editingId={editingId}
      />

      <HealthCallouts
        lookupError={selection.lookupError}
        warnings={data.warnings}
        error={data.error}
        notice={notice}
      />

      {tab === 'Observations' ? (
        <>
          <HealthSummary
            visibleCount={visible.length}
            openCount={open.length}
            deaths={deaths}
          />
          <ObservationTable
            visible={visible}
            loading={data.loading}
            names={names}
            penNames={penNames}
            deleting={deleting}
            onEdit={edit}
            onDelete={remove}
            search={search}
            setSearch={setSearch}
            onExport={exportCsv}
          />
        </>
      ) : (
        <ObservationForm
          editingId={editingId}
          form={form}
          set={set}
          setForm={setForm}
          flocks={data.flocks}
          penOptions={penOptions}
          names={names}
          penNames={penNames}
          penPopulation={penPopulation}
          expanded={expanded}
          setExpanded={setExpanded}
          busy={busy}
          loading={data.loading}
          activeFarmId={activeFarmId}
          onSave={save}
          onCancelEdit={cancelEdit}
        />
      )}
    </div>
  )
}
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Check, CircleAlert, Clock3, Download, Egg, Plus, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ScreenHeader, Panel, Metric } from '../shared/intelligence-ui'

const RECORD_LIMIT = 1000
const TABLES = ['flocks', 'batches', 'pens', 'houses', 'flock_placements', 'egg_collections']
const LAYER_CATEGORY_PATTERN = /layer|pullet|hen|lohmann|isa brown/i

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isoMinus = days => {
  const d = new Date(`${today()}T12:00:00`)
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fresh = () => ({
  flock_id: '',
  pen_id: '',
  collection_date: today(),
  eggs_collected: '',
  damaged_eggs: '0',
  birds_observed: '',
  notes: '',
})

const fmt = v => Number(v || 0).toLocaleString('en-UG', { maximumFractionDigits: 1 })

const control = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid #d9e2dc',
  borderRadius: 9,
  background: 'var(--surface, white)',
  color: 'inherit',
}

const total = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0)

const integerKeys = ['eggs_collected', 'damaged_eggs', 'birds_observed']

function InputField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
      {label}
      {children}
    </label>
  )
}

function validate(form, selectedFarmId, birdCount) {
  if (!selectedFarmId) return 'Select a farm first.'
  if (!form.flock_id || !form.pen_id) return 'Select a layer flock and an occupied pen.'
  if (!form.collection_date || form.collection_date > today()) return 'Choose today or an earlier date.'
  if (form.eggs_collected === '' || form.birds_observed === '') return 'Enter eggs collected and birds observed.'

  for (const key of integerKeys) {
    if (!/^\d+$/.test(String(form[key]))) return 'Egg and bird counts must be whole non-negative numbers.'
  }

  if (Number(form.birds_observed) < 1 || Number(form.birds_observed) > birdCount) {
    return 'Birds observed must be between 1 and the current occupied pen count.'
  }
  if (Number(form.damaged_eggs) > Number(form.eggs_collected)) {
    return 'Damaged eggs cannot exceed eggs collected.'
  }
  return ''
}

async function fetchEggData(farmId) {
  const db = createClient()
  const results = await Promise.all([
    db.from('flocks').select('id,name,batch_id,current_count,archived_at').eq('farm_id', farmId),
    db.from('batches').select('id,batch_number,category,breed').eq('farm_id', farmId),
    db.from('pens').select('id,name,house_id').eq('farm_id', farmId),
    db.from('houses').select('id,name').eq('farm_id', farmId),
    db.from('flock_placements').select('flock_id,pen_id,bird_count').eq('farm_id', farmId),
    db.from('egg_collections').select('*').eq('farm_id', farmId).order('collection_date', { ascending: false }).order('created_at', { ascending: false }).limit(RECORD_LIMIT),
  ])

  const warnings = results.flatMap((r, i) =>
    r.error ? [`${TABLES[i]}: ${r.error.message} (${r.error.code || 'unknown'})`] : []
  )

  const [fs, bs, ps, hs, pls, rs] = results.map(r => r.data || [])
  const batchMap = new Map(bs.map(b => [b.id, b]))
  const flocks = fs.filter(f => !f.archived_at).map(f => ({ ...f, batch: batchMap.get(f.batch_id) }))

  return {
    flocks,
    pens: ps,
    houses: hs,
    placements: pls,
    records: rs,
    warnings,
    recordsError: results[5].error,
  }
}

async function saveEggCollection(farmId, form, editingId) {
  const { error } = await createClient().rpc('bw_save_egg_collection', {
    p_farm_id: farmId,
    p_record_id: editingId || null,
    p_data: form,
  })
  if (error) throw error
}

async function deleteEggCollection(farmId, recordId) {
  const { error } = await createClient().rpc('bw_delete_egg_collection', {
    p_farm_id: farmId,
    p_record_id: recordId,
  })
  if (error) throw error
}

function useFarmSelection({ farmId, farm, farms }) {
  const [availableFarms, setAvailableFarms] = useState([])
  const [localFarmId, setLocalFarmId] = useState('')
  const [warnings, setWarnings] = useState([])

  const farmOptions = useMemo(
    () => [...new Map(
      [...(Array.isArray(farms) ? farms : []), ...availableFarms, ...(farm?.id ? [farm] : [])]
        .filter(f => f?.id)
        .map(f => [f.id, f])
    ).values()],
    [farms, availableFarms, farm]
  )

  const selectedFarmId = localFarmId || farmId || farm?.id || ''
  const activeFarm = farmOptions.find(f => f.id === selectedFarmId)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await createClient().from('farms').select('id,name').order('name')
      if (!alive) return
      if (error) setWarnings(p => [...p, `Farm discovery: ${error.message}`])
      else setAvailableFarms(data || [])
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (farmId && !localFarmId) setLocalFarmId(farmId)
    else if (!selectedFarmId && farmOptions.length) setLocalFarmId(farmOptions[0].id)
  }, [farmId, localFarmId, selectedFarmId, farmOptions])

  return { farmOptions, selectedFarmId, activeFarm, setLocalFarmId, warnings }
}

function useEggData(farmId) {
  const [flocks, setFlocks] = useState([])
  const [pens, setPens] = useState([])
  const [houses, setHouses] = useState([])
  const [placements, setPlacements] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState([])
  const [reload, setReload] = useState(0)

  const load = useCallback(async () => {
    if (!farmId) {
      setFlocks([]); setPens([]); setHouses([]); setPlacements([]); setRecords([])
      return
    }

    setLoading(true)
    setError('')
    setWarnings([])

    try {
      const data = await fetchEggData(farmId)
      setFlocks(data.flocks)
      setPens(data.pens)
      setHouses(data.houses)
      setPlacements(data.placements)
      setRecords(data.records)
      setWarnings(data.warnings)
      if (data.recordsError) {
        setError('Egg collection database unavailable. Run the egg production SQL migration and check RLS permissions.')
      }
    } catch (e) {
      setError(e.message || 'Could not load egg production records')
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => { void load() }, [load, reload])

  return {
    flocks, pens, houses, placements, records,
    loading, error, setError, warnings, refresh: () => setReload(v => v + 1),
  }
}

function useEggForm(farmId) {
  const [form, setForm] = useState(fresh)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }))

  useEffect(() => {
    setForm(fresh())
    setEditingId(null)
    setNotice('')
  }, [farmId])

  return { form, setForm, set, editingId, setEditingId, saving, setSaving, notice, setNotice }
}

function FarmSelector({ farmOptions, selectedFarmId, onChange, onRefresh }) {
  return (
    <div className="ops-callout" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Egg size={18} />
      <strong>Active farm</strong>
      <select
        aria-label="Select farm"
        style={{ ...control, maxWidth: 360 }}
        value={selectedFarmId}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select farm</option>
        {farmOptions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <button type="button" className="quiet-action" onClick={onRefresh}>
        <RefreshCw size={14} /> Refresh
      </button>
    </div>
  )
}

function StatusCallouts({ error, warnings, notice }) {
  return (
    <>
      {error && <div className="ops-callout" role="alert"><CircleAlert size={17} />{error}</div>}
      {warnings.length > 0 && (
        <details className="ops-callout">
          <summary>Database diagnostics ({warnings.length})</summary>
          {warnings.map((w, i) => <p key={i}>{w}</p>)}
        </details>
      )}
      {notice && <div className="ops-success" role="status"><Check size={16} />{notice}</div>}
    </>
  )
}

function EggMetrics({ eggsToday, usableToday, damagedToday, layingRate, activeBirds, recentCount, period }) {
  return (
    <div className="analytics-metrics">
      <Metric label="Eggs collected today" value={fmt(eggsToday)} detail="Recorded today" icon={Egg} tone="gold" />
      <Metric label="Usable eggs today" value={fmt(usableToday)} detail="Collected minus damaged" icon={Check} tone="sage" />
      <Metric label="Damaged eggs today" value={fmt(damagedToday)} detail="Reported today" icon={CircleAlert} tone="rose" />
      <Metric label="Hen-day production" value={layingRate === null ? '—' : `${fmt(layingRate)}%`} detail="Eggs ÷ birds observed today" icon={Activity} />
      <Metric label="Active layer birds" value={fmt(activeBirds)} detail="Current occupied placements" icon={Activity} tone="sage" />
      <Metric label="Recent entries" value={fmt(recentCount)} detail={`Last ${period} days · loaded records`} icon={Clock3} />
    </div>
  )
}

function CollectionHistory({ filtered, loading, period, setPeriod, search, setSearch, onExport, flockNames, penNames, onEdit, onDelete, deletingId }) {
  return (
    <Panel
      title="Recent egg collection"
      action={
        <select aria-label="History period" style={control} value={period} onChange={e => setPeriod(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      }
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          aria-label="Search collections"
          style={{ ...control, maxWidth: 380 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search date, flock, pen or notes"
        />
        <button type="button" className="quiet-action" disabled={!filtered.length} onClick={onExport}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr>
              {['DATE', 'FLOCK / LOCATION', 'COLLECTED', 'DAMAGED', 'USABLE', 'BIRDS', 'HEN-DAY %', 'ACTIONS'].map(x => (
                <th key={x} style={{ padding: 10, borderBottom: '1px solid #d9e2dc', whiteSpace: 'nowrap' }}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                {[
                  r.collection_date,
                  `${flockNames.get(r.flock_id) || 'Flock'} · ${penNames.get(r.pen_id) || 'Pen'}`,
                  fmt(r.eggs_collected),
                  fmt(r.damaged_eggs),
                  fmt(r.eggs_collected - r.damaged_eggs),
                  fmt(r.birds_observed),
                  `${fmt((r.eggs_collected / r.birds_observed) * 100)}%`,
                ].map((x, i) => (
                  <td key={i} style={{ padding: 10, borderBottom: '1px solid #edf0ec' }}>{x}</td>
                ))}
                <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                  <button type="button" className="quiet-action" onClick={() => onEdit(r)}>Edit</button>
                  <button type="button" className="quiet-action" disabled={deletingId === r.id} onClick={() => void onDelete(r)}>
                    {deletingId === r.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? (
        <p className="chart-caption">Loading egg collections…</p>
      ) : !filtered.length ? (
        <p className="chart-caption">No egg collections for this period. Record your first collection below.</p>
      ) : null}

      <p className="chart-caption">
        Hen-day production is eggs collected divided by birds observed, multiplied by 100. This is an operational indicator, not a MAAIF benchmark. Records are limited to the most recent {RECORD_LIMIT.toLocaleString('en-UG')} entries.
      </p>
    </Panel>
  )
}

function CollectionForm({
  editingId, form, set, setForm, layerFlocks, occupiedPens, flockNames, penNames,
  placements, birdCount, saving, loading, selectedFarmId, onSave, onCancelEdit,
}) {
  return (
    <div id="egg-entry">
      <Panel title={editingId ? 'Edit daily egg collection' : 'Record daily egg collection'}>
        <div className="intel-form-grid">
          <InputField label="Layer flock">
            <select
              style={control}
              value={form.flock_id}
              onChange={e => setForm(p => ({ ...p, flock_id: e.target.value, pen_id: '', birds_observed: '' }))}
            >
              <option value="">Select layer flock</option>
              {layerFlocks.map(f => <option key={f.id} value={f.id}>{flockNames.get(f.id)}</option>)}
              {editingId && form.flock_id && !layerFlocks.some(f => f.id === form.flock_id) && (
                <option value={form.flock_id}>Previously recorded flock</option>
              )}
            </select>
          </InputField>

          <InputField label="House and pen">
            <select
              style={control}
              value={form.pen_id}
              onChange={e => {
                const birds = placements
                  .filter(p => p.flock_id === form.flock_id && p.pen_id === e.target.value)
                  .reduce((s, p) => s + Number(p.bird_count || 0), 0)
                setForm(p => ({ ...p, pen_id: e.target.value, birds_observed: birds ? String(birds) : '' }))
              }}
            >
              <option value="">Select occupied pen</option>
              {occupiedPens.map(p => <option key={p.id} value={p.id}>{penNames.get(p.id)}</option>)}
            </select>
          </InputField>

          <InputField label="Collection date">
            <input style={control} type="date" max={today()} value={form.collection_date} onChange={e => set('collection_date', e.target.value)} />
          </InputField>

          <InputField label="Eggs collected (total)">
            <input style={control} type="number" min="0" step="1" value={form.eggs_collected} onChange={e => set('eggs_collected', e.target.value)} placeholder="e.g. 104" />
          </InputField>

          <InputField label="Damaged eggs (included in total)">
            <input style={control} type="number" min="0" step="1" value={form.damaged_eggs} onChange={e => set('damaged_eggs', e.target.value)} />
          </InputField>

          <InputField label="Birds observed">
            <input style={control} type="number" min="1" step="1" value={form.birds_observed} onChange={e => set('birds_observed', e.target.value)} placeholder={birdCount ? String(birdCount) : 'Birds in pen'} />
          </InputField>

          <InputField label="Collection notes">
            <textarea style={control} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Egg quality, collection conditions, remarks…" />
          </InputField>
        </div>

        <p className="chart-caption">
          Current pen population: {fmt(birdCount)} · Usable eggs: {fmt(Math.max(0, Number(form.eggs_collected || 0) - Number(form.damaged_eggs || 0)))} · Hen-day rate: {Number(form.birds_observed) > 0 ? `${fmt((Number(form.eggs_collected || 0) / Number(form.birds_observed)) * 100)}%` : '—'}. One daily record per flock and pen; edit it to correct totals.
        </p>

        <div className="intel-form-footer">
          <span>Saved to Supabase · actual farm data</span>
          <button type="button" className="button-primary" disabled={saving || loading || !selectedFarmId} onClick={() => void onSave()}>
            <Check size={15} />
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save collection'}
          </button>
          {editingId && (
            <button type="button" className="quiet-action" onClick={onCancelEdit}>Cancel edit</button>
          )}
        </div>
      </Panel>
    </div>
  )
}

export function EggProduction({ farmId, farm, farms = [], onFarmChange }) {
  const selection = useFarmSelection({ farmId, farm, farms })
  const data = useEggData(selection.selectedFarmId)
  const eggForm = useEggForm(selection.selectedFarmId)

  const { form, setForm, set, editingId, setEditingId, saving, setSaving, notice, setNotice } = eggForm
  const { selectedFarmId, activeFarm } = selection

  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState(7)

  useEffect(() => { setSearch(''); setError('') }, [selectedFarmId])

  const layerFlocks = useMemo(
    () => data.flocks.filter(f => LAYER_CATEGORY_PATTERN.test([f.batch?.category, f.batch?.breed].join(' '))),
    [data.flocks]
  )

  const occupiedPens = useMemo(
    () => data.pens.filter(p =>
      data.placements.some(x => x.flock_id === form.flock_id && x.pen_id === p.id && Number(x.bird_count) > 0) ||
      (editingId && form.pen_id === p.id)
    ),
    [data.pens, data.placements, form.flock_id, form.pen_id, editingId]
  )

  const birdCount = data.placements
    .filter(x => x.flock_id === form.flock_id && x.pen_id === form.pen_id)
    .reduce((s, x) => s + Number(x.bird_count || 0), 0)

  const flockNames = useMemo(
    () => new Map(data.flocks.map(f => [f.id, `${f.batch?.batch_number || f.name} · ${f.batch?.category || 'Poultry'}`])),
    [data.flocks]
  )

  const houseNames = useMemo(() => new Map(data.houses.map(h => [h.id, h.name])), [data.houses])

  const penNames = useMemo(
    () => new Map(data.pens.map(p => [p.id, `${houseNames.get(p.house_id) || 'House'} · ${p.name}`])),
    [data.pens, houseNames]
  )

  const daily = useMemo(
    () => data.records.filter(r => r.collection_date === today()),
    [data.records]
  )

  const recent = useMemo(
    () => data.records.filter(r => r.collection_date >= isoMinus(period - 1)),
    [data.records, period]
  )

  const eggsToday = total(daily, 'eggs_collected')
  const damagedToday = total(daily, 'damaged_eggs')
  const usableToday = eggsToday - damagedToday
  const observedToday = total(daily, 'birds_observed')
  const layingRate = observedToday > 0 ? (eggsToday / observedToday) * 100 : null

  const activeBirds = useMemo(
    () => layerFlocks.reduce(
      (sum, f) => sum + data.placements
        .filter(p => p.flock_id === f.id)
        .reduce((s, p) => s + Number(p.bird_count || 0), 0),
      0
    ),
    [layerFlocks, data.placements]
  )

  const filtered = useMemo(
    () => recent.filter(r =>
      [r.collection_date, flockNames.get(r.flock_id), penNames.get(r.pen_id), r.notes]
        .join(' ').toLowerCase()
        .includes(search.toLowerCase().trim())
    ),
    [recent, flockNames, penNames, search]
  )

  async function save() {
    const issue = validate(form, selectedFarmId, birdCount)
    setError('')
    setNotice('')

    if (issue) {
      setError(issue)
      return
    }

    setSaving(true)
    try {
      await saveEggCollection(selectedFarmId, form, editingId)
      setNotice(editingId ? 'Egg collection updated.' : 'Egg collection saved to Supabase.')
      setEditingId(null)
      setForm(fresh())
      data.refresh()
    } catch (e) {
      setError(`${e.message || 'Could not save collection'}${e.code ? ` (${e.code})` : ''}`)
    } finally {
      setSaving(false)
    }
  }

  function edit(r) {
    setEditingId(r.id)
    setForm({
      flock_id: r.flock_id,
      pen_id: r.pen_id,
      collection_date: r.collection_date,
      eggs_collected: String(r.eggs_collected),
      damaged_eggs: String(r.damaged_eggs),
      birds_observed: String(r.birds_observed),
      notes: r.notes || '',
    })
    setNotice('Editing existing collection')
    document.getElementById('egg-entry')?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(fresh())
    setNotice('')
  }

  async function remove(r) {
    if (!window.confirm(`Delete egg collection for ${r.collection_date}?`)) return
    setDeletingId(r.id)
    setError('')
    try {
      await deleteEggCollection(selectedFarmId, r.id)
      setNotice('Collection deleted.')
      if (editingId === r.id) cancelEdit()
      data.refresh()
    } catch (e) {
      setError(e.message || 'Could not delete collection')
    } finally {
      setDeletingId(null)
    }
  }

  function exportCsv() {
    const header = ['Date', 'Flock', 'Pen', 'Eggs collected', 'Damaged eggs', 'Usable eggs', 'Birds observed', 'Hen-day production %', 'Notes']
    const rows = filtered.map(r => [
      r.collection_date,
      flockNames.get(r.flock_id) || r.flock_id,
      penNames.get(r.pen_id) || r.pen_id,
      r.eggs_collected,
      r.damaged_eggs,
      r.eggs_collected - r.damaged_eggs,
      r.birds_observed,
      ((r.eggs_collected / r.birds_observed) * 100).toFixed(1),
      r.notes,
    ])
    const csv = [header, ...rows].map(row => row.map(x => '"' + String(x ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'broodwatch-egg-production.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function changeFarm(id) {
    selection.setLocalFarmId(id)
    onFarmChange?.(id)
  }

  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="FLOCK OPERATIONS"
        title="Egg production"
        description={`Daily egg collection and laying performance${activeFarm?.name ? ` · ${activeFarm.name}` : ''}. All figures are from saved farm records.`}
        action={{
          label: 'Record egg collection',
          icon: Plus,
          onClick: () => document.getElementById('egg-entry')?.scrollIntoView({ behavior: 'smooth' }),
        }}
      />

      <FarmSelector
        farmOptions={selection.farmOptions}
        selectedFarmId={selectedFarmId}
        onChange={changeFarm}
        onRefresh={data.refresh}
      />

      <StatusCallouts
        error={error || data.error}
        warnings={[...selection.warnings, ...data.warnings]}
        notice={notice}
      />

      <EggMetrics
        eggsToday={eggsToday}
        usableToday={usableToday}
        damagedToday={damagedToday}
        layingRate={layingRate}
        activeBirds={activeBirds}
        recentCount={recent.length}
        period={period}
      />

      <CollectionHistory
        filtered={filtered}
        loading={data.loading}
        period={period}
        setPeriod={setPeriod}
        search={search}
        setSearch={setSearch}
        onExport={exportCsv}
        flockNames={flockNames}
        penNames={penNames}
        onEdit={edit}
        onDelete={remove}
        deletingId={deletingId}
      />

      <CollectionForm
        editingId={editingId}
        form={form}
        set={set}
        setForm={setForm}
        layerFlocks={layerFlocks}
        occupiedPens={occupiedPens}
        flockNames={flockNames}
        penNames={penNames}
        placements={data.placements}
        birdCount={birdCount}
        saving={saving}
        loading={data.loading}
        selectedFarmId={selectedFarmId}
        onSave={save}
        onCancelEdit={cancelEdit}
      />
    </div>
  )
}
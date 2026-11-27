'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, CircleAlert, Droplets, Plus, RefreshCw, Wheat, Download, Scale, History, Package, ChevronDown, Search, ArrowUpRight, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeading, OpsPanel } from '../shared/operations-ui'
import { Metric } from '../shared/intelligence-ui'

const Panel = OpsPanel
const ActivityIcon = Scale

const RECORD_LIMIT = 500
const MOVEMENT_LIMIT = 2000
const ALERT_LIMIT = 300

const TABLES = [
  'flocks',
  'batches',
  'houses',
  'pens',
  'flock_placements',
  'feed_water_allocations',
  'feed_inventory_items',
  'feed_inventory_movements',
  'feed_water_alerts',
  'daily_records',
]

const ERROR_HINTS = {
  PGRST202: 'The save RPC is missing or not exposed; run the feed/water SQL migration and reload PostgREST schema.',
  '42P01': 'The allocation table is missing; run the feed/water SQL migration.',
  '42501': 'Check authenticated farm membership and RLS permissions.',
}

const QUANTITY_FIELDS = [
  ['feed_supplied_kg', 'Feed supplied (kg)'],
  ['feed_remaining_kg', 'Feed remaining (kg)'],
  ['water_supplied_l', 'Water supplied (L)'],
  ['water_remaining_l', 'Water remaining (L)'],
]

const HISTORY_COLUMNS = [
  'Date',
  'Flock',
  'Pen',
  'Feed supplied',
  'Feed consumed',
  'Water supplied',
  'Water consumed',
  'MAAIF reference',
  'Assessment',
  'Daily overlap',
  'Notes',
  'Actions',
]

const FEED_FORMS = ['Pellet', 'Mash', 'Crumble', 'Other']

const FEED_REFERENCES = {
  pellet: [23, 54, 80, 127, 135],
  mash: [20, 42.9, 81.4, 125.7, 160, 174.2],
  improved: [15, 29, 47, 78, 104, 122, 144, 150, 162, 178],
  layer: [11, 17, 25, 32, 37, 42, 46, 50, 54, 58, 61, 64, 67, 70, 73, 76, 80, 87, 90],
}

const LAYER_WATER_REFERENCES = [
  [20, 30], [40, 50], [50, 60], [60, 70], [70, 80], [80, 100], [100, 120],
  [120, 130], [130, 140], [150, 160], [160, 165], [165, 170], [170, 175],
  [175, 180], [180, 190], [190, 195], [195, 200], [205, 210], [210, 220],
]

const BROILER_WATER_REFERENCES = [
  [40, 50], [60, 80], [100, 120], [140, 160], [180, 200], [210, 230],
]

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid #d9e2dc',
  borderRadius: 9,
  background: 'var(--surface, white)',
  color: 'inherit',
}

const n = v => Number(v || 0)

const fmt = (v, digits = 2) =>
  Number(v).toLocaleString('en-UG', { maximumFractionDigits: digits })

const dateToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const initial = () => ({
  inventory_item_id: '',
  observation_hours: '24',
  population_observed: '',
  flock_id: '',
  pen_id: '',
  record_date: dateToday(),
  feed_supplied_kg: '',
  feed_remaining_kg: '0',
  water_supplied_l: '',
  water_remaining_l: '0',
  notes: '',
})

const total = (list, key) => list.reduce((sum, r) => sum + n(r[key]), 0)

const daysAgo = (count, today) => {
  const d = new Date(`${today}T12:00:00`)
  d.setDate(d.getDate() - count)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchFeedWaterData(farmId) {
  const db = createClient()
  const results = await Promise.all([
    db.from('flocks').select('id,name,batch_id,current_count,archived_at').eq('farm_id', farmId),
    db.from('batches').select('id,batch_number,category,breed,hatch_date,arrival_date,feed_form,feeding_programme').eq('farm_id', farmId),
    db.from('houses').select('id,name').eq('farm_id', farmId),
    db.from('pens').select('id,name,house_id').eq('farm_id', farmId),
    db.from('flock_placements').select('flock_id,pen_id,bird_count').eq('farm_id', farmId),
    db.from('feed_water_allocations').select('*').eq('farm_id', farmId).order('record_date', { ascending: false }).order('created_at', { ascending: false }).limit(RECORD_LIMIT),
    db.from('feed_inventory_items').select('*').eq('farm_id', farmId),
    db.from('feed_inventory_movements').select('*').eq('farm_id', farmId).limit(MOVEMENT_LIMIT),
    db.from('feed_water_alerts').select('*').eq('farm_id', farmId).order('created_at', { ascending: false }).limit(ALERT_LIMIT),
    db.from('daily_records').select('flock_id,pen_id,record_date,feed_supplied_kg,water_supplied_l').eq('farm_id', farmId).limit(RECORD_LIMIT),
  ])

  const warnings = results.flatMap((res, i) =>
    res.error ? [`${TABLES[i]}: ${res.error.message}${res.error.code ? ` (${res.error.code})` : ''}`] : []
  )

  const [flocks, batches, houses, pens, placements, records, inventory, movements, alerts, dailyOverlap] =
    results.map(x => x.data || [])
  const ledgerOk = !results[5].error

  const batchMap = new Map(batches.map(x => [x.id, x]))
  const activeFlocks = flocks
    .filter(x => !x.archived_at)
    .map(x => ({ ...x, batch: batchMap.get(x.batch_id) }))

  return {
    flocks: activeFlocks,
    houses,
    pens,
    placements,
    records,
    inventory,
    movements,
    alerts,
    dailyOverlap,
    warnings,
    ledgerOk,
  }
}

async function saveAllocation(farmId, form, editingId) {
  const db = createClient()
  const { data, error } = await db.rpc('fw_save_allocation', {
    p_farm_id: farmId,
    p_record_id: editingId || null,
    p_data: { ...form },
  })
  if (error) throw error
  if (!data) throw new Error('No record ID returned by Supabase')
  return data
}

async function deleteAllocation(farmId, recordId) {
  const { error } = await createClient().rpc('delete_feed_water_allocation', {
    p_farm_id: farmId,
    p_record_id: recordId,
  })
  if (error) throw error
}

async function createInventoryItem(farmId, name, feedForm, reorderKg) {
  const { error } = await createClient().rpc('fw_create_inventory_item', {
    p_farm_id: farmId,
    p_name: name,
    p_feed_form: feedForm,
    p_reorder_kg: reorderKg,
  })
  if (error) throw error
}

async function recordStockTransaction(farmId, itemId, kind, quantityKg, unitCostUgx) {
  const { error } = await createClient().rpc('fw_record_stock', {
    p_farm_id: farmId,
    p_item_id: itemId,
    p_kind: kind,
    p_quantity_kg: quantityKg,
    p_unit_cost_ugx: unitCostUgx,
    p_note: null,
  })
  if (error) throw error
}

async function resolveAlert(farmId, alertId) {
  const { error } = await createClient().rpc('fw_resolve_alert', {
    p_farm_id: farmId,
    p_alert_id: alertId,
  })
  if (error) throw error
}

function validateAllocation(form, today, consumedFeed, consumedWater) {
  if (!form.flock_id || !form.pen_id) {
    return 'Select a flock and an occupied pen. If the list is empty, check flock placements in Supabase.'
  }
  if (!form.observation_hours || Number(form.observation_hours) <= 0 || Number(form.observation_hours) > 168) {
    return 'Enter observation hours between 1 and 168.'
  }
  if (!form.population_observed || Number(form.population_observed) < 1) {
    return 'Enter the number of birds observed.'
  }
  if (!form.record_date || form.record_date > today) {
    return 'Select today or an earlier date.'
  }

  const invalid = QUANTITY_FIELDS.some(
    ([key]) => !Number.isFinite(Number(form[key])) || n(form[key]) < 0
  )
  if (form.feed_supplied_kg === '' || form.water_supplied_l === '' || invalid) {
    return 'Enter valid non-negative feed and water quantities. Use 0 when none was supplied.'
  }
  if (consumedFeed < 0 || consumedWater < 0) {
    return 'Remaining quantity cannot exceed supplied quantity.'
  }
  if (n(form.feed_supplied_kg) === 0 && n(form.water_supplied_l) === 0) {
    return 'Enter at least one positive allocation.'
  }
  return null
}

function batchAgeDays(flock, date) {
  const start = flock?.batch?.hatch_date || flock?.batch?.arrival_date
  if (!start) return null
  const diff = Math.floor((Date.parse(date + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z')) / 86400000)
  return diff >= 0 ? diff : null
}

function referenceFor(flock, date, itemId, inventory) {
  const age = batchAgeDays(flock, date)
  if (age == null) return null

  const week = Math.floor(age / 7) + 1
  const category = String(flock?.batch?.category || '').toLowerCase()
  const item = inventory.find(i => i.id === itemId)
  const formName = String(
    item?.feed_form || flock?.batch?.feed_form || flock?.batch?.feeding_programme || ''
  ).toLowerCase()

  let feed = null
  let water = null
  let source = ''

  if (category.includes('broiler')) {
    if (formName.includes('mash')) {
      feed = FEED_REFERENCES.mash[week - 1]
      source = 'MAAIF Table 33'
    } else if (/pellet|crumble/.test(formName)) {
      feed = FEED_REFERENCES.pellet[week - 1]
      source = 'MAAIF Table 32'
    }
    water = BROILER_WATER_REFERENCES[week - 1] || null
  } else if (category.includes('layer')) {
    feed = week <= 19 ? FEED_REFERENCES.layer[week - 1] : week <= 80 ? 95 : null
    water = week <= 19 ? LAYER_WATER_REFERENCES[week - 1] : week <= 80 ? [220, 230] : null
    source = 'MAAIF Table 26'
  } else if (/improved/.test(category)) {
    feed = FEED_REFERENCES.improved[week - 1]
    source = 'MAAIF Table 34'
  }

  return feed != null || water ? { feed, water, source, week } : null
}

function assessRecord(record, flocks, inventory) {
  const flock = flocks.find(f => f.id === record.flock_id)
  const ref = referenceFor(flock, record.record_date, record.inventory_item_id, inventory)
  const population = n(record.population_observed)
  const hours = n(record.observation_hours)

  if (!ref || !population || hours !== 24) {
    return { ref, status: 'Not comparable', detail: 'Requires a supported age/category, bird count and a 24-hour observation.' }
  }

  const feedPerBird = (n(record.feed_consumed_kg) * 1000) / population
  const waterPerBird = (n(record.water_consumed_l) * 1000) / population
  const deviations = []

  if (ref.feed != null && n(record.feed_supplied_kg) > 0) {
    deviations.push(['Feed', 100 * (feedPerBird / ref.feed - 1)])
  }
  if (ref.water && n(record.water_supplied_l) > 0) {
    const mid = (ref.water[0] + ref.water[1]) / 2
    deviations.push(['Water', 100 * (waterPerBird / mid - 1)])
  }

  const flagged = deviations.filter(x => Math.abs(x[1]) > 25)
  return {
    ref,
    status: !deviations.length ? 'Not comparable' : flagged.length ? 'Review' : 'Within screening range',
    detail: deviations.map(([k, v]) => `${k}: ${v >= 0 ? '+' : ''}${v.toFixed(0)}% ${Math.abs(v) > 25 ? '(review)' : '(within band)'}`).join(' · ') || 'No comparable consumption',
  }
}

function useFarmSelection({ farmId, farm, farms }) {
  const [discoveredFarms, setDiscoveredFarms] = useState([])
  const [farmLookupError, setFarmLookupError] = useState('')
  const [localFarmId, setLocalFarmId] = useState('')

  const farmOptions = useMemo(() => {
    const options = [...(Array.isArray(farms) ? farms : []), ...discoveredFarms]
    if (farm?.id && !options.some(f => f.id === farm.id)) options.unshift(farm)
    return [...new Map(options.filter(f => f?.id).map(f => [f.id, f])).values()]
  }, [farms, discoveredFarms, farm])

  const activeFarmId = localFarmId || farmId || ''
  const activeFarm = farmOptions.find(f => f.id === activeFarmId) || (farm?.id === activeFarmId ? farm : null)

  useEffect(() => {
    let alive = true
    async function findFarms() {
      const { data, error } = await createClient().from('farms').select('id,name').order('name')
      if (!alive) return
      if (error) { setFarmLookupError(error.message); return }
      setDiscoveredFarms(data || [])
      setFarmLookupError('')
    }
    void findFarms()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (farmId && !localFarmId) { setLocalFarmId(farmId); return }
    if (farmOptions.length && !farmOptions.some(f => f.id === localFarmId)) {
      setLocalFarmId(farm?.id && farmOptions.some(f => f.id === farm.id) ? farm.id : farmOptions[0].id)
    }
  }, [farmId, farm?.id, farmOptions, localFarmId])

  return { farmOptions, farmLookupError, activeFarmId, activeFarm, setLocalFarmId }
}

function useFeedWaterData(farmId) {
  const [state, setState] = useState({
    flocks: [], houses: [], pens: [], placements: [], records: [],
    inventory: [], movements: [], alerts: [], dailyOverlap: [],
    warnings: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dbStatus, setDbStatus] = useState('Checking database…')
  const [reload, setReload] = useState(0)

  const load = useCallback(async () => {
    if (!farmId) {
      setState({
        flocks: [], houses: [], pens: [], placements: [], records: [],
        inventory: [], movements: [], alerts: [], dailyOverlap: [], warnings: [],
      })
      setDbStatus('No farm selected')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await fetchFeedWaterData(farmId)
      setState({
        flocks: data.flocks, houses: data.houses, pens: data.pens, placements: data.placements,
        records: data.records, inventory: data.inventory, movements: data.movements,
        alerts: data.alerts, dailyOverlap: data.dailyOverlap, warnings: data.warnings,
      })
      setDbStatus(data.ledgerOk ? 'Allocation ledger connected' : 'Allocation ledger unavailable')
    } catch (e) {
      setError(e.message || 'Unable to load feed and water records')
      setDbStatus('Database connection failed')
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => { void load() }, [load, reload])

  return { ...state, loading, error, dbStatus, refresh: () => setReload(v => v + 1) }
}

function useAllocationForm(farmId) {
  const [form, setForm] = useState(initial)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }))

  useEffect(() => {
    setForm(initial())
    setEditingId(null)
    setNotice('')
  }, [farmId])

  return { form, setForm, set, editingId, setEditingId, saving, setSaving, error, setError, notice, setNotice }
}

function useInventoryState() {
  const [newItem, setNewItem] = useState('')
  const [newForm, setNewForm] = useState('Mash')
  const [newReorder, setNewReorder] = useState('0')
  const [stockItem, setStockItem] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [stockCost, setStockCost] = useState('')
  const [stockKind, setStockKind] = useState('purchase')
  const [busy, setBusy] = useState(false)

  return {
    newItem, setNewItem, newForm, setNewForm, newReorder, setNewReorder,
    stockItem, setStockItem, stockQty, setStockQty, stockCost, setStockCost,
    stockKind, setStockKind, busy, setBusy,
  }
}

function Entry({ label, children }) {
  return (
    <div className="ops-field">
      <label style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function FarmSelector({ farmOptions, farmLookupError, activeFarmId, onChange }) {
  return (
    <div className="ops-callout" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Wheat size={17} />
      <label htmlFor="feed-water-farm"><strong>Active farm</strong></label>
      <select
        id="feed-water-farm"
        aria-label="Choose farm"
        style={{ ...inputStyle, maxWidth: 360, minWidth: 220 }}
        value={activeFarmId || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select a farm</option>
        {farmOptions.map(f => (
          <option key={f.id} value={f.id}>{f.name || 'Unnamed farm'}</option>
        ))}
      </select>
      {!activeFarmId && <span>Choose a farm to load its flocks and allocations.</span>}
      {!farmOptions.length && farmLookupError && (
        <span role="alert">Could not load farms: {farmLookupError}. Check access to the farms table.</span>
      )}
    </div>
  )
}

function StatusCallouts({ error, dbStatus, farmId, flocks, placements, records, warnings, notice }) {
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  return (
    <>
      {error && (
        <div className="ops-callout" role="alert">
          <CircleAlert size={17} />
          <p>{error}</p>
        </div>
      )}

      {(warnings.length > 0 || dbStatus !== 'Allocation ledger connected') && (
        <div className="ops-callout" role="status">
          <CircleAlert size={16} />
          <div style={{ flex: 1 }}>
            <strong>{dbStatus}</strong>
            <button type="button" className="quiet-action" style={{ marginLeft: 10 }} onClick={() => setShowDiagnostics(v => !v)}>
              {showDiagnostics ? 'Hide details' : 'Database details'} <ChevronDown size={13} />
            </button>
            {showDiagnostics && <div style={{ marginTop: 10 }}>
              <p>Farm: {farmId ? 'Selected' : 'Missing'} · Flocks: {flocks.length} · Occupied placements: {placements.filter(p => n(p.bird_count) > 0).length} · Saved allocations: {records.length}</p>
              {warnings.map((w, i) => <p role="alert" key={i}>{w}</p>)}
            </div>}
          </div>
        </div>
      )}

      {notice && (
        <div className="ops-success" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </>
  )
}

function FeedWaterMetrics({ todays, inventoryTotal, openAlerts }) {
  return (
    <div className="analytics-metrics fw-metrics">
      <Metric label="Feed supplied today" value={`${fmt(total(todays, 'feed_supplied_kg'))} kg`} detail="Recorded allocations" icon={Wheat} />
      <Metric label="Feed consumed today" value={`${fmt(total(todays, 'feed_consumed_kg'))} kg`} detail="Supplied minus remaining" icon={Wheat} tone="gold" />
      <Metric label="Water consumed today" value={`${fmt(total(todays, 'water_consumed_l'))} L`} detail="Supplied minus remaining" icon={Droplets} tone="sage" />
      <Metric label="Feed stock on hand" value={`${fmt(inventoryTotal)} kg`} detail="Purchased + adjusted − issued" icon={Wheat} />
      <Metric label="Open feed/water alerts" value={String(openAlerts.length)} detail="Monitoring warnings" icon={CircleAlert} tone="rose" />
      <Metric label="Records today" value={String(todays.length)} detail="Saved allocation entries" icon={Check} />
    </div>
  )
}

function ConsumptionTrend({ trend, days, setDays }) {
  return (
    <Panel
      title="Recorded consumption trend"
      action={
        <select aria-label="Chart period" value={days} onChange={e => setDays(Number(e.target.value))} style={inputStyle}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      }
    >
      <div className="chart-legend">
        <span><i className="feed-dot" /> Feed (kg)</span>
        <span><i className="water-dot" /> Water (L)</span>
      </div>
      <div className="intel-chart" style={{ minHeight: 230, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend}>
            <CartesianGrid vertical={false} stroke="#e9ede6" strokeDasharray="3 4" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Area type="monotone" dataKey="feed" stroke="#286e56" fill="#286e5622" />
            <Area type="monotone" dataKey="water" stroke="#d9a441" fill="#d9a44122" />
          </AreaChart>
        </ResponsiveContainer>
        {trend.every(d => d.feed === 0 && d.water === 0) && (
          <div className="fw-empty-chart">No recorded consumption for this period yet.</div>
        )}
      </div>
      <p className="chart-caption">
        Only saved allocation entries appear. Missing dates are shown as zero recorded consumption, not proof of zero actual use.
      </p>
    </Panel>
  )
}

function RecordingGuidance({ onRefresh }) {
  return (
    <Panel title="Recording guidance">
      <p>Record feed and water supplied to a flock in a specific pen, then the amount remaining at the end of the observation period.</p>
      <p>Consumption is estimated as supplied minus remaining. This does not account for spills, waste or evaporation.</p>
      <p>Each saved allocation is a separate entry. Do not enter the same allocation twice.</p>
      <button type="button" className="quiet-action" onClick={onRefresh}>
        <RefreshCw size={15} /> Refresh records
      </button>
    </Panel>
  )
}

function AllocationForm({
  flocks, penOptions, form, set, setForm, save, saving, loading,
  consumedFeed, consumedWater, flockNames, penNames, today,
  editingId, onCancelEdit, birdCount, feedPerBird, waterPerBird,
  inventory, placements, stockFor,
}) {
  return (
    <div id="feed-entry">
      <Panel title={editingId ? 'Edit feed & water allocation' : 'Record feed & water allocation'}>
        <div className="intel-form-grid">
          <Entry label="Flock">
            <select
              style={inputStyle}
              value={form.flock_id}
              onChange={e => setForm(p => ({ ...p, flock_id: e.target.value, pen_id: '' }))}
            >
              <option value="">Select flock</option>
              {flocks.map(f => (
                <option key={f.id} value={f.id}>{flockNames.get(f.id)}</option>
              ))}
              {editingId && form.flock_id && !flocks.some(f => f.id === form.flock_id) && (
                <option value={form.flock_id}>Archived flock (existing record)</option>
              )}
            </select>
          </Entry>

          <Entry label="House and pen">
            <select
              style={inputStyle}
              value={form.pen_id}
              onChange={e => {
                const id = e.target.value
                const birds = placements
                  .filter(x => x.flock_id === form.flock_id && x.pen_id === id)
                  .reduce((a, x) => a + n(x.bird_count), 0)
                setForm(p => ({ ...p, pen_id: id, population_observed: birds ? String(birds) : '' }))
              }}
            >
              <option value="">Select occupied pen</option>
              {penOptions.map(p => (
                <option key={p.id} value={p.id}>{penNames.get(p.id)}</option>
              ))}
            </select>
          </Entry>

          <Entry label="Record date">
            <input
              style={inputStyle}
              type="date"
              max={today}
              value={form.record_date}
              onChange={e => set('record_date', e.target.value)}
            />
          </Entry>

          {QUANTITY_FIELDS.map(([key, label]) => (
            <Entry key={key} label={label}>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form[key]}
                onChange={e => set(key, e.currentTarget.value)}
                placeholder="0"
              />
            </Entry>
          ))}

          <Entry label="Feed inventory item (optional)">
            <select style={inputStyle} value={form.inventory_item_id} onChange={e => set('inventory_item_id', e.target.value)}>
              <option value="">Untracked / no stock deduction</option>
              {inventory.map(i => (
                <option key={i.id} value={i.id}>{i.name} · {fmt(stockFor(i.id))} kg available</option>
              ))}
            </select>
          </Entry>

          <Entry label="Observation duration (hours)">
            <input
              type="number"
              min="1"
              max="168"
              step="0.5"
              style={inputStyle}
              value={form.observation_hours}
              onChange={e => set('observation_hours', e.target.value)}
            />
          </Entry>

          <Entry label="Bird population observed">
            <input
              type="number"
              min="1"
              step="1"
              style={inputStyle}
              value={form.population_observed}
              onChange={e => set('population_observed', e.target.value)}
              placeholder={birdCount ? String(birdCount) : 'Birds present'}
            />
            <button
              type="button"
              className="quiet-action"
              onClick={() => set('population_observed', String(birdCount || ''))}
            >
              Use current pen count
            </button>
          </Entry>

          <Entry label="Notes (optional)">
            <textarea
              style={inputStyle}
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Feed type, spillage, water interruption…"
            />
          </Entry>
        </div>

        <p className="chart-caption">
          Calculated consumption: {consumedFeed >= 0 ? fmt(consumedFeed, 3) : 'Invalid'} kg feed ·{' '}
          {consumedWater >= 0 ? fmt(consumedWater, 3) : 'Invalid'} L water.{' '}
          {birdCount > 0
            ? `Birds in selected pen: ${fmt(birdCount, 0)} · Feed: ${fmt(feedPerBird, 1)} g/bird · Water: ${fmt(waterPerBird, 1)} mL/bird (recorded interval, not necessarily 24 hours).`
            : 'Select an occupied pen to see per-bird quantities.'}
        </p>

        <div className="intel-form-footer">
          <span>Saved to Supabase · no demo data</span>
          <button type="button" className="button-primary" disabled={saving || loading} onClick={() => void save()}>
            <Check size={15} />
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save allocation'}
          </button>
          {editingId && (
            <button type="button" className="quiet-action" onClick={onCancelEdit}>Cancel edit</button>
          )}
        </div>
      </Panel>
    </div>
  )
}

function InventoryPanel({ inventory, stockFor, stockState, onCreateItem, onRecordStock }) {
  const {
    newItem, setNewItem, newForm, setNewForm, newReorder, setNewReorder,
    stockItem, setStockItem, stockQty, setStockQty, stockCost, setStockCost,
    stockKind, setStockKind, busy,
  } = stockState

  return (
    <Panel title="Feed inventory · purchasing and stock adjustments">
      <p className="chart-caption">
        Stock is purchased/adjusted quantity minus feed supplied to pens. Consumption is not deducted again. Water is not stored in this feed-stock ledger.
      </p>

      <div className="intel-form-grid">
        <Entry label="New feed item">
          <input style={inputStyle} value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="e.g. Broiler starter pellets" />
        </Entry>
        <Entry label="Feed form">
          <select style={inputStyle} value={newForm} onChange={e => setNewForm(e.target.value)}>
            {FEED_FORMS.map(f => <option key={f}>{f}</option>)}
          </select>
        </Entry>
        <Entry label="Reorder level (kg)">
          <input style={inputStyle} type="number" min="0" value={newReorder} onChange={e => setNewReorder(e.target.value)} />
        </Entry>
      </div>

      <button className="button-primary" type="button" disabled={busy || !newItem.trim()} onClick={onCreateItem}>
        <Plus size={15} /> Add feed item
      </button>

      <div style={{ overflowX: 'auto', marginTop: 15 }}>
        <table style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr><th>Feed item</th><th>Form</th><th>On hand</th><th>Reorder level</th><th>Status</th></tr>
          </thead>
          <tbody>
            {inventory.map(i => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.feed_form}</td>
                <td>{fmt(stockFor(i.id))} kg</td>
                <td>{fmt(i.reorder_kg)} kg</td>
                <td>{stockFor(i.id) <= n(i.reorder_kg) ? 'Low / reorder' : 'Available'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="intel-form-grid" style={{ marginTop: 18 }}>
        <Entry label="Feed item">
          <select style={inputStyle} value={stockItem} onChange={e => setStockItem(e.target.value)}>
            <option value="">Select item</option>
            {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </Entry>
        <Entry label="Transaction">
          <select style={inputStyle} value={stockKind} onChange={e => setStockKind(e.target.value)}>
            <option value="purchase">Purchase / receipt</option>
            <option value="adjustment">Stock adjustment (+/-)</option>
          </select>
        </Entry>
        <Entry label="Quantity (kg)">
          <input style={inputStyle} type="number" step="any" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="e.g. 50" />
        </Entry>
        <Entry label="Unit cost (UGX, optional)">
          <input style={inputStyle} type="number" min="0" value={stockCost} onChange={e => setStockCost(e.target.value)} />
        </Entry>
      </div>

      <button className="button-primary" type="button" disabled={busy || !stockItem || !stockQty} onClick={onRecordStock}>
        <Check size={15} /> Record stock transaction
      </button>
    </Panel>
  )
}

function AlertsPanel({ openAlerts, onResolve }) {
  return (
    <Panel title={`Consumption alerts (${openAlerts.length} open)`}>
      {!openAlerts.length ? (
        <p className="subtle">No open feed or water alerts in the loaded records.</p>
      ) : (
        openAlerts.map(a => (
          <div key={a.id} className="ops-callout" style={{ marginBottom: 10 }}>
            <CircleAlert size={18} />
            <div>
              <strong>{a.severity.toUpperCase()} · {a.title}</strong>
              <p>{a.detail}</p>
              <p>{a.recommendation}</p>
              <button type="button" className="quiet-action" onClick={() => onResolve(a.id)}>Mark reviewed</button>
            </div>
          </div>
        ))
      )}
      <p className="chart-caption">
        BroodWatch alerts are screening indicators, not disease diagnoses. Alerts also appear in this farm's feed/water monitoring records.
      </p>
    </Panel>
  )
}

function GuidancePanel() {
  return (
    <Panel title="MAAIF consumption guidance">
      <p>
        Age-aware daily feed references: broiler pellets Table 32, broiler mash Table 33, improved meat breeds Table 34, and pullets/layers Table 26.
        Broiler water reference: Table 31; layer water: Table 26. Values are per bird per day, not universal clinical cutoffs.
      </p>
      <p>
        Comparisons require a 24-hour record, known bird count, supported category, age and feed form.
        BroodWatch flags deviations greater than ±25% for review; this is a software screening threshold, not a MAAIF rule.
      </p>
      <a href="https://www.agriculture.go.ug/wp-content/uploads/2020/07/MAAIF-Poultry-Manual.pdf" target="_blank" rel="noopener noreferrer">
        MAAIF Poultry Training Manual
      </a>
    </Panel>
  )
}

function AllocationHistory({
  filtered, loading, search, setSearch, onExport, flockNames, penNames,
  onEdit, onDelete, deletingId, assess, dailyOverlap,
}) {
  return (
    <Panel
      title="Allocation history"
      action={
        <button type="button" className="quiet-action" disabled={!filtered.length} onClick={onExport}>
          <Download size={14} /> Export CSV
        </button>
      }
    >
      <div className="fw-history-search"><Search size={17} /><input
        aria-label="Search allocation history"
        style={{ ...inputStyle, marginBottom: 16 }}
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search flock, pen, date or notes…"
      />{search && <button type="button" className="quiet-action" aria-label="Clear search" onClick={() => setSearch('')}><X size={15}/></button>}</div>

      {loading ? (
        <p>Loading farm records…</p>
      ) : !filtered.length ? (
        <p className="subtle">No matching allocation records.</p>
      ) : (
        <div className="fw-table-scroll">
          <table className="fw-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr>
                {HISTORY_COLUMNS.map(h => (
                  <th key={h} style={{ padding: 10, borderBottom: '1px solid #d9e2dc' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const assessment = assess(r)
                const overlap = dailyOverlap.some(d =>
                  d.flock_id === r.flock_id &&
                  d.pen_id === r.pen_id &&
                  d.record_date === r.record_date &&
                  (n(d.feed_supplied_kg) > 0 || n(d.water_supplied_l) > 0)
                )
                return (
                  <tr key={r.id}>
                    {[
                      r.record_date,
                      flockNames.get(r.flock_id) || 'Archived flock',
                      penNames.get(r.pen_id) || 'Unknown pen',
                      `${fmt(r.feed_supplied_kg)} kg`,
                      `${fmt(r.feed_consumed_kg)} kg`,
                      `${fmt(r.water_supplied_l)} L`,
                      `${fmt(r.water_consumed_l)} L`,
                      assessment.ref?.source || 'Unavailable',
                      <span key="assessment" className={`fw-assessment ${assessment.status === 'Review' ? 'is-warning' : assessment.status === 'Not comparable' ? 'is-muted' : 'is-ok'}`}><strong>{assessment.status}</strong><small>{assessment.detail}</small></span>,
                      overlap ? <span key="overlap" className="fw-assessment is-warning">Check duplicate</span> : '—',
                      r.notes || '—',
                    ].map((v, i) => (
                      <td key={i} style={{ padding: 10, borderBottom: '1px solid #edf0ec' }}>{v}</td>
                    ))}
                    <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                      <button type="button" className="quiet-action" onClick={() => onEdit(r)}>Edit</button>{' '}
                      <button type="button" className="quiet-action" disabled={deletingId === r.id} onClick={() => void onDelete(r)}>
                        {deletingId === r.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="chart-caption">
        Showing up to {RECORD_LIMIT} most recent allocations. Feed on hand is not inferred from this ledger; a separate inventory ledger is required. Missing dates do not imply zero actual consumption.
      </p>
    </Panel>
  )
}

export function FeedWater({ farmId, farm, farms = [], onFarmChange }) {
  const farmSelection = useFarmSelection({ farmId, farm, farms })
  const { activeFarmId, activeFarm } = farmSelection

  const data = useFeedWaterData(activeFarmId)
  const alloc = useAllocationForm(activeFarmId)
  const stockState = useInventoryState()
  const { form, setForm, set, editingId, setEditingId, saving, setSaving, error, setError, notice, setNotice } = alloc

  const [days, setDays] = useState(7)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [section, setSection] = useState('overview')

  const today = useMemo(() => dateToday(), [])

  useEffect(() => { setSearch('') }, [activeFarmId])

  const penOptions = useMemo(
    () => data.pens.filter(p =>
      data.placements.some(x => x.flock_id === form.flock_id && x.pen_id === p.id && n(x.bird_count) > 0) ||
      (editingId && p.id === form.pen_id)
    ),
    [data.pens, data.placements, form.flock_id, form.pen_id, editingId]
  )

  const houseNames = useMemo(() => new Map(data.houses.map(h => [h.id, h.name])), [data.houses])

  const flockNames = useMemo(
    () => new Map(data.flocks.map(f => [f.id, `${f.batch?.batch_number || f.name} · ${f.batch?.category || 'Poultry'}`])),
    [data.flocks]
  )

  const penNames = useMemo(
    () => new Map(data.pens.map(p => [p.id, `${houseNames.get(p.house_id) || 'House'} · ${p.name}`])),
    [data.pens, houseNames]
  )

  const todays = useMemo(
    () => data.records.filter(r => r.record_date === today),
    [data.records, today]
  )

  const trend = useMemo(
    () => Array.from({ length: days }, (_, i) => {
      const date = daysAgo(days - 1 - i, today)
      const rows = data.records.filter(r => r.record_date === date)
      return {
        day: date.slice(5),
        date,
        feed: Number(total(rows, 'feed_consumed_kg').toFixed(3)),
        water: Number(total(rows, 'water_consumed_l').toFixed(3)),
      }
    }),
    [data.records, days, today]
  )

  const filtered = useMemo(
    () => data.records.filter(r => {
      const hay = [r.record_date, flockNames.get(r.flock_id), penNames.get(r.pen_id), r.notes].join(' ').toLowerCase()
      return search.toLowerCase().trim().split(/\s+/).every(t => hay.includes(t))
    }),
    [data.records, flockNames, penNames, search]
  )

  const stockFor = useCallback(
    id =>
      data.movements.filter(m => m.item_id === id).reduce((v, m) => v + n(m.quantity_kg), 0) -
      data.records.filter(r => r.inventory_item_id === id).reduce((v, r) => v + n(r.feed_supplied_kg), 0),
    [data.movements, data.records]
  )

  const inventoryTotal = useMemo(
    () => data.inventory.reduce((sum, item) => sum + stockFor(item.id), 0),
    [data.inventory, stockFor]
  )

  const openAlerts = useMemo(() => data.alerts.filter(a => a.status === 'open'), [data.alerts])

  const consumedFeed = n(form.feed_supplied_kg) - n(form.feed_remaining_kg)
  const consumedWater = n(form.water_supplied_l) - n(form.water_remaining_l)

  const birdCount = data.placements
    .filter(p => p.flock_id === form.flock_id && p.pen_id === form.pen_id)
    .reduce((a, p) => a + n(p.bird_count), 0)
  const feedPerBird = birdCount > 0 ? (consumedFeed * 1000) / birdCount : null
  const waterPerBird = birdCount > 0 ? (consumedWater * 1000) / birdCount : null

  function chooseFarm(id) {
    farmSelection.setLocalFarmId(id)
    onFarmChange?.(id)
  }

  async function save() {
    setError('')
    setNotice('')

    if (!activeFarmId) {
      setError('Select a farm above before saving an allocation.')
      return
    }

    const validationError = validateAllocation(form, today, consumedFeed, consumedWater)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    try {
      await saveAllocation(activeFarmId, form, editingId)
      setNotice(editingId ? 'Allocation updated successfully.' : 'Allocation saved successfully.')
      setEditingId(null)
      setForm(p => ({ ...initial(), flock_id: p.flock_id, pen_id: p.pen_id }))
      data.refresh()
    } catch (e) {
      const hint = ERROR_HINTS[e.code] || ''
      setError(`${e.message || 'Unable to save allocation'}${e.code ? ` [${e.code}]` : ''}. ${hint}`)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(r) {
    setSection('record')
    setEditingId(r.id)
    setError('')
    setNotice('Editing a saved allocation. Save changes to update this record.')
    setForm({
      flock_id: r.flock_id,
      pen_id: r.pen_id,
      record_date: r.record_date,
      feed_supplied_kg: String(r.feed_supplied_kg),
      feed_remaining_kg: String(r.feed_remaining_kg),
      water_supplied_l: String(r.water_supplied_l),
      water_remaining_l: String(r.water_remaining_l),
      notes: r.notes || '',
      inventory_item_id: r.inventory_item_id || '',
      observation_hours: String(r.observation_hours || 24),
      population_observed: String(r.population_observed || ''),
    })
    setTimeout(() => document.getElementById('feed-entry')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(initial())
    setNotice('')
  }

  async function removeRecord(r) {
    if (!window.confirm(`Delete the allocation from ${r.record_date}? This cannot be undone.`)) return
    setDeletingId(r.id)
    setError('')
    setNotice('')
    try {
      await deleteAllocation(activeFarmId, r.id)
      setNotice('Allocation deleted.')
      if (editingId === r.id) cancelEdit()
      data.refresh()
    } catch (e) {
      setError(e.message || 'Unable to delete allocation')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleCreateItem() {
    if (!activeFarmId || stockState.newItem.trim().length < 2) return
    stockState.setBusy(true)
    setError('')
    try {
      await createInventoryItem(activeFarmId, stockState.newItem, stockState.newForm, Number(stockState.newReorder) || 0)
      stockState.setNewItem('')
      setNotice('Inventory item created')
      data.refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      stockState.setBusy(false)
    }
  }

  async function handleRecordStock() {
    if (!activeFarmId || !stockState.stockItem || !stockState.stockQty) return
    stockState.setBusy(true)
    setError('')
    try {
      await recordStockTransaction(
        activeFarmId,
        stockState.stockItem,
        stockState.stockKind,
        Number(stockState.stockQty),
        stockState.stockCost === '' ? null : Number(stockState.stockCost)
      )
      stockState.setStockQty('')
      stockState.setStockCost('')
      setNotice('Stock transaction recorded')
      data.refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      stockState.setBusy(false)
    }
  }

  async function handleResolveAlert(id) {
    try {
      await resolveAlert(activeFarmId, id)
      data.refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  function exportCsv() {
    const cols = ['Date', 'Flock', 'Pen', 'Feed supplied kg', 'Feed remaining kg', 'Feed consumed kg', 'Water supplied L', 'Water remaining L', 'Water consumed L', 'Notes', 'MAAIF reference', 'Assessment']
    const rows = filtered.map(r => {
      const a = assessRecord(r, data.flocks, data.inventory)
      return [
        r.record_date,
        flockNames.get(r.flock_id) || r.flock_id,
        penNames.get(r.pen_id) || r.pen_id,
        r.feed_supplied_kg,
        r.feed_remaining_kg,
        r.feed_consumed_kg,
        r.water_supplied_l,
        r.water_remaining_l,
        r.water_consumed_l,
        r.notes || '',
        a.ref?.source || '',
        a.detail,
      ]
    })
    const esc = v => '"' + String(v ?? '').replaceAll('"', '""') + '"'
    const csv = [cols, ...rows].map(row => row.map(esc).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'broodwatch-feed-water.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const assess = useCallback(
    r => assessRecord(r, data.flocks, data.inventory),
    [data.flocks, data.inventory]
  )

  return (
    <div className="operations-page fw-page">
      <PageHeading
        kicker="FLOCK OPERATIONS"
        title="Feed & water"
        description={`Track allocations, stock and consumption for ${activeFarm?.name || 'your farm'} with MAAIF-aware screening.`}
        action={{ label: 'Record allocation', icon: Plus, onClick: () => { setSection('record'); setTimeout(() => document.getElementById('feed-entry')?.scrollIntoView({ behavior: 'smooth' }), 0) } }}
      />
      <div className="ops-callout fw-intro"><Droplets size={19} /><p><strong>Every allocation tells a story.</strong> Record actual supply and leftovers, compare daily consumption against applicable poultry references, and investigate changes early. All figures come from your farm records.</p></div>

      <FarmSelector
        farmOptions={farmSelection.farmOptions}
        farmLookupError={farmSelection.farmLookupError}
        activeFarmId={activeFarmId}
        onChange={chooseFarm}
      />

      <StatusCallouts
        error={error || data.error}
        dbStatus={data.dbStatus}
        farmId={activeFarmId}
        flocks={data.flocks}
        placements={data.placements}
        records={data.records}
        warnings={data.warnings}
        notice={notice}
      />

      <FeedWaterMetrics todays={todays} inventoryTotal={inventoryTotal} openAlerts={openAlerts} />

      <nav className="fw-tabs" aria-label="Feed and water sections">
        {[
          ['overview', 'Overview', ActivityIcon],
          ['record', 'Record allocation', Plus],
          ['inventory', 'Feed inventory', Package],
          ['history', 'History', History],
        ].map(([id, label, Icon]) => (
          <button key={id} type="button" aria-current={section === id ? 'page' : undefined}
            className={`fw-tab ${section === id ? 'active' : ''}`} onClick={() => setSection(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {section === 'overview' && <div className="intel-two-col fw-overview-grid">
        <ConsumptionTrend trend={trend} days={days} setDays={setDays} />
        <RecordingGuidance onRefresh={data.refresh} />
      </div>}

      {section === 'record' && <AllocationForm
        flocks={data.flocks}
        penOptions={penOptions}
        form={form}
        set={set}
        setForm={setForm}
        save={save}
        saving={saving}
        loading={data.loading}
        consumedFeed={consumedFeed}
        consumedWater={consumedWater}
        flockNames={flockNames}
        penNames={penNames}
        today={today}
        editingId={editingId}
        onCancelEdit={cancelEdit}
        birdCount={birdCount}
        feedPerBird={feedPerBird}
        waterPerBird={waterPerBird}
        inventory={data.inventory}
        placements={data.placements}
        stockFor={stockFor}
      />}

      {section === 'inventory' && <InventoryPanel
        inventory={data.inventory}
        stockFor={stockFor}
        stockState={stockState}
        onCreateItem={handleCreateItem}
        onRecordStock={handleRecordStock}
      />}

      {section === 'overview' && <AlertsPanel openAlerts={openAlerts} onResolve={handleResolveAlert} />}

      {section === 'overview' && <GuidancePanel />}

      {section === 'history' && <AllocationHistory
        filtered={filtered}
        loading={data.loading}
        search={search}
        setSearch={setSearch}
        onExport={exportCsv}
        flockNames={flockNames}
        penNames={penNames}
        onEdit={startEdit}
        onDelete={removeRecord}
        deletingId={deletingId}
        assess={assess}
        dailyOverlap={data.dailyOverlap}
      />}
      <style>{`
        .fw-page { --fw-green:#1d634f; --fw-line:#dfe7e1; --fw-muted:#66756d; }
        .fw-page .fw-intro { margin: 12px 0 18px; align-items:flex-start; }
        .fw-page .fw-intro p { margin:0; line-height:1.6; }
        .fw-page .fw-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin:18px 0 22px; }
        .fw-page .fw-tabs { display:flex; gap:7px; padding:6px; margin:8px 0 22px; border:1px solid var(--fw-line); border-radius:14px; background:var(--surface,#fff); flex-wrap:wrap; }
        .fw-page .fw-tab { display:inline-flex; gap:8px; align-items:center; justify-content:center; flex:1; min-width:155px; padding:12px 16px; border:0; border-radius:10px; color:var(--fw-muted); background:transparent; font:inherit; font-size:13px; font-weight:650; cursor:pointer; transition:background .15s,color .15s; }
        .fw-page .fw-tab:hover { background:#eef4ef; color:#184d3d; }
        .fw-page .fw-tab.active { background:var(--fw-green); color:white; box-shadow:0 3px 10px rgba(29,99,79,.16); }
        .fw-page .fw-overview-grid { align-items:start; }
        .fw-page .fw-empty-chart { position:absolute; inset:0; display:flex; justify-content:center; align-items:center; text-align:center; padding:25px; background:rgba(255,255,255,.78); color:var(--fw-muted); font-size:13px; pointer-events:none; }
        .fw-page .fw-history-search { display:flex; align-items:center; gap:8px; border:1px solid var(--fw-line); border-radius:10px; padding:0 10px; margin-bottom:16px; background:var(--surface,#fff); }
        .fw-page .fw-history-search input { border:0!important; outline:none; box-shadow:none!important; margin:0!important; flex:1; min-width:0; }
        .fw-page .fw-table-scroll { overflow-x:auto; border:1px solid var(--fw-line); border-radius:12px; }
        .fw-page .fw-table { min-width:1180px; }
        .fw-page .fw-table thead { background:#f3f7f3; }
        .fw-page .fw-table th { white-space:nowrap; color:#51665b; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
        .fw-page .fw-table tbody tr:hover { background:#f7faf7; }
        .fw-page .fw-table td { vertical-align:middle; }
        .fw-page .fw-assessment { display:flex; flex-direction:column; gap:3px; min-width:140px; }
        .fw-page .fw-assessment strong { font-size:12px; }
        .fw-page .fw-assessment small { font-size:11px; color:var(--fw-muted); line-height:1.4; }
        .fw-page .fw-assessment.is-warning strong { color:#a25c16; }
        .fw-page .fw-assessment.is-ok strong { color:#1b7353; }
        .fw-page .fw-assessment.is-muted strong { color:#6b7280; }
        .fw-page .ops-field input:focus,.fw-page .ops-field select:focus,.fw-page .ops-field textarea:focus { outline:2px solid #7ab69d; outline-offset:1px; }
        @media(max-width:900px){.fw-page .fw-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}}
        @media(max-width:580px){.fw-page .fw-metrics{grid-template-columns:1fr;}.fw-page .fw-tab{min-width:calc(50% - 8px);}.fw-page .fw-tabs{gap:4px;}}
      `}</style>
    </div>
  )
}
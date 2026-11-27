'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Leaf, RefreshCw } from 'lucide-react'
import { ScreenHeader, Panel, FilterBar } from '../shared/intelligence-ui'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

const REPORT_NAMES = [
  'Farm overview',
  'Batch performance',
  'Pen performance',
  'Feed & water',
  'Growth and weight',
  'Mortality and health',
  'Egg production',
  'Vaccination history',
  'Environment',
  'Alert history',
  'Bird movements',
  'MAAIF reference assessment',
  'Data quality',
  'Comprehensive farm report',
]

const SOURCE_SPECS = {
  houses: ['houses'],
  pens: ['pens'],
  batches: ['batches'],
  flocks: ['flocks'],
  placements: ['flock_placements'],
  daily: ['daily_records', 'record_date'],
  ledger: ['feed_water_allocations', 'record_date'],
  weights: ['weight_records', 'weighed_on'],
  events: ['flock_events', 'event_date'],
  health: ['health_observations', 'observed_on'],
  eggs: ['egg_collections', 'collection_date'],
  tasks: ['bw_flock_tasks'],
  devices: ['bw_environment_devices'],
  alerts: ['bw_anomaly_alerts', 'created_at', true],
}

const PERIOD_OPTIONS = [
  ['Last 7 days', 'Last 7 days'],
  ['Last 30 days', 'Last 30 days'],
  ['This month', 'This month'],
  ['Custom range', 'Custom range'],
]

const SOURCE_OPTIONS = [
  ['ledger', 'Feed & water ledger'],
  ['daily', 'Final daily records'],
]

const SENSOR_OPTIONS = [
  ['false', 'Physical only'],
  ['true', 'Simulated only'],
]

const PAGE_SIZE = 500
const MAX_ROWS = 100000
const PREVIEW_ROWS = 200

const REPORT_STYLES = `
.bw-reports .report-layout {grid-template-columns: 190px minmax(0,1fr); align-items:start;}
.bw-reports .report-preview {min-width:0; overflow:hidden;}
.bw-reports .bw-report-actions {display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end;}
.bw-reports .bw-report-actions button {display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border:1px solid #dce5dd; border-radius:8px; background:#fff; color:#285b46; font-weight:600;}
.bw-reports .bw-report-actions button:disabled {opacity:.45; cursor:not-allowed;}
.bw-reports .report-brand {padding:16px 0; margin-bottom:18px;}
.bw-reports .report-preview h2 {font-size:24px; font-weight:700; color:#173d30; margin:12px 0 6px;}
.bw-reports .report-subtitle {line-height:1.6; margin-bottom:20px;}
.bw-reports .bw-report-section {min-width:0; margin:20px 0 28px;}
.bw-reports .bw-report-section + .bw-report-section {border-top:1px solid #e1e8e1; padding-top:24px;}
.bw-reports .bw-report-section h3 {font-size:17px; font-weight:650; color:#244b39; margin:0 0 14px;}
.bw-reports .report-summary-grid {display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,155px),1fr)); gap:12px; margin:16px 0;}
.bw-reports .report-summary-grid > div {padding:15px; border:1px solid #e1e9e1; border-radius:10px; background:#f5f8f4; min-width:0;}
.bw-reports .report-summary-grid > div span {display:block; font-size:12px; line-height:1.5; color:#607266;}
.bw-reports .report-summary-grid > div strong {display:block; font-size:25px; font-weight:700; color:#214e3b; margin-top:8px; overflow-wrap:anywhere; font-variant-numeric:tabular-nums;}
.bw-reports .report-copy {line-height:1.65; margin:16px 0;}
.bw-reports .bw-report-table-wrap {max-width:100%; overflow-x:auto; border:1px solid #dfe7df; border-radius:10px; margin:16px 0; background:#fff;}
.bw-reports .bw-report-table {width:100%; min-width:620px; border-collapse:separate; border-spacing:0; font-size:13px; color:#243e32; text-align:left;}
.bw-reports .bw-report-table th {background:#eaf1e9; color:#355b46; font-size:11px; font-weight:700; letter-spacing:.025em; text-transform:uppercase; text-align:left; padding:13px 16px; border-bottom:1px solid #dce6dc; white-space:normal; min-width:100px;}
.bw-reports .bw-report-table td {padding:13px 16px; border-bottom:1px solid #e8ede8; vertical-align:top; line-height:1.5; overflow-wrap:anywhere; min-width:100px; max-width:340px;}
.bw-reports .bw-report-table td:first-child {font-weight:600; color:#24513c;}
.bw-reports .bw-report-table tbody tr:nth-child(even) {background:#f7f9f6;}
.bw-reports .bw-report-table tbody tr:hover {background:#edf4ed;}
.bw-reports .bw-report-table tbody tr:last-child td {border-bottom:0;}
.bw-reports .bw-report-table td.bw-number {font-variant-numeric:tabular-nums; text-align:right; white-space:nowrap;}
@media(max-width:800px){.bw-reports .report-layout {display:flex; flex-direction:column;}.bw-reports .report-list,.bw-reports .report-preview {width:100%;}.bw-reports .report-list {display:flex; flex-wrap:wrap; gap:5px;}.bw-reports .report-list > span {width:100%;}}
`

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

const shift = (start, days) => {
  const d = new Date(start + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const stamp = day => `${day}T00:00:00+03:00`

const fmt = v =>
  v == null || v === '' ? '—' : typeof v === 'number' ? v.toLocaleString('en-UG', { maximumFractionDigits: 3 }) : String(v)

const num = v => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

const sum = (rows, key) => {
  const values = rows.map(r => num(r[key])).filter(v => v !== null)
  return values.length ? values.reduce((acc, v) => acc + v, 0) : null
}

const avg = (rows, key) => {
  const values = rows.map(r => num(r[key])).filter(v => v !== null)
  return values.length ? values.reduce((acc, v) => acc + v, 0) / values.length : null
}

const ratio = (a, b, mult = 1) => (a != null && b > 0 ? (a / b) * mult : null)

const unit = (v, suffix) => (v == null ? '—' : `${fmt(v)} ${suffix}`)

const makeSection = (title, headings, rows, metrics = [], note = '', chart = null) => ({
  title, headings, rows, metrics, note, chart,
})

async function fetchAllPages(makeQuery) {
  const out = []
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const r = await makeQuery().order('id').range(offset, offset + PAGE_SIZE - 1)
    if (r.error) throw Error(r.error.message)
    out.push(...r.data)
    if (r.data.length < PAGE_SIZE) return out
  }
  throw Error('Report exceeds 100,000 rows; choose a shorter period.')
}

function csvCell(v) {
  let s = fmt(v)
  if (/^[\s]*[=+@-]/.test(s) && typeof v !== 'number') s = "'" + s
  return '"' + s.replaceAll('"', '""') + '"'
}

function exportCsv(sections, meta) {
  const text = [
    ['BroodWatch', meta],
    ...sections.flatMap(s => [[s.title], ...s.metrics, [s.note], s.headings, ...s.rows, []]),
  ].map(row => row.map(csvCell).join(',')).join('\r\n')

  const url = URL.createObjectURL(new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'broodwatch-report.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function loadSources(db, farmId, start, end) {
  const data = {}
  const errors = {}

  await Promise.all(
    Object.entries(SOURCE_SPECS).map(async ([key, [table, col, isTimestamp]]) => {
      try {
        data[key] = await fetchAllPages(() => {
          let q = db.from(table).select('*').eq('farm_id', farmId)
          if (col) {
            q = isTimestamp
              ? q.gte(col, stamp(start)).lt(col, stamp(shift(end, 1)))
              : q.gte(col, start).lte(col, end)
          }
          return q
        })
      } catch (e) {
        errors[key] = e.message
        data[key] = []
      }
    })
  )

  try {
    data.readings = []
    for (const dev of data.devices) {
      const rows = await fetchAllPages(() =>
        db
          .from('bw_environment_readings')
          .select('id,device_id,received_at,temperature,humidity,simulated')
          .eq('device_id', dev.id)
          .gte('received_at', stamp(start))
          .lt('received_at', stamp(shift(end, 1)))
      )
      data.readings.push(...rows)
    }
  } catch (e) {
    errors.readings = e.message
    data.readings = []
  }

  return { data, errors }
}

function useReportsData(id, start, end, valid, revision) {
  const [loaded, setLoaded] = useState(null)
  const [error, setError] = useState('')

  const key = [id, start, end, revision].join(':')

  useEffect(() => {
    if (!id || !valid) return
    let live = true
    const db = createClient()

    loadSources(db, id, start, end)
      .then(result => { if (live) setLoaded({ key, ...result }) })
      .catch(e => { if (live) setError(e.message) })

    return () => { live = false }
  }, [id, start, end, valid, key])

  return { loaded: loaded?.key === key ? loaded : null, error, setError }
}

function buildTrend(rows, dateKey, valueKey) {
  return Array.from(new Set(rows.map(r => r[dateKey])))
    .sort()
    .map(day => ({ day, value: sum(rows.filter(r => r[dateKey] === day), valueKey) }))
}

function buildSections({ report, loaded, filters }) {
  if (!loaded) return []
  const { data: d, errors } = loaded
  const { flock, house, pen, source, sim, start, end } = filters

  const list = k => d[k] || []
  const lookup = (k, x, field = 'name') => list(k).find(r => r.id === x)?.[field] || '—'
  const fl = x => lookup('flocks', x)
  const pn = x => lookup('pens', x)
  const batch = f => list('batches').find(b => b.id === f.batch_id)

  const pens = list('pens').filter(p => !house || p.house_id === house)
  const location = id =>
    (!house && !pen) ||
    Boolean(id && pens.some(x => x.id === id) && (!pen || id === pen))

  const scope = r => (!flock || r.flock_id === flock) && location(r.pen_id)
  const farmWide = !flock && !house && !pen
  const dateIn = x => x && x >= start && x <= end

  const daily = list('daily').filter(r => scope(r) && r.status === 'final')
  const cons = source === 'daily' ? daily : list('ledger').filter(scope)
  const weights = list('weights').filter(scope)
  const eggs = list('eggs').filter(scope)
  const health = list('health').filter(scope)
  const events = list('events').filter(
    r => (!flock || r.flock_id === flock) && (!house && !pen || [r.source_pen_id, r.destination_pen_id].some(p => p && location(p)))
  )
  const deaths = events.filter(r => r.event_type === 'mortality')
  const placements = list('placements').filter(scope)
  const flocks = list('flocks').filter(
    f => (!flock || f.id === flock) && (!house && !pen || placements.some(p => p.flock_id === f.id))
  )
  const active = flocks.filter(f => !f.archived_at)
  const tasks = list('tasks').filter(
    r => r.kind === 'vaccination' && (!flock || r.flock_id === flock) && !house && !pen && (dateIn(r.planned_on) || dateIn(r.completed_on))
  )
  const devices = list('devices').filter(
    r => !flock && (!house && !pen || (r.pen_id && location(r.pen_id)) || (!pen && house && r.house_id === house))
  )
  const readings = list('readings').filter(r => devices.some(x => x.id === r.device_id) && r.simulated === sim)
  const alerts = farmWide ? list('alerts') : []

  const m = (label, value) => [label, value]
  const s = {}
  const dailyCount = new Set(daily.map(r => r.flock_id + ':' + r.record_date)).size
  const live = house || pen ? sum(placements, 'bird_count') : sum(active, 'current_count')
  const feed = sum(cons, 'feed_consumed_kg')
  const water = sum(cons, 'water_consumed_l')
  const mean = ratio(sum(weights, 'net_weight_kg'), sum(weights, 'sample_size'))
  const dead = sum(deaths, 'bird_count')
  const egg = sum(eggs, 'eggs_collected')
  const damaged = sum(eggs, 'damaged_eggs')

  s[REPORT_NAMES[0]] = makeSection(
    REPORT_NAMES[0],
    ['Flock', 'Batch', 'Category', 'Current live (whole flock)', 'Final recorded days'],
    flocks.map(f => [
      f.name,
      batch(f)?.batch_number,
      batch(f)?.category,
      f.current_count,
      new Set(daily.filter(r => r.flock_id === f.id).map(r => r.record_date)).size,
    ]),
    [
      m('Active flocks (current)', active.length),
      m('Live birds (current scope)', live),
      m('Final recorded flock-days', dailyCount),
      m('Recorded deaths', dead),
      m('Feed consumed', unit(feed, 'kg')),
      m('Eggs collected', egg),
    ],
    'Current population and facilities are snapshots, not period-end historical values. Recorded flock-days are not a completeness percentage.'
  )

  s[REPORT_NAMES[1]] = makeSection(
    REPORT_NAMES[1],
    ['Batch', 'Category', 'Breed', 'Hatch date', 'Initial birds (whole batch)', 'Current scoped birds', 'Recorded deaths', 'Feed kg', 'Mean sample kg'],
    list('batches')
      .filter(b => flocks.some(f => f.batch_id === b.id))
      .map(b => {
        const fs = flocks.filter(f => f.batch_id === b.id)
        const has = r => fs.some(f => f.id === r.flock_id)
        const w = weights.filter(has)
        return [
          b.batch_number,
          b.category,
          b.breed,
          b.hatch_date,
          b.initial_count,
          house || pen ? sum(placements.filter(has), 'bird_count') : sum(fs.filter(f => !f.archived_at), 'current_count'),
          sum(deaths.filter(has), 'bird_count'),
          sum(cons.filter(has), 'feed_consumed_kg'),
          ratio(sum(w, 'net_weight_kg'), sum(w, 'sample_size')),
        ]
      }),
    [],
    'Initial counts are whole-batch values. Current counts are not historical denominators.'
  )

  s[REPORT_NAMES[2]] = makeSection(
    REPORT_NAMES[2],
    ['House', 'Pen', 'Capacity', 'Current scoped birds', 'Occupancy % (all flocks)', 'Feed kg', 'Water L'],
    pens
      .filter(p => !pen || p.id === pen)
      .map(p => {
        const all = list('placements').filter(r => r.pen_id === p.id)
        const n = all.reduce((acc, r) => acc + Number(r.bird_count), 0)
        return [
          lookup('houses', p.house_id),
          p.name,
          p.capacity,
          placements.filter(r => r.pen_id === p.id).reduce((acc, r) => acc + Number(r.bird_count), 0),
          ratio(n, p.capacity, 100),
          sum(cons.filter(r => r.pen_id === p.id), 'feed_consumed_kg'),
          sum(cons.filter(r => r.pen_id === p.id), 'water_consumed_l'),
        ]
      }),
    [],
    'Occupancy is current; capacity utilisation includes all flocks in the pen.'
  )

  s[REPORT_NAMES[3]] = makeSection(
    REPORT_NAMES[3],
    ['Date', 'Flock', 'Pen', 'Feed supplied kg', 'Feed remaining kg', 'Feed consumed kg', 'Water supplied L', 'Water remaining L', 'Water consumed L'],
    cons.map(r => [
      r.record_date,
      fl(r.flock_id),
      pn(r.pen_id),
      r.feed_supplied_kg,
      r.feed_remaining_kg,
      r.feed_consumed_kg,
      r.water_supplied_l,
      r.water_remaining_l,
      r.water_consumed_l,
    ]),
    [
      m('Feed consumed', unit(feed, 'kg')),
      m('Water consumed', unit(water, 'L')),
      m('Observations', cons.length),
      m('Water/feed ratio', unit(ratio(water, feed), 'L/kg')),
    ],
    `Source: ${source === 'daily' ? 'final daily records' : 'feed & water ledger'}. Sources are never added together.`,
    { label: 'Recorded feed (kg)', data: buildTrend(cons, 'record_date', 'feed_consumed_kg') }
  )

  s[REPORT_NAMES[4]] = makeSection(
    REPORT_NAMES[4],
    ['Date', 'Flock', 'Pen', 'Method', 'Sample size', 'Net kg', 'Mean kg', 'Target kg', 'Deviation %'],
    weights.map(r => [
      r.weighed_on,
      fl(r.flock_id),
      pn(r.pen_id),
      r.method,
      r.sample_size,
      r.net_weight_kg,
      ratio(num(r.net_weight_kg), num(r.sample_size)),
      r.weight_assessment?.target_weight_kg,
      r.weight_assessment?.deviation_pct,
    ]),
    [
      m('Weight observations', weights.length),
      m('Bird measurements', sum(weights, 'sample_size')),
      m('Sample-weighted mean', unit(mean, 'kg')),
    ],
    'Repeated measurements may include the same birds; the mean is not a whole-flock estimate.'
  )

  s[REPORT_NAMES[5]] = makeSection(
    REPORT_NAMES[5],
    ['Date', 'Flock', 'Pen', 'Record type', 'Count', 'Details', 'Follow-up'],
    [
      ...deaths.map(r => [r.event_date, fl(r.flock_id), pn(r.source_pen_id), 'Mortality event', r.bird_count, r.notes, '—']),
      ...health.map(r => [r.observed_on, fl(r.flock_id), pn(r.pen_id), 'Health observation', r.affected_count, r.symptoms, r.follow_up_status]),
    ],
    [
      m('Recorded deaths', dead),
      m('Health observations', health.length),
      m('Open follow-ups', health.filter(r => r.follow_up_status === 'open').length),
    ],
    'Deaths are counted from flock events only; health observations may describe the same deaths. No historical mortality rate is inferred.',
    { label: 'Recorded deaths', data: buildTrend(deaths, 'event_date', 'bird_count') }
  )

  s[REPORT_NAMES[6]] = makeSection(
    REPORT_NAMES[6],
    ['Date', 'Flock', 'Pen', 'Eggs', 'Damaged', 'Birds observed', 'Eggs per 100 observed birds'],
    eggs.map(r => [
      r.collection_date,
      fl(r.flock_id),
      pn(r.pen_id),
      r.eggs_collected,
      r.damaged_eggs,
      r.birds_observed,
      ratio(num(r.eggs_collected), num(r.birds_observed), 100),
    ]),
    [
      m('Eggs collected', egg),
      m('Damaged eggs', damaged),
      m('Damage percentage', unit(ratio(damaged, egg, 100), '%')),
      m('Eggs per 100 observed bird-days', ratio(egg, sum(eggs, 'birds_observed'), 100)),
    ],
    'Uses egg register only. Observed birds are not necessarily confirmed laying hens.',
    { label: 'Eggs collected', data: buildTrend(eggs, 'collection_date', 'eggs_collected') }
  )

  s[REPORT_NAMES[7]] = makeSection(
    REPORT_NAMES[7],
    ['Flock', 'Activity', 'Planned', 'Completed', 'Status', 'Product', 'Administrator', 'Source'],
    tasks.map(r => [fl(r.flock_id), r.activity, r.planned_on, r.completed_on, r.status, r.product, r.administrator, r.source]),
    [
      m('Completed in period', tasks.filter(r => r.status === 'completed' && dateIn(r.completed_on)).length),
      m('Planned in period', tasks.filter(r => r.status === 'planned' && dateIn(r.planned_on)).length),
      m('Currently overdue (selected period)', tasks.filter(r => r.status === 'planned' && r.planned_on < today()).length),
    ],
    'Includes tasks planned or completed within period. Status is current. Pen/house filters exclude flock-level vaccination records.'
  )

  s[REPORT_NAMES[8]] = makeSection(
    REPORT_NAMES[8],
    ['Received at (UTC)', 'Device', 'House', 'Pen', 'Temperature °C', 'Humidity %', 'Type'],
    readings.map(r => {
      const dev = devices.find(x => x.id === r.device_id)
      return [
        r.received_at,
        dev?.name,
        lookup('houses', dev?.house_id || list('pens').find(p => p.id === dev?.pen_id)?.house_id),
        pn(dev?.pen_id),
        r.temperature,
        r.humidity,
        r.simulated ? 'Simulated' : 'Physical',
      ]
    }),
    [
      m('Devices in scope', devices.length),
      m('Readings', readings.length),
      m('Mean temperature', unit(avg(readings, 'temperature'), '°C')),
      m('Mean humidity', unit(avg(readings, 'humidity'), '%')),
    ],
    `${sim ? 'Simulated test data only' : 'Physical readings only'}. Device location is current; no historical device relocation or flock exposure is inferred. Flock filter excludes unassigned sensor readings.`
  )

  s[REPORT_NAMES[9]] = makeSection(
    REPORT_NAMES[9],
    ['Created', 'Title', 'Area', 'Severity', 'Metric', 'Observed', 'Baseline', 'Current status', 'Resolution note'],
    alerts.map(r => [r.created_at, r.title, r.area, r.severity, r.metric, r.observed, r.baseline, r.status, r.resolution_note]),
    [
      m('Alerts created in period', alerts.length),
      m('Currently open', alerts.filter(r => r.status === 'Open').length),
      m('Currently resolved', alerts.filter(r => r.status === 'Resolved').length),
    ],
    'Farm-wide only: alerts lack structured flock and pen identifiers. Status is current, not an event history.'
  )

  s[REPORT_NAMES[10]] = makeSection(
    REPORT_NAMES[10],
    ['Date', 'Flock', 'Event', 'Source pen', 'Destination pen', 'Birds', 'Notes'],
    events.map(r => [r.event_date, fl(r.flock_id), r.event_type, pn(r.source_pen_id), pn(r.destination_pen_id), r.bird_count, r.notes]),
    [
      m('Events', events.length),
      m('Transfer events', events.filter(r => r.event_type === 'movement').length),
    ],
    'Transfers are not additions to farm population. Event counts are not net population change.'
  )

  s[REPORT_NAMES[11]] = makeSection(
    REPORT_NAMES[11],
    ['Date', 'Flock', 'Observed kg', 'Target kg', 'Deviation %', 'Status', 'Reference table'],
    weights
      .filter(r => r.weight_assessment)
      .map(r => {
        const a = r.weight_assessment
        return [r.weighed_on, fl(r.flock_id), a.observed_mean_kg, a.target_weight_kg, a.deviation_pct, a.status, a.reference_table]
      }),
    [m('Stored assessments', weights.filter(r => r.weight_assessment).length)],
    'Stored weight assessments only; confirm feeding programme and manual applicability. Not regulatory certification.'
  )

  s[REPORT_NAMES[12]] = makeSection(
    REPORT_NAMES[12],
    ['Source', 'Rows loaded', 'Availability'],
    Object.keys({ ...SOURCE_SPECS, readings: [] }).map(k => [k, errors[k] ? '—' : list(k).length, errors[k] || 'Loaded']),
    [
      m('Final scoped records', daily.length),
      m('Draft scoped records', list('daily').filter(r => scope(r) && r.status === 'draft').length),
      m('Recorded flock-days', dailyCount),
    ],
    'Source counts are farm-wide, except period-limited queries. Expected historical pen-days are not reconstructed; missing data is not zero.'
  )

  if (report === REPORT_NAMES[13]) {
    return REPORT_NAMES.slice(0, -1).map(n => s[n])
  }
  return [s[report]]
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select className="range-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

function ReportList({ report, onSelect }) {
  return (
    <aside className="report-list">
      <span>REPORT TYPE</span>
      {REPORT_NAMES.map(n => (
        <button key={n} className={report === n ? 'selected' : ''} onClick={() => onSelect(n)}>
          {n}<span>→</span>
        </button>
      ))}
    </aside>
  )
}

function ReportSection({ section }) {
  return (
    <section className="bw-report-section">
      <h3>{section.title}</h3>
      <div className="report-summary-grid">
        {section.metrics.map(([k, v]) => (
          <div key={k}><span>{k}</span><strong>{fmt(v)}</strong></div>
        ))}
      </div>
      <p className="report-copy">{section.note}</p>

      {section.chart?.data.length > 0 && (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={section.chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name={section.chart.label} fill="#286e56" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {section.rows.length ? (
        <>
          <div className="bw-report-table-wrap" tabIndex={0} role="region" aria-label={`${section.title} records`}>
            <table className="bw-report-table">
              <thead>
                <tr>{section.headings.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr>
              </thead>
              <tbody>
                {section.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j} className={typeof v === 'number' ? 'bw-number' : ''}>{fmt(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {section.rows.length > PREVIEW_ROWS && (
            <p>Preview: first {PREVIEW_ROWS} of {section.rows.length} rows. Export includes all rows.</p>
          )}
        </>
      ) : (
        <p>No matching records.</p>
      )}
    </section>
  )
}

function ReportPreview({ report, meta, sections, ready, partial, onExport, onPrint }) {
  const canExport = ready && !partial

  return (
    <Panel
      title={report}
      className="report-preview"
      action={
        <div className="bw-report-actions">
          <button className="quiet-action" disabled={!canExport} onClick={onExport}><Download size={14} /> CSV</button>
          <button className="quiet-action" disabled={!canExport} onClick={onPrint}><Download size={14} /> Print / PDF</button>
        </div>
      }
    >
      <div className="report-brand">
        <span className="brand-mark"><Leaf size={18} /></span>
        <div>
          <strong>BroodWatch</strong>
          <small>FARM REPORT · {partial ? 'INCOMPLETE' : 'RECORDED DATA'}</small>
        </div>
        <span className="report-date">{today()}</span>
      </div>

      <h2>{report}</h2>
      <p className="report-subtitle">{meta}</p>

      {ready && sections.map(s => <ReportSection key={s.title} section={s} />)}
    </Panel>
  )
}

export function Reports({ farmId, farm, farms = [], onFarmChange } = {}) {
  const [available, setAvailable] = useState([])
  const [local, setLocal] = useState('')
  const [report, setReport] = useState(REPORT_NAMES[0])
  const [period, setPeriod] = useState('Last 30 days')
  const [from, setFrom] = useState(() => shift(today(), -29))
  const [to, setTo] = useState(today)
  const [flock, setFlock] = useState('')
  const [house, setHouse] = useState('')
  const [pen, setPen] = useState('')
  const [source, setSource] = useState('ledger')
  const [sim, setSim] = useState(false)
  const [revision, setRevision] = useState(0)

  const end = period === 'Custom range' ? to : today()
  const start =
    period === 'Custom range' ? from
    : period === 'This month' ? end.slice(0, 8) + '01'
    : shift(end, period === 'Last 7 days' ? -6 : -29)

  const valid = Boolean(start && end && start <= end && end <= today() && start >= shift(end, -365))
  const id = local || farmId || farm?.id || available[0]?.id || farms[0]?.id || ''

  const { loaded, error, setError } = useReportsData(id, start, end, valid, revision)

  useEffect(() => { setLocal('') }, [farmId, farm?.id])
  useEffect(() => { setFlock(''); setHouse(''); setPen('') }, [id])

  useEffect(() => {
    let live = true
    createClient()
      .from('farms')
      .select('id,name,district')
      .order('name')
      .then(r => { if (live && !r.error) setAvailable(r.data || []) })
    return () => { live = false }
  }, [])

  const ready = Boolean(loaded)
  const d = loaded?.data || {}
  const errors = loaded?.errors || {}
  const list = k => d[k] || []
  const partial = Object.keys(errors).length > 0

  const filters = { flock, house, pen, source, sim, start, end }

  const sections = useMemo(
    () => buildSections({ report, loaded, filters }),
    [report, loaded, flock, house, pen, source, sim, start, end]
  )

  const farmName = available.find(f => f.id === id) || farms.find(f => f.id === id) || farm
  const flockName = list('flocks').find(f => f.id === flock)?.name || 'All flocks'
  const houseName = list('houses').find(h => h.id === house)?.name || 'All houses'
  const penName = list('pens').find(p => p.id === pen)?.name || 'All pens'
  const meta = `${farmName?.name || 'Farm'} · ${start} to ${end} · ${flockName} · ${houseName} · ${penName}`

  function print() {
    if (!ready || partial) return
    const w = window.open('', '_blank')
    if (!w) { setError('Allow popups to print the report.'); return }

    const doc = w.document
    doc.title = 'BroodWatch — ' + report

    const style = doc.createElement('style')
    style.textContent =
      '@page{size:A4 landscape;margin:14mm}body{font:11px Arial;color:#183b30}h1{font-size:24px}h2{margin-top:24px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ccc;padding:6px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}th{background:#eaf1e9;color:#285b46}tbody tr:nth-child(even){background:#f5f8f4}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}tr{break-inside:avoid}p{white-space:pre-wrap}'
    doc.head.append(style)

    const add = (tag, text, parent = doc.body) => {
      const el = doc.createElement(tag)
      el.textContent = text
      parent.append(el)
      return el
    }

    add('h1', 'BroodWatch | ' + report)
    add('p', meta)
    add('p', 'Generated ' + new Date().toISOString())

    for (const s of sections) {
      add('h2', s.title)
      for (const [k, v] of s.metrics) add('p', k + ': ' + fmt(v))
      add('p', s.note)

      const t = add('table', '')
      const h = add('thead', '', t)
      const tr = add('tr', '', h)
      s.headings.forEach(x => add('th', x, tr))
      const b = add('tbody', '', t)
      s.rows.forEach(r => {
        const row = add('tr', '', b)
        r.forEach(x => add('td', fmt(x), row))
      })
    }

    w.focus()
    w.print()
  }

  const pens = list('pens').filter(p => !house || p.house_id === house)

  return (
    <div className="intelligence-page bw-reports">
      <style>{REPORT_STYLES}</style>

      <ScreenHeader
        kicker="REPORTING"
        title="Reports"
        description="Review, compare and export recorded farm performance."
        action={{ label: 'Refresh', icon: RefreshCw, onClick: () => setRevision(x => x + 1) }}
      />

      <FilterBar>
        <SelectField label="Farm" value={id} onChange={v => { setLocal(v); onFarmChange?.(v) }} options={(available.length ? available : farms.length ? farms : farm ? [farm] : []).map(f => [f.id, f.name])} />
        <SelectField label="Period" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        {period === 'Custom range' && (
          <>
            <label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
            <label>To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          </>
        )}
        <SelectField label="Flock" value={flock} onChange={setFlock} options={[['', 'All flocks'], ...list('flocks').map(f => [f.id, f.name])]} />
        <SelectField label="House" value={house} onChange={v => { setHouse(v); setPen('') }} options={[['', 'All houses'], ...list('houses').map(h => [h.id, h.name])]} />
        <SelectField label="Pen" value={pen} onChange={setPen} options={[['', 'All pens'], ...pens.map(p => [p.id, p.name])]} />
        <SelectField label="Consumption source" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
        <SelectField label="Sensor data" value={String(sim)} onChange={v => setSim(v === 'true')} options={SENSOR_OPTIONS} />
      </FilterBar>

      {error && <p role="alert">{error}</p>}
      {!valid && <p role="alert">Choose a valid period of at most 366 days, ending today or earlier.</p>}
      {!id && <p>No accessible farm selected.</p>}
      {id && valid && !ready && <p>Loading report sources…</p>}

      {partial && (
        <div role="alert">
          <strong>Incomplete report — export disabled</strong>
          {Object.entries(errors).map(([k, v]) => <p key={k}>{k}: {v}</p>)}
        </div>
      )}

      <div className="report-layout">
        <ReportList report={report} onSelect={setReport} />
        <ReportPreview
          report={report}
          meta={meta}
          sections={sections}
          ready={ready}
          partial={partial}
          onExport={() => exportCsv(sections, meta)}
          onPrint={print}
        />
      </div>
    </div>
  )
}
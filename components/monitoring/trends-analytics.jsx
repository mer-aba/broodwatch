'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClipboardIcon, Droplets, HeartPulse, Info, RefreshCw, Wheat } from 'lucide-react'
import { ScreenHeader, Panel, Metric, FilterBar } from '../shared/intelligence-ui'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 500

const METRIC_OPTIONS = [
  ['Feed & water', 'Feed & water'],
  ['Mortality', 'Mortality'],
  ['Weight', 'Weight'],
  ['Egg production', 'Egg production'],
]

const PERIOD_OPTIONS = [
  ['Last 7 days', 'Last 7 days'],
  ['Last 30 days', 'Last 30 days'],
  ['This month', 'This month'],
]

const SOURCE_OPTIONS = [
  ['Daily records', 'Daily records'],
  ['Feed & water ledger', 'Feed & water ledger'],
]

const SERIES = {
  'Feed & water': [
    ['feed', 'Feed (kg)', '#286e56'],
    ['water', 'Water (L)', '#d9a441'],
  ],
  Mortality: [['mortality', 'Mortality (birds)', '#ba6a59']],
  Weight: [['weight', 'Sample-weighted mean (kg)', '#286e56']],
  'Egg production': [['eggs', 'Eggs collected', '#d9a441']],
}

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Kampala',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function iso(offset = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  const parts = formatter.formatToParts(d).filter(x => x.type !== 'literal')
  const p = parts.reduce((acc, x) => ({ ...acc, [x.type]: x.value }), {})
  return `${p.year}-${p.month}-${p.day}`
}

const sum = (rows, key) => rows.reduce((acc, r) => acc + Number(r[key] || 0), 0)
const fmt = value => Number(value.toFixed(2)).toLocaleString()

function periodDays(period, end) {
  if (period === 'Last 30 days') return 30
  if (period === 'This month') return Number(end.slice(-2))
  return 7
}

async function fetchPaged(db, table, farmId, column, start, end) {
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let q = db.from(table).select('*').eq('farm_id', farmId)
    if (column) q = q.gte(column, start).lte(column, end)
    const r = await q.order('id').range(offset, offset + PAGE_SIZE - 1)
    if (r.error) throw new Error(`${table}: ${r.error.message}`)
    rows.push(...r.data)
    if (r.data.length < PAGE_SIZE) return rows
  }
}

async function fetchAnalytics(db, farmId, start, end) {
  const [flocks, batches, daily, ledger, events, weights, eggs] = await Promise.all([
    fetchPaged(db, 'flocks', farmId),
    fetchPaged(db, 'batches', farmId),
    fetchPaged(db, 'daily_records', farmId, 'record_date', start, end),
    fetchPaged(db, 'feed_water_allocations', farmId, 'record_date', start, end),
    fetchPaged(db, 'flock_events', farmId, 'event_date', start, end),
    fetchPaged(db, 'weight_records', farmId, 'weighed_on', start, end),
    fetchPaged(db, 'egg_collections', farmId, 'collection_date', start, end),
  ])

  return {
    flocks,
    batches,
    daily: daily.filter(r => r.status === 'final'),
    ledger,
    events: events.filter(r => r.event_type === 'mortality'),
    weights,
    eggs,
  }
}

function useAnalytics(farmId, start, end) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  const key = [farmId, start, end].join(':')

  useEffect(() => {
    if (!farmId) return
    let live = true

    ;(async () => {
      try {
        const result = await fetchAnalytics(createClient(), farmId, start, end)
        if (live) {
          setData({ key, ...result })
          setError('')
        }
      } catch (e) {
        if (live) setError(e.message)
      }
    })()

    return () => { live = false }
  }, [farmId, start, end, revision, key])

  return {
    data: data?.key === key ? data : null,
    error,
    refresh: () => setRevision(x => x + 1),
  }
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

function buildTrend({ days, cons, deaths, weights, eggs }) {
  return Array.from({ length: days }, (_, i) => {
    const day = iso(i - days + 1)
    const c = cons.filter(r => r.record_date === day)
    const m = deaths.filter(r => r.event_date === day)
    const w = weights.filter(r => r.weighed_on === day)
    const e = eggs.filter(r => r.collection_date === day)

    return {
      day: day.slice(5),
      feed: c.length ? sum(c, 'feed_consumed_kg') : null,
      water: c.length ? sum(c, 'water_consumed_l') : null,
      mortality: m.length ? sum(m, 'bird_count') : null,
      weight: w.length ? sum(w, 'net_weight_kg') / sum(w, 'sample_size') : null,
      eggs: e.length ? sum(e, 'eggs_collected') : null,
    }
  })
}

function TrendChart({ trend, metric, setMetric }) {
  const series = SERIES[metric]

  return (
    <Panel
      title="Recorded trend"
      action={<SelectField label="Metric" value={metric} onChange={setMetric} options={METRIC_OPTIONS} />}
    >
      <div className="chart-legend">
        {series.map(([key, label, color]) => (
          <span key={key}><i style={{ background: color }} className="feed-dot" />{label}</span>
        ))}
      </div>

      <div className="intel-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e9ede6" strokeDasharray="3 4" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip />
            {series.map(([key, label, color]) => (
              <Area
                key={key}
                type="linear"
                dataKey={key}
                name={label}
                stroke={color}
                fill={color + '15'}
                strokeWidth={2.3}
                connectNulls={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="chart-caption">Missing observations are gaps, not zeros. Feed and water use different units.</p>
    </Panel>
  )
}

function FlockComparison({ selected, batches, daily, activeCount }) {
  return (
    <Panel title="Flock comparison">
      {selected.map(f => {
        const batch = batches.find(x => x.id === f.batch_id)
        const days = new Set(daily.filter(r => r.flock_id === f.id).map(r => r.record_date)).size

        return (
          <div className="compare-row" key={f.id}>
            <span className="compare-chip sage">{batch?.category?.slice(0, 2) || 'FL'}</span>
            <div>
              <strong>{batch?.batch_number || f.name}</strong>
              <small>
                {batch?.category || 'Unknown category'} · {f.current_count} current live · {f.archived_at ? 'Archived' : 'Active'}
              </small>
            </div>
            <strong>{days} recorded days</strong>
          </div>
        )
      })}
      <p className="chart-caption">
        Current counts are not historical denominators. {activeCount} active flocks in farm.
      </p>
    </Panel>
  )
}

export function TrendsAnalytics({ farmId, farm, farms = [], onFarmChange }) {
  const [available, setAvailable] = useState([])
  const [local, setLocal] = useState('')
  const [flock, setFlock] = useState('')
  const [period, setPeriod] = useState('Last 7 days')
  const [metric, setMetric] = useState('Feed & water')
  const [source, setSource] = useState('Daily records')

  const id = local || farmId || farm?.id || farms[0]?.id || available[0]?.id || ''
  const end = iso()
  const days = periodDays(period, end)
  const start = iso(1 - days)

  const { data, error, refresh } = useAnalytics(id, start, end)

  useEffect(() => { setLocal('') }, [farmId, farm?.id])
  useEffect(() => { setFlock('') }, [id])

  useEffect(() => {
    let live = true
    createClient()
      .from('farms')
      .select('id,name')
      .order('name')
      .then(r => {
        if (!live) return
        if (r.error) setAvailable([])
        else setAvailable(r.data || [])
      })
    return () => { live = false }
  }, [])

  const d = data || { flocks: [], batches: [], daily: [], ledger: [], events: [], weights: [], eggs: [] }

  const filter = r => !flock || r.flock_id === flock
  const cons = (source === 'Daily records' ? d.daily : d.ledger).filter(filter)
  const deaths = d.events.filter(filter)
  const weights = d.weights.filter(filter)
  const eggs = d.eggs.filter(filter)
  const daily = d.daily.filter(filter)
  const active = d.flocks.filter(f => !f.archived_at)
  const selected = d.flocks.filter(f => !flock || f.id === flock)

  const trend = useMemo(
    () => buildTrend({ days, cons, deaths, weights, eggs }),
    [days, cons, deaths, weights, eggs]
  )

  const observed = useMemo(
    () => new Set(daily.map(r => `${r.flock_id}:${r.record_date}`)).size,
    [daily]
  )

  const farmOptions = available.length ? available : farms.length ? farms : farm ? [farm] : []

  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="MONITORING"
        title="Trends & analytics"
        description="Explore recorded patterns across your flocks."
        action={{ label: 'Refresh', icon: RefreshCw, onClick: refresh }}
      />

      <FilterBar>
        <SelectField
          label="Farm"
          value={id}
          onChange={v => { setLocal(v); onFarmChange?.(v) }}
          options={farmOptions.map(f => [f.id, f.name])}
        />
        <SelectField
          label="Flock"
          value={flock}
          onChange={setFlock}
          options={[['', 'All flocks (including archived)'], ...d.flocks.map(f => [f.id, f.name])]}
        />
        <SelectField label="Period" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        <SelectField label="Consumption source" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
      </FilterBar>

      {error && <p role="alert">{error}</p>}
      {!data && <p>Loading farm records…</p>}

      <div className="analytics-metrics">
        <Metric label="Feed recorded" value={cons.length ? fmt(sum(cons, 'feed_consumed_kg')) + ' kg' : '—'} detail={source} icon={Wheat} />
        <Metric label="Water recorded" value={cons.length ? fmt(sum(cons, 'water_consumed_l')) + ' L' : '—'} detail={source} icon={Droplets} tone="gold" />
        <Metric label="Mortality recorded" value={data ? sum(deaths, 'bird_count') + ' birds' : '—'} detail="Mortality events only" icon={HeartPulse} tone="rose" />
        <Metric label="Recorded flock-days" value={data ? observed : '—'} detail="Final daily records; not completeness %" icon={ClipboardIcon} tone="sage" />
      </div>

      <div className="intel-two-col">
        <TrendChart trend={trend} metric={metric} setMetric={setMetric} />
        <FlockComparison selected={selected} batches={d.batches} daily={d.daily} activeCount={active.length} />
      </div>

      <div className="trend-note">
        <Info size={15} />
        <span>
          Consumption sources are deliberately separate to avoid double counting. Egg totals use the egg register; mortality uses flock events. No MAAIF target or simulated sensor data is inferred.
        </span>
      </div>
    </div>
  )
}
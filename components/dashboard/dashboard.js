'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  Activity, Bird, ChevronDown, CircleAlert, Clock3, Leaf, Plus,
  Sparkles, Weight, Wheat,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const formatNumber = (value) => new Intl.NumberFormat('en-UG').format(value)
const number = (value) => Number(value) || 0

function MetricCard({ item }) {
  const Icon = item.icon
  return (
    <article className="metric-card">
      <div className={`metric-icon ${item.tone}`}><Icon size={19} /></div>
      <p className="metric-label">{item.label}</p>
      <strong>{item.value}</strong>
      <span className="metric-note">{item.note}</span>
    </article>
  )
}

function ConsumptionChart() {
  const [range, setRange] = useState('7 days')
  // The onboarding schema does not contain daily feed/water records.
  const trendData = []
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">FLOCK OPERATIONS</p>
          <h2>Feed & water consumption</h2>
          <p className="subtle">Daily totals · all active flocks</p>
        </div>
        <button type="button" className="select-button" onClick={() => setRange(range === '7 days' ? '30 days' : '7 days')}>
          {range} <ChevronDown size={15} />
        </button>
      </div>
      <div className="chart-legend">
        <span><i className="legend-dot feed-dot" />Feed (kg)</span>
        <span><i className="legend-dot water-dot" />Water (L)</span>
      </div>
      <div className="chart-wrap" style={{ minHeight: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="feedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c634e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1c634e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d9a441" stopOpacity={0.16} />
                <stop offset="95%" stopColor="#d9a441" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e9ede6" strokeDasharray="3 4" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8b948a', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b948a', fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6eae3', fontSize: 12 }} />
            <Area type="monotone" dataKey="feed" stroke="#1c634e" strokeWidth={2.5} fill="url(#feedFill)" />
            <Area type="monotone" dataKey="water" stroke="#d9a441" strokeWidth={2.5} fill="url(#waterFill)" />
          </AreaChart>
        </ResponsiveContainer>
        <p className="subtle" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
          No feed or water records yet. Daily recording will populate this chart.
        </p>
      </div>
    </section>
  )
}

function FlockSummary({ flocks, batches, onNavigate }) {
  const batchById = useMemo(() => new Map(batches.map((batch) => [batch.id, batch])), [batches])
  return (
    <section className="panel flock-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">YOUR FLOCKS</p><h2>Flock performance</h2></div>
        <button type="button" className="text-link" onClick={() => onNavigate?.('Flocks & Batches')}>
          View all <span>→</span>
        </button>
      </div>
      <div className="flock-list">
        {flocks.length === 0 ? (
          <p className="subtle" style={{ padding: 20 }}>No flocks registered for this farm yet.</p>
        ) : flocks.map((flock) => {
          const batch = batchById.get(flock.batch_id)
          const initial = number(batch?.initial_count)
          const live = number(flock.current_count)
          const progress = initial > 0 ? Math.min(100, Math.max(0, (live / initial) * 100)) : 0
          const category = batch?.category || 'Poultry'
          return (
            <article className="flock-row" key={flock.id}>
              <div className={`flock-avatar ${category === 'Broiler' ? 'avatar-gold' : 'avatar-sage'}`}><Bird size={18} /></div>
              <div className="flock-info">
                <div className="flock-title-line">
                  <strong>{batch?.batch_number || flock.name}</strong>
                  <span className="status-pill">{live > 0 ? 'Active' : 'Empty'}</span>
                </div>
                <p>{category} · {batch?.breed || 'Breed not specified'}</p>
                <div className="flock-progress"><span style={{ width: `${progress}%` }} /></div>
                <small>{formatNumber(live)} current <i>·</i> {formatNumber(initial)} initial birds</small>
              </div>
              <button type="button" className="icon-plain" aria-label={`Open ${batch?.batch_number || flock.name}`} onClick={() => onNavigate?.('Flocks & Batches')}>↗</button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function TaskList({ onNavigate }) {
  return (
    <section className="panel tasks-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">STAY ON TRACK</p><h2>Today’s tasks</h2></div>
        <span className="count-badge">0</span>
      </div>
      <div className="task-list"><p className="subtle" style={{ padding: 20 }}>No scheduled tasks available. Task management will be connected in the next phase.</p></div>
      <button type="button" className="all-tasks" onClick={() => onNavigate?.('Vaccination & Tasks')}>See all tasks <span>→</span></button>
    </section>
  )
}

function AlertsCard() {
  return (
    <section className="panel alerts-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">NEEDS A LOOK</p><h2>Farm alerts</h2></div>
        <span className="alert-count">Not connected</span>
      </div>
      <p className="subtle" style={{ padding: 20 }}>Live anomaly and sensor alerts are not connected yet. No alert status can be determined.</p>
    </section>
  )
}

function AdvisoryCard({ onNavigate }) {
  return (
    <section className="advisory-card">
      <div className="advisory-top">
        <span className="advisory-icon"><Sparkles size={18} /></span>
        <span className="advisory-label">TODAY’S FARM NOTE</span>
        <span className="advisory-source">General guidance</span>
      </div>
      <h2>A steady routine makes the biggest difference.</h2>
      <p>Keep fresh water available and check drinkers for blockages during each daily walk-through.</p>
      <div className="advisory-foot">
        <span>General husbandry reminder</span>
        <button type="button" aria-label="Open knowledge library" onClick={() => onNavigate?.('Knowledge Library')}>→</button>
      </div>
    </section>
  )
}

export default function Dashboard({ onNavigate, userName = 'Farmer', farm, farmId, farms = [], onFarmChange }) {
  const [records, setRecords] = useState({ houses: [], pens: [], batches: [], flocks: [], placements: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showFarmMenu, setShowFarmMenu] = useState(false)
  const [houseFilter, setHouseFilter] = useState('all')
  const [flockFilter, setFlockFilter] = useState('all')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      setHouseFilter('all')
      setFlockFilter('all')
      if (!farmId) {
        setRecords({ houses: [], pens: [], batches: [], flocks: [], placements: [] })
        setLoading(false)
        return
      }
      try {
        const supabase = createClient()
        const tables = ['houses', 'pens', 'batches', 'flocks', 'flock_placements']
        const responses = await Promise.all(tables.map((table) => supabase.from(table).select('*').eq('farm_id', farmId)))
        for (const response of responses) if (response.error) throw response.error
        if (!active) return
        setRecords({
          houses: responses[0].data || [], pens: responses[1].data || [],
          batches: responses[2].data || [], flocks: responses[3].data || [],
          placements: responses[4].data || [],
        })
      } catch (err) {
        if (active) setError(err.message || 'Unable to retrieve farm data.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [farmId])

  const { houses, pens, batches, flocks, placements } = records
  const visiblePens = houseFilter === 'all' ? pens : pens.filter((pen) => pen.house_id === houseFilter)
  const visiblePenIds = new Set(visiblePens.map((pen) => pen.id))
  const visibleFlockIds = new Set(flocks.filter((flock) => flockFilter === 'all' || flock.id === flockFilter).map((flock) => flock.id))
  const filteredPlacements = placements.filter((p) => visiblePenIds.has(p.pen_id) && visibleFlockIds.has(p.flock_id))
  const placementByFlock = new Map()
  for (const p of placements) placementByFlock.set(p.flock_id, (placementByFlock.get(p.flock_id) || 0) + number(p.bird_count))
  const filteredFlocks = flocks.filter((flock) => visibleFlockIds.has(flock.id) && (
    houseFilter === 'all' || placements.some((p) => p.flock_id === flock.id && visiblePenIds.has(p.pen_id))
  ))
  const totalLive = houseFilter === 'all'
    ? filteredFlocks.reduce((sum, flock) => sum + number(flock.current_count), 0)
    : filteredPlacements.reduce((sum, placement) => {
        const flock = flocks.find((f) => f.id === placement.flock_id)
        const totalPlaced = placementByFlock.get(placement.flock_id) || 0
        return sum + (totalPlaced ? number(placement.bird_count) * number(flock?.current_count) / totalPlaced : 0)
      }, 0)
  const displayedBirds = Math.round(totalLive)
  const metrics = [
    { label: 'Active flocks', value: formatNumber(filteredFlocks.filter((f) => number(f.current_count) > 0).length), note: `Across ${houseFilter === 'all' ? houses.length : 1} house(s)`, icon: Bird, tone: 'green' },
    { label: 'Live birds', value: formatNumber(displayedBirds), note: 'Current flock counts · not yet linked to daily mortality', icon: Activity, tone: 'gold' },
    { label: 'Today’s feed', value: '—', note: 'Daily feed records not connected', icon: Wheat, tone: 'sage' },
    { label: 'Active alerts', value: '—', note: 'Alert monitoring not connected', icon: CircleAlert, tone: 'rose' },
  ]
  const firstName = (userName || 'Farmer').trim().split(/\s+/)[0] || 'Farmer'
  const dateLabel = new Intl.DateTimeFormat('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())

  if (loading) return <div className="dashboard-page"><section className="panel" style={{ padding: 28 }}>Loading farm dashboard…</section></div>
  if (error) return (
    <div className="dashboard-page"><section className="panel" style={{ padding: 28 }}>
      <h2>Unable to load dashboard</h2><p role="alert">{error}</p>
      <p className="subtle">Check Supabase table permissions and your farm membership, then refresh the page.</p>
    </section></div>
  )

  return (
    <div className="dashboard-page">
      <header className="welcome-row">
        <div>
          <p className="eyebrow date-eyebrow">{dateLabel.toUpperCase()} <span className="demo-tag">FARM DATA</span></p>
          <h1>Welcome, {firstName}</h1>
          <p className="welcome-copy">Here’s what’s happening at {farm?.name || 'your farm'}.</p>
        </div>
        <div className="quick-actions">
          <button type="button" className="button-secondary" onClick={() => onNavigate?.('Weight Monitoring')}><Weight size={16} /> Record weight</button>
          <button type="button" className="button-primary" onClick={() => onNavigate?.('Flocks & Batches')}><Plus size={17} /> Add batch</button>
        </div>
      </header>
      <div className="filter-strip">
        <div style={{ position: 'relative' }}>
          <button type="button" className="farm-filter" onClick={() => setShowFarmMenu((value) => !value)} aria-expanded={showFarmMenu}>
            <span className="farm-dot" />{farm?.name || 'Select a farm'} <ChevronDown size={15} />
          </button>
          {showFarmMenu && farms.length > 1 && (
            <div className="panel" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, minWidth: 220, padding: 8 }}>
              {farms.map((item) => <button type="button" key={item.id} className="task-row" onClick={() => { onFarmChange?.(item.id); setShowFarmMenu(false) }}>{item.name}</button>)}
            </div>
          )}
        </div>
        <span className="filter-divider" />
        <select className="small-filter" aria-label="Filter houses" value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)}>
          <option value="all">All houses</option>
          {houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}
        </select>
        <select className="small-filter" aria-label="Filter flocks" value={flockFilter} onChange={(e) => setFlockFilter(e.target.value)}>
          <option value="all">All flocks</option>
          {flocks.map((flock) => <option key={flock.id} value={flock.id}>{batches.find((b) => b.id === flock.batch_id)?.batch_number || flock.name}</option>)}
        </select>
        <span className="freshness"><Clock3 size={13} /> Farm records</span>
      </div>
      <section className="metrics-grid" aria-label="Farm metrics">{metrics.map((item) => <MetricCard key={item.label} item={item} />)}</section>
      <div className="dashboard-grid main-grid">
        <ConsumptionChart />
        <FlockSummary flocks={filteredFlocks} batches={batches} onNavigate={onNavigate} />
      </div>
      <div className="dashboard-grid lower-grid">
        <AlertsCard />
        <TaskList onNavigate={onNavigate} />
        <AdvisoryCard onNavigate={onNavigate} />
      </div>
      <footer className="page-foot">
        <span>{houses.length} houses · {pens.length} pens · {formatNumber(flocks.length)} registered flocks</span>
        <button type="button" onClick={() => onNavigate?.('Knowledge Library')}><Leaf size={14} /> Explore the knowledge library</button>
      </footer>
    </div>
  )
}

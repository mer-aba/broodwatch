'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Bird, ChevronDown, CircleAlert, Clock3, Leaf, Plus, Sparkles, Weight, Wheat } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BroodWatchWeightAlerts } from '@/components/monitoring/BroodWatchWeightAlerts'

const formatNumber = value => new Intl.NumberFormat('en-UG').format(value)
const number = value => Number(value) || 0

const toIsoDay = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const daysAgoIso = days => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return toIsoDay(d)
}

const dateLabel = () =>
  new Intl.DateTimeFormat('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())

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

function OperationsChart({ rows, onNavigate }) {
  const [range, setRange] = useState(7)
  const data = Array.from({length: range}, (_, i) => {
    const day = daysAgoIso(range - 1 - i)
    const records = rows.filter(r => r.record_date === day)
    return { day: day.slice(5), feed: records.length ? records.reduce((a,r)=>a+number(r.feed_consumed_kg),0) : null, water: records.length ? records.reduce((a,r)=>a+number(r.water_consumed_l),0) : null }
  })
  return <section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">FLOCK OPERATIONS</p><h2>Feed & water consumption</h2><p className="subtle">Final daily records · selected scope</p><button className="text-link" onClick={()=>onNavigate?.('Feed & Water')}>Open feed & water →</button></div><select aria-label="Chart period" className="small-filter" value={range} onChange={e=>setRange(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option></select></div><div className="chart-legend"><span>Feed (kg) · left axis</span><span>Water (L) · right axis</span></div>{data.some(r=>r.feed!==null) ? <div style={{height:260,minWidth:0,width:'100%'}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid vertical={false} strokeDasharray="3 4"/><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis yAxisId="feed" width={42}/><YAxis yAxisId="water" orientation="right" width={42}/><Tooltip/><Area yAxisId="feed" name="Feed (kg)" dataKey="feed" stroke="#1c634e" fill="#1c634e" fillOpacity={0.12}/><Area yAxisId="water" name="Water (L)" dataKey="water" stroke="#d9a441" fill="#d9a441" fillOpacity={0.12}/></AreaChart></ResponsiveContainer></div>:<p className="subtle" style={{padding:20}}>No final daily records in this period.</p>}</section>
}

function useOperations(farmId) {
  const [state,setState]=useState({farmId:null,loading:true,errors:{},daily:[],eggs:[],events:[],tasks:[],alerts:[],environment:[]})
  useEffect(()=>{
    let alive=true
    async function load(){
      if(!farmId)return
      const db=createClient(), today=daysAgoIso(0)
      const queries={daily:db.from('daily_records').select('record_date,flock_id,pen_id,feed_consumed_kg,water_consumed_l').eq('farm_id',farmId).eq('status','final').gte('record_date',daysAgoIso(29)).lte('record_date',today),eggs:db.from('egg_collections').select('flock_id,pen_id,eggs_collected,damaged_eggs').eq('farm_id',farmId).eq('collection_date',today),events:db.from('flock_events').select('flock_id,source_pen_id,bird_count').eq('farm_id',farmId).eq('event_type','mortality').eq('event_date',today),tasks:db.from('bw_flock_tasks').select('id,activity,planned_on,kind').eq('farm_id',farmId).eq('status','planned').lte('planned_on',daysAgoIso(-7)).order('planned_on'),alerts:db.from('bw_anomaly_alerts').select('id,title,severity,area,status').eq('farm_id',farmId).in('status',['Open','Acknowledged']).order('created_at',{ascending:false}),environment:db.rpc('bw_environment_latest',{p_farm:farmId})}
      const next={farmId,loading:false,errors:{}}
      await Promise.all(Object.entries(queries).map(async ([key,q])=>{try{const {data,error}=await q;if(error)throw error;next[key]=data||[]}catch(e){next[key]=[];next.errors[key]=e.message||'Unable to load'}}))
      if(alive)setState(next)
    }
    load();const timer=setInterval(load,30000);return()=>{alive=false;clearInterval(timer)}
  },[farmId])
  return state.farmId===farmId?state:{loading:true,errors:{},daily:[],eggs:[],events:[],tasks:[],alerts:[],environment:[]}
}

function LivePanel({title,items,render,empty,error,loading,onOpen}){
 return <section className="panel" style={{minWidth:0}}><div className="panel-heading"><h2>{title}</h2><button className="text-link" onClick={onOpen}>View all →</button></div><div style={{padding:'0 18px 18px',overflowWrap:'anywhere'}}>{loading?<p>Loading…</p>:error?<p role="alert">{error}</p>:items.length?items.slice(0,5).map(render):<p className="subtle">{empty}</p>}</div></section>
}

function FlockSummary({ flocks, batches, onNavigate }) {
  const batchById = useMemo(() => new Map(batches.map(batch => [batch.id, batch])), [batches])

  return (
    <section className="panel flock-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">YOUR FLOCKS</p>
          <h2>Flock performance</h2>
        </div>
        <button type="button" className="text-link" onClick={() => onNavigate?.('Flocks & Batches')}>
          View all <span>→</span>
        </button>
      </div>
      <div className="flock-list">
        {flocks.length === 0 ? (
          <p className="subtle" style={{ padding: 20 }}>No flocks registered for this farm yet.</p>
        ) : flocks.map(flock => {
          const batch = batchById.get(flock.batch_id)
          const initial = number(batch?.initial_count)
          const live = number(flock.current_count)
          const progress = initial > 0 ? Math.min(100, Math.max(0, (live / initial) * 100)) : 0
          const category = batch?.category || 'Poultry'

          return (
            <article className="flock-row" key={flock.id}>
              <div className={`flock-avatar ${category === 'Broiler' ? 'avatar-gold' : 'avatar-sage'}`}>
                <Bird size={18} />
              </div>
              <div className="flock-info">
                <div className="flock-title-line">
                  <strong>{batch?.batch_number || flock.name}</strong>
                  <span className="status-pill">{live > 0 ? 'Active' : 'Empty'}</span>
                </div>
                <p>{category} · {batch?.breed || 'Breed not specified'}</p>
                <div className="flock-progress"><span style={{ width: `${progress}%` }} /></div>
                <small>{formatNumber(live)} current <i>·</i> {formatNumber(initial)} initial birds</small>
              </div>
              <button
                type="button"
                className="icon-plain"
                aria-label={`Open ${batch?.batch_number || flock.name}`}
                onClick={() => onNavigate?.('Flocks & Batches')}
              >
                ↗
              </button>
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
        <div>
          <p className="eyebrow">STAY ON TRACK</p>
          <h2>Today’s tasks</h2>
        </div>
        <span className="count-badge">0</span>
      </div>
      <div className="task-list">
        <p className="subtle" style={{ padding: 20 }}>
          No scheduled tasks available. Task management will be connected in the next phase.
        </p>
      </div>
      <button type="button" className="all-tasks" onClick={() => onNavigate?.('Vaccination & Tasks')}>
        See all tasks <span>→</span>
      </button>
    </section>
  )
}

function FeedWaterDashboardAlerts({ farmId, onCountChange, onNavigate }) {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setItems([])
    setError('')
    onCountChange?.(null)
    if (!farmId) return () => { active = false }

    createClient()
      .from('feed_water_alerts')
      .select('id,title,detail,severity,created_at,status')
      .eq('farm_id', farmId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message)
        else {
          setItems(data || [])
          onCountChange?.((data || []).length)
        }
      })

    return () => { active = false }
  }, [farmId, onCountChange])

  return (
    <div style={{ padding: '0 18px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>Feed & water alerts</strong>
        <button type="button" className="text-link" onClick={() => onNavigate?.('Feed & Water')}>
          Open Feed & Water →
        </button>
      </div>
      {error ? (
        <p role="alert" className="subtle">Feed/water alert connection: {error}</p>
      ) : items.length === 0 ? (
        <p className="subtle">No open feed/water alerts in loaded records.</p>
      ) : (
        items.slice(0, 4).map(a => (
          <div key={a.id} style={{ padding: '9px 0', borderBottom: '1px solid #e6eae3' }}>
            <strong>{a.severity.toUpperCase()} · {a.title}</strong>
            <p className="subtle">{a.detail}</p>
          </div>
        ))
      )}
      {items.length > 4 && <p className="subtle">+{items.length - 4} more open feed/water alerts</p>}
    </div>
  )
}

function AlertsCard({ farmId, onNavigate, onAlertCountChange, onFeedAlertCountChange }) {
  return (
    <section className="panel alerts-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">NEEDS A LOOK</p>
          <h2>Farm weight alerts</h2>
        </div>
        <button type="button" className="text-link" onClick={() => onNavigate?.('Weight Monitoring')}>
          Weight history <span>→</span>
        </button>
      </div>
      <BroodWatchWeightAlerts
        farmId={farmId}
        onOpenWeightRecord={() => onNavigate?.('Weight Monitoring')}
        onAlertsChanged={onAlertCountChange}
      />
      <FeedWaterDashboardAlerts
        farmId={farmId}
        onNavigate={onNavigate}
        onCountChange={onFeedAlertCountChange}
      />
      <p className="subtle" style={{ padding: '0 20px 16px' }}>
        Weight and feed/water alerts are monitored separately. Anomaly and environmental records are shown separately below.
      </p>
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

const emptyRecords = () => ({ houses: [], pens: [], batches: [], flocks: [], placements: [] })

function useFarmRecords(farmId) {
  const [records, setRecords] = useState(emptyRecords)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      if (!farmId) {
        setRecords(emptyRecords())
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const tables = ['houses', 'pens', 'batches', 'flocks', 'flock_placements']
        const responses = await Promise.all(
          tables.map(table => supabase.from(table).select('*').eq('farm_id', farmId))
        )
        for (const response of responses) if (response.error) throw response.error
        if (!active) return

        setRecords({
          houses: responses[0].data || [],
          pens: responses[1].data || [],
          batches: responses[2].data || [],
          flocks: (responses[3].data || []).filter(f=>!f.archived_at),
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

  return { records, loading, error }
}

function computeMetrics({ houses, flocks, placements, houseFilter, flockFilter, weightAlertCount, feedAlertCount }) {
  const visiblePens = houseFilter === 'all' ? null : null
  const visiblePenIds = houseFilter === 'all' ? null : null
  void visiblePens
  void visiblePenIds

  const pensAll = arguments[0].pens || []
  const pens = houseFilter === 'all' ? pensAll : pensAll.filter(pen => pen.house_id === houseFilter)
  const visiblePenSet = new Set(pens.map(pen => pen.id))
  const visibleFlockSet = new Set(
    flocks.filter(flock => flockFilter === 'all' || flock.id === flockFilter).map(flock => flock.id)
  )

  const filteredPlacements = placements.filter(
    p => visiblePenSet.has(p.pen_id) && visibleFlockSet.has(p.flock_id)
  )

  const placementByFlock = new Map()
  for (const p of placements) {
    placementByFlock.set(p.flock_id, (placementByFlock.get(p.flock_id) || 0) + number(p.bird_count))
  }

  const filteredFlocks = flocks.filter(flock =>
    visibleFlockSet.has(flock.id) &&
    (houseFilter === 'all' || placements.some(p => p.flock_id === flock.id && visiblePenSet.has(p.pen_id)))
  )

  const totalLive = houseFilter === 'all'
    ? filteredFlocks.reduce((sum, flock) => sum + number(flock.current_count), 0)
    : filteredPlacements.reduce((sum, placement) => {
        const flock = flocks.find(f => f.id === placement.flock_id)
        const totalPlaced = placementByFlock.get(placement.flock_id) || 0
        return sum + number(placement.bird_count)
      }, 0)

  return {
    filteredFlocks,
    displayedBirds: Math.round(totalLive),
    metrics: [
      {
        label: 'Active flocks',
        value: formatNumber(filteredFlocks.filter(f => number(f.current_count) > 0).length),
        note: `Across ${houseFilter === 'all' ? houses.length : 1} house(s)`,
        icon: Bird,
        tone: 'green',
      },
      {
        label: 'Live birds',
        value: formatNumber(Math.round(totalLive)),
        note: 'Current registered population',
        icon: Activity,
        tone: 'gold',
      },
      {
        label: 'Today’s feed',
        value: '—',
        note: 'Daily feed records not connected',
        icon: Wheat,
        tone: 'sage',
      },
      {
        label: 'Active alerts',
        value: weightAlertCount == null || feedAlertCount == null ? '—' : formatNumber(weightAlertCount + feedAlertCount),
        note: 'Open weight + feed/water alerts',
        icon: CircleAlert,
        tone: 'rose',
      },
    ],
  }
}

function LoadingState() {
  return (
    <div className="dashboard-page">
      <section className="panel" style={{ padding: 28 }}>Loading farm dashboard…</section>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="dashboard-page">
      <section className="panel" style={{ padding: 28 }}>
        <h2>Unable to load dashboard</h2>
        <p role="alert">{error}</p>
        <p className="subtle">
          Check Supabase table permissions and your farm membership, then refresh the page.
        </p>
      </section>
    </div>
  )
}

function DashboardHeader({ firstName, farm, onNavigate }) {
  return (
    <header className="welcome-row">
      <div>
        <p className="eyebrow date-eyebrow">
          {dateLabel().toUpperCase()} <span className="demo-tag">FARM DATA</span>
        </p>
        <h1>Welcome, {firstName}</h1>
        <p className="welcome-copy">Here’s what’s happening at {farm?.name || 'your farm'}.</p>
      </div>
      <div className="quick-actions">
        <button type="button" className="button-secondary" onClick={() => onNavigate?.('Weight Monitoring')}>
          <Weight size={16} /> Record weight
        </button>
        <button type="button" className="button-primary" onClick={() => onNavigate?.('Flocks & Batches')}>
          <Plus size={17} /> Add batch
        </button>
      </div>
    </header>
  )
}

function FilterStrip({
  farm, farms, houses, flocks, batches,
  showFarmMenu, setShowFarmMenu, onFarmChange,
  houseFilter, setHouseFilter, flockFilter, setFlockFilter,
}) {
  return (
    <div className="filter-strip">
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="farm-filter"
          onClick={() => setShowFarmMenu(value => !value)}
          aria-expanded={showFarmMenu}
        >
          <span className="farm-dot" />{farm?.name || 'Select a farm'} <ChevronDown size={15} />
        </button>
        {showFarmMenu && farms.length > 1 && (
          <div className="panel" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, minWidth: 220, padding: 8 }}>
            {farms.map(item => (
              <button
                type="button"
                key={item.id}
                className="task-row"
                onClick={() => { onFarmChange?.(item.id); setShowFarmMenu(false) }}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="filter-divider" />

      <select
        className="small-filter"
        aria-label="Filter houses"
        value={houseFilter}
        onChange={e => setHouseFilter(e.target.value)}
      >
        <option value="all">All houses</option>
        {houses.map(house => <option key={house.id} value={house.id}>{house.name}</option>)}
      </select>

      <select
        className="small-filter"
        aria-label="Filter flocks"
        value={flockFilter}
        onChange={e => setFlockFilter(e.target.value)}
      >
        <option value="all">All flocks</option>
        {flocks.map(flock => (
          <option key={flock.id} value={flock.id}>
            {batches.find(b => b.id === flock.batch_id)?.batch_number || flock.name}
          </option>
        ))}
      </select>

      <span className="freshness"><Clock3 size={13} /> Farm records</span>
    </div>
  )
}

function DashboardFooter({ houses, pens, flocks, onNavigate }) {
  return (
    <footer className="page-foot">
      <span>{houses.length} houses · {pens.length} pens · {formatNumber(flocks.length)} registered flocks</span>
      <button type="button" onClick={() => onNavigate?.('Knowledge Library')}>
        <Leaf size={14} /> Explore the knowledge library
      </button>
    </footer>
  )
}

export default function Dashboard({ onNavigate, userName = 'Farmer', farm, farmId, farms = [], onFarmChange }) {
  const { records, loading, error } = useFarmRecords(farmId)
  const ops = useOperations(farmId)
  const { houses, pens, batches, flocks, placements } = records

  const [showFarmMenu, setShowFarmMenu] = useState(false)
  const [houseFilter, setHouseFilter] = useState('all')
  const [flockFilter, setFlockFilter] = useState('all')
  const [weightAlertCount, setWeightAlertCount] = useState(null)
  const [feedAlertCount, setFeedAlertCount] = useState(null)

  useEffect(() => {
    setHouseFilter('all')
    setFlockFilter('all')
    setWeightAlertCount(null)
  }, [farmId])

  const { filteredFlocks, metrics } = useMemo(
    () => computeMetrics({
      houses, pens, flocks, placements,
      houseFilter, flockFilter,
      weightAlertCount, feedAlertCount,
    }),
    [houses, pens, flocks, placements, houseFilter, flockFilter, weightAlertCount, feedAlertCount]
  )

  const scoped = (r, penKey='pen_id') => (flockFilter==='all'||r.flock_id===flockFilter)&&(houseFilter==='all'||pens.some(p=>p.id===r[penKey]&&p.house_id===houseFilter))
  const daily = ops.daily.filter(r=>scoped(r))
  const todayRows = daily.filter(r=>r.record_date===daysAgoIso(0))
  const display = (key,rows,field,suffix='') => ops.loading||ops.errors[key]?'—':rows.length?formatNumber(Math.round(rows.reduce((a,r)=>a+number(r[field]),0)*100)/100)+suffix:'—'
  const cards = [...metrics.slice(0,2),{label:'Deaths today',value:display('events',ops.events.filter(r=>scoped(r,'source_pen_id')),'bird_count'),note:'Recorded mortality events · — means no records or unavailable',icon:Activity,tone:'rose'},{label:'Eggs today',value:display('eggs',ops.eggs.filter(r=>scoped(r)),'eggs_collected'),note:'Egg collection register',icon:Bird,tone:'gold'},{label:'Feed consumed today',value:display('daily',todayRows,'feed_consumed_kg',' kg'),note:'Final daily records',icon:Wheat,tone:'sage'},{label:'Water consumed today',value:display('daily',todayRows,'water_consumed_l',' L'),note:'Final daily records',icon:Activity,tone:'green'},{label:'Active anomaly alerts',value:ops.loading||ops.errors.alerts?'—':formatNumber(ops.alerts.length),note:'Farm-wide · open and acknowledged',icon:CircleAlert,tone:'rose'}]
  const firstName = (userName || 'Farmer').trim().split(/\s+/)[0] || 'Farmer'

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} />

  return (
    <div className="dashboard-page bw-live-dashboard">
      <style>{`.bw-live-dashboard{min-width:0}.bw-live-dashboard .metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,185px),1fr));gap:14px}.bw-live-dashboard .dashboard-grid>*{min-width:0}.bw-live-dashboard .lower-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.bw-live-dashboard .filter-strip,.bw-live-dashboard .quick-actions{flex-wrap:wrap}.bw-live-dashboard .panel-heading{flex-wrap:wrap;gap:8px}.bw-live-dashboard .flock-info{min-width:0;overflow-wrap:anywhere}@media(max-width:760px){.bw-live-dashboard .dashboard-grid{display:grid;grid-template-columns:minmax(0,1fr)}.bw-live-dashboard .welcome-row{flex-direction:column;align-items:flex-start}.bw-live-dashboard .filter-strip{height:auto}.bw-live-dashboard .small-filter{max-width:100%}.bw-live-dashboard .metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bw-live-dashboard .metric-card{min-width:0;overflow-wrap:anywhere}}@media(max-width:360px){.bw-live-dashboard .metrics-grid{grid-template-columns:1fr}}`}</style>
      <DashboardHeader firstName={firstName} farm={farm} onNavigate={onNavigate} />

      <FilterStrip
        farm={farm}
        farms={farms}
        houses={houses}
        flocks={flocks}
        batches={batches}
        showFarmMenu={showFarmMenu}
        setShowFarmMenu={setShowFarmMenu}
        onFarmChange={onFarmChange}
        houseFilter={houseFilter}
        setHouseFilter={setHouseFilter}
        flockFilter={flockFilter}
        setFlockFilter={setFlockFilter}
      />

      <section className="metrics-grid" aria-label="Farm metrics">
        {cards.map(item => <MetricCard key={item.label} item={item} />)}
      </section>

      <div className="dashboard-grid main-grid">
        <OperationsChart rows={daily} onNavigate={onNavigate} />
        <FlockSummary flocks={filteredFlocks} batches={batches} onNavigate={onNavigate} />
      </div>

      <div className="dashboard-grid lower-grid">
        <AlertsCard
          farmId={farmId}
          onNavigate={onNavigate}
          onAlertCountChange={setWeightAlertCount}
          onFeedAlertCountChange={setFeedAlertCount}
        />
        <LivePanel title="Upcoming & overdue tasks" items={ops.tasks} loading={ops.loading} error={ops.errors.tasks} empty="No planned tasks due within seven days." onOpen={()=>onNavigate?.('Vaccination & Tasks')} render={r=><div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid #e6eae3'}}><strong>{r.activity}</strong><p className="subtle">{r.planned_on} · {r.planned_on<daysAgoIso(0)?'Overdue':r.kind}</p></div>}/>
        <LivePanel title="Farm anomaly alerts" items={ops.alerts} loading={ops.loading} error={ops.errors.alerts} empty="No open or acknowledged anomaly alerts." onOpen={()=>onNavigate?.('Anomaly Alerts')} render={r=><div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid #e6eae3'}}><strong>{r.title}</strong><p className="subtle">{r.severity} · {r.area} · {r.status}</p></div>}/>
        <LivePanel title="Latest environmental readings" items={ops.environment} loading={ops.loading} error={ops.errors.environment} empty="No environmental readings available." onOpen={()=>onNavigate?.('Live Environment')} render={(r,i)=><div key={r.device_id||i} style={{padding:'10px 0',borderBottom:'1px solid #e6eae3'}}><strong>{r.name||r.device_name||'Sensor '+(i+1)}</strong><p>{r.temperature??'—'} °C · {r.humidity??'—'}% RH</p><p className="subtle">{r.simulated?'Simulated':r.simulated===false?'Device reported':'Source unavailable'} · {r.received_at?new Date(r.received_at).toLocaleString():'No timestamp'}</p></div>}/>
        <AdvisoryCard onNavigate={onNavigate} />
      </div>

      <DashboardFooter houses={houses} pens={pens} flocks={flocks} onNavigate={onNavigate} />
    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, Droplets, Info, RefreshCw, WifiOff } from 'lucide-react'
import { ScreenHeader, Panel, StatePill, Metric, FilterBar } from '../shared/intelligence-ui'
import { createClient } from '@/lib/supabase/client'

const REFRESH_MS = 60000
const PAGE_SIZE = 500

const SEVERITIES = ['All severities', 'Review', 'Data issue']
const STATUSES = ['Open and acknowledged', 'Open', 'Acknowledged', 'Resolved', 'All statuses']

async function fetchFarms() {
  const { data, error } = await createClient().from('farms').select('id,name').order('name')
  if (error) throw error
  return data || []
}

async function fetchAlerts(farmId) {
  const db = createClient()
  const scan = await db.rpc('bw_scan_anomalies', { p_farm: farmId })
  if (scan.error) throw scan.error

  const all = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const q = await db
      .from('bw_anomaly_alerts')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (q.error) throw q.error
    all.push(...q.data)
    if (q.data.length < PAGE_SIZE) break
  }
  return all
}

async function updateAlert(farmId, alertId, status, note) {
  const { error } = await createClient().rpc('bw_update_anomaly', {
    p_farm: farmId,
    p_id: alertId,
    p_status: status,
    p_note: note,
  })
  if (error) throw error
}

function useAnomalyAlerts(farmId) {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!farmId) return
    let live = true

    async function load() {
      try {
        const data = await fetchAlerts(farmId)
        if (live) {
          setRows(data)
          setLoaded(farmId)
          setError('')
        }
      } catch (e) {
        if (live) setError(e.message)
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => { live = false; clearInterval(timer) }
  }, [farmId, revision])

  return {
    rows: loaded === farmId ? rows : [],
    loading: loaded !== farmId && Boolean(farmId),
    error,
    refresh: () => setRevision(x => x + 1),
  }
}

function severityTone(alert) {
  return alert.severity === 'Data issue' ? 'slate' : 'gold'
}

function filterAlerts(alerts, severity, status) {
  return alerts.filter(a => {
    if (severity !== 'All severities' && a.severity !== severity) return false
    if (status === 'All statuses') return true
    if (status === 'Open and acknowledged') return a.status !== 'Resolved'
    return a.status === status
  })
}

function AlertsSummary({ data }) {
  const open = data.filter(x => x.status !== 'Resolved')
  return (
    <div className="intel-alert-summary">
      <Metric label="Open alerts" value={data.filter(x => x.status === 'Open').length} detail="Across this farm" icon={AlertTriangle} tone="gold" />
      <Metric label="Needs review" value={open.filter(x => x.severity === 'Review').length} detail="Unresolved observations" icon={Droplets} tone="green" />
      <Metric label="Data issues" value={open.filter(x => x.severity === 'Data issue').length} detail="Unresolved device notices" icon={WifiOff} tone="slate" />
    </div>
  )
}

function AlertsFilterBar({ farms, farm, id, setLocal, onFarmChange, severity, setSeverity, status, setStatus }) {
  const options = farms.length ? farms : farm ? [farm] : []
  return (
    <FilterBar>
      <label>
        Farm
        <select
          className="range-select"
          value={id}
          onChange={e => { setLocal(e.target.value); onFarmChange?.(e.target.value) }}
        >
          {options.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>

      <label>
        Severity
        <select className="range-select" value={severity} onChange={e => setSeverity(e.target.value)}>
          {SEVERITIES.map(x => <option key={x}>{x}</option>)}
        </select>
      </label>

      <label>
        Status
        <select className="range-select" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(x => <option key={x}>{x}</option>)}
        </select>
      </label>
    </FilterBar>
  )
}

function AlertList({ list, activeId, onSelect }) {
  return (
    <Panel title={`Alert list · ${list.length}`} className="alert-list-panel">
      <div className="alert-list">
        {list.map(x => (
          <button
            key={x.id}
            className={`alert-list-item ${activeId === x.id ? 'selected' : ''}`}
            onClick={() => onSelect(x.id)}
          >
            <span className={`alert-list-symbol ${severityTone(x)}`}><AlertTriangle size={16} /></span>
            <span className="alert-list-copy">
              <strong>{x.title}</strong>
              <small>{x.area} · {new Date(x.created_at).toLocaleString()}</small>
              <StatePill tone={severityTone(x)}>{x.status} · {x.severity}</StatePill>
            </span>
            <ChevronDown size={14} />
          </button>
        ))}
        {!list.length && <p>No matching alerts.</p>}
      </div>
    </Panel>
  )
}

function AlertDetail({ alert, note, setNote, busy, onUpdate }) {
  if (!alert) return <Panel title="Alert details" className="alert-detail-panel"><p>Select an alert to review its evidence.</p></Panel>

  return (
    <Panel title="Alert details" className="alert-detail-panel">
      <div className="alert-detail-title">
        <StatePill tone={severityTone(alert)}>{alert.status} · {alert.severity}</StatePill>
      </div>

      <h2>{alert.title}</h2>
      <p className="alert-location">{alert.area}</p>

      <div className="alert-metric-grid">
        {[
          ['Metric', alert.metric],
          ['Current value', alert.observed],
          ['Baseline', alert.baseline],
          ['Detection', 'Recorded evidence'],
        ].map(([k, v]) => (
          <div key={k}><span>{k}</span><strong>{v}</strong></div>
        ))}
      </div>

      <div className="alert-reason">
        <strong>Why this alert appeared</strong>
        <p>{alert.reason}</p>
      </div>

      <div className="alert-checks">
        <strong>Suggested investigation</strong>
        <p>{alert.steps}</p>
      </div>

      <div className="alert-method">
        <Info size={14} />
        <p>Screening only, not diagnosis. Simulated environmental values are not used for health alerts.</p>
      </div>

      <label className="resolution-note">
        Resolution notes
        <input value={note} onChange={e => setNote(e.target.value)} />
      </label>

      <div className="alert-controls">
        <button className="button-secondary" disabled={busy || alert.status !== 'Open'} onClick={() => onUpdate('Acknowledged')}>
          Acknowledge
        </button>
        <button className="button-primary" disabled={busy} onClick={() => onUpdate(alert.status === 'Resolved' ? 'Open' : 'Resolved')}>
          {alert.status === 'Resolved' ? 'Reopen alert' : 'Mark resolved'}
        </button>
      </div>

      <div className="intel-timeline">
        <span className="timeline-dot" />
        Last updated {new Date(alert.updated_at).toLocaleString()}
      </div>
    </Panel>
  )
}

export function AnomalyAlerts({ farmId, farm, farms = [], onFarmChange }) {
  const [available, setAvailable] = useState([])
  const [local, setLocal] = useState('')
  const [selected, setSelected] = useState('')
  const [severity, setSeverity] = useState('All severities')
  const [status, setStatus] = useState('Open and acknowledged')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const id = local || farmId || farm?.id || farms[0]?.id || available[0]?.id || ''
  const { rows: data, loading, error, refresh } = useAnomalyAlerts(id)

  useEffect(() => { setLocal('') }, [farmId, farm?.id])

  useEffect(() => {
    let live = true
    fetchFarms()
      .then(list => { if (live) setAvailable(list) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const filtered = useMemo(() => filterAlerts(data, severity, status), [data, severity, status])

  const active = filtered.find(x => x.id === selected) || filtered[0]

  useEffect(() => {
    setNote(active?.resolution_note || '')
  }, [active?.id, active?.resolution_note])

  async function update(next) {
    if (!active || busy) return
    setBusy(true)
    setActionError('')
    try {
      await updateAlert(id, active.id, next, note)
      refresh()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="MONITORING"
        title="Anomaly alerts"
        description="Review recorded observations and data freshness."
        action={{ label: 'Refresh alerts', icon: RefreshCw, onClick: refresh }}
      />

      <AlertsSummary data={data} />

      <AlertsFilterBar
        farms={available.length ? available : farms}
        farm={farm}
        id={id}
        setLocal={setLocal}
        onFarmChange={onFarmChange}
        severity={severity}
        setSeverity={setSeverity}
        status={status}
        setStatus={setStatus}
      />

      {(error || actionError) && <p role="alert">{actionError || error}</p>}
      {loading && <p>Loading alerts…</p>}

      <div className="alert-workspace">
        <AlertList list={filtered} activeId={active?.id} onSelect={setSelected} />
        <AlertDetail
          alert={active}
          note={note}
          setNote={setNote}
          busy={busy}
          onUpdate={update}
        />
      </div>
    </div>
  )
}
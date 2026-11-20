'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, Droplets, Info, MoreHorizontal, WifiOff } from 'lucide-react'

import {
  ScreenHeader,
  Panel,
  StatePill,
  DemoFlag,
  Metric,
  FilterBar,
  FilterControl,
} from '../shared/intelligence-ui'

import { demoAlerts } from '../data/intelligence-demo-data'

export function AnomalyAlerts() {
  const [selected, setSelected] = useState(demoAlerts[0])
  const [status, setStatus] = useState({})
  const [severity, setSeverity] = useState('All severities')
  const list = demoAlerts.filter(
    (alert) => severity === 'All severities' || alert.severity === severity,
  )
  const alertStatus = status[selected.id] || 'Open'
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="MONITORING"
        title="Anomaly alerts"
        description="Understand what triggered a flag before deciding what to check."
      />
      <div className="intel-alert-summary">
        <Metric
          label="Open alerts"
          value={demoAlerts.filter((item) => (status[item.id] || 'Open') === 'Open').length}
          detail="Across this farm"
          icon={AlertTriangle}
          tone="gold"
        />
        <Metric
          label="Needs review"
          value="1"
          detail="Flock observation"
          icon={Droplets}
          tone="green"
        />
        <Metric
          label="Data issues"
          value="2"
          detail="Offline or missing data"
          icon={WifiOff}
          tone="slate"
        />
      </div>
      <FilterBar>
        <FilterControl
          label="Farm"
          value="Green Valley Poultry Farm"
          options={['Green Valley Poultry Farm']}
        />
        <FilterControl
          label="Severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          options={['All severities', 'Review', 'Data issue']}
        />
        <FilterControl
          label="Status"
          value="Open and acknowledged"
          options={['Open and acknowledged', 'Open', 'Acknowledged', 'Resolved']}
        />
        <span className="intel-filter-spacer" />
        <DemoFlag />
      </FilterBar>
      <div className="alert-workspace">
        <Panel title={`Alert list · ${list.length}`} className="alert-list-panel">
          <div className="alert-list">
            {list.map((alert) => (
              <button
                key={alert.id}
                className={`alert-list-item ${selected.id === alert.id ? 'selected' : ''}`}
                onClick={() => setSelected(alert)}
              >
                <span className={`alert-list-symbol ${alert.tone}`}>
                  <AlertTriangle size={16} />
                </span>
                <span className="alert-list-copy">
                  <strong>{alert.title}</strong>
                  <small>
                    {alert.area} · {alert.time}
                  </small>
                  <span>
                    <StatePill tone={alert.tone}>
                      {status[alert.id] || 'Open'} · {alert.severity}
                    </StatePill>
                  </span>
                </span>
                <ChevronDown size={14} />
              </button>
            ))}
          </div>
        </Panel>
        <Panel
          title="Alert details"
          action={
            <button className="quiet-icon" aria-label="More alert actions">
              <MoreHorizontal size={18} />
            </button>
          }
          className="alert-detail-panel"
        >
          <div className="alert-detail-title">
            <StatePill tone={selected.tone}>
              {alertStatus} · {selected.severity}
            </StatePill>
            <span>{selected.time}</span>
          </div>
          <h2>{selected.title}</h2>
          <p className="alert-location">
            {selected.area} <i>·</i> {selected.flock}
          </p>
          <div className="alert-metric-grid">
            <div>
              <span>Metric</span>
              <strong>{selected.metric}</strong>
            </div>
            <div>
              <span>Current value</span>
              <strong>{selected.value}</strong>
            </div>
            <div>
              <span>Baseline</span>
              <strong>{selected.baseline}</strong>
            </div>
            <div>
              <span>Detection</span>
              <strong>2 demo observations</strong>
            </div>
          </div>
          <div className="alert-reason">
            <strong>Why this alert appeared</strong>
            <p>{selected.why}</p>
          </div>
          <div className="alert-checks">
            <strong>Suggested investigation</strong>
            <p>{selected.steps}</p>
          </div>
          <div className="alert-method">
            <Info size={14} />
            <p>
              Demo logic: rolling-median comparison and persistence across consecutive observations.
              No live sensor feed or automated health diagnosis.
            </p>
          </div>
          <div className="alert-controls">
            <button
              className="button-secondary"
              onClick={() => setStatus({ ...status, [selected.id]: 'Acknowledged' })}
              disabled={alertStatus === 'Acknowledged'}
            >
              Acknowledge
            </button>
            <button
              className="button-primary"
              onClick={() =>
                setStatus({
                  ...status,
                  [selected.id]: alertStatus === 'Resolved' ? 'Open' : 'Resolved',
                })
              }
            >
              {alertStatus === 'Resolved' ? 'Reopen alert' : 'Mark resolved'}
            </button>
          </div>
          <label className="resolution-note">
            Resolution notes
            <input placeholder="Add a note before closing (optional)" />
          </label>
        </Panel>
      </div>
      <div className="intel-timeline">
        <span className="timeline-dot" />
        <span>Alert generated from demonstration data</span>
        <small>{selected.time}</small>
      </div>
    </div>
  )
}

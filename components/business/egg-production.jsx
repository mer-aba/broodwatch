'use client'

import { useState } from 'react'
import { Activity, Check, CircleAlert, Clock3, Egg, Plus } from 'lucide-react'

import {
  ScreenHeader,
  Panel,
  StatePill,
  DemoFlag,
  Metric,
  Field,
  FilterControl,
  Table,
} from '../shared/intelligence-ui'

export function EggProduction() {
  const [saved, setSaved] = useState(false)
  const rows = [
    ['15 Nov 2026', 'House B · B1', '102', '4', '120 birds'],
    ['14 Nov 2026', 'House B · B1', '98', '2', '120 birds'],
    ['13 Nov 2026', 'House B · B1', '96', '3', '120 birds'],
  ]
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="FLOCK OPERATIONS"
        title="Egg production"
        description="Keep daily collection totals and quality notes for your layer flock."
        action={{
          label: 'Record egg collection',
          icon: Plus,
          onClick: () =>
            document.getElementById('egg-entry')?.scrollIntoView({ behavior: 'smooth' }),
        }}
      />
      {saved && (
        <div className="ops-success">
          <Check size={16} />
          Egg collection saved as a demonstration entry.
        </div>
      )}
      <DemoFlag />
      <div className="analytics-metrics">
        <Metric
          label="Eggs collected today"
          value="104"
          detail="House B · Pen B1"
          icon={Egg}
          tone="gold"
        />
        <Metric
          label="Damaged eggs"
          value="3"
          detail="Reported today"
          icon={CircleAlert}
          tone="rose"
        />
        <Metric
          label="Active layer flock"
          value="120"
          detail="Initial placement: 120"
          icon={Activity}
          tone="sage"
        />
        <Metric
          label="Recent records"
          value="3 days"
          detail="Records available in demo"
          icon={Clock3}
        />
      </div>
      <Panel
        title="Recent egg collection"
        action={
          <FilterControl
            label="Period"
            value="Last 7 days"
            options={['Last 7 days', 'Last 30 days']}
          />
        }
      >
        <Table
          headings={['DATE', 'LOCATION', 'EGGS COLLECTED', 'DAMAGED', 'FLOCK COUNT']}
          rows={rows}
        />
        <p className="chart-caption">
          Collection values are example records, not production benchmarks.
        </p>
      </Panel>
      <Panel id="egg-entry" title="Record daily collection">
        <div className="intel-form-grid">
          <Field label="Layer flock" options={['LY-2026-002 · Lohmann Brown']} />
          <Field label="House and pen" options={['House B · Pen B1']} />
          <Field label="Collection date" type="date" value="2026-11-16" />
          <Field label="Eggs collected" type="number" min="0" placeholder="e.g. 104" />
          <Field label="Damaged eggs" type="number" min="0" placeholder="0" />
          <Field label="Collection notes" placeholder="Optional notes" />
        </div>
        <div className="intel-form-footer">
          <span>Record the actual count; comparisons need flock context.</span>
          <button className="button-primary" onClick={() => setSaved(true)}>
            <Check size={15} />
            Save collection
          </button>
        </div>
      </Panel>
    </div>
  )
}

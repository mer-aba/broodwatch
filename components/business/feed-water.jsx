'use client'

import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowUpRight, Check, CircleAlert, Droplets, Plus, Wheat } from 'lucide-react'

import { ScreenHeader, Panel, StatePill, DemoFlag, Metric, Field } from '../shared/intelligence-ui'

import { demoTrend } from '../data/intelligence-demo-data'

export function FeedWater() {
  const [saved, setSaved] = useState(false)
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="FLOCK OPERATIONS"
        title="Feed & water"
        description="Review supply records and log daily allocations by flock."
        action={{
          label: 'Record allocation',
          icon: Plus,
          onClick: () =>
            document.getElementById('feed-entry')?.scrollIntoView({ behavior: 'smooth' }),
        }}
      />
      {saved && (
        <div className="ops-success">
          <Check size={16} />
          Feed and water allocation added to the demonstration log.
        </div>
      )}
      <DemoFlag />
      <div className="analytics-metrics">
        <Metric
          label="Feed on hand"
          value="17 bags"
          detail="Inventory demo estimate"
          icon={Wheat}
        />
        <Metric
          label="Feed allocated today"
          value="30 kg"
          detail="Across active pens"
          icon={ArrowUpRight}
          tone="gold"
        />
        <Metric
          label="Water recorded today"
          value="48 L"
          detail="Measurement entered manually"
          icon={Droplets}
          tone="sage"
        />
        <Metric
          label="Low stock"
          value="2 items"
          detail="Check inventory"
          icon={CircleAlert}
          tone="rose"
        />
      </div>
      <div className="intel-two-col">
        <Panel
          title="Recent consumption"
          action={<StatePill tone="blue">Last 7 days · demo</StatePill>}
        >
          <div className="chart-legend">
            <span>
              <i className="feed-dot" />
              Feed (kg)
            </span>
            <span>
              <i className="water-dot" />
              Water (L)
            </span>
          </div>
          <div className="intel-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demoTrend}>
                <CartesianGrid vertical={false} stroke="#e9ede6" strokeDasharray="3 4" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8b948a', fontSize: 10 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b948a', fontSize: 10 }} />
                <Tooltip />
                <Area dataKey="feed" stroke="#286e56" fill="#286e5612" />
                <Area dataKey="water" stroke="#d9a441" fill="#d9a44112" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Stock notes">
          <div className="stock-line">
            <span>Broiler starter pellets</span>
            <strong>8 bags</strong>
            <StatePill>Available</StatePill>
          </div>
          <div className="stock-line">
            <span>Broiler grower mash</span>
            <strong>3 bags</strong>
            <StatePill tone="gold">Low</StatePill>
          </div>
          <p className="chart-caption">
            Stock is demonstration data; no feed or water sensors are connected.
          </p>
        </Panel>
      </div>
      <Panel id="feed-entry" title="Record feed & water allocation">
        <div className="intel-form-grid">
          <Field label="Flock" options={['BR-2026-001 · Broiler', 'LY-2026-002 · Layer']} />
          <Field
            label="House and pen"
            options={['House A · Pen A1', 'House A · Pen A2', 'House B · Pen B1']}
          />
          <Field label="Record date" type="date" value="2026-11-16" />
          <Field
            label="Feed supplied (kg)"
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 15"
          />
          <Field
            label="Feed remaining (kg)"
            type="number"
            min="0"
            step="0.1"
            placeholder="Optional"
          />
          <Field
            label="Water supplied (L)"
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 24"
          />
        </div>
        <div className="intel-form-footer">
          <span>Manual entry · demo only</span>
          <button className="button-primary" onClick={() => setSaved(true)}>
            <Check size={15} />
            Save allocation
          </button>
        </div>
      </Panel>
    </div>
  )
}

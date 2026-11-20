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
import { Droplets, HeartPulse, Info, Wheat } from 'lucide-react'

import {
  ScreenHeader,
  Panel,
  DemoFlag,
  Metric,
  FilterBar,
  FilterControl,
  ClipboardIcon,
} from '../shared/intelligence-ui'

import { demoTrend } from '../data/intelligence-demo-data'

export function TrendsAnalytics() {
  const [metric, setMetric] = useState('Feed & water')
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="MONITORING"
        title="Trends & analytics"
        description="Explore recorded patterns across your flocks. All values shown are examples."
      />
      <FilterBar>
        <FilterControl
          label="Farm"
          value="Green Valley Poultry Farm"
          options={['Green Valley Poultry Farm']}
        />
        <FilterControl
          label="Flock"
          value="All active flocks"
          options={['All active flocks', 'BR-2026-001', 'LY-2026-002']}
        />
        <FilterControl
          label="Period"
          value="Last 7 days"
          options={['Last 7 days', 'Last 30 days', 'This month']}
        />
        <DemoFlag />
      </FilterBar>
      <div className="analytics-metrics">
        <Metric
          label="Feed recorded"
          value="207 kg"
          detail="7 day total · demo"
          icon={Wheat}
          trend="↑ 4%"
        />
        <Metric
          label="Water recorded"
          value="330 L"
          detail="7 day total · demo"
          icon={Droplets}
          trend="↑ 3%"
          tone="gold"
        />
        <Metric
          label="Mortality recorded"
          value="2 birds"
          detail="Across all active flocks"
          icon={HeartPulse}
          tone="rose"
        />
        <Metric
          label="Records complete"
          value="86%"
          detail="Missing days excluded"
          icon={ClipboardIcon}
          tone="sage"
        />
      </div>
      <div className="intel-two-col">
        <Panel
          title="Consumption trend"
          action={
            <select
              className="range-select"
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
            >
              <option>Feed & water</option>
              <option>Mortality</option>
            </select>
          }
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
              <AreaChart data={demoTrend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e9ede6" strokeDasharray="3 4" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8b948a', fontSize: 10 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b948a', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e6eae3', fontSize: 10 }}
                />
                {metric === 'Mortality' ? (
                  <Area
                    type="monotone"
                    dataKey="mortality"
                    name="Mortality (birds)"
                    stroke="#ba6a59"
                    fill="#ba6a5912"
                    strokeWidth={2.3}
                  />
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="feed"
                      name="Feed (kg)"
                      stroke="#286e56"
                      fill="#286e5615"
                      strokeWidth={2.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="water"
                      name="Water (L)"
                      stroke="#d9a441"
                      fill="#d9a44114"
                      strokeWidth={2.3}
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Flock comparison">
          <div className="compare-row">
            <span className="compare-chip gold">BR</span>
            <div>
              <strong>BR-2026-001</strong>
              <small>Broiler · 28 days · 186 live</small>
            </div>
            <strong>7 days</strong>
          </div>
          <div className="compare-row">
            <span className="compare-chip sage">LY</span>
            <div>
              <strong>LY-2026-002</strong>
              <small>Layer · 16 weeks · 120 live</small>
            </div>
            <strong>7 days</strong>
          </div>
          <p className="chart-caption">
            Compare flocks within the same production category and stage. Cross-category benchmarks
            are not combined.
          </p>
        </Panel>
      </div>
      <div className="trend-note">
        <Info size={15} />
        <span>
          Charts summarize mock records only. Environmental values are simulated, and no MAAIF
          target bands are implied.
        </span>
      </div>
    </div>
  )
}

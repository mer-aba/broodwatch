'use client'

import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  CircleAlert,
  Info,
  Plus,
  Thermometer,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { ScreenHeader, Panel, StatePill, DemoFlag, Metric, Field } from '../shared/intelligence-ui'

import { demoTrend } from '../data/intelligence-demo-data'

export function EnvironmentMonitoring() {
  const [range, setRange] = useState('24 hours')
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="MONITORING"
        title="Live environment"
        description="See recent temperature and humidity readings for registered devices."
        action={{
          label: 'Register device',
          icon: Plus,
          onClick: () =>
            document.getElementById('device-form')?.scrollIntoView({ behavior: 'smooth' }),
        }}
      />
      <div className="environment-warning">
        <Info size={15} />
        <span>
          <strong>Simulated preview data.</strong> No sensors are connected. Readings below are
          examples for the interface.
        </span>
        <DemoFlag />
      </div>
      <div className="device-overview-grid">
        <article className="device-card">
          <div className="device-card-head">
            <span className="device-icon connected">
              <Thermometer size={18} />
            </span>
            <div>
              <strong>House A environment</strong>
              <small>ESP32 · DHT22-01</small>
            </div>
            <StatePill>Reporting</StatePill>
          </div>
          <div className="device-reading">
            <div>
              <span>Temperature</span>
              <strong>
                28.4 <small>°C</small>
              </strong>
              <p>
                <TrendingUp size={13} /> +0.3° from last check
              </p>
            </div>
            <div>
              <span>Relative humidity</span>
              <strong>
                64 <small>%</small>
              </strong>
              <p>
                <Activity size={13} /> Last reading · 4 min ago
              </p>
            </div>
          </div>
          <div className="device-meta">
            <span>
              <Wifi size={13} /> Device online
            </span>
            <span>House A · general area</span>
          </div>
        </article>
        <article className="device-card stale">
          <div className="device-card-head">
            <span className="device-icon offline">
              <WifiOff size={18} />
            </span>
            <div>
              <strong>House B environment</strong>
              <small>ESP32 · DHT22-02</small>
            </div>
            <StatePill tone="gold">Stale · 2 hours</StatePill>
          </div>
          <div className="stale-content">
            <CircleAlert size={17} />
            <div>
              <strong>Waiting for a new reading</strong>
              <p>
                Check the device connection. This is a data freshness notice, not a poultry-health
                alert.
              </p>
            </div>
          </div>
          <div className="device-meta">
            <span>
              <WifiOff size={13} /> Last reading · 08:10
            </span>
            <span>House B · general area</span>
          </div>
        </article>
      </div>
      <div className="intel-two-col">
        <Panel
          title="Temperature & humidity trend"
          action={
            <select
              className="range-select"
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              <option>24 hours</option>
              <option>7 days</option>
            </select>
          }
        >
          <div className="chart-legend">
            <span>
              <i className="feed-dot" />
              Temperature (°C)
            </span>
            <span>
              <i className="water-dot" />
              Relative humidity (%)
            </span>
          </div>
          <div className="intel-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demoTrend} margin={{ top: 10, right: 9, left: -18, bottom: 0 }}>
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
                <Line
                  type="monotone"
                  dataKey="temp"
                  name="Temperature °C"
                  stroke="#286e56"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  name="Relative humidity %"
                  stroke="#d9a441"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-caption">
            Example readings only. Reference ranges depend on flock age and housing context; none
            are asserted here.
          </p>
        </Panel>
        <Panel title="Device health">
          <div className="device-health-row">
            <span className="connected-dot" />
            <div>
              <strong>DHT22-01</strong>
              <small>House A · Fresh 4 min ago</small>
            </div>
            <StatePill>Connected</StatePill>
          </div>
          <div className="device-health-row">
            <span className="stale-dot" />
            <div>
              <strong>DHT22-02</strong>
              <small>House B · Last update 2 hours ago</small>
            </div>
            <StatePill tone="gold">Check device</StatePill>
          </div>
          <div className="device-spec">
            <span>Hardware scope</span>
            <strong>ESP32 + DHT22</strong>
          </div>
          <div className="device-spec">
            <span>Last sync</span>
            <strong>Today · 10:26 (demo)</strong>
          </div>
        </Panel>
      </div>
      <Panel
        title="Register an environmental device"
        className="device-register"
        action={<span className="optional-label">Optional · demo only</span>}
      >
        <div id="device-form" className="register-device-grid">
          <Field label="Device identifier" placeholder="e.g. ESP32-001" />
          <Field label="Friendly name" placeholder="e.g. House A sensor" />
          <Field
            label="Assign to house or pen"
            options={['House A', 'House B', 'Pen A1', 'Pen A2', 'Pen B1']}
          />
          <Field label="Installation date" type="date" />
          <button
            className="button-primary"
            onClick={(event) => {
              event.currentTarget.innerText = 'Device added to demo'
              event.currentTarget.disabled = true
            }}
          >
            Add device
          </button>
        </div>
      </Panel>
    </div>
  )
}

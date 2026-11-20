'use client'

import { useState } from 'react'
import { Check, Info, Plus, Thermometer, Wifi, WifiOff } from 'lucide-react'

import { ScreenHeader, Panel, StatePill, DemoFlag, Field } from '../shared/intelligence-ui'

export function Devices() {
  const [registered, setRegistered] = useState(false)
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="ADMINISTRATION"
        title="Devices"
        description="Manage environmental monitoring devices assigned to your poultry houses."
        action={{
          label: 'Register device',
          icon: Plus,
          onClick: () =>
            document.getElementById('devices-register')?.scrollIntoView({ behavior: 'smooth' }),
        }}
      />
      <div className="environment-warning">
        <Info size={15} />
        <span>
          <strong>Demo device list.</strong> No hardware is currently connected. Initial hardware
          scope: ESP32 and DHT22 temperature/humidity sensor.
        </span>
        <DemoFlag />
      </div>
      <div className="device-list-cards">
        <article className="device-card">
          <div className="device-card-head">
            <span className="device-icon connected">
              <Thermometer size={18} />
            </span>
            <div>
              <strong>House A climate monitor</strong>
              <small>ESP32 · DHT22-01 · Installed 02 Nov 2026</small>
            </div>
            <StatePill>Demo online</StatePill>
          </div>
          <div className="device-meta">
            <span>
              <Wifi size={13} /> Last sample · 4 min ago
            </span>
            <span>Assigned to House A</span>
          </div>
        </article>
        <article className="device-card">
          <div className="device-card-head">
            <span className="device-icon offline">
              <WifiOff size={18} />
            </span>
            <div>
              <strong>House B climate monitor</strong>
              <small>ESP32 · DHT22-02 · Installed 28 Oct 2026</small>
            </div>
            <StatePill tone="gold">Demo stale</StatePill>
          </div>
          <div className="device-meta">
            <span>
              <WifiOff size={13} /> Last sample · 2 hours ago
            </span>
            <span>Assigned to House B</span>
          </div>
        </article>
      </div>
      {registered && (
        <div className="ops-success">
          <Check size={15} />
          Device added to the local demo list.
        </div>
      )}
      <Panel id="devices-register" title="Register a device">
        <div className="intel-form-grid">
          <Field label="Device identifier" placeholder="ESP32-001" />
          <Field label="Friendly name" placeholder="House A climate monitor" />
          <Field
            label="Assign to house or pen"
            options={['House A', 'House B', 'Pen A1', 'Pen A2', 'Pen B1']}
          />
          <Field label="Sensor type" options={['DHT22 · temperature and humidity']} />
          <Field label="Installation date" type="date" />
          <Field label="Device notes" placeholder="Optional" />
        </div>
        <div className="intel-form-footer">
          <span>No feed or water-flow sensors are required for this project.</span>
          <button className="button-primary" onClick={() => setRegistered(true)}>
            <Plus size={15} />
            Register device
          </button>
        </div>
      </Panel>
    </div>
  )
}

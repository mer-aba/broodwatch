'use client'

import { useEffect, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CircleAlert, Info, Plus, Thermometer, TrendingUp, Wifi, WifiOff } from 'lucide-react'
import { ScreenHeader, Panel, StatePill } from '../shared/intelligence-ui'
import { createClient } from '@/lib/supabase/client'

const DEVICE_REFRESH_MS = 15000
const TREND_REFRESH_MS = 60000
const ONLINE_THRESHOLD_MINUTES = 3
const READINGS_PAGE = 1000
const READINGS_MAX = 21000

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

const blank = () => ({ identifier: '', name: '', location: '', date: today() })

const dateTime = t =>
  t ? new Date(t).toLocaleString('en-UG', { timeZone: 'Africa/Kampala' }) : 'Never'

const age = (t, now) => t ? Math.max(0, Math.floor((now - new Date(t).getTime()) / 60000)) : Infinity

const SERIES = [
  ['temp', 'Temperature °C', '#286e56', 't', false],
  ['humidity', 'Humidity %', '#d9a441', 'h', false],
  ['simTemp', 'Simulated temperature °C', '#286e56', 't', true],
  ['simHumidity', 'Simulated humidity %', '#d9a441', 'h', true],
]

function Field({ label, children }) {
  return <label className="intel-field"><span>{label}</span>{children}</label>
}

async function fetchFarms() {
  const { data, error } = await createClient().from('farms').select('id,name')
  if (error) throw error
  return data || []
}

async function fetchEnvironment(farmId) {
  const db = createClient()
  const results = await Promise.all([
    db.from('bw_environment_devices').select('*').eq('farm_id', farmId),
    db.from('houses').select('id,name').eq('farm_id', farmId),
    db.from('pens').select('id,name,house_id').eq('farm_id', farmId),
    db.rpc('bw_environment_latest', { p_farm: farmId }),
  ])

  const failed = results.find(r => r.error)
  if (failed) throw failed.error

  return {
    id: farmId,
    devices: results[0].data || [],
    houses: results[1].data || [],
    pens: results[2].data || [],
    latest: results[3].data || [],
  }
}

async function fetchReadings(deviceId, range) {
  const db = createClient()
  const hours = range === '24 hours' ? 24 : 168
  const since = new Date(Date.now() - hours * 3600000).toISOString()

  const all = []
  for (let offset = 0; offset < READINGS_MAX; offset += READINGS_PAGE) {
    const r = await db
      .from('bw_environment_readings')
      .select('id,received_at,temperature,humidity,simulated')
      .eq('device_id', deviceId)
      .gte('received_at', since)
      .order('received_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + READINGS_PAGE - 1)
    if (r.error) throw r.error
    all.push(...r.data)
    if (r.data.length < READINGS_PAGE) break
  }
  return all
}

function bucketReadings(rows, range) {
  const step = (range === '24 hours' ? 5 : 60) * 60000
  const buckets = new Map()

  for (const r of rows) {
    const t = Math.floor(new Date(r.received_at).getTime() / step) * step
    const key = `${t}-${r.simulated}`
    const b = buckets.get(key) || { t, simulated: r.simulated, n: 0, temp: 0, humidity: 0 }
    b.n++
    b.temp += Number(r.temperature)
    b.humidity += Number(r.humidity)
    buckets.set(key, b)
  }

  return [...buckets.values()]
    .sort((a, b) => a.t - b.t)
    .map(b => ({
      day: new Date(b.t).toLocaleString('en-UG', {
        timeZone: 'Africa/Kampala',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      temp: b.simulated ? null : +(b.temp / b.n).toFixed(1),
      humidity: b.simulated ? null : +(b.humidity / b.n).toFixed(1),
      simTemp: b.simulated ? +(b.temp / b.n).toFixed(1) : null,
      simHumidity: b.simulated ? +(b.humidity / b.n).toFixed(1) : null,
    }))
}

function useEnvironmentData(farmId) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!farmId) return
    let live = true
    let running = false

    async function load() {
      if (running) return
      running = true
      try {
        const result = await fetchEnvironment(farmId)
        if (live) {
          setData(result)
          setError('')
          setNow(Date.now())
        }
      } catch (e) {
        if (live) setError(e.message)
      } finally {
        running = false
      }
    }

    load()
    const timer = setInterval(load, DEVICE_REFRESH_MS)
    return () => { live = false; clearInterval(timer) }
  }, [farmId, revision])

  return {
    data: data?.id === farmId ? data : null,
    error, setError,
    refresh: () => setRevision(x => x + 1),
  }
}

function useReadings(deviceId, range) {
  const [trend, setTrend] = useState([])
  const [chartError, setChartError] = useState('')

  useEffect(() => {
    setTrend([])
    setChartError('')
    if (!deviceId) return

    let live = true
    let running = false

    async function load() {
      if (running) return
      running = true
      try {
        const rows = await fetchReadings(deviceId, range)
        if (live) {
          setTrend(bucketReadings(rows, range))
          setChartError('')
        }
      } catch (e) {
        if (live) setChartError(e.message)
      } finally {
        running = false
      }
    }

    load()
    const timer = setInterval(load, TREND_REFRESH_MS)
    return () => { live = false; clearInterval(timer) }
  }, [deviceId, range])

  return { trend, chartError }
}

function useRegistration(farmId, onRegistered) {
  const [form, setForm] = useState(blank)
  const [credentials, setCredentials] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  async function register(e) {
    e.preventDefault()
    if (lock.current || !farmId || !form.location) return
    lock.current = true
    setBusy(true)
    setError('')
    setCredentials(null)

    try {
      const [kind, loc] = form.location.split(':')
      const r = await createClient().rpc('bw_register_environment', {
        p_farm: farmId,
        p_identifier: form.identifier,
        p_name: form.name,
        p_house: kind === 'house' ? loc : null,
        p_pen: kind === 'pen' ? loc : null,
        p_date: form.date,
      })
      if (r.error) throw r.error
      setCredentials(r.data)
      setForm(blank())
      onRegistered?.()
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return { form, set, credentials, setCredentials, busy, error, register }
}

function DeviceCard({ device, reading, online, locationName }) {
  return (
    <article className={`device-card ${online ? '' : 'stale'}`}>
      <div className="device-card-head">
        <span className={`device-icon ${online ? 'connected' : 'offline'}`}><Thermometer size={18} /></span>
        <div>
          <strong>{device.name}</strong>
          <small>ESP32 · {device.identifier}</small>
        </div>
        <StatePill tone={online ? undefined : 'gold'}>
          {!device.enabled ? 'Disabled' : online ? 'Reporting' : reading ? 'Stale' : 'Awaiting data'}
        </StatePill>
      </div>

      {reading && (
        <div className="device-reading">
          <div>
            <span>Temperature</span>
            <strong>{Number(reading.temperature).toFixed(1)} <small>°C</small></strong>
            <p><TrendingUp size={13} />{reading.simulated ? 'Simulated' : 'Sensor reading'}</p>
          </div>
          <div>
            <span>Relative humidity</span>
            <strong>{Number(reading.humidity).toFixed(1)} <small>%</small></strong>
            <p><Activity size={13} />{dateTime(reading.received_at)}</p>
          </div>
        </div>
      )}

      {!online && (
        <div className="stale-content">
          <CircleAlert size={17} />
          <div>
            <strong>Waiting for a new reading</strong>
            <p>Check device connection. This is not a poultry-health alert.</p>
          </div>
        </div>
      )}

      <div className="device-meta">
        <span>{online ? <Wifi size={13} /> : <WifiOff size={13} />} {online ? 'Recent telemetry' : 'No recent telemetry'}</span>
        <span>{locationName}</span>
      </div>
    </article>
  )
}

function TrendPanel({ devices, deviceId, setSelected, range, setRange, trend, chartError }) {
  return (
    <Panel
      title="Temperature & humidity trend"
      action={
        <>
          <select className="range-select" value={deviceId || ''} onChange={e => setSelected(e.target.value)}>
            {devices.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <select className="range-select" value={range} onChange={e => setRange(e.target.value)}>
            <option>24 hours</option>
            <option>7 days</option>
          </select>
        </>
      }
    >
      <div className="chart-legend">
        <span><i className="feed-dot" />Temperature (°C)</span>
        <span><i className="water-dot" />Relative humidity (%)</span>
      </div>

      {chartError && <p role="alert">{chartError}</p>}

      {trend.length ? (
        <div className="intel-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 9, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e9ede6" strokeDasharray="3 4" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="t" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="h" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              {SERIES.map(([key, name, stroke, axis, sim]) => (
                <Line
                  key={key}
                  yAxisId={axis}
                  dataKey={key}
                  name={name}
                  stroke={stroke}
                  strokeDasharray={sim ? '5 4' : undefined}
                  dot={{ r: 2 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p>No readings in this period.</p>
      )}

      <p className="chart-caption">
        {range === '24 hours' ? '5-minute' : 'Hourly'} averages. Dashed lines represent simulated readings. Times in East Africa Time.
      </p>
    </Panel>
  )
}

function DeviceHealthPanel({ devices, data, fresh, locationName }) {
  return (
    <Panel title="Device health">
      {devices.map(x => (
        <div className="device-health-row" key={x.id}>
          <span className={fresh(x) ? 'connected-dot' : 'stale-dot'} />
          <div>
            <strong>{x.identifier}</strong>
            <small>{locationName(x)} · {dateTime(data?.latest.find(r => r.device_id === x.id)?.received_at)}</small>
          </div>
          <StatePill tone={fresh(x) ? undefined : 'gold'}>
            {fresh(x) ? 'Reporting' : 'Check device'}
          </StatePill>
        </div>
      ))}
      <div className="device-spec"><span>Hardware scope</span><strong>ESP32 + DHT22</strong></div>
      <div className="device-spec"><span>Refresh interval</span><strong>15 seconds</strong></div>
    </Panel>
  )
}

function RegisterPanel({ data, form, set, credentials, setCredentials, busy, register }) {
  return (
    <Panel
      title="Register an environmental device"
      className="device-register"
      action={<span className="optional-label">Optional · IoT</span>}
    >
      <form id="device-form" className="register-device-grid" onSubmit={register}>
        <Field label="Device identifier">
          <input required maxLength={80} value={form.identifier} onChange={e => set('identifier', e.target.value)} placeholder="ESP32-001" />
        </Field>

        <Field label="Friendly name">
          <input required maxLength={120} value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>

        <Field label="Assign to house or pen">
          <select required value={form.location} onChange={e => set('location', e.target.value)}>
            <option value="">Select location</option>
            {data?.houses.map(h => <option key={h.id} value={`house:${h.id}`}>{h.name}</option>)}
            {data?.pens.map(p => (
              <option key={p.id} value={`pen:${p.id}`}>
                {data.houses.find(h => h.id === p.house_id)?.name} · {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Installation date">
          <input required type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>

        <button className="button-primary" disabled={busy || !data}>
          {busy ? 'Registering…' : 'Add device'}
        </button>
      </form>

      {credentials && (
        <div role="status">
          <p>Device registered. Copy the credentials now; the token is not retrievable later.</p>
          <Field label="Device UUID"><input readOnly value={credentials.device_id} /></Field>
          <Field label="Device token"><input readOnly value={credentials.token} /></Field>
          <button className="button-secondary" onClick={() => setCredentials(null)}>Hide credentials</button>
        </div>
      )}
    </Panel>
  )
}

export function EnvironmentMonitoring({ farmId, farm, farms = [], onFarmChange }) {
  const [found, setFound] = useState([])
  const [local, setLocal] = useState('')
  const [range, setRange] = useState('24 hours')
  const [selected, setSelected] = useState('')

  const options = [...new Map([...found, ...farms, ...(farm?.id ? [farm] : [])].map(f => [f.id, f])).values()]
  const id = local || farmId || farm?.id || options[0]?.id || ''

  const { data, error, setError, refresh } = useEnvironmentData(id)
  const devices = data?.devices || []
  const device = devices.find(x => x.id === selected) || devices[0]
  const deviceId = device?.id

  const { trend, chartError } = useReadings(deviceId, range)
  const registration = useRegistration(id, refresh)

  useEffect(() => { setLocal('') }, [farmId])

  useEffect(() => {
    let live = true
    fetchFarms()
      .then(list => { if (live) setFound(list) })
      .catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [])

  useEffect(() => { setSelected(''); registration.setCredentials(null) }, [id])

  const now = Date.now()

  const latestReading = device => data?.latest.find(r => r.device_id === device.id)
  const locationName = device => {
    if (device.pen_id) {
      const pen = data?.pens.find(p => p.id === device.pen_id)
      const house = data?.houses.find(h => h.id === pen?.house_id)
      return `${house?.name || 'House'} · ${pen?.name || 'Pen'}`
    }
    return data?.houses.find(h => h.id === device.house_id)?.name || 'House'
  }
  const isFresh = device => {
    const t = latestReading(device)?.received_at
    return device.enabled && age(t, now) < ONLINE_THRESHOLD_MINUTES
  }

  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="MONITORING"
        title="Live environment"
        description="See recent temperature and humidity readings for registered devices."
        action={{
          label: 'Register device',
          icon: Plus,
          onClick: () => document.getElementById('device-form')?.scrollIntoView({ behavior: 'smooth' }),
        }}
      />

      <div className="environment-warning">
        <Info size={15} />
        <span>
          <strong>Hardware telemetry.</strong> Simulated readings are labelled and must not be used for poultry health decisions. Reporting status is based on received readings.
        </span>
      </div>

      <Field label="Farm">
        <select
          className="range-select"
          disabled={registration.busy}
          value={id}
          onChange={e => { setLocal(e.target.value); onFarmChange?.(e.target.value) }}
        >
          <option value="">Select farm</option>
          {options.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </Field>

      {error && <p role="alert" className="wizard-validation">{error}</p>}
      {!data && <p>{id ? 'Loading devices…' : 'Select a farm.'}</p>}

      <div className="device-overview-grid">
        {devices.map(x => (
          <DeviceCard
            key={x.id}
            device={x}
            reading={latestReading(x)}
            online={isFresh(x)}
            locationName={locationName(x)}
          />
        ))}
        {data && !devices.length && <p>No devices registered yet.</p>}
      </div>

      <div className="intel-two-col">
        <TrendPanel
          devices={devices}
          deviceId={deviceId}
          setSelected={setSelected}
          range={range}
          setRange={setRange}
          trend={trend}
          chartError={chartError}
        />
        <DeviceHealthPanel
          devices={devices}
          data={data}
          fresh={isFresh}
          locationName={locationName}
        />
      </div>

      <RegisterPanel
        data={data}
        form={registration.form}
        set={registration.set}
        credentials={registration.credentials}
        setCredentials={registration.setCredentials}
        busy={registration.busy}
        register={registration.register}
      />
    </div>
  )
}
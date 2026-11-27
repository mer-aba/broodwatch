'use client'

import { useEffect, useRef, useState } from 'react'
import { Info, Plus, Thermometer, Wifi, WifiOff } from 'lucide-react'
import { ScreenHeader, Panel, StatePill } from '../shared/intelligence-ui'
import { createClient } from '@/lib/supabase/client'

const REFRESH_MS = 15000
const ONLINE_THRESHOLD_MS = 180000

const blank = () => ({
  identifier: '',
  name: '',
  location: '',
  date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date()),
  enabled: true,
})

async function fetchFarms() {
  const { data, error } = await createClient().from('farms').select('id,name')
  if (error) throw error
  return data || []
}

async function fetchDeviceData(db, farmId) {
  const results = await Promise.all([
    db.from('bw_environment_devices').select('*').eq('farm_id', farmId),
    db.from('houses').select('id,name').eq('farm_id', farmId),
    db.from('pens').select('id,name,house_id').eq('farm_id', farmId),
    db.rpc('bw_environment_latest', { p_farm: farmId }),
    db.rpc('bw_admin_owner', { p_farm: farmId }),
  ])

  const failed = results.find(r => r.error)
  if (failed) throw failed.error

  return {
    id: farmId,
    devices: results[0].data || [],
    houses: results[1].data || [],
    pens: results[2].data || [],
    latest: results[3].data || [],
    owner: results[4].data,
  }
}

async function registerDevice(db, farmId, form) {
  const [kind, value] = form.location.split(':')
  const { data, error } = await db.rpc('bw_register_environment', {
    p_farm: farmId,
    p_identifier: form.identifier,
    p_name: form.name,
    p_house: kind === 'house' ? value : null,
    p_pen: kind === 'pen' ? value : null,
    p_date: form.date,
  })
  if (error) throw error
  return data
}

async function updateDevice(db, farmId, deviceId, form, rotate) {
  const [kind, value] = form.location.split(':')
  const { data, error } = await db.rpc('bw_admin_device', {
    p_farm: farmId,
    p_name: form.name,
    p_house: kind === 'house' ? value : null,
    p_pen: kind === 'pen' ? value : null,
    p_device: deviceId,
    p_enabled: form.enabled,
    p_rotate: rotate,
  })
  if (error) throw error
  return data
}

function useFarms() {
  const [farms, setFarms] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    fetchFarms()
      .then(list => { if (live) setFarms(list) })
      .catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [])

  return { farms, error }
}

function useDeviceData(farmId, revision) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!farmId) return
    let live = true
    let running = false

    async function load() {
      if (running) return
      running = true
      try {
        const result = await fetchDeviceData(createClient(), farmId)
        if (live) setData(result)
      } catch (e) {
        if (live) setError(e.message)
      } finally {
        running = false
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => { live = false; clearInterval(timer) }
  }, [farmId, revision])

  return { data: data?.id === farmId ? data : null, error }
}

function useDeviceForm(farmId, onSaved) {
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState('')
  const [credentials, setCredentials] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    setForm(blank())
    setEditing('')
    setCredentials(null)
    setError('')
  }, [farmId])

  function reset() {
    setEditing('')
    setForm(blank())
  }

  function edit(device) {
    setEditing(device.id)
    setForm({
      identifier: device.identifier,
      name: device.name,
      location: device.pen_id ? `pen:${device.pen_id}` : `house:${device.house_id}`,
      date: device.installed_on,
      enabled: device.enabled,
    })
    document.getElementById('devices-register')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function save(owner, rotate = false) {
    if (lock.current || !owner || !form.location) return
    if (rotate && !window.confirm('Rotate token? Existing firmware credentials will stop working.')) return

    lock.current = true
    setBusy(true)
    setError('')
    setCredentials(null)

    try {
      const db = createClient()
      const result = editing
        ? await updateDevice(db, farmId, editing, form, rotate)
        : await registerDevice(db, farmId, form)

      if (result?.token) setCredentials(result)
      setEditing('')
      setForm(blank())
      onSaved?.()
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return { form, set, editing, edit, reset, credentials, setCredentials, error, setError, busy, save }
}

function DeviceCard({ device, data, online, label, owner, busy, onEdit }) {
  const reading = data.latest.find(y => y.device_id === device.id)

  return (
    <article className="device-card">
      <div className="device-card-head">
        <span className={`device-icon ${online ? 'connected' : 'offline'}`}><Thermometer size={18} /></span>
        <div>
          <strong>{device.name}</strong>
          <small>ESP32 · {device.identifier} · {device.installed_on}</small>
        </div>
        <StatePill tone={online ? 'green' : 'gold'}>
          {!device.enabled ? 'Disabled' : online ? 'Reporting' : reading ? 'Stale' : 'Awaiting data'}
        </StatePill>
      </div>

      <div className="device-meta">
        <span>
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}{' '}
          {reading ? new Date(reading.received_at).toLocaleString('en-UG', { timeZone: 'Africa/Kampala' }) : 'Never received'}
        </span>
        <span>{label(device)}</span>
      </div>

      {reading && (
        <div className="device-reading">
          <div><span>Temperature</span><strong>{reading.temperature} °C</strong></div>
          <div><span>Humidity</span><strong>{reading.humidity}%</strong></div>
          <span>{reading.simulated ? 'Simulated' : 'Physical (device reported)'}</span>
          {reading.rssi != null && <span>RSSI {reading.rssi} dBm</span>}
          {reading.firmware && <span>Firmware {reading.firmware}</span>}
          {reading.uptime_seconds != null && <span>Uptime {reading.uptime_seconds}s</span>}
        </div>
      )}

      {owner && (
        <button className="button-secondary" disabled={busy} onClick={() => onEdit(device)}>
          Manage device
        </button>
      )}
    </article>
  )
}

function CredentialsPanel({ credentials, onHide }) {
  return (
    <div role="status">
      <strong>Copy credentials now. The token cannot be retrieved later.</strong>
      <label>Device UUID<input readOnly value={credentials.device_id} /></label>
      <label>Device token<input readOnly value={credentials.token} /></label>
      <p>Set these values in your ESP32 firmware configuration and upload it. Keep the token private.</p>
      <button className="button-secondary" onClick={onHide}>Hide credentials</button>
    </div>
  )
}

function DeviceForm({ data, form, set, editing, busy, credentials, setCredentials, onSubmit, onRotate, onCancel }) {
  return (
    <Panel title={editing ? 'Manage device' : 'Register device'}>
      <form id="devices-register" className="intel-form-grid" onSubmit={onSubmit}>
        <label>
          Identifier
          <input required disabled={Boolean(editing) || busy} maxLength={80} value={form.identifier} onChange={e => set('identifier', e.target.value)} />
        </label>

        <label>
          Friendly name
          <input required maxLength={120} value={form.name} onChange={e => set('name', e.target.value)} />
        </label>

        <label>
          Location
          <select required value={form.location} onChange={e => set('location', e.target.value)}>
            <option value="">Select location</option>
            {data.houses.map(h => <option key={h.id} value={`house:${h.id}`}>{h.name}</option>)}
            {data.pens.map(p => (
              <option key={p.id} value={`pen:${p.id}`}>
                {data.houses.find(h => h.id === p.house_id)?.name} · {p.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Installation date
          <input type="date" required disabled={Boolean(editing)} value={form.date} onChange={e => set('date', e.target.value)} />
        </label>

        {editing && (
          <label>
            <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} /> Enabled
          </label>
        )}

        <button className="button-primary" disabled={busy}>
          {editing ? 'Save changes' : 'Register device'}
        </button>

        {editing && (
          <>
            <button type="button" className="button-secondary" disabled={busy} onClick={onRotate}>
              Save and rotate token
            </button>
            <button type="button" className="button-secondary" onClick={onCancel}>Cancel</button>
          </>
        )}
      </form>

      {credentials && <CredentialsPanel credentials={credentials} onHide={() => setCredentials(null)} />}
    </Panel>
  )
}

export function Devices({ farmId } = {}) {
  const { farms, error: farmsError } = useFarms()
  const [farm, setFarm] = useState('')
  const [revision, setRevision] = useState(0)

  const id = farm || farmId || farms[0]?.id || ''
  const { data, error: dataError } = useDeviceData(id, revision)
  const formState = useDeviceForm(id, () => setRevision(x => x + 1))

  const error = dataError || formState.error || farmsError
  const label = device =>
    device.pen_id
      ? data?.pens.find(p => p.id === device.pen_id)?.name
      : data?.houses.find(h => h.id === device.house_id)?.name

  const isOnline = device => {
    const reading = data?.latest.find(y => y.device_id === device.id)
    return device.enabled && reading && Date.now() - Date.parse(reading.received_at) < ONLINE_THRESHOLD_MS
  }

  function handleSubmit(e) {
    e.preventDefault()
    formState.save(data?.owner)
  }

  function startRegister() {
    formState.reset()
    document.getElementById('devices-register')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="ADMINISTRATION"
        title="Devices"
        description="Manage ESP32 environmental monitors."
        action={data?.owner ? { label: 'Register device', icon: Plus, onClick: startRegister } : undefined}
      />

      <label>
        Farm
        <select className="range-select" disabled={formState.busy} value={id} onChange={e => setFarm(e.target.value)}>
          {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>

      <div className="environment-warning">
        <Info size={15} /> Reporting means a reading was received within three minutes. Simulated readings are not physical measurements.
      </div>

      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>{id ? 'Loading devices…' : 'No accessible farm.'}</p>}

      <div className="device-list-cards">
        {data?.devices.map(device => (
          <DeviceCard
            key={device.id}
            device={device}
            data={data}
            online={isOnline(device)}
            label={label}
            owner={data.owner}
            busy={formState.busy}
            onEdit={formState.edit}
          />
        ))}
      </div>

      {data && !data.devices.length && <p>No devices registered.</p>}

      {data?.owner && (
        <DeviceForm
          data={data}
          form={formState.form}
          set={formState.set}
          editing={formState.editing}
          busy={formState.busy}
          credentials={formState.credentials}
          setCredentials={formState.setCredentials}
          onSubmit={handleSubmit}
          onRotate={() => formState.save(data.owner, true)}
          onCancel={formState.reset}
        />
      )}
    </div>
  )
}
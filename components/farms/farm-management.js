'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Bird,
  ChevronRight,
  CirclePlus,
  House,
  MapPin,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const blank = {
  name: '',
  farm_type: 'Smallholder poultry farm',
  district: '',
  town: '',
  housing_system: 'Deep litter',
  length_m: '',
  width_m: '',
  capacity: '100',
  batch_number: '',
  category: 'Broiler',
  breed: '',
  initial_count: '',
  hatch_date: '',
  arrival_date: '',
  supplier: '',
  feeding_programme: '',
  flock_id: '',
  source_pen_id: '',
  destination_pen_id: '',
  bird_count: '',
  event_date: new Date().toISOString().slice(0, 10),
  notes: '',
}

const fmt = (n) => new Intl.NumberFormat('en-UG').format(Number(n) || 0)
const count = (n) => Number(n) || 0

const FormCtx = createContext(null)

function Field({ label, children }) {
  return (
    <label className="wizard-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Input({ field, label, type = 'text', required = false, min, step }) {
  const { form, set } = useContext(FormCtx)
  return (
    <Field label={label}>
      <input
        type={type}
        required={required}
        min={min}
        step={step}
        value={form[field] ?? ''}
        onChange={(e) => set(field, e.target.value)}
      />
    </Field>
  )
}

function Select({ field, label, options }) {
  const { form, set } = useContext(FormCtx)
  return (
    <Field label={label}>
      <select value={form[field] ?? ''} onChange={(e) => set(field, e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

const labels = {
  create_farm: 'Add another farm',
  update_farm: 'Edit farm',
  house: 'Add house',
  pen: 'Add pen',
  batch: 'Add batch',
  update_house: 'Edit house',
  update_pen: 'Edit pen',
  update_batch: 'Edit batch',
  move_birds: 'Move birds',
  record_mortality: 'Record mortality',
}

export default function FarmManagement({
  section,
  farm,
  farmId,
  farms = [],
  onFarmChange,
  onFarmRefresh,
}) {
  const [tab, setTab] = useState(
    section === 'Flocks & Batches'
      ? 'Flocks & batches'
      : section === 'My Farms'
      ? 'My farms'
      : 'Houses & pens'
  )
  const [query, setQuery] = useState('')
  const [data, setData] = useState({
    houses: [],
    pens: [],
    batches: [],
    flocks: [],
    placements: [],
    events: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [action, setAction] = useState('')
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTab(
      section === 'Flocks & Batches'
        ? 'Flocks & batches'
        : section === 'My Farms'
        ? 'My farms'
        : 'Houses & pens'
    )
  }, [section])

  const load = useCallback(async () => {
    if (!farmId) {
      setData({ houses: [], pens: [], batches: [], flocks: [], placements: [], events: [] })
      return
    }
    setLoading(true)
    setError('')
    try {
      const tables = ['houses', 'pens', 'batches', 'flocks', 'flock_placements', 'flock_events']
      const results = await Promise.all(
        tables.map((t) => createClient().from(t).select('*').eq('farm_id', farmId))
      )
      const failed = results.find((r) => r.error)
      if (failed) throw failed.error
      setData(
        Object.fromEntries(
          ['houses', 'pens', 'batches', 'flocks', 'placements', 'events'].map((k, i) => [
            k,
            results[i].data || [],
          ])
        )
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => {
    load()
  }, [load])

  const penById = useMemo(() => new Map(data.pens.map((x) => [x.id, x])), [data.pens])
  const houseById = useMemo(() => new Map(data.houses.map((x) => [x.id, x])), [data.houses])
  const batchById = useMemo(() => new Map(data.batches.map((x) => [x.id, x])), [data.batches])
  const occupancy = useMemo(
    () =>
      new Map(
        data.pens.map((p) => [
          p.id,
          data.placements
            .filter((x) => x.pen_id === p.id)
            .reduce((s, x) => s + count(x.bird_count), 0),
        ])
      ),
    [data.pens, data.placements]
  )

  const active = data.flocks.filter((f) => !f.archived_at)
  const archived = data.flocks.filter((f) => f.archived_at)
  const matching = (s) => String(s || '').toLowerCase().includes(query.toLowerCase().trim())
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const open = (type, record = {}) => {
    setAction(type)
    setForm({
      ...blank,
      ...record,
      source_pen_id: '',
      destination_pen_id: '',
      bird_count: '',
      notes: '',
    })
    setError('')
    setNotice('')
  }

  const close = () => {
    setAction('')
    setForm(blank)
  }

  async function rpc(name, payload) {
    const { data: result, error: err } = await createClient().rpc(name, payload)
    if (err) throw err
    return result
  }

  async function mutate(type, payload) {
    if (saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (type === 'house')
        await rpc('add_farm_house', {
          p_farm_id: farmId,
          p_name: payload.name,
          p_housing_system: payload.housing_system,
          p_length_m: payload.length_m === '' ? null : Number(payload.length_m),
          p_width_m: payload.width_m === '' ? null : Number(payload.width_m),
        })
      else if (type === 'pen')
        await rpc('add_farm_pen', {
          p_farm_id: farmId,
          p_house_id: payload.house_id,
          p_name: payload.name,
          p_capacity: Number(payload.capacity),
        })
      else if (type === 'batch')
        await rpc('add_farm_batch', {
          p_farm_id: farmId,
          p_batch_number: payload.batch_number,
          p_category: payload.category,
          p_breed: payload.breed,
          p_initial_count: Number(payload.initial_count),
          p_hatch_date: payload.hatch_date || null,
          p_arrival_date: payload.arrival_date || null,
        })
      else {
        const result = await rpc('manage_farm', {
          p_farm_id: type === 'create_farm' ? null : farmId,
          p_action: type,
          p_data: payload,
        })
        if (type === 'create_farm') {
          await onFarmRefresh?.()
          onFarmChange?.(result.id)
        }
      }

      close()
      setNotice('Changes saved successfully.')
      await load()
      if (type === 'create_farm' || type === 'update_farm') await onFarmRefresh?.()
    } catch (e) {
      setError(e.message || 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    await mutate(action, {
      ...form,
      bird_count: Number(form.bird_count),
      capacity: Number(form.capacity),
      initial_count: Number(form.initial_count),
    })
  }

  async function destructive(type, record) {
    const label =
      type === 'delete_house'
        ? 'house'
        : type === 'delete_pen'
        ? 'pen'
        : type === 'delete_flock'
        ? 'flock'
        : type === 'archive_flock'
        ? 'flock'
        : 'flock'
    if (
      !window.confirm(
        `${type === 'archive_flock' ? 'Archive' : type === 'restore_flock' ? 'Restore' : 'Delete'} ${label} “${record.name}”? ${
          type.startsWith('delete') ? 'Deletion is permanent and may be blocked if history exists.' : ''
        }`
      )
    )
      return
    await mutate(type, { id: record.id })
  }

  const opts = (items, empty = 'Select') => [
    { value: '', label: empty },
    ...items.map((x) => ({ value: x.id, label: x.name })),
  ]

  const penOptions = opts(
    data.pens.map((p) => ({
      ...p,
      name: `${houseById.get(p.house_id)?.name || 'House'} · ${p.name} (${fmt(
        occupancy.get(p.id)
      )}/${fmt(p.capacity)})`,
    })),
    'Unassigned birds'
  )

  const flockOptions = opts(
    active.map((f) => ({
      ...f,
      name: `${batchById.get(f.batch_id)?.batch_number || f.name} (${fmt(f.current_count)} live)`,
    })),
    'Choose a flock'
  )

  return (
    <div className="management-page">
      <div className="management-title-row">
        <div>
          <p className="eyebrow">FARM OVERVIEW</p>
          <h1>{section === 'My Farms' ? 'My farms' : 'Farm management'}</h1>
          <p className="welcome-copy">
            Manage multiple farms, housing, birds and farm records.
          </p>
        </div>
        <button className="button-primary" type="button" onClick={() => open('create_farm')}>
          <Plus size={17} /> Add another farm
        </button>
      </div>

      <section className="farm-overview-card">
        <div className="farm-overview-symbol">
          <House size={23} />
        </div>
        <div className="farm-overview-copy">
          <div className="farm-title-line">
            <h2>{farm?.name || 'Select a farm'}</h2>
            <button type="button" className="button-secondary" onClick={() => open('update_farm', farm || {})}>
              Edit farm
            </button>
          </div>
          <p>
            <MapPin size={14} />{' '}
            {[farm?.town, farm?.district].filter(Boolean).join(', ') || 'Location not set'} ·{' '}
            {farm?.farm_type || 'Poultry farm'}
          </p>
          <div className="farm-stats">
            <span>
              <b>{fmt(data.houses.length)}</b> houses
            </span>
            <span>
              <b>{fmt(data.pens.length)}</b> pens
            </span>
            <span>
              <b>{fmt(active.length)}</b> active flocks
            </span>
            <span>
              <b>{fmt(active.reduce((s, f) => s + count(f.current_count), 0))}</b> live birds
            </span>
          </div>
        </div>
      </section>

      {farms.length > 1 && (
        <div className="filter-strip">
          <label>
            Working farm:{' '}
            <select value={farmId || ''} onChange={(e) => onFarmChange?.(e.target.value)}>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.district || 'Unknown district'}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <p className="wizard-validation" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="inline-hint" role="status">
          {notice}
        </p>
      )}

      {action && (
        <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
          <h2>{labels[action] || action.replaceAll('_', ' ')}</h2>
          <FormCtx.Provider value={{ form, set }}>
            <form className="wizard-fields" style={{ marginTop: 16 }} onSubmit={submit}>
              {(action === 'create_farm' || action === 'update_farm') && (
                <>
                  <Input field="name" label="Farm name" required />
                  <Input field="district" label="District (e.g. Moroto, Karamoja)" />
                  <Input field="town" label="Town / village" />
                  <Select
                    field="farm_type"
                    label="Farm type"
                    options={[
                      'Smallholder poultry farm',
                      'Commercial poultry farm',
                      'Mixed farm',
                    ].map((x) => ({ value: x, label: x }))}
                  />
                </>
              )}

              {(action === 'house' || action === 'update_house') && (
                <>
                  <Input field="name" label="House name" required />
                  <Select
                    field="housing_system"
                    label="Housing system"
                    options={[
                      'Deep litter',
                      'Raised slatted floor',
                      'Free range',
                      'Other',
                    ].map((x) => ({ value: x, label: x }))}
                  />
                  <div className="field-row">
                    <Input field="length_m" label="Length (m)" type="number" min="0.01" step="any" />
                    <Input field="width_m" label="Width (m)" type="number" min="0.01" step="any" />
                  </div>
                </>
              )}

              {(action === 'pen' || action === 'update_pen') && (
                <>
                  <Input field="name" label="Pen name" required />
                  <Input field="capacity" label="Bird capacity" type="number" min="1" step="1" required />
                </>
              )}

              {(action === 'batch' || action === 'update_batch') && (
                <>
                  <Input field="batch_number" label="Batch number" required />
                  {action === 'batch' && (
                    <>
                      <Select
                        field="category"
                        label="Category"
                        options={['Broiler', 'Layer'].map((x) => ({ value: x, label: x }))}
                      />
                      <Input field="initial_count" label="Initial bird count" type="number" min="1" step="1" required />
                      <Input field="hatch_date" label="Hatch date" type="date" />
                      <Input field="arrival_date" label="Arrival date" type="date" />
                    </>
                  )}
                  <Input field="breed" label="Breed" />
                  <Input field="supplier" label="Supplier" />
                  <Input field="feeding_programme" label="Feeding programme" />
                </>
              )}

              {(action === 'move_birds' || action === 'record_mortality') && (
                <>
                  <Select field="flock_id" label="Flock" options={flockOptions} />
                  <Select
                    field="source_pen_id"
                    label={action === 'move_birds' ? 'Move from' : 'Mortality location'}
                    options={penOptions}
                  />
                  {action === 'move_birds' && (
                    <Select field="destination_pen_id" label="Move to" options={penOptions} />
                  )}
                  <Input field="bird_count" label="Number of birds" type="number" min="1" step="1" required />
                  <Input field="event_date" label="Event date" type="date" required />
                  <Input field="notes" label="Notes / reason" />
                </>
              )}

              <div className="wizard-actions">
                <button type="button" className="button-secondary" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </FormCtx.Provider>
        </section>
      )}

      <div className="management-tabs">
        {['My farms', 'Houses & pens', 'Flocks & batches', 'Archived'].map((t) => (
          <button
            type="button"
            key={t}
            className={tab === t ? 'selected' : ''}
            onClick={() => setTab(t)}
          >
            {t} {t === 'Archived' ? `(${archived.length})` : ''}
          </button>
        ))}
        <div className="management-search">
          <Search size={15} />
          <input
            aria-label="Search farm"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Loading farm records…</p>
      ) : tab === 'My farms' ? (
        <div className="house-grid">
          {farms
            .filter((f) => matching(`${f.name} ${f.district} ${f.town}`))
            .map((f) => (
              <article className="house-card" key={f.id} style={{ padding: 20 }}>
                <h3>{f.name}</h3>
                <p>
                  <MapPin size={14} /> {f.town || ''} {f.district || ''}
                </p>
                <div className="wizard-actions">
                  <button type="button" className="button-secondary" onClick={() => onFarmChange?.(f.id)}>
                    Manage this farm
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      onFarmChange?.(f.id)
                      open('update_farm', f)
                    }}
                  >
                    Edit
                  </button>
                </div>
              </article>
            ))}
          <button className="add-house-card" type="button" onClick={() => open('create_farm')}>
            <Plus />
            Add another farm
          </button>
        </div>
      ) : tab === 'Houses & pens' ? (
        <>
          <div className="wizard-actions">
            <button type="button" className="button-primary" onClick={() => open('house')}>
              <Plus size={16} /> Add house
            </button>
            <button type="button" className="button-secondary" onClick={() => open('move_birds')}>
              Move birds
            </button>
            <button type="button" className="button-secondary" onClick={() => open('record_mortality')}>
              Record mortality
            </button>
          </div>
          <div className="house-grid">
            {data.houses
              .filter(
                (h) =>
                  matching(`${h.name} ${h.housing_system}`) ||
                  data.pens.some((p) => p.house_id === h.id && matching(p.name))
              )
              .map((h) => {
                const pens = data.pens.filter((p) => p.house_id === h.id)
                return (
                  <article className="house-card" key={h.id}>
                    <div className="house-card-head">
                      <span className="house-icon">
                        <House size={18} />
                      </span>
                      <div>
                        <h3>{h.name}</h3>
                        <p>
                          {h.housing_system} ·{' '}
                          {h.length_m && h.width_m
                            ? `${h.length_m} × ${h.width_m} m`
                            : 'Size not recorded'}
                        </p>
                      </div>
                      <button type="button" className="button-secondary" onClick={() => open('update_house', h)}>
                        Edit
                      </button>
                      <button type="button" className="button-secondary" onClick={() => destructive('delete_house', h)}>
                        Delete
                      </button>
                    </div>
                    <div className="pens-list">
                      {pens.map((p) => {
                        const birds = occupancy.get(p.id) || 0
                        return (
                          <div className={`pen-row ${birds === 0 ? 'empty-pen' : ''}`} key={p.id}>
                            <span className="pen-icon">
                              <Bird size={15} />
                            </span>
                            <div className="pen-copy">
                              <strong>{p.name}</strong>
                              <p>
                                {data.placements
                                  .filter((x) => x.pen_id === p.id)
                                  .map((x) => {
                                    const f = data.flocks.find((f) => f.id === x.flock_id)
                                    return batchById.get(f?.batch_id)?.batch_number || f?.name
                                  })
                                  .filter(Boolean)
                                  .join(', ') || 'Available'}
                              </p>
                              {birds > 0 && (
                                <div className="occupancy-bar">
                                  <span
                                    style={{
                                      width: `${Math.min(100, (birds / count(p.capacity)) * 100)}%`,
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <span className="occupancy-count">
                              {fmt(birds)} / {fmt(p.capacity)}
                            </span>
                            <button type="button" className="icon-plain" onClick={() => open('update_pen', p)}>
                              Edit
                            </button>
                            <button type="button" className="icon-plain" onClick={() => destructive('delete_pen', p)}>
                              Delete
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <button type="button" className="add-pen" onClick={() => open('pen', { house_id: h.id })}>
                      <CirclePlus size={15} /> Add pen
                    </button>
                    <div className="house-footer">
                      <span>
                        <Users size={14} /> {fmt(pens.reduce((s, p) => s + (occupancy.get(p.id) || 0), 0))} placed birds
                      </span>
                    </div>
                  </article>
                )
              })}
            <button type="button" className="add-house-card" onClick={() => open('house')}>
              <Plus size={20} />
              Add poultry house
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="wizard-actions">
            {tab === 'Flocks & batches' && (
              <>
                <button className="button-primary" type="button" onClick={() => open('batch')}>
                  <Plus size={16} /> Add batch
                </button>
                <button className="button-secondary" type="button" onClick={() => open('move_birds')}>
                  Move birds
                </button>
                <button className="button-secondary" type="button" onClick={() => open('record_mortality')}>
                  Record mortality
                </button>
              </>
            )}
          </div>
          <div className="batch-table-wrap">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Live birds</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'Archived' ? archived : active)
                  .filter((f) => matching(`${f.name} ${batchById.get(f.batch_id)?.batch_number}`))
                  .map((f) => {
                    const b = batchById.get(f.batch_id)
                    const locations = [
                      ...new Set(
                        data.placements
                          .filter((p) => p.flock_id === f.id)
                          .map((p) => houseById.get(penById.get(p.pen_id)?.house_id)?.name)
                          .filter(Boolean)
                      ),
                    ]
                    return (
                      <tr key={f.id}>
                        <td>
                          <strong>{b?.batch_number || f.name}</strong>
                          <small>Initial: {fmt(b?.initial_count)}</small>
                        </td>
                        <td>{b?.category || '—'}</td>
                        <td>{locations.join(', ') || 'Unassigned'}</td>
                        <td>
                          <strong>{fmt(f.current_count)}</strong>
                        </td>
                        <td>
                          <span className="status-pill">{f.archived_at ? 'Archived' : 'Active'}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="icon-plain"
                              onClick={() =>
                                open('update_batch', {
                                  id: f.id,
                                  batch_number: b?.batch_number || f.name,
                                  breed: b?.breed || '',
                                  supplier: b?.supplier || '',
                                  feeding_programme: b?.feeding_programme || '',
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="icon-plain"
                              onClick={() => destructive(f.archived_at ? 'restore_flock' : 'archive_flock', f)}
                            >
                              {f.archived_at ? 'Restore' : 'Archive'}
                            </button>
                            <button type="button" className="icon-plain" onClick={() => destructive('delete_flock', f)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="management-footnote">
        <span className="freshness-dot" /> Live counts decrease when mortality is recorded. Moves
        update pen occupancy without changing flock totals. Archived flocks retain their records.
      </div>
    </div>
  )
}
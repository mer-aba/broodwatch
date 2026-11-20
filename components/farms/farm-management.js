'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bird, ChevronRight, CirclePlus, House, MapPin, MoreHorizontal,
  Plus, Search, Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const num = (value) => Number(value) || 0
const fmt = (value) => new Intl.NumberFormat('en-UG').format(num(value))
const initialForm = { name: '', housing_system: 'Deep litter', length_m: '', width_m: '', capacity: '100', category: 'Broiler', breed: '', initial_count: '', batch_number: '', hatch_date: '', arrival_date: '' }

export default function FarmManagement({ section, farm, farmId, onFarmRefresh }) {
  const [tab, setTab] = useState(section === 'Flocks & Batches' ? 'Flocks & batches' : 'Houses & pens')
  const [query, setQuery] = useState('')
  const [data, setData] = useState({ houses: [], pens: [], batches: [], flocks: [], placements: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formType, setFormType] = useState(null)
  const [formHouseId, setFormHouseId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setTab(section === 'Flocks & Batches' ? 'Flocks & batches' : 'Houses & pens')
  }, [section])

  const load = useCallback(async () => {
    if (!farmId) {
      setData({ houses: [], pens: [], batches: [], flocks: [], placements: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const tables = ['houses', 'pens', 'batches', 'flocks', 'flock_placements']
      const results = await Promise.all(tables.map((table) =>
        supabase.from(table).select('*').eq('farm_id', farmId)
      ))
      const failed = results.find((result) => result.error)
      if (failed) throw failed.error
      setData({
        houses: results[0].data || [],
        pens: results[1].data || [],
        batches: results[2].data || [],
        flocks: results[3].data || [],
        placements: results[4].data || [],
      })
    } catch (err) {
      setError(err.message || 'Could not load farm records')
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => { load() }, [load])

  const batchById = useMemo(() => new Map(data.batches.map((b) => [b.id, b])), [data.batches])
  const flockById = useMemo(() => new Map(data.flocks.map((f) => [f.id, f])), [data.flocks])
  const penById = useMemo(() => new Map(data.pens.map((p) => [p.id, p])), [data.pens])
  const houseById = useMemo(() => new Map(data.houses.map((h) => [h.id, h])), [data.houses])
  const occupancy = useMemo(() => {
    const counts = new Map()
    for (const placement of data.placements) {
      counts.set(placement.pen_id, (counts.get(placement.pen_id) || 0) + num(placement.bird_count))
    }
    return counts
  }, [data.placements])
  const totalBirds = data.flocks.reduce((sum, flock) => sum + num(flock.current_count), 0)
  const matching = (text) => text.toLowerCase().includes(query.trim().toLowerCase())

  function openForm(type, houseId = null) {
    setFormType(type)
    setFormHouseId(houseId)
    setForm(initialForm)
    setError('')
    setNotice('')
  }

  async function submitForm(event) {
    event.preventDefault()
    if (!farmId || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const supabase = createClient()
      let rpcName, payload
      if (formType === 'house') {
        rpcName = 'add_farm_house'
        payload = { p_farm_id: farmId, p_name: form.name.trim(), p_housing_system: form.housing_system,
          p_length_m: form.length_m === '' ? null : Number(form.length_m),
          p_width_m: form.width_m === '' ? null : Number(form.width_m) }
      } else if (formType === 'pen') {
        rpcName = 'add_farm_pen'
        payload = { p_farm_id: farmId, p_house_id: formHouseId, p_name: form.name.trim(), p_capacity: Number(form.capacity) }
      } else if (formType === 'batch') {
        rpcName = 'add_farm_batch'
        payload = { p_farm_id: farmId, p_batch_number: form.batch_number.trim(), p_category: form.category,
          p_breed: form.breed.trim() || null, p_initial_count: Number(form.initial_count),
          p_hatch_date: form.hatch_date || null, p_arrival_date: form.arrival_date || null }
      } else return
      const { error: rpcError } = await supabase.rpc(rpcName, payload)
      if (rpcError) throw rpcError
      setFormType(null)
      setNotice(`${formType === 'house' ? 'House' : formType === 'pen' ? 'Pen' : 'Batch'} added successfully.`)
      await load()
      onFarmRefresh?.()
    } catch (err) {
      setError(err.message || 'Unable to save changes')
    } finally {
      setSaving(false)
    }
  }

  const flockRows = data.flocks.filter((flock) => {
    const batch = batchById.get(flock.batch_id)
    return matching(`${flock.name} ${batch?.batch_number || ''} ${batch?.category || ''} ${batch?.breed || ''}`)
  })

  return (
    <div className="management-page">
      <div className="management-title-row">
        <div>
          <p className="eyebrow">FARM OVERVIEW</p>
          <h1>{section === 'My Farms' ? 'My farms' : 'Farm management'}</h1>
          <p className="welcome-copy">Manage your houses, pens and flocks in one place.</p>
        </div>
        <button type="button" className="button-primary" onClick={() => openForm(tab === 'Flocks & batches' ? 'batch' : 'house')}>
          <Plus size={17} /> {tab === 'Flocks & batches' ? 'Add batch' : 'Add house'}
        </button>
      </div>

      <section className="farm-overview-card">
        <div className="farm-overview-symbol"><House size={23} /></div>
        <div className="farm-overview-copy">
          <div className="farm-title-line">
            <h2>{farm?.name || 'Your farm'}</h2>
          </div>
          <p><MapPin size={14} /> {[farm?.town, farm?.district].filter(Boolean).join(', ') || 'Location not set'} <i>·</i> {farm?.farm_type || 'Poultry farm'}</p>
          <div className="farm-stats">
            <span><b>{fmt(data.houses.length)}</b> houses</span>
            <span><b>{fmt(data.pens.length)}</b> pens</span>
            <span><b>{fmt(data.flocks.filter((f) => num(f.current_count) > 0).length)}</b> active flocks</span>
            <span><b>{fmt(totalBirds)}</b> recorded live birds</span>
          </div>
        </div>
      </section>

      {error && <p className="wizard-validation" role="alert">{error}</p>}
      {notice && <p className="inline-hint" role="status">{notice}</p>}

      {formType && (
        <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
          <h2>{formType === 'house' ? 'Add poultry house' : formType === 'pen' ? 'Add pen' : 'Add batch and flock'}</h2>
          <form onSubmit={submitForm} className="wizard-fields" style={{ marginTop: 16 }}>
            {formType !== 'batch' ? (
              <>
                <label className="wizard-field"><span>{formType === 'house' ? 'House name' : 'Pen name'}</span>
                  <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={formType === 'house' ? 'House C' : 'Pen C1'} /></label>
                {formType === 'house' ? <>
                  <label className="wizard-field"><span>Housing system</span><select value={form.housing_system} onChange={(e) => setForm({ ...form, housing_system: e.target.value })}><option>Deep litter</option><option>Raised slatted floor</option><option>Free range</option><option>Other</option></select></label>
                  <div className="field-row">
                    <label className="wizard-field"><span>Length (m), optional</span><input type="number" min="0.01" step="any" value={form.length_m} onChange={(e) => setForm({ ...form, length_m: e.target.value })} /></label>
                    <label className="wizard-field"><span>Width (m), optional</span><input type="number" min="0.01" step="any" value={form.width_m} onChange={(e) => setForm({ ...form, width_m: e.target.value })} /></label>
                  </div>
                </> : <label className="wizard-field"><span>Capacity (birds)</span><input required type="number" min="1" step="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></label>}
              </>
            ) : <>
              <label className="wizard-field"><span>Batch number</span><input required value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} placeholder="BR-2026-002" /></label>
              <div className="field-row">
                <label className="wizard-field"><span>Category</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Broiler</option><option>Layer</option></select></label>
                <label className="wizard-field"><span>Breed / strain</span><input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} /></label>
              </div>
              <div className="field-row">
                <label className="wizard-field"><span>Initial bird count</span><input required type="number" min="1" step="1" value={form.initial_count} onChange={(e) => setForm({ ...form, initial_count: e.target.value })} /></label>
                <label className="wizard-field"><span>Hatch date</span><input type="date" value={form.hatch_date} onChange={(e) => setForm({ ...form, hatch_date: e.target.value })} /></label>
              </div>
              <label className="wizard-field"><span>Arrival date</span><input type="date" value={form.arrival_date} onChange={(e) => setForm({ ...form, arrival_date: e.target.value })} /></label>
              <p className="subtle">The batch creates a flock with the initial count. Assign birds to pens in the placement workflow when available.</p>
            </>}
            <div className="wizard-actions">
              <button type="button" className="button-secondary" onClick={() => setFormType(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="button-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </section>
      )}

      <div className="management-tabs">
        <button type="button" className={tab === 'Houses & pens' ? 'selected' : ''} onClick={() => setTab('Houses & pens')}>Houses & pens <span>{data.pens.length}</span></button>
        <button type="button" className={tab === 'Flocks & batches' ? 'selected' : ''} onClick={() => setTab('Flocks & batches')}>Flocks & batches <span>{data.flocks.length}</span></button>
        <button type="button" className={tab === 'Archived' ? 'selected' : ''} onClick={() => setTab('Archived')}>Archived</button>
        <div className="management-search"><Search size={15} /><input aria-label="Search farm" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>

      {loading ? <p className="subtle">Loading farm records...</p> : tab === 'Archived' ? (
        <section className="panel" style={{ padding: 24 }}><p className="subtle">Archiving has not been implemented yet. No archived records are shown.</p></section>
      ) : tab === 'Houses & pens' ? (
        <div className="house-grid">
          {data.houses.filter((h) => matching(`${h.name} ${h.housing_system}`) || data.pens.some((p) => p.house_id === h.id && matching(p.name))).map((house) => {
            const housePens = data.pens.filter((p) => p.house_id === house.id)
            const total = housePens.reduce((sum, pen) => sum + (occupancy.get(pen.id) || 0), 0)
            return (
              <article className="house-card" key={house.id}>
                <div className="house-card-head">
                  <span className="house-icon"><House size={18} /></span>
                  <div><h3>{house.name}</h3><p>{house.housing_system} · {house.length_m && house.width_m ? `${house.length_m} × ${house.width_m} m` : 'Size not recorded'}</p></div>
                </div>
                <div className="pens-list">
                  {housePens.map((pen) => {
                    const birds = occupancy.get(pen.id) || 0
                    const names = [...new Set(data.placements.filter((p) => p.pen_id === pen.id).map((p) => {
                      const flock = flockById.get(p.flock_id)
                      return batchById.get(flock?.batch_id)?.batch_number || flock?.name
                    }).filter(Boolean))]
                    return (
                      <div className={`pen-row ${birds === 0 ? 'empty-pen' : ''}`} key={pen.id}>
                        <span className="pen-icon"><Bird size={15} /></span>
                        <div className="pen-copy">
                          <div><strong>{pen.name}</strong><small>{pen.name}</small></div>
                          <p>{names.join(', ') || 'Available'}</p>
                          {birds > 0 && <div className="occupancy-bar"><span style={{ width: `${Math.min(100, birds / Math.max(1, num(pen.capacity)) * 100)}%` }} /></div>}
                        </div>
                        <span className="occupancy-count">{birds ? `${fmt(birds)} / ${fmt(pen.capacity)}` : `Empty · ${fmt(pen.capacity)} capacity`}</span>
                        <ChevronRight size={15} className="pen-chevron" />
                      </div>
                    )
                  })}
                </div>
                <button type="button" className="add-pen" onClick={() => openForm('pen', house.id)}><CirclePlus size={15} /> Add pen</button>
                <div className="house-footer"><span><Users size={14} /> {fmt(total)} birds placed</span><span>{housePens.length} pens</span></div>
              </article>
            )
          })}
          <button type="button" className="add-house-card" onClick={() => openForm('house')}><span><Plus size={20} /></span><strong>Add a poultry house</strong><small>Organise your farm into houses and pens</small></button>
        </div>
      ) : (
        <div className="batch-table-wrap">
          <table className="batch-table">
            <thead><tr><th>Batch</th><th>Category</th><th>Location</th><th>Birds</th><th>Age</th><th>Status</th><th /></tr></thead>
            <tbody>
              {flockRows.map((flock) => {
                const batch = batchById.get(flock.batch_id)
                const placed = data.placements.filter((p) => p.flock_id === flock.id)
                const locations = [...new Set(placed.map((p) => houseById.get(penById.get(p.pen_id)?.house_id)?.name).filter(Boolean))]
                const start = batch?.hatch_date || batch?.arrival_date
                const days = start ? Math.max(0, Math.floor((Date.now() - new Date(`${start}T00:00:00`).getTime()) / 86400000)) : null
                return (
                  <tr key={flock.id}>
                    <td><strong>{batch?.batch_number || flock.name}</strong><small>Initial count: {fmt(batch?.initial_count)}</small></td>
                    <td><span className="table-category"><Bird size={14} />{batch?.category || 'Poultry'}</span></td>
                    <td>{locations.join(', ') || 'Not placed'}<small>{placed.length} pens</small></td>
                    <td><strong>{fmt(flock.current_count)}</strong><small>recorded live birds</small></td>
                    <td>{days === null ? 'Unknown' : `${days} days`}</td>
                    <td><span className="status-pill">{num(flock.current_count) > 0 ? 'Active' : 'Empty'}</span></td>
                    <td><MoreHorizontal size={18} aria-hidden="true" /></td>
                  </tr>
                )
              })}
              {flockRows.length === 0 && <tr><td colSpan={7}>No flocks found. Add a batch to get started.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <div className="management-footnote"><span className="freshness-dot" /> Pen occupancy is based on saved placements. Live counts are onboarding values until mortality and movement records are connected.</div>
    </div>
  )
}

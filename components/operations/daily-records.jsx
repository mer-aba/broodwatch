'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Bird, Check, Clock3, Filter, Plus, Wheat } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './daily-records-fields.module.css'
import {
  PageHeading,
  OpsFilters,
  OpsPanel,
  Status,
  SuccessNote,
  DataTable,
} from '../shared/operations-ui'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

const empty = () => ({
  flock_id: '',
  pen_id: '',
  record_date: today(),
  feed_supplied_kg: '',
  feed_remaining_kg: '',
  water_supplied_l: '',
  water_remaining_l: '',
  mortality_count: '0',
  behaviour: 'Normal',
  eggs_collected: '',
  eggs_damaged: '',
  symptoms: '',
  notes: '',
})

const fmt = (n, unit = '') =>
  `${Number(n || 0).toLocaleString('en-UG', { maximumFractionDigits: 2 })}${unit}`
const num = (v) => (v === '' ? 0 : Number(v))

function Input({ label, value, onChange, type = 'text', min, step, placeholder, disabled = false }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        className={styles.control}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  )
}

function Select({ label, value, onChange, options, disabled = false }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        className={styles.control}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function DailyRecords({ farmId, farm, farms = [], onFarmChange }) {
  const [tab, setTab] = useState('New record')
  const [form, setForm] = useState(empty)
  const [data, setData] = useState({
    flocks: [],
    batches: [],
    pens: [],
    houses: [],
    placements: [],
    records: [],
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [historyDate, setHistoryDate] = useState('')
  const [historyFlock, setHistoryFlock] = useState('')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const load = useCallback(async () => {
    if (!farmId) {
      setData({ flocks: [], batches: [], pens: [], houses: [], placements: [], records: [] })
      return
    }
    setLoading(true)
    setError('')
    try {
      const names = ['flocks', 'batches', 'pens', 'houses', 'flock_placements', 'daily_records']
      const result = await Promise.all(
        names.map((name) => createClient().from(name).select('*').eq('farm_id', farmId))
      )
      const failure = result.find((r) => r.error)
      if (failure) throw failure.error
      setData(
        Object.fromEntries(
          ['flocks', 'batches', 'pens', 'houses', 'placements', 'records'].map((key, i) => [
            key,
            result[i].data || [],
          ])
        )
      )
    } catch (e) {
      setError(e.message || 'Could not load daily records')
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setForm(empty())
    setNotice('')
    setHistoryDate('')
    setHistoryFlock('')
  }, [farmId])

  const batchesById = useMemo(() => new Map(data.batches.map((x) => [x.id, x])), [data.batches])
  const housesById = useMemo(() => new Map(data.houses.map((x) => [x.id, x])), [data.houses])
  const pensById = useMemo(() => new Map(data.pens.map((x) => [x.id, x])), [data.pens])
  const flocksById = useMemo(() => new Map(data.flocks.map((x) => [x.id, x])), [data.flocks])

  const active = data.flocks.filter((x) => !x.archived_at)
  const placements = data.placements.filter(
    (x) => x.flock_id === form.flock_id && Number(x.bird_count) > 0
  )
  const availablePens = placements.map((x) => pensById.get(x.pen_id)).filter(Boolean)
  const selectedBatch = batchesById.get(flocksById.get(form.flock_id)?.batch_id)
  const category = selectedBatch?.category || ''
  const selectedPen = pensById.get(form.pen_id)

  const penLabel = (id) => {
    const p = pensById.get(id)
    return p ? `${housesById.get(p.house_id)?.name || 'House'} · ${p.name}` : 'Unknown pen'
  }
  const flockLabel = (id) => {
    const f = flocksById.get(id)
    return batchesById.get(f?.batch_id)?.batch_number || f?.name || 'Unknown flock'
  }

  const sameDay = data.records.find(
    (r) =>
      r.flock_id === form.flock_id &&
      r.pen_id === form.pen_id &&
      r.record_date === form.record_date
  )

  const previous = data.records
    .filter(
      (r) =>
        r.flock_id === form.flock_id &&
        r.pen_id === form.pen_id &&
        r.status === 'final' &&
        r.record_date < form.record_date
    )
    .sort((a, b) => b.record_date.localeCompare(a.record_date))[0]

  const history = data.records
    .filter(
      (r) =>
        (!historyDate || r.record_date === historyDate) &&
        (!historyFlock || r.flock_id === historyFlock)
    )
    .sort((a, b) => b.record_date.localeCompare(a.record_date))

  const occupied = placements.find((x) => x.pen_id === form.pen_id)?.bird_count || 0

  const loadDraft = (r) => {
    setForm({
      flock_id: r.flock_id,
      pen_id: r.pen_id,
      record_date: r.record_date,
      feed_supplied_kg: String(r.feed_supplied_kg),
      feed_remaining_kg: String(r.feed_remaining_kg),
      water_supplied_l: String(r.water_supplied_l),
      water_remaining_l: String(r.water_remaining_l),
      mortality_count: String(r.mortality_count),
      behaviour: r.behaviour || 'Normal',
      eggs_collected: r.eggs_collected == null ? '' : String(r.eggs_collected),
      eggs_damaged: r.eggs_damaged == null ? '' : String(r.eggs_damaged),
      symptoms: r.symptoms || '',
      notes: r.notes || '',
    })
    setTab('New record')
    setNotice('Draft loaded for editing.')
  }

  async function save(status) {
    setError('')
    setNotice('')

    if (!farmId || !form.flock_id || !form.pen_id || !form.record_date) {
      setError('Select a farm, flock, pen and date.')
      return
    }
    if (sameDay?.status === 'final') {
      setError('This record is finalized and cannot be edited.')
      return
    }
    if (
      [form.feed_supplied_kg, form.feed_remaining_kg, form.water_supplied_l, form.water_remaining_l].some(
        (v) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0)
      )
    ) {
      setError('Enter valid nonnegative quantities.')
      return
    }
    if (
      num(form.feed_remaining_kg) > num(form.feed_supplied_kg) ||
      num(form.water_remaining_l) > num(form.water_supplied_l)
    ) {
      setError('Remaining amounts cannot exceed supplied amounts.')
      return
    }
    if (
      !Number.isInteger(num(form.mortality_count)) ||
      num(form.mortality_count) < 0 ||
      num(form.mortality_count) > occupied
    ) {
      setError('Deaths must be a whole number no greater than birds currently in this pen.')
      return
    }
    if (status === 'final' && occupied <= 0) {
      setError('This flock has no birds in the selected pen.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        id: sameDay?.id || null,
        status,
        feed_supplied_kg: num(form.feed_supplied_kg),
        feed_remaining_kg: num(form.feed_remaining_kg),
        water_supplied_l: num(form.water_supplied_l),
        water_remaining_l: num(form.water_remaining_l),
        mortality_count: num(form.mortality_count),
        eggs_collected:
          category === 'Layer' && form.eggs_collected !== '' ? Number(form.eggs_collected) : null,
        eggs_damaged:
          category === 'Layer' && form.eggs_damaged !== '' ? Number(form.eggs_damaged) : null,
      }
      const { error: rpcError } = await createClient().rpc('save_daily_record', {
        p_farm_id: farmId,
        p_data: payload,
      })
      if (rpcError) throw rpcError

      setNotice(
        status === 'final'
          ? 'Daily record finalized. Mortality and live counts updated.'
          : 'Draft saved to Supabase; bird counts unchanged.'
      )
      await load()
      if (status === 'final') {
        setForm(empty())
        setTab('History')
      }
    } catch (e) {
      setError(e.message || 'Could not save record')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK OPERATIONS"
        title="Daily records"
        description="Record actual feed, water, mortality and flock observations for each pen."
        action={{
          label: 'Record daily data',
          icon: Plus,
          onClick: () => {
            setTab('New record')
            setForm(empty())
            setNotice('')
          },
        }}
      />

      <OpsFilters>
        <label className={styles.field}>
          <span>Farm</span>
          <select
            className={styles.control}
            value={farmId || ''}
            onChange={(e) => onFarmChange?.(e.target.value)}
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {f.district || 'District not set'}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>History date</span>
          <input
            className={styles.control}
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
          />
        </label>
        <span className="ops-filter-spacer" />
        <button
          type="button"
          className={`ops-tab ${tab === 'New record' ? 'selected' : ''}`}
          onClick={() => setTab('New record')}
        >
          New record
        </button>
        <button
          type="button"
          className={`ops-tab ${tab === 'History' ? 'selected' : ''}`}
          onClick={() => setTab('History')}
        >
          History <span>{data.records.length}</span>
        </button>
      </OpsFilters>

      {error && (
        <p role="alert" className="wizard-validation">
          {error}
        </p>
      )}
      {notice && <SuccessNote>{notice}</SuccessNote>}
      {loading && <p className="subtle">Loading farm records…</p>}

      {tab === 'History' ? (
        <OpsPanel
          title="Saved records"
          action={
            <button
              type="button"
              className="quiet-action"
              onClick={() => {
                setHistoryDate('')
                setHistoryFlock('')
              }}
            >
              <Filter size={14} /> Clear filters
            </button>
          }
        >
          <div className="ops-form-grid" style={{ marginBottom: 16 }}>
            <Select
              label="Flock filter"
              value={historyFlock}
              onChange={setHistoryFlock}
              options={[
                { value: '', label: 'All flocks' },
                ...data.flocks.map((f) => ({ value: f.id, label: flockLabel(f.id) })),
              ]}
            />
          </div>
          {history.length ? (
            <DataTable
              headings={[
                'DATE',
                'FLOCK',
                'HOUSE · PEN',
                'FEED CONSUMED',
                'WATER CONSUMED',
                'DEATHS',
                'STATUS / ACTION',
              ]}
              rows={history.map((r) => [
                r.record_date,
                flockLabel(r.flock_id),
                penLabel(r.pen_id),
                fmt(r.feed_consumed_kg, ' kg'),
                fmt(r.water_consumed_l, ' L'),
                r.mortality_count,
                r.status === 'draft' ? (
                  <button type="button" className="quiet-action" onClick={() => loadDraft(r)}>
                    Edit draft
                  </button>
                ) : (
                  <Status>Final</Status>
                ),
              ])}
            />
          ) : (
            <p className="subtle">No daily records match these filters.</p>
          )}
        </OpsPanel>
      ) : (
        <div className="ops-columns daily-layout">
          <div className="ops-main-column">
            <OpsPanel
              title="Record flock activity"
              action={
                <span className="required-note">
                  <i>*</i> Required
                </span>
              }
            >
              <div className="ops-form-grid">
                <Select
                  label="Flock or batch *"
                  value={form.flock_id}
                  onChange={(v) => setForm((f) => ({ ...f, flock_id: v, pen_id: '' }))}
                  options={[
                    { value: '', label: 'Select a flock' },
                    ...active.map((f) => ({
                      value: f.id,
                      label: `${flockLabel(f.id)} · ${batchesById.get(f.batch_id)?.category || 'Poultry'}`,
                    })),
                  ]}
                />
                <Select
                  label="House and pen *"
                  value={form.pen_id}
                  onChange={(v) => set('pen_id', v)}
                  options={[
                    { value: '', label: 'Select occupied pen' },
                    ...availablePens.map((p) => ({ value: p.id, label: penLabel(p.id) })),
                  ]}
                />
                <Input
                  label="Recording date *"
                  type="date"
                  value={form.record_date}
                  onChange={(v) => set('record_date', v)}
                />
                <Input
                  label="Production type"
                  value={category || 'Select flock'}
                  onChange={() => {}}
                  disabled
                />
              </div>

              {form.pen_id && (
                <p className="subtle">Current birds in this pen: {fmt(occupied)}</p>
              )}
              {sameDay?.status === 'final' && (
                <p role="alert" className="wizard-validation">
                  This flock/pen/date has already been finalized. Final records are read-only.
                </p>
              )}
              {sameDay?.status === 'draft' && (
                <p className="info-note">A draft exists for this date. Saving will update it.</p>
              )}

              <div className="ops-form-section">
                <div className="form-section-heading">
                  <Wheat size={16} />
                  <strong>Feed and water</strong>
                  <span>Enter totals for this pen</span>
                </div>
                <div className="ops-form-grid">
                  <Input
                    label="Feed supplied (kg)"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.feed_supplied_kg}
                    onChange={(v) => set('feed_supplied_kg', v)}
                    placeholder="e.g. 16"
                  />
                  <Input
                    label="Feed remaining (kg)"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.feed_remaining_kg}
                    onChange={(v) => set('feed_remaining_kg', v)}
                    placeholder="Optional"
                  />
                  <Input
                    label="Water supplied (L)"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.water_supplied_l}
                    onChange={(v) => set('water_supplied_l', v)}
                    placeholder="e.g. 28"
                  />
                  <Input
                    label="Water remaining (L)"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.water_remaining_l}
                    onChange={(v) => set('water_remaining_l', v)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="ops-form-section">
                <div className="form-section-heading">
                  <Bird size={16} />
                  <strong>Flock check</strong>
                  <span>Record observations</span>
                </div>
                <div className="ops-form-grid">
                  <Input
                    label="Bird deaths"
                    type="number"
                    min="0"
                    step="1"
                    value={form.mortality_count}
                    onChange={(v) => set('mortality_count', v)}
                  />
                  <Select
                    label="General behaviour"
                    value={form.behaviour}
                    onChange={(v) => set('behaviour', v)}
                    options={[
                      'Normal',
                      'Less active than usual',
                      'Unusual behaviour observed',
                    ].map((v) => ({ value: v, label: v }))}
                  />
                </div>
                {category === 'Layer' && (
                  <div className="ops-form-grid conditional-field">
                    <Input
                      label="Eggs collected"
                      type="number"
                      min="0"
                      step="1"
                      value={form.eggs_collected}
                      onChange={(v) => set('eggs_collected', v)}
                    />
                    <Input
                      label="Damaged eggs"
                      type="number"
                      min="0"
                      step="1"
                      value={form.eggs_damaged}
                      onChange={(v) => set('eggs_damaged', v)}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                className="optional-toggle"
                onClick={() => setShowOptional((v) => !v)}
              >
                {showOptional ? '− Hide' : '+ Add'} symptoms and farm notes <span>Optional</span>
              </button>

              {showOptional && (
                <div className="ops-form-grid optional-fields">
                  <Input
                    label="Symptoms noticed"
                    value={form.symptoms}
                    onChange={(v) => set('symptoms', v)}
                    placeholder="Describe what you observed"
                  />
                  <Input
                    label="Farm notes"
                    value={form.notes}
                    onChange={(v) => set('notes', v)}
                    placeholder="Anything else to remember?"
                  />
                </div>
              )}

              <div className="ops-form-footer">
                <span>
                  <Clock3 size={13} /> Drafts are saved securely in Supabase.
                </span>
                <div>
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={saving || sameDay?.status === 'final'}
                    onClick={() => save('draft')}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    disabled={saving || sameDay?.status === 'final'}
                    onClick={() => save('final')}
                  >
                    <Check size={15} />
                    {saving ? 'Saving…' : 'Save record'}
                  </button>
                </div>
              </div>
            </OpsPanel>
          </div>

          <aside className="ops-aside-column">
            <OpsPanel title="Previous recorded day">
              {previous ? (
                <>
                  <p className="ops-aside-caption">
                    {flockLabel(previous.flock_id)} · {penLabel(previous.pen_id)} ·{' '}
                    {previous.record_date}
                  </p>
                  <div className="comparison-item">
                    <span>Feed consumed</span>
                    <strong>{fmt(previous.feed_consumed_kg, ' kg')}</strong>
                  </div>
                  <div className="comparison-item">
                    <span>Water consumed</span>
                    <strong>{fmt(previous.water_consumed_l, ' L')}</strong>
                  </div>
                  <div className="comparison-item">
                    <span>Bird deaths</span>
                    <strong>{previous.mortality_count}</strong>
                  </div>
                </>
              ) : (
                <p className="subtle">
                  Select a flock and pen to compare with an earlier finalized record.
                </p>
              )}
            </OpsPanel>

            <OpsPanel title="Why record daily?">
              <div className="benefit-list">
                <span>
                  <Check size={14} /> Spot changes early
                </span>
                <span>
                  <Check size={14} /> Track feed and water use
                </span>
                <span>
                  <Check size={14} /> Keep a history for your flock
                </span>
              </div>
              <p className="info-note">
                <Activity size={14} /> Finalizing a record applies its mortality once. Drafts
                never change live counts.
              </p>
            </OpsPanel>
          </aside>
        </div>
      )}
    </div>
  )
}
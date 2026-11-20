'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Bird,
  Check,
  CircleAlert,
  Download,
  History,
  Scale,
  TrendingUp,
} from 'lucide-react'
import {
  PageHeading,
  Field,
  OpsPanel,
  Status,
  SuccessNote,
  DataTable,
} from '../shared/operations-ui'
import { createClient } from '@/lib/supabase/client'

// MAAIF Poultry Training Manual: commercial broilers §4.5.2 (p.67),
// commercial layers §4.4.3/§4.4.4. This 10% rule is NOT for breeder stock.
const MAAIF_SOURCE =
  'https://www.agriculture.go.ug/wp-content/uploads/2020/07/MAAIF-Poultry-Manual.pdf'

const samplingAdvice = (population, category, method) => {
  const count = Math.max(0, Math.floor(Number(population) || 0))
  if (!count)
    return {
      recommended: 0,
      applicable: false,
      message: 'Select a location containing live birds.',
    }
  if (method === 'Full-flock total')
    return {
      recommended: count,
      applicable: true,
      message:
        'Full-count measurement: weigh every bird in the selected location. This is a measurement option, not the MAAIF 10% sampling rule.',
    }
  if (!['broiler', 'layer'].includes(String(category || '').trim().toLowerCase()))
    return {
      recommended: null,
      applicable: false,
      message:
        'The MAAIF commercial broiler/layer 10% rule cannot be applied to this production category. Confirm the appropriate guidance.',
    }
  return {
    recommended: Math.min(count, Math.ceil(count * 0.1)),
    applicable: true,
    message:
      'MAAIF recommends weighing 10% of commercial birds weekly and comparing average weight with the breed/age standard.',
  }
}

// Reference weights transcribed from the MAAIF Poultry Training Manual.
// Commercial broilers: Table 32 pellet, Table 33 mash (p.69).
// Commercial layers: Table 26 (p.62). These are NOT breed-specific targets.
const MAAIF_TARGETS = {
  broiler_pellet: { 1: 160, 2: 435, 3: 760, 4: 1290, 5: 1750 },
  broiler_mash: { 1: 150, 2: 375, 3: 705, 4: 1140, 5: 1600, 6: 2000 },
  layer: {
    1: 60, 2: 120, 3: 190, 4: 275, 5: 360, 6: 450, 7: 540, 8: 630, 9: 720,
    10: 810, 11: 900, 12: 1000, 13: 1095, 14: 1180, 15: 1265, 16: 1350,
    17: 1425, 18: 1475, 19: 1500,
  },
}

function daysBetween(start, end) {
  if (!start || !end) return null
  const a = Date.parse(`${start}T12:00:00Z`),
    b = Date.parse(`${end}T12:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null
  return Math.floor((b - a) / 86400000)
}

function assessWeight({ category, feedingProgramme, breed, ageDays, meanKg }) {
  if (!Number.isFinite(meanKg) || meanKg <= 0 || ageDays == null) return null
  const type = String(category || '').toLowerCase()
  let key, table
  if (type === 'broiler') {
    const feed = String(feedingProgramme || '').toLowerCase()
    if (/pellet|crumble/.test(feed)) {
      key = 'broiler_pellet'
      table = 'Table 32'
    } else if (/mash/.test(feed)) {
      key = 'broiler_mash'
      table = 'Table 33'
    } else
      return {
        status: 'unavailable',
        message:
          'Select or confirm the flock feeding programme (pellet or mash) before comparing against the MAAIF broiler reference.',
      }
  } else if (type === 'layer') {
    key = 'layer'
    table = 'Table 26'
  } else
    return {
      status: 'unavailable',
      message:
        'No applicable commercial broiler/layer reference is configured for this production category.',
    }
  // Tables give end-of-week values. Only compare at completed weeks, never extrapolate.
  const week = Math.floor(ageDays / 7)
  const targetG = MAAIF_TARGETS[key][week]
  if (!targetG)
    return {
      status: 'unavailable',
      message: `MAAIF ${table} has no configured target for completed week ${week}. No weight alert generated.`,
    }
  const targetKg = targetG / 1000
  const deviationPct = ((meanKg - targetKg) / targetKg) * 100
  // BroodWatch's own screening threshold; not a MAAIF threshold.
  const status =
    deviationPct < -10 ? 'underweight' : deviationPct > 10 ? 'above_target' : 'within_range'
  const message =
    status === 'underweight'
      ? 'Average weight is below the reference. Check feed availability and quality, water supply, feeder access, house temperature and signs of disease or parasites. Reweigh a representative sample and seek veterinary advice if birds appear unwell.'
      : status === 'above_target'
      ? 'Average weight is above the reference. Confirm sample representativeness, scale calibration and feeding programme; monitor growth and avoid sudden feed changes.'
      : 'Average weight is within BroodWatch’s ±10% screening band. Continue routine feeding, water checks and weekly representative weighing.'
  return {
    status,
    table,
    week,
    targetKg,
    deviationPct,
    message,
    referenceKey: key,
    breedNote: `MAAIF ${table} is a general commercial reference, not a verified ${
      breed || 'breed-specific'
    } growth curve. Confirm the breed supplier’s standard for breed-specific decisions.`,
  }
}

const methods = [
  { label: 'Individual bird', icon: Bird },
  { label: 'Group sample', icon: Scale },
  { label: 'Full-flock total', icon: Activity },
]

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

const formatDate = (s) =>
  s
    ? new Date(`${s}T12:00:00`).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

const fmt = (n, digits = 2) => Number(n).toFixed(digits)

const initial = () => ({
  flock_id: '',
  pen_id: '',
  weighed_on: today(),
  scale_type: 'Digital platform scale',
  sample_size: '',
  gross_weight_kg: '',
  tare_weight_kg: '0',
  individual: '',
  notes: '',
})

// Keeps the original shared Field component and its CSS rather than replacing it with wizard-field.
export function WeightMonitoring({ farm, farmId, farms = [], onFarmChange }) {
  const [method, setMethod] = useState('Group sample')
  const [form, setForm] = useState(initial)
  const [flocks, setFlocks] = useState([])
  const [pens, setPens] = useState([])
  const [placements, setPlacements] = useState([])
  const [records, setRecords] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const set = (name, value) => setForm((p) => ({ ...p, [name]: value }))

  useEffect(() => {
    let alive = true
    setFlocks([])
    setPens([])
    setPlacements([])
    setRecords([])
    setBatches([])
    setForm(initial())
    setError('')
    if (!farmId) return

    async function load() {
      setLoading(true)
      const db = createClient()
      const queries = await Promise.all([
        db.from('flocks').select('id,name,batch_id,current_count,archived_at').eq('farm_id', farmId),
        db.from('houses').select('id,name').eq('farm_id', farmId),
        db.from('pens').select('id,name,house_id').eq('farm_id', farmId),
        db.from('flock_placements').select('flock_id,pen_id,bird_count').eq('farm_id', farmId),
        db
          .from('weight_records')
          .select('*')
          .eq('farm_id', farmId)
          .order('weighed_on', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(250),
        db
          .from('batches')
          .select('id,category,batch_number,breed,hatch_date,arrival_date,feeding_programme')
          .eq('farm_id', farmId),
      ])
      if (!alive) return
      const failure = queries.find((q) => q.error)
      if (failure) {
        setError(failure.error.message)
        setLoading(false)
        return
      }
      const [f, h, p, pl, r, b] = queries.map((q) => q.data || [])
      const houseNames = new Map(h.map((x) => [x.id, x.name]))
      setFlocks(f.filter((x) => !x.archived_at))
      setPens(p.map((x) => ({ ...x, houseName: houseNames.get(x.house_id) || 'House' })))
      setPlacements(pl)
      setRecords(r)
      setBatches(b)
      setLoading(false)
    }
    load()
    return () => {
      alive = false
    }
  }, [farmId, refresh])

  const selectedFlock = flocks.find((f) => f.id === form.flock_id)
  const selectedBatch = batches.find((b) => b.id === selectedFlock?.batch_id)
  const category = selectedBatch?.category || ''
  const ageDays = daysBetween(
    selectedBatch?.hatch_date || selectedBatch?.arrival_date,
    form.weighed_on
  )

  const assigned = placements.filter((p) => p.flock_id === form.flock_id)
  const occupiedPens = pens.filter((p) =>
    assigned.some((a) => a.pen_id === p.id && Number(a.bird_count) > 0)
  )
  const assignedTotal = assigned.reduce((n, p) => n + Number(p.bird_count), 0)
  const unassigned = Math.max(0, Number(selectedFlock?.current_count || 0) - assignedTotal)
  const available =
    form.pen_id === 'unassigned'
      ? unassigned
      : Number(assigned.find((p) => p.pen_id === form.pen_id)?.bird_count || 0)

  const recommendation = samplingAdvice(available, category, method)

  const individualWeights = useMemo(
    () =>
      form.individual
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .map(Number),
    [form.individual]
  )

  const gross =
    method === 'Individual bird'
      ? individualWeights.reduce((a, b) => a + b, 0) + Number(form.tare_weight_kg || 0)
      : Number(form.gross_weight_kg)
  const net = gross - Number(form.tare_weight_kg || 0)
  const avg = Number(form.sample_size) > 0 ? net / Number(form.sample_size) : 0

  const assessment = assessWeight({
    category,
    feedingProgramme: selectedBatch?.feeding_programme,
    breed: selectedBatch?.breed,
    ageDays,
    meanKg: avg,
  })

  const selectedRecords = records.filter((r) => !form.flock_id || r.flock_id === form.flock_id)
  const latest = selectedRecords[0]
  const individualList = latest?.individual_weights_kg
  const weights = Array.isArray(individualList) ? individualList.map(Number) : []
  const mean = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0
  const sd =
    weights.length > 1
      ? Math.sqrt(weights.reduce((a, b) => a + (b - mean) ** 2, 0) / (weights.length - 1))
      : 0
  const cv = mean > 0 && weights.length > 1 ? `${fmt((sd / mean) * 100, 1)}%` : 'Not available'

  const names = new Map(flocks.map((f) => [f.id, f.name]))
  const penNames = new Map(pens.map((p) => [p.id, `${p.houseName} · ${p.name}`]))

  function chooseMethod(nextMethod) {
    setMethod(nextMethod)
    const next = samplingAdvice(available, category, nextMethod)
    setForm((p) => ({
      ...p,
      sample_size: next.recommended == null ? '' : String(next.recommended),
    }))
  }

  function chooseLocation(penId, flockId = form.flock_id) {
    const flock = flocks.find((f) => f.id === flockId)
    const assignedHere = placements.filter((p) => p.flock_id === flockId)
    const assignedSum = assignedHere.reduce((sum, p) => sum + Number(p.bird_count), 0)
    const count =
      penId === 'unassigned'
        ? Math.max(0, Number(flock?.current_count || 0) - assignedSum)
        : Number(assignedHere.find((p) => p.pen_id === penId)?.bird_count || 0)
    const batch = batches.find((b) => b.id === flock?.batch_id)
    const next = samplingAdvice(count, batch?.category, method)
    setForm((p) => ({
      ...p,
      flock_id: flockId,
      pen_id: penId,
      sample_size: next.recommended == null ? '' : String(next.recommended),
    }))
  }

  async function save() {
    setError('')
    setSaved(false)
    if (!farmId || !form.flock_id || !form.pen_id) {
      setError('Select a farm, flock and location.')
      return
    }
    const n = Number(form.sample_size)
    if (!Number.isInteger(n) || n < 1 || n > available) {
      setError(`Number weighed must be between 1 and ${available}.`)
      return
    }
    if (!recommendation.applicable) {
      setError(
        'A MAAIF sampling rule is not available for this production type. Confirm the appropriate sampling guidance before saving.'
      )
      return
    }
    if (method === 'Full-flock total' && n !== available) {
      setError(`For a full count, enter all ${available} birds in this location.`)
      return
    }
    if (
      method === 'Individual bird' &&
      (individualWeights.length !== n ||
        individualWeights.some((w) => !Number.isFinite(w) || w <= 0))
    ) {
      setError('Enter exactly one positive weight per bird, separated by commas.')
      return
    }
    if (
      !Number.isFinite(gross) ||
      !Number.isFinite(net) ||
      net <= 0 ||
      Number(form.tare_weight_kg) < 0
    ) {
      setError('Net weight must be positive and tare cannot be negative.')
      return
    }
    if (
      n < (recommendation.recommended || 0) &&
      method !== 'Full-flock total' &&
      !window.confirm(
        `You weighed ${n} birds, below the MAAIF 10% recommendation of ${recommendation.recommended}. Save this smaller sample anyway?`
      )
    )
      return
    if (form.weighed_on > today()) {
      setError('The weighing date cannot be in the future.')
      return
    }

    setSaving(true)
    const db = createClient()
    const { error: e } = await db.rpc('save_weight_record_with_assessment', {
      p_farm_id: farmId,
      p_data: {
        flock_id: form.flock_id,
        pen_id: form.pen_id === 'unassigned' ? null : form.pen_id,
        weighed_on: form.weighed_on,
        method,
        scale_type: form.scale_type,
        sample_size: n,
        gross_weight_kg: gross,
        tare_weight_kg: Number(form.tare_weight_kg || 0),
        individual_weights_kg: method === 'Individual bird' ? individualWeights : null,
        notes: form.notes,
        // These fields are stored by the optional accompanying migration.
        population_at_weighing: available,
        recommended_sample_size: recommendation.recommended,
        sampling_guideline: 'MAAIF-POULTRY-MANUAL-COMMERCIAL-10PCT',
        assessment: assessment?.targetKg
          ? {
              reference_key: assessment.referenceKey,
              reference_table: assessment.table,
              age_days: ageDays,
              age_week: assessment.week,
              target_weight_kg: assessment.targetKg,
              observed_mean_kg: avg,
              deviation_pct: assessment.deviationPct,
              status: assessment.status,
              recommendation: assessment.message,
              breed_note: assessment.breedNote,
              threshold_source: 'BroodWatch ±10% screening rule',
            }
          : null,
      },
    })
    setSaving(false)
    if (e) {
      setError(e.message)
      return
    }
    setSaved(true)
    setRefresh((v) => v + 1)
  }

  function exportCsv() {
    const cols = ['Date', 'Flock', 'Pen', 'Method', 'Sample size', 'Net kg', 'Mean kg', 'Scale', 'Notes']
    const data = selectedRecords.map((r) => [
      r.weighed_on,
      names.get(r.flock_id) || r.flock_id,
      penNames.get(r.pen_id) || 'Unassigned',
      r.method,
      r.sample_size,
      r.net_weight_kg,
      Number(r.net_weight_kg) / r.sample_size,
      r.scale_type,
      r.notes || '',
    ])
    const esc = (x) => `"${String(x ?? '').replaceAll('"', '""')}"`
    const blob = new Blob([[cols, ...data].map((row) => row.map(esc).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'broodwatch-weight-history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK OPERATIONS"
        title="Weight monitoring"
        description="Weigh at useful intervals to understand how your flock is growing."
        action={{
          label: 'View weight history',
          icon: History,
          onClick: () =>
            document.getElementById('weight-history')?.scrollIntoView({ behavior: 'smooth' }),
        }}
      />

      <div className="ops-callout">
        <Scale size={17} />
        <p>
          <strong>Choose a sampling method that suits your flock.</strong> Weighing every day
          is not required. Record whether a measurement is a sample or a full-flock total.
        </p>
      </div>

      {farms.length > 1 && (
        <div className="ops-callout">
          <span>Farm:</span>
          <select
            aria-label="Choose farm"
            value={farmId || ''}
            onChange={(e) => onFarmChange?.(e.target.value)}
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="ops-callout" role="alert">
          <CircleAlert size={17} />
          <p>{error}</p>
        </div>
      )}
      {saved && <SuccessNote>Weight entry saved to your farm's records.</SuccessNote>}

      <div className="ops-columns weight-layout">
        <div className="ops-main-column">
          <OpsPanel title="New weight entry">
            <div className="method-choice">
              {methods.map(({ label, icon: Icon }) => (
                <button
                  type="button"
                  className={`method-card ${method === label ? 'active' : ''}`}
                  key={label}
                  onClick={() => chooseMethod(label)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {method === label && <Check size={14} />}
                </button>
              ))}
            </div>

            <div className="ops-form-grid">
              <Field
                label="Flock or batch"
                options={['Select flock', ...flocks.map((f) => f.name)]}
                value={selectedFlock?.name || 'Select flock'}
                onChange={(e) => {
                  const f = flocks.find((x) => x.name === e.target.value)
                  setForm((p) => ({ ...p, flock_id: f?.id || '', pen_id: '', sample_size: '' }))
                }}
              />
              <Field
                label="House and pen"
                options={[
                  'Select location',
                  ...occupiedPens.map((p) => `${p.houseName} · ${p.name}`),
                  ...(unassigned > 0 ? ['Unassigned birds'] : []),
                ]}
                value={
                  form.pen_id === 'unassigned'
                    ? 'Unassigned birds'
                    : penNames.get(form.pen_id) || 'Select location'
                }
                onChange={(e) => {
                  const pen = occupiedPens.find(
                    (p) => `${p.houseName} · ${p.name}` === e.target.value
                  )
                  chooseLocation(
                    e.target.value === 'Unassigned birds' ? 'unassigned' : pen?.id || ''
                  )
                }}
              />
              <Field
                label="Date weighed"
                type="date"
                value={form.weighed_on}
                max={today()}
                onChange={(e) => set('weighed_on', e.target.value)}
              />
              <Field
                label="Scale type"
                options={['Digital platform scale', 'Hanging scale', 'Other']}
                value={form.scale_type}
                onChange={(e) => set('scale_type', e.target.value)}
              />
              <div className="ops-field">
                <label>Birds available (live, selected location)</label>
                <div className="ops-callout" style={{ margin: 0, padding: 12 }}>
                  <Bird size={16} />
                  <strong>{form.pen_id ? available.toLocaleString() : 'Select a flock and location'}</strong>
                  <span style={{ fontSize: 12 }}>Automatically retrieved from live placements</span>
                </div>
              </div>
              <Field
                label={
                  method === 'Individual bird'
                    ? 'Number of birds weighed'
                    : method === 'Group sample'
                    ? 'Number of birds in sample'
                    : 'Birds weighed'
                }
                type="number"
                min="1"
                max={available}
                placeholder="e.g. 10"
                value={form.sample_size}
                onChange={(e) => set('sample_size', e.target.value)}
              />
            </div>

            <div className="ops-callout" role="note" style={{ marginTop: 16 }}>
              <Scale size={17} />
              <div>
                <strong>MAAIF weighing recommendation</strong>
                <p>
                  Live birds: <strong>{available}</strong> · Recommended to weigh:{' '}
                  <strong>
                    {recommendation.recommended == null
                      ? 'Not established'
                      : recommendation.recommended}
                  </strong>
                </p>
                <p>{recommendation.message}</p>
                {recommendation.applicable && method !== 'Full-flock total' && (
                  <p>
                    Sampling target: {recommendation.recommended} birds (10%, rounded up).{' '}
                    {category.toLowerCase() === 'broiler'
                      ? 'Select birds from the four corners of the house.'
                      : 'Take a representative sample across the location.'}{' '}
                    Weigh weekly and compare the average with the correct breed and age standard.
                  </p>
                )}
                <p>
                  <a href={MAAIF_SOURCE} target="_blank" rel="noopener noreferrer">
                    Source: Uganda MAAIF Poultry Training Manual (commercial broilers §4.5.2, p.67;
                    commercial layers §4.4)
                  </a>
                </p>
              </div>
            </div>

            <div className="ops-form-section">
              <div className="form-section-heading">
                <Scale size={16} />
                <strong>Measurement details</strong>
              </div>
              <div className="ops-form-grid">
                {method === 'Individual bird' ? (
                  <Field
                    label="Bird weights (kg)"
                    placeholder="e.g. 1.1, 1.2, 1.15"
                    value={form.individual}
                    onChange={(e) => set('individual', e.target.value)}
                  />
                ) : (
                  <Field
                    label={
                      method === 'Full-flock total'
                        ? 'Total flock weight (kg)'
                        : 'Total sample weight (kg)'
                    }
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="e.g. 12.4"
                    value={form.gross_weight_kg}
                    onChange={(e) => set('gross_weight_kg', e.target.value)}
                  />
                )}
                <Field
                  label="Container tare weight (kg)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.tare_weight_kg}
                  onChange={(e) => set('tare_weight_kg', e.target.value)}
                />
                <Field
                  label="Sampling notes"
                  placeholder="How were birds selected?"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
              <p className="info-note">
                Net weight: {Number.isFinite(net) && net > 0 ? `${fmt(net, 3)} kg` : '—'} · Mean per
                bird: {avg > 0 ? `${fmt(avg, 3)} kg` : '—'}. For individual weights, the sum is
                calculated automatically. For other methods, enter the total scale reading before
                subtracting tare.
              </p>
            </div>

            <div className="ops-callout" role="status" aria-live="polite" style={{ marginTop: 16 }}>
              <CircleAlert size={18} />
              <div>
                <strong>MAAIF growth comparison &amp; BroodWatch recommendation</strong>
                {!assessment ? (
                  <p>
                    Choose a flock and location, then enter the weighing measurements to calculate
                    an assessment.
                  </p>
                ) : assessment.status === 'unavailable' ? (
                  <p>{assessment.message}</p>
                ) : (
                  <>
                    <p>
                      Age: <strong>{ageDays} days (completed week {assessment.week})</strong> ·
                      Observed mean: <strong>{fmt(avg, 3)} kg</strong> · MAAIF reference:{' '}
                      <strong>{fmt(assessment.targetKg, 3)} kg</strong> ({assessment.table})
                    </p>
                    <p>
                      Difference:{' '}
                      <strong>
                        {assessment.deviationPct >= 0 ? '+' : ''}
                        {fmt(assessment.deviationPct, 1)}%
                      </strong>{' '}
                      · Assessment:{' '}
                      <strong>
                        {assessment.status === 'underweight'
                          ? 'Below reference'
                          : assessment.status === 'above_target'
                          ? 'Above reference'
                          : 'Within screening range'}
                      </strong>
                    </p>
                    <p>{assessment.message}</p>
                    <p style={{ fontSize: 12 }}>
                      {assessment.breedNote} Alert threshold: BroodWatch ±10% screening rule, not a
                      MAAIF clinical cutoff.
                    </p>
                  </>
                )}
                <a href={MAAIF_SOURCE} target="_blank" rel="noopener noreferrer">
                  Official MAAIF Poultry Training Manual — Tables 26, 32 and 33
                </a>
              </div>
            </div>

            <div className="ops-form-footer">
              <span>Sample estimates are not full-flock measurements.</span>
              <button
                type="button"
                className="button-primary"
                disabled={saving || loading || !farmId}
                onClick={save}
              >
                <Check size={15} />
                {saving ? 'Saving…' : 'Save weight'}
              </button>
            </div>
          </OpsPanel>
        </div>

        <aside className="ops-aside-column">
          <OpsPanel title="Latest flock summary">
            {latest ? (
              <>
                <div className="weight-summary">
                  <span className="weight-stat-icon">
                    <TrendingUp size={17} />
                  </span>
                  <div>
                    <strong>{fmt(Number(latest.net_weight_kg) / latest.sample_size, 3)} kg</strong>
                    <small>Mean recorded weight</small>
                  </div>
                  <Status>{latest.method === 'Full-flock total' ? 'Full count' : 'Sample'}</Status>
                </div>
                <div className="weight-detail-grid">
                  <div>
                    <span>Sample size</span>
                    <strong>{latest.sample_size} birds</strong>
                  </div>
                  <div>
                    <span>Last weighed</span>
                    <strong>{formatDate(latest.weighed_on)}</strong>
                  </div>
                  <div>
                    <span>Weight range</span>
                    <strong>
                      {weights.length
                        ? `${fmt(Math.min(...weights))}–${fmt(Math.max(...weights))} kg`
                        : 'Not available'}
                    </strong>
                  </div>
                  <div>
                    <span>Variability (CV)</span>
                    <strong>{cv}</strong>
                  </div>
                </div>
                <p className="info-note">
                  <CircleAlert size={14} /> Weight range and CV are available only for
                  individual-bird entries. Reference targets vary by breed and age.
                </p>
              </>
            ) : (
              <p className="info-note">No weight entries yet for this farm or selected flock.</p>
            )}
          </OpsPanel>
        </aside>
      </div>

      <div id="weight-history">
        <OpsPanel
          title="Sampling history"
          action={
            <button
              type="button"
              className="quiet-action"
              onClick={exportCsv}
              disabled={!selectedRecords.length}
            >
              <Download size={14} /> Export
            </button>
          }
        >
          {loading ? (
            <p>Loading weight records…</p>
          ) : (
            <DataTable
              headings={['DATE', 'FLOCK', 'PEN', 'METHOD', 'SAMPLE SIZE', 'MEAN WEIGHT', 'ENTRY TYPE']}
              rows={selectedRecords.map((r) => [
                formatDate(r.weighed_on),
                names.get(r.flock_id) || 'Archived flock',
                penNames.get(r.pen_id) || 'Unassigned',
                r.method,
                `${r.sample_size} birds`,
                `${fmt(Number(r.net_weight_kg) / r.sample_size, 3)} kg`,
                <Status key={r.id}>{r.method === 'Full-flock total' ? 'Full count' : 'Sample'}</Status>,
              ])}
            />
          )}
          {!loading && !selectedRecords.length && (
            <p className="info-note">No recorded weights yet. Save your first measurement above.</p>
          )}
        </OpsPanel>
      </div>
    </div>
  )
}
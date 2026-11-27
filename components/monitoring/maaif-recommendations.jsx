'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, BookOpen, CheckCircle2, CircleAlert, Clock3, ExternalLink, Info, ShieldCheck } from 'lucide-react'
import { ScreenHeader, StatePill, Metric, FilterBar } from '../shared/intelligence-ui'
import { createClient } from '@/lib/supabase/client'

const MANUAL_PATH = '/references/maaif-poultry-manual.pdf'
const PAGE_SIZE = 500

const REFERENCE_TABLES = {
  layer: [11, 17, 25, 32, 37, 42, 46, 50, 54, 58, 61, 64, 67, 70, 73, 76, 80, 87, 90, 95],
  pellet: [23, 54, 80, 127, 135],
  mash: [20, 42.9, 81.4, 125.7, 160, 174.2],
  dual: [15, 29, 47, 78, 104, 122, 144, 150, 162, 178],
}

const REFERENCE_SOURCES = {
  layer: 'Table 26, p. 62',
  pellet: 'Table 32, p. 69',
  mash: 'Table 33, p. 69',
  dual: 'Table 34, p. 71',
}

const PROGRAMME_OPTIONS = {
  Layer: [['layer', 'Commercial layer mash programme']],
  Broiler: [['pellet', 'Commercial broiler pellet'], ['mash', 'Commercial broiler mash'], ['dual', 'Improved dual-purpose meat programme']],
}

const FILTERS = ['All recommendations', 'MAAIF reference', 'Calculated comparison']

const SUMMARY_STATES = [
  ['Within reference range', CheckCircle2, 'sage'],
  ['Needs attention', CircleAlert, 'gold'],
  ['Insufficient data', Info, 'slate'],
  ['Not applicable', Activity, 'slate'],
]

const FEED_SCREENING_BAND = 10
const WEIGHT_REVIEW_STATUSES = ['underweight', 'above_target']
const WEIGHT_OK_STATUSES = ['within_range', 'within_target', 'on_target']
const VALID_WEIGHT_STATUSES = [...WEIGHT_REVIEW_STATUSES, ...WEIGHT_OK_STATUSES]

const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}

const fmt = n => Number(n).toFixed(1)
const daysBetween = (a, b) => (Date.parse(a) - Date.parse(b)) / 86400000

async function fetchPaged(db, table, farmId) {
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const r = await db.from(table).select('*').eq('farm_id', farmId).order('id').range(offset, offset + PAGE_SIZE - 1)
    if (r.error) throw new Error(`${table}: ${r.error.message}`)
    rows.push(...r.data)
    if (r.data.length < PAGE_SIZE) return rows
  }
}

async function fetchMaaifData(farmId) {
  const db = createClient()
  const [flocks, batches, ledger, weights] = await Promise.all([
    fetchPaged(db, 'flocks', farmId),
    fetchPaged(db, 'batches', farmId),
    fetchPaged(db, 'feed_water_allocations', farmId),
    fetchPaged(db, 'weight_records', farmId),
  ])
  return { id: farmId, flocks, batches, ledger, weights, at: new Date() }
}

function useMaaifData(farmId) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!farmId) return
    let active = true
    setData(null)
    setError('')

    fetchMaaifData(farmId)
      .then(result => { if (active) setData(result) })
      .catch(e => { if (active) setError(e.message) })

    return () => { active = false }
  }, [farmId, revision])

  return { data: data?.id === farmId ? data : null, error, refresh: () => setRevision(x => x + 1) }
}

function toneFor(state) {
  if (state === 'Needs attention') return 'gold'
  if (state === 'Within reference range') return 'sage'
  return 'slate'
}

function buildFeedCard(farmId, flock, batch, data, confirmed) {
  const key = `${farmId}:${flock.id}`
  const programme = confirmed[key] || ''
  const source = REFERENCE_SOURCES[programme]
  const rows = data.ledger
    .filter(r => r.flock_id === flock.id && r.record_date <= today())
    .sort((a, b) =>
      b.record_date.localeCompare(a.record_date) ||
      String(b.created_at).localeCompare(String(a.created_at)) ||
      a.id.localeCompare(b.id)
    )
  const latest = rows[0]
  const age = latest && batch.hatch_date ? daysBetween(latest.record_date, batch.hatch_date) : NaN
  const week = Math.floor(age / 7) + 1
  const target = programme === 'layer' && week >= 20 && week <= 80
    ? 95
    : REFERENCE_TABLES[programme]?.[week - 1]

  const duplicate = latest && rows.filter(x => x.record_date === latest.record_date && x.pen_id === latest.pen_id).length !== 1
  const valid =
    latest &&
    Number(latest.observation_hours) === 24 &&
    Number(latest.population_observed) > 0 &&
    !duplicate &&
    Number.isFinite(age) &&
    age >= 0 &&
    target > 0 &&
    latest.feed_consumed_kg != null

  const actual = valid ? (Number(latest.feed_consumed_kg) * 1000) / Number(latest.population_observed) : null
  const deviation = valid ? ((actual - target) / target) * 100 : null

  const state = !valid
    ? 'Insufficient data'
    : Math.abs(deviation) > FEED_SCREENING_BAND
      ? 'Needs attention'
      : 'Within reference range'

  return {
    id: `${flock.id}-feed`,
    flock: flock.name,
    type: 'Calculated comparison',
    title: 'Feed consumption assessment',
    state,
    key,
    programme,
    category: batch.category,
    values: [
      ['Observation', latest?.record_date || 'None'],
      ['Pen ID', latest?.pen_id || '—'],
      ['Age week', Number.isFinite(week) ? week : 'Unknown'],
      ['Recorded g/bird/day', valid ? fmt(actual) : '—'],
      ['Reference g/bird/day', target ?? '—'],
      ['Deviation', valid ? fmt(deviation) + '%' : '—'],
    ],
    explanation: valid
      ? `Latest pen-level 24-hour ledger observation compared with the selected general programme. ±${FEED_SCREENING_BAND}% is a BroodWatch screening band, not a MAAIF tolerance.`
      : 'Confirm the applicable programme and supply a hatch date, one 24-hour allocation per pen/day and a recorded population. No current flock count is substituted.',
    action: 'Check feed access, measurement accuracy and programme suitability before changing feed.',
    source: source || 'Programme not confirmed',
  }
}

function buildWeightCard(flock, data) {
  const latest = data.weights
    .filter(w => w.flock_id === flock.id && w.weighed_on <= today())
    .sort((a, b) =>
      b.weighed_on.localeCompare(a.weighed_on) ||
      String(b.created_at).localeCompare(String(a.created_at))
    )[0]

  const assessment = latest?.weight_assessment
  const valid = assessment?.assessment_source === 'server' && VALID_WEIGHT_STATUSES.includes(assessment.status)

  const state = !valid
    ? 'Insufficient data'
    : WEIGHT_REVIEW_STATUSES.includes(assessment.status)
      ? 'Needs attention'
      : 'Within reference range'

  return {
    id: `${flock.id}-weight`,
    flock: flock.name,
    type: 'Calculated comparison',
    title: 'Growth assessment',
    state,
    values: [
      ['Weighed on', latest?.weighed_on || '—'],
      ['Observed kg', assessment?.observed_mean_kg ?? '—'],
      ['Target kg', assessment?.target_weight_kg ?? '—'],
    ],
    explanation: assessment?.breed_note || 'No recognised server assessment for the latest weighing.',
    action: assessment?.recommendation || 'Record a representative weight sample and verify its feeding programme.',
    source: assessment?.reference_table || 'Weight assessment unavailable',
  }
}

const REFERENCE_CARD = {
  id: 'reference',
  flock: 'All flocks',
  type: 'MAAIF reference',
  title: 'Choose the correct feeding programme',
  state: 'Not applicable',
  values: [
    ['Commercial layers', 'Table 26'],
    ['Commercial broilers', 'Tables 32–33'],
    ['Improved meat birds', 'Table 34'],
  ],
  explanation: 'Table 23 concerns female Cobb 500 breeder stock, not ordinary commercial layers. References are programme-specific.',
  action: 'Confirm breed, production purpose and feed form before selecting a comparison.',
  source: 'MAAIF (2019), pp. 57, 62, 69, 71',
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select className="range-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

function ReferenceBanner() {
  return (
    <div className="reference-banner">
      <span><BookOpen size={17} /></span>
      <div>
        <strong>Manual guidance is flock-specific.</strong>
        <p>Confirm the applicable programme. Selection is temporary and does not change your flock settings.</p>
      </div>
      <StatePill tone="blue">Verified references</StatePill>
    </div>
  )
}

function AdvisoryOverview({ ready, visible }) {
  return (
    <div className="advisory-overview">
      {SUMMARY_STATES.map(([state, Icon, tone]) => (
        <Metric
          key={state}
          label={state}
          value={ready ? visible.filter(c => c.state === state).length : '—'}
          detail="Displayed assessments"
          icon={Icon}
          tone={tone}
        />
      ))}
    </div>
  )
}

function AdvisoryCard({ card, confirmed, onConfirmProgramme }) {
  return (
    <article className="advisory-item">
      <div className="advisory-card-head">
        <span className="advisory-source-label">{card.type}</span>
        <StatePill tone={toneFor(card.state)}>{card.state}</StatePill>
      </div>

      <h2>{card.title}</h2>
      <p className="advisory-flock">{card.flock}</p>

      {card.key && (
        <SelectField
          label="Confirm programme"
          value={card.programme}
          onChange={v => onConfirmProgramme(card.key, v)}
          options={[['', 'Not confirmed'], ...(PROGRAMME_OPTIONS[card.category] || [])]}
        />
      )}

      <div className="advisory-values">
        {card.values.map(([label, value]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>

      <div className="advisory-explanation">
        <span>What this means</span>
        <p>{card.explanation}</p>
      </div>

      <div className="advisory-action">
        <span><CheckCircle2 size={15} /></span>
        <p><strong>Suggested check</strong>{card.action}</p>
      </div>

      <div className="advisory-citation">
        <BookOpen size={14} />
        <span>{card.source}</span>
        <a href={MANUAL_PATH} target="_blank" rel="noreferrer" aria-label="Open reference manual">
          <ExternalLink size={13} />
        </a>
      </div>
    </article>
  )
}

export function MAAIFRecommendations({ farmId, farm, farms = [], onFarmChange }) {
  const [available, setAvailable] = useState([])
  const [local, setLocal] = useState('')
  const [flock, setFlock] = useState('')
  const [filter, setFilter] = useState('All recommendations')
  const [confirmed, setConfirmed] = useState({})

  const id = local || farmId || farm?.id || farms[0]?.id || available[0]?.id || ''
  const { data, error, refresh } = useMaaifData(id)

  useEffect(() => { setLocal('') }, [farmId, farm?.id])
  useEffect(() => { setFlock('') }, [id])

  useEffect(() => {
    let active = true
    createClient()
      .from('farms')
      .select('id,name')
      .order('name')
      .then(r => { if (active && !r.error) setAvailable(r.data || []) })
    return () => { active = false }
  }, [])

  const ready = Boolean(data)
  const activeFlocks = ready ? data.flocks.filter(f => !f.archived_at && f.current_count > 0) : []

  const cards = useMemo(() => {
    if (!ready) return []
    const out = []

    for (const f of activeFlocks.filter(f => !flock || f.id === flock)) {
      const batch = data.batches.find(b => b.id === f.batch_id) || {}
      out.push(buildFeedCard(id, f, batch, data, confirmed))
      out.push(buildWeightCard(f, data))
    }

    out.push(REFERENCE_CARD)
    return out
  }, [ready, data, activeFlocks, flock, confirmed, id])

  const visible = cards.filter(c => filter === 'All recommendations' || c.type === filter)

  function changeFarm(next) {
    setLocal(next)
    onFarmChange?.(next)
  }

  function confirmProgramme(key, programme) {
    setConfirmed(old => ({ ...old, [key]: programme }))
  }

  const farmOptions = available.length ? available : farms.length ? farms : farm ? [farm] : []

  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="ADVISORY CENTRE"
        title="MAAIF recommendations"
        description="Programme-specific reference comparisons using recorded farm observations."
      />

      <ReferenceBanner />

      <FilterBar>
        <SelectField
          label="Farm"
          value={id}
          onChange={changeFarm}
          options={farmOptions.map(f => [f.id, f.name])}
        />
        <SelectField
          label="Flock"
          value={flock}
          onChange={setFlock}
          options={[['', 'All active flocks'], ...activeFlocks.map(f => [f.id, f.name])]}
        />
        <SelectField
          label="Category"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map(x => [x, x])}
        />
        <span className="intel-filter-spacer" />
        <button className="quiet-action" onClick={refresh}>Refresh</button>
        <span className="last-evaluated">
          <Clock3 size={13} />{ready ? data.at.toLocaleString('en-GB') : 'Not evaluated'}
        </span>
      </FilterBar>

      {error && <p role="alert">{error}</p>}
      {!ready && id && !error && <p>Loading farm observations…</p>}
      {!id && <p>Select or create a farm.</p>}

      <AdvisoryOverview ready={ready} visible={visible} />

      <div className="advisory-list">
        {visible.map(card => (
          <AdvisoryCard
            key={card.id}
            card={card}
            confirmed={confirmed}
            onConfirmProgramme={confirmProgramme}
          />
        ))}
      </div>

      <p className="intel-disclaimer">
        <ShieldCheck size={14} /> Screening only; not veterinary diagnosis. Ledger population and measurement duration must be accurate.
      </p>
    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Bird,
  Check,
  CircleAlert,
  Download,
  History,
  X,
  Scale,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import {
  PageHeading,
  Field,
  OpsPanel,
  Status,
  SuccessNote,
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

function assessWeight({ category, feedingProgramme, feedForm, breed, ageDays, meanKg }) {
  if (!Number.isFinite(meanKg) || meanKg <= 0 || ageDays == null) return null
  const type = String(category || '').toLowerCase()
  let key, table
  if (type === 'broiler') {
    const feed = String(feedForm || feedingProgramme || '').toLowerCase()
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
  const [result, setResult] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [historyQuery, setHistoryQuery] = useState('')
  const [historyMethod, setHistoryMethod] = useState('All methods')
  const [historyAssessment, setHistoryAssessment] = useState('All assessments')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyLimit, setHistoryLimit] = useState(15)
  const [historyDetail, setHistoryDetail] = useState(null)
  const [historySort, setHistorySort] = useState('newest')

  const set = (name, value) => setForm((p) => ({ ...p, [name]: value }))

  useEffect(() => {
    let alive = true
    setFlocks([])
    setPens([])
    setPlacements([])
    setRecords([])
    setBatches([])
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
          .select('id,category,batch_number,breed,hatch_date,arrival_date,feeding_programme,feed_form,production_purpose')
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
  const wholeFlockRecommendation = samplingAdvice(Number(selectedFlock?.current_count || 0), category, 'Group sample')

  const individualWeights = useMemo(
    () => form.individual.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).map(Number),
    [form.individual]
  )

  // Blank inputs are NOT zero measurements. Update totals live as the user types.
  const hasReading = method === 'Individual bird'
    ? form.individual.trim().length > 0
    : form.gross_weight_kg !== '' && form.gross_weight_kg != null
  const gross = method === 'Individual bird'
    ? individualWeights.reduce((a, b) => a + b, 0)
    : hasReading ? Number(form.gross_weight_kg) : NaN
  const tare = method === 'Individual bird' ? 0 : Number(form.tare_weight_kg || 0)
  const net = hasReading && Number.isFinite(gross) && Number.isFinite(tare) && gross > tare
    ? gross - tare : NaN
  const effectiveSampleSize = method === 'Individual bird'
    ? individualWeights.length : form.sample_size === '' ? 0 : Number(form.sample_size)
  const avg = Number.isFinite(net) && effectiveSampleSize > 0 ? net / effectiveSampleSize : NaN

  const assessment = assessWeight({
    category,
    feedingProgramme: selectedBatch?.feeding_programme,
    feedForm: selectedBatch?.feed_form,
    breed: selectedBatch?.breed,
    ageDays,
    meanKg: avg,
  })

  const selectedRecords = records.filter((r) => !form.flock_id || r.flock_id === form.flock_id)
  const validWeights = individualWeights.length > 0 && individualWeights.every((w) => Number.isFinite(w) && w > 0)
  const lastFlockRecord = form.flock_id ? records.find((r) => r.flock_id === form.flock_id) : null
  const lastFlockDays = lastFlockRecord ? daysBetween(lastFlockRecord.weighed_on, form.weighed_on) : null
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
      ...p, individual: '', gross_weight_kg: '',
      sample_size: nextMethod === 'Individual bird' ? '' : next.recommended == null ? '' : String(next.recommended),
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
      sample_size: method === 'Individual bird' ? '' : next.recommended == null ? '' : String(next.recommended),
    }))
  }

  async function save() {
    setError('')
    setSaved(false)
    if (!farmId || !form.flock_id || !form.pen_id) {
      setError('Select a farm, flock and location first. The weight cannot be saved without them.')
      return
    }
    const n = effectiveSampleSize
    if (!Number.isInteger(n) || n < 1 || n > available) {
      setError(`Number weighed must be between 1 and ${available}.`)
      return
    }
    // Record valid observations for every poultry category; absence of a reference
    // must not prevent farmers from keeping measurements.
    if (method === 'Full-flock total' && n !== available) {
      setError(`For a full count, enter all ${available} birds in this location.`)
      return
    }
    if (method === 'Individual bird' && !validWeights) {
      setError('Enter exactly one positive weight per bird, separated by commas.')
      return
    }
    if (!hasReading) {
      setError(method === 'Individual bird' ? 'Enter individual bird weights in kilograms.' : 'Enter the total weight shown on your scale (kg).')
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
      recommendation.applicable && n < (recommendation.recommended || 0) &&
      method !== 'Full-flock total' &&
      !window.confirm(
        `You weighed ${n} birds, below the MAAIF 10% recommendation of ${recommendation.recommended}. Save this smaller sample anyway?`
      )
    )
      return
    if (!form.weighed_on || form.weighed_on > today()) {
      setError('The weighing date cannot be in the future.')
      return
    }

    if (ageDays === null && selectedBatch?.hatch_date) {
      setError('The weighing date cannot be before the flock hatch date.')
      return
    }
    setSaving(true)
    const db = createClient()
    let e
    let savedRecord = null
    try {
    const response = await db.rpc('save_weight_record_with_assessment', {
      p_farm_id: farmId,
      p_data: {
        flock_id: form.flock_id,
        pen_id: form.pen_id === 'unassigned' ? null : form.pen_id,
        weighed_on: form.weighed_on,
        method,
        scale_type: form.scale_type,
        sample_size: n,
        gross_weight_kg: gross,
        tare_weight_kg: method === 'Individual bird' ? 0 : Number(form.tare_weight_kg || 0),
        individual_weights_kg: method === 'Individual bird' ? individualWeights : null,
        notes: form.notes,
        // These fields are stored by the optional accompanying migration.
        population_at_weighing: available,
        recommended_sample_size: recommendation.recommended,
        sampling_guideline: recommendation.applicable && method !== 'Full-flock total'
          ? 'MAAIF-POULTRY-MANUAL-COMMERCIAL-10PCT' : null,
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
    e = response.error || (!response.data ? new Error('Supabase did not return a saved record ID. Please check the RPC result.') : null)
    if (!e && response.data) {
      // Display the server-calculated, saved assessment, never an unverified client value.
      const read = await db.from('weight_records')
        .select('id,weighed_on,method,sample_size,net_weight_kg,weight_assessment,population_at_weighing,recommended_sample_size')
        .eq('farm_id', farmId).eq('id', response.data).single()
      if (read.error) {
        // Save succeeded; show a truthful receipt with no invented server assessment.
        savedRecord = { id: response.data, weighed_on: form.weighed_on, sample_size: n,
          net_weight_kg: net, weight_assessment: null, readError: read.error.message }
      } else savedRecord = read.data
    }
    } catch (unexpected) { e = unexpected; console.error('[BroodWatch Weight] Save exception', unexpected) }
    setSaving(false)
    if (e) {
      setError(e?.message || String(e))
        return
    }
    setSaved(true)
    setResult({ record: savedRecord, flock: selectedFlock?.name || 'Flock',
      breed: selectedBatch?.breed || selectedBatch?.category || 'Unknown breed',
      category, method, pen: form.pen_id === 'unassigned' ? 'Unassigned birds' : penNames.get(form.pen_id) || 'Location',
      ageDays, provisional: assessment, observedMean: avg, sampleSize: n })
    setForm((previous) => ({ ...initial(), flock_id: previous.flock_id, pen_id: previous.pen_id, weighed_on: previous.weighed_on }))
    setRefresh((v) => v + 1)
  }

  const recordMean = (r) => Number(r?.sample_size) > 0 ? Number(r.net_weight_kg) / Number(r.sample_size) : null
  // Historical records may predate the assessment migration. Compute a clearly
  // labelled display-only assessment from their stored measurement and batch data.
  // This does NOT overwrite a database record or create retrospective alerts.
  const historyAssessmentFor = (r) => {
    if (r.weight_assessment?.target_weight_kg != null && Number(r.weight_assessment.target_weight_kg) > 0) {
      return { ...r.weight_assessment, origin: 'saved' }
    }
    const flock = flocks.find(f => f.id === r.flock_id)
    const batch = batches.find(b => b.id === flock?.batch_id)
    const observed = recordMean(r)
    if (!batch || !Number.isFinite(observed) || observed <= 0) return null
    // A later edit to batch metadata can change this historical reconstruction.
    const age = daysBetween(batch.hatch_date || batch.arrival_date, r.weighed_on)
    const computed = assessWeight({
      category: batch.category,
      feedingProgramme: batch.feeding_programme,
      feedForm: batch.feed_form,
      breed: batch.breed,
      ageDays: age,
      meanKg: observed,
    })
    return computed?.targetKg != null ? {
      target_weight_kg: computed.targetKg,
      deviation_pct: computed.deviationPct,
      status: computed.status,
      reference_table: computed.table,
      age_week: computed.week,
      recommendation: computed.message,
      breed_note: computed.breedNote,
      origin: 'calculated',
    } : null
  }
  // BroodWatch analytics: descriptive indicators, not official MAAIF thresholds.
  const recordUniformity = (r) => {
    const values = Array.isArray(r?.individual_weights_kg) ? r.individual_weights_kg.map(Number) : []
    if (values.length < 2 || values.some(v => !Number.isFinite(v) || v <= 0)) return null
    const mean = values.reduce((sum,v) => sum+v,0)/values.length
    const sd = Math.sqrt(values.reduce((sum,v) => sum+(v-mean)**2,0)/(values.length-1))
    return { cvPct: 100*sd/mean, withinTenPct: 100*values.filter(v=>Math.abs(v-mean)<=mean*.1).length/values.length, count:values.length }
  }
  const previousComparableRecord = (r) => [...records]
    .filter(x => x.id !== r.id && x.flock_id === r.flock_id && (x.pen_id||null)===(r.pen_id||null)
      && x.method === r.method && String(x.weighed_on) < String(r.weighed_on)
      && Number.isFinite(recordMean(x)) && recordMean(x)>0)
    .sort((a,b)=>String(b.weighed_on).localeCompare(String(a.weighed_on)) || String(b.created_at).localeCompare(String(a.created_at)))[0]
  const recordGrowth = (r) => {
    const previous=previousComparableRecord(r)
    if (!previous) return null
    const days=daysBetween(previous.weighed_on,r.weighed_on)
    if (!days || days<=0) return null
    const gainKg=recordMean(r)-recordMean(previous)
    return { days, gainKg, gramsPerDay:gainKg*1000/days, previousDate:previous.weighed_on, previousMean:recordMean(previous) }
  }
  const samplingAssessment = (r) => {
    if (r.method === 'Full-flock total') return { label:'Full count', message:'Recorded as a full count; verify that every bird in this location was weighed.' }
    const pop=Number(r.population_at_weighing), size=Number(r.sample_size)
    const flock=flocks.find(f=>f.id===r.flock_id)
    const batch=batches.find(b=>b.id===flock?.batch_id)
    if (!Number.isFinite(pop) || pop<=0 || !Number.isFinite(size) || size<=0) return {label:'Unknown',message:'Population snapshot unavailable; sampling adequacy cannot be checked retrospectively.'}
    if (!['broiler','layer'].includes(String(batch?.category||'').toLowerCase())) return {label:'Not applicable',message:'Commercial broiler/layer 10% guidance is not applied to this production category.'}
    const recommended=Math.ceil(pop*.1)
    return size>=recommended
      ? {label:'Meets numerical target',message:`${size} of ${pop} birds weighed; at least ${recommended} meets the 10% numerical target. Representative selection is not verified.`}
      : {label:'Below numerical target',message:`${size} of ${pop} birds weighed; ${recommended} would meet the 10% numerical target. Reweigh a representative sample.`}
  }
  const followUpFor = (r) => {
    const advice=[];const a=historyAssessmentFor(r),growth=recordGrowth(r),sample=samplingAssessment(r),uniformity=recordUniformity(r)
    if (a?.status==='underweight') advice.push('Review feed quantity and quality, water access, housing conditions and signs of illness; repeat a representative weighing and seek veterinary advice if birds appear unwell.')
    else if (a?.status==='above_target') advice.push('Verify scale calibration, feeding programme and sample selection before changing feeding decisions.')
    else if (a?.status==='within_range') advice.push('Continue routine observation and scheduled representative weighing.')
    else advice.push('Record or confirm hatch date, production category and broiler feed form to enable an applicable reference comparison, where available.')
    if (sample.label==='Below numerical target') advice.push('Increase sample size toward the commercial 10% numerical target and sample across representative locations.')
    if (sample.label==='Unknown') advice.push('Record the live population at weighing to calculate sampling coverage on future entries.')
    if (growth && growth.gramsPerDay<0) advice.push('Average weight fell relative to the previous comparable entry; verify the measurements and check flock health and sample selection.')
    if (uniformity && uniformity.cvPct>10) advice.push('Individual weights show elevated variation under BroodWatch’s illustrative 10% CV flag; review access to feed and water and investigate uneven growth.')
    if (!growth) advice.push('Record another weighing on a later date for the same flock, location and method to calculate observed daily gain.')
    return advice
  }
  const normalizedSearch = (value) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const coveragePct = (r) => Number(r?.population_at_weighing) > 0
    ? Number((100 * Number(r.sample_size) / Number(r.population_at_weighing)).toFixed(1)) : null
  const assessmentLabel = (status) => ({ underweight: 'Below reference', above_target: 'Above reference', within_range: 'Within range' }[status] || 'Not assessed')
  const assessmentColor = (status) => status === 'within_range' ? '#166534' : status === 'underweight' || status === 'above_target' ? '#b45309' : '#64748b'
  const filteredHistory = selectedRecords.filter(r => {
    const flock = flocks.find(f => f.id === r.flock_id)
    const batch = batches.find(b => b.id === flock?.batch_id)
    const a = historyAssessmentFor(r)
    const date = formatDate(r.weighed_on)
    const searchFields = [
      flock?.name, batch?.breed, batch?.batch_number, batch?.category,
      penNames.get(r.pen_id), r.pen_id == null ? 'unassigned' : '',
      r.notes, r.weighed_on, date, r.method, r.scale_type,
      r.sample_size, assessmentLabel(a?.status), a?.reference_table, samplingAssessment(r).label, recordGrowth(r)?.gramsPerDay, recordUniformity(r)?.cvPct,
      a?.target_weight_kg, a?.deviation_pct,
    ]
    const haystack = normalizedSearch(searchFields.join(' '))
    const terms = normalizedSearch(historyQuery).split(' ').filter(Boolean)
    return terms.every(term => haystack.includes(term))
      && (historyMethod === 'All methods' || r.method === historyMethod)
      && (historyAssessment === 'All assessments' || (a?.status || 'unavailable') === historyAssessment)
  }).sort((a,b) => historySort === 'oldest'
    ? String(a.weighed_on).localeCompare(String(b.weighed_on)) || String(a.created_at).localeCompare(String(b.created_at))
    : String(b.weighed_on).localeCompare(String(a.weighed_on)) || String(b.created_at).localeCompare(String(a.created_at)))
  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / historyLimit))
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages)
  const visibleHistory = filteredHistory.slice((currentHistoryPage - 1) * historyLimit, currentHistoryPage * historyLimit)
  const trendRecords = [...selectedRecords].filter(r => Number.isFinite(recordMean(r)) && recordMean(r) > 0).sort((a,b) => String(a.weighed_on).localeCompare(String(b.weighed_on)))
  const trendPoints = trendRecords.slice(-24)
  const chartW = 620, chartH = 180, chartPad = 32
  const chartValues = trendPoints.map(r => recordMean(r))
  const minChart = chartValues.length ? Math.min(...chartValues) : 0
  const maxChart = chartValues.length ? Math.max(...chartValues) : 1
  const chartRange = Math.max(.05, maxChart - minChart)
  const xy = (v, i) => [chartPad + (trendPoints.length < 2 ? .5 : i/(trendPoints.length-1))*(chartW-2*chartPad), chartH-chartPad-((v-minChart)/chartRange)*(chartH-2*chartPad)]
  const trendPath = chartValues.map((v,i) => `${i?'L':'M'}${xy(v,i).join(',')}`).join(' ')
  const lastTwo = trendRecords.slice(-2)
  const change = lastTwo.length === 2 && lastTwo[0].weighed_on !== lastTwo[1].weighed_on
    ? recordMean(lastTwo[1]) - recordMean(lastTwo[0]) : null
  const latestAssessment = selectedRecords[0] ? historyAssessmentFor(selectedRecords[0]) : null

  function exportCsv() {
    const cols = ['Date', 'Flock', 'Breed', 'Location', 'Method', 'Birds weighed', 'Population', 'Coverage %', 'Net kg', 'Mean kg', 'Reference kg', 'Deviation %', 'Assessment', 'Daily gain g/day', 'Sampling adequacy', 'Uniformity CV %', 'Uniformity within 10% %', 'Scale', 'Notes']
    const data = filteredHistory.map((r) => [
      r.weighed_on,
      names.get(r.flock_id) || r.flock_id,
      batches.find(b => b.id === flocks.find(f => f.id === r.flock_id)?.batch_id)?.breed || '',
      penNames.get(r.pen_id) || 'Unassigned',
      r.method,
      r.sample_size,
      r.population_at_weighing ?? '',
      coveragePct(r) ?? '',
      r.net_weight_kg,
      recordMean(r) ?? '',
      historyAssessmentFor(r)?.target_weight_kg ?? '',
      historyAssessmentFor(r)?.deviation_pct ?? '',
      assessmentLabel(historyAssessmentFor(r)?.status),
      recordGrowth(r)?.gramsPerDay ?? '', samplingAssessment(r).label, recordUniformity(r)?.cvPct ?? '', recordUniformity(r)?.withinTenPct ?? '',
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
    a.download = `broodwatch-weight-history-${today()}.csv`
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
                  setForm((p) => ({ ...p, flock_id: f?.id || '', pen_id: '', sample_size: '', individual: '', gross_weight_kg: '' }))
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
              {method === 'Individual bird' ? (
                <div className="ops-field"><label>Birds weighed</label><strong>{individualWeights.length} individual weights entered</strong></div>
              ) : <div className="ops-field"><label htmlFor="weight-sample-size">{method === 'Group sample' ? 'Number of birds in sample' : 'Birds weighed'}</label><input id="weight-sample-size" type="number" min="1" max={available} step="1" placeholder="Number of birds" value={form.sample_size} onChange={e=>set('sample_size',e.currentTarget.value)} style={{width:'100%',padding:12,borderRadius:9,border:'1px solid var(--border,#cbd5e1)',background:'var(--surface,#fff)',color:'inherit'}} /></div>}
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
                {wholeFlockRecommendation.applicable && method !== 'Full-flock total' && (
                  <p>Whole-flock weekly sample target: <strong>{wholeFlockRecommendation.recommended} birds</strong>, selected across representative locations. The pen-level target above is a planning estimate, not proof of whole-flock representativeness.</p>
                )}
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

            {selectedBatch && (
              <div className="ops-callout" role="note">
                <Bird size={17} />
                <p><strong>{selectedBatch.batch_number}</strong> · {selectedBatch.breed || selectedBatch.category} · {ageDays == null ? 'Age unavailable' : `${ageDays} days old`} · Feed: {selectedBatch.feed_form || selectedBatch.feeding_programme || 'Not recorded'}. {lastFlockDays != null && lastFlockDays >= 0 && lastFlockDays < 7 ? `Last recorded weighing was ${lastFlockDays} days before this entry; routine weighing is generally weekly.` : ''}</p>
              </div>
            )}
            <div className="ops-form-section">
              <div className="form-section-heading">
                <Scale size={16} />
                <strong>Measurement details</strong>
              </div>
              <div className="ops-form-grid">
                {method === 'Individual bird' ? (
                  <div className="ops-field">
                    <label htmlFor="weight-individual">Bird weights (kg)</label>
                    <textarea id="weight-individual" rows={3} placeholder="e.g. 1.1, 1.2, 1.15" value={form.individual}
                      onChange={(e) => set('individual', e.currentTarget.value)}
                      style={{ width: '100%', padding: 12, borderRadius: 9, border: '1px solid var(--border, #cbd5e1)', background: 'var(--surface, #fff)', color: 'inherit' }} />
                  </div>
                ) : (
                  <div className="ops-field">
                    <label htmlFor="weight-gross">{method === 'Full-flock total' ? 'Total flock weight (kg)' : 'Total sample weight (kg)'}</label>
                    <input id="weight-gross" type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 12.4"
                      value={form.gross_weight_kg} onChange={(e) => set('gross_weight_kg', e.currentTarget.value)}
                      style={{ width: '100%', padding: 12, borderRadius: 9, border: '1px solid var(--border, #cbd5e1)', background: 'var(--surface, #fff)', color: 'inherit' }} />
                  </div>
                )}
                {method !== 'Individual bird' && (
                  <div className="ops-field">
                    <label htmlFor="weight-tare">Container tare weight (kg)</label>
                    <input id="weight-tare" type="number" inputMode="decimal" min="0" step="any"
                      value={form.tare_weight_kg} onChange={(e) => set('tare_weight_kg', e.currentTarget.value)}
                      style={{ width: '100%', padding: 12, borderRadius: 9, border: '1px solid var(--border, #cbd5e1)', background: 'var(--surface, #fff)', color: 'inherit' }} />
                  </div>
                )}
                <div className="ops-field"><label htmlFor="weight-notes">Sampling notes</label><textarea id="weight-notes" rows={2} placeholder="Describe how birds were selected" value={form.notes} onChange={e=>set('notes',e.currentTarget.value)} style={{width:'100%',padding:12,borderRadius:9,border:'1px solid var(--border,#cbd5e1)',background:'var(--surface,#fff)',color:'inherit'}} /></div>
              </div>
              <div className="ops-callout" role="status" aria-live="polite" style={{ marginTop: 12 }}>
                <Scale size={18} />
                <div>
                  <strong>Live weight calculation</strong>
                  <p>Gross: <strong>{hasReading && Number.isFinite(gross) ? `${fmt(gross, 3)} kg` : 'Enter weight'}</strong>
                    {' · '}Tare: <strong>{fmt(tare, 3)} kg</strong></p>
                  <p>Net weight: <strong>{Number.isFinite(net) ? `${fmt(net, 3)} kg` : '—'}</strong>
                    {' · '}Birds weighed: <strong>{effectiveSampleSize || '—'}</strong></p>
                  <p>Average per bird: <strong>{Number.isFinite(avg) && avg > 0 ? `${fmt(avg, 3)} kg (${fmt(avg * 1000, 0)} g)` : '—'}</strong></p>
                  <p style={{ fontSize: 12 }}>For individual weighing, enter weights separated by commas; their sum and bird count are automatic. For group weighing, enter the scale reading and number of birds; the container weight is subtracted automatically.</p>
                </div>
              </div>
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
                disabled={saving}
                onClick={() => { void save() }}
              >
                <Check size={15} />
                {saving ? 'Saving…' : 'Save weight'}
              </button>
            </div>
            {error && (
              <div id="weight-error" role="alert" aria-live="assertive" className="ops-callout" style={{ marginTop: 12, border: '1px solid currentColor' }}>
                <CircleAlert size={18} />
                <div><strong>Weight was not saved</strong><p>{error}</p></div>
              </div>
            )}
            {saving && <p role="status" className="info-note">Saving measurement to Supabase…</p>}
            {!farmId && <p className="info-note">Choose a farm before saving.</p>}
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

      <div id="weight-history" style={{ scrollMarginTop: 90 }}>
        <OpsPanel title="Weight history & growth monitoring" action={<button type="button" className="quiet-action" onClick={() => setRefresh(v => v + 1)} disabled={loading}><RefreshCw size={14} /> Refresh</button>}>
          <div className="ops-form-grid" style={{ marginBottom: 16 }}>
            <div className="ops-callout"><Scale size={18}/><div><small>Recorded weighings</small><strong style={{display:'block',fontSize:20}}>{selectedRecords.length}</strong></div></div>
            <div className="ops-callout"><Bird size={18}/><div><small>Latest sample</small><strong style={{display:'block',fontSize:20}}>{latest ? `${latest.sample_size} birds` : '—'}</strong></div></div>
            <div className="ops-callout"><TrendingUp size={18}/><div><small>Latest mean</small><strong style={{display:'block',fontSize:20}}>{latest && recordMean(latest) != null ? `${fmt(recordMean(latest),3)} kg` : '—'}</strong></div></div>
            <div className="ops-callout"><Activity size={18}/><div><small>Change between last two dated records</small><strong style={{display:'block',fontSize:20}}>{change == null ? '—' : `${change >= 0 ? '+' : ''}${fmt(change,3)} kg`}</strong></div></div>
          </div>
          <p className="info-note">Measurements are stored observations, not estimates of total flock biomass. Comparisons between different pens or sampling methods may not represent true flock growth.</p>
          {trendPoints.length >= 2 ? (
            <div style={{border:'1px solid var(--border,#dbe2ea)',borderRadius:12,padding:14,margin:'16px 0'}}>
              <strong>Recorded average weight trend</strong>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} role="img" aria-label="Recorded average weight over time" style={{display:'block',width:'100%',height:'auto',maxHeight:240,marginTop:8}}>
                <line x1={chartPad} y1={chartH-chartPad} x2={chartW-chartPad} y2={chartH-chartPad} stroke="currentColor" opacity=".25"/>
                <line x1={chartPad} y1={chartPad} x2={chartPad} y2={chartH-chartPad} stroke="currentColor" opacity=".25"/>
                <text x={chartPad+4} y={18} fontSize="12" fill="currentColor">kg per bird</text>
                <text x={chartPad} y={chartH-7} fontSize="11" fill="currentColor">{trendPoints[0]?.weighed_on}</text>
                <text x={chartW-chartPad} y={chartH-7} textAnchor="end" fontSize="11" fill="currentColor">{trendPoints[trendPoints.length-1]?.weighed_on}</text>
                <path d={trendPath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                {trendPoints.map((r,i) => <circle key={r.id} cx={xy(recordMean(r),i)[0]} cy={xy(recordMean(r),i)[1]} r="4" fill="#0d9488"><title>{`${r.weighed_on}: ${fmt(recordMean(r),3)} kg (${r.sample_size} birds)`}</title></circle>)}
              </svg>
              <p className="info-note">Last {trendPoints.length} measurements; chronological order. A trend is descriptive and does not establish a diagnosis.</p>
            </div>
          ) : <p className="info-note">Record at least two weight measurements to see a growth trend.</p>}
          <div className="ops-form-grid" style={{marginTop:16,marginBottom:12}}>
            <div className="ops-field"><label htmlFor="history-search">Search records</label><div style={{position:'relative'}}><Search size={16} style={{position:'absolute',left:10,top:12,opacity:.6}}/><input id="history-search" type="search" placeholder="Search flock, breed, pen, date, status, notes…" value={historyQuery} onChange={e=>{setHistoryQuery(e.currentTarget.value);setHistoryPage(1)}} style={{width:'100%',padding:'10px 10px 10px 34px'}}/></div></div>
            <div className="ops-field"><label htmlFor="history-method">Measurement method</label><select id="history-method" value={historyMethod} onChange={e=>{setHistoryMethod(e.currentTarget.value);setHistoryPage(1)}}>{['All methods',...methods.map(m=>m.label)].map(m=><option key={m}>{m}</option>)}</select></div>
            <div className="ops-field"><label htmlFor="history-assessment">Growth assessment</label><select id="history-assessment" value={historyAssessment} onChange={e=>{setHistoryAssessment(e.currentTarget.value);setHistoryPage(1)}}><option>All assessments</option><option value="within_range">Within range</option><option value="underweight">Below reference</option><option value="above_target">Above reference</option><option value="unavailable">Not assessed</option></select></div>
            <div className="ops-field"><label htmlFor="history-sort">Order</label><select id="history-sort" value={historySort} onChange={e=>{setHistorySort(e.currentTarget.value);setHistoryPage(1)}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:12}}>
            <span className="info-note">Showing {filteredHistory.length} matching record{filteredHistory.length===1?'':'s'} · {records.length >= 250 ? 'Most recent 250 loaded; older records may be excluded' : 'All loaded records'}</span>
            <button type="button" className="quiet-action" onClick={exportCsv} disabled={!filteredHistory.length}><Download size={15}/> Export filtered CSV</button>
          </div>
          <div style={{overflowX:'auto',width:'100%'}}>
            <table style={{width:'100%',minWidth:1050,borderCollapse:'collapse',fontSize:13}}>
              <thead><tr>{['DATE','FLOCK / BREED','LOCATION','METHOD','BIRDS','COVERAGE','MEAN / BIRD','MAAIF REF.','ASSESSMENT','GAIN / DAY','SAMPLING','UNIFORMITY','DETAILS'].map(h=><th key={h} scope="col" style={{textAlign:'left',padding:'12px 10px',borderBottom:'1px solid var(--border,#dbe2ea)',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
              <tbody>{visibleHistory.map(r=>{const f=flocks.find(f=>f.id===r.flock_id);const b=batches.find(b=>b.id===f?.batch_id);const a=historyAssessmentFor(r);return <tr key={r.id} style={{borderBottom:'1px solid var(--border,#e2e8f0)'}}>
                <td style={{padding:'12px 10px',whiteSpace:'nowrap'}}>{formatDate(r.weighed_on)}</td>
                <td style={{padding:'12px 10px'}}><strong>{f?.name||'Archived flock'}</strong><div style={{opacity:.7,fontSize:12}}>{b?.breed||b?.category||'Breed not recorded'}</div></td>
                <td style={{padding:'12px 10px'}}>{penNames.get(r.pen_id)||'Unassigned'}</td>
                <td style={{padding:'12px 10px'}}>{r.method}</td>
                <td style={{padding:'12px 10px'}}>{r.sample_size}</td>
                <td style={{padding:'12px 10px'}}>{coveragePct(r)==null?'—':`${coveragePct(r)}%`}</td>
                <td style={{padding:'12px 10px',fontWeight:600}}>{recordMean(r)==null?'—':`${fmt(recordMean(r),3)} kg`}</td>
                <td style={{padding:'12px 10px'}}>{a?.target_weight_kg!=null?<><strong>{fmt(a.target_weight_kg,3)} kg</strong><div style={{fontSize:11,opacity:.7}}>{a.reference_table} · {a.origin==='saved'?'Saved':'Calculated'}</div></>:'Not available'}</td>
                <td style={{padding:'12px 10px'}}><span style={{color:assessmentColor(a?.status),fontWeight:600}}>{assessmentLabel(a?.status)}</span>{a?.deviation_pct!=null&&<div style={{fontSize:11,opacity:.75}}>{Number(a.deviation_pct)>0?'+':''}{fmt(a.deviation_pct,1)}% · {a.origin==='saved'?'Saved':'Calculated'}</div>}</td>
                <td style={{padding:'12px 10px',whiteSpace:'nowrap'}}>{recordGrowth(r) ? `${recordGrowth(r).gramsPerDay>=0?'+':''}${fmt(recordGrowth(r).gramsPerDay,1)} g/day` : '—'}</td>
                <td style={{padding:'12px 10px'}}>{samplingAssessment(r).label}</td>
                <td style={{padding:'12px 10px'}}>{recordUniformity(r) ? `${fmt(recordUniformity(r).cvPct,1)}% CV` : '—'}</td>
                <td style={{padding:'12px 10px'}}><button type="button" className="quiet-action" onClick={()=>setHistoryDetail(r)}>View</button></td>
              </tr>})}</tbody>
            </table>
          </div>
          {loading && <p role="status">Loading weight history…</p>}
          {!loading && !filteredHistory.length && <p className="info-note">No matching records. Try fewer search terms, clear a filter, or save a new measurement.</p>}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:16}}>
            <div className="ops-field"><label htmlFor="history-page-size">Rows per page</label><select id="history-page-size" value={historyLimit} onChange={e=>{setHistoryLimit(Number(e.currentTarget.value));setHistoryPage(1)}}>{[10,15,25,50].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
            <div style={{display:'flex',alignItems:'center',gap:12}}><button type="button" className="quiet-action" disabled={currentHistoryPage===1} onClick={()=>setHistoryPage(p=>Math.max(1,p-1))}><ChevronLeft size={16}/> Previous</button><span>Page {currentHistoryPage} of {totalHistoryPages}</span><button type="button" className="quiet-action" disabled={currentHistoryPage>=totalHistoryPages} onClick={()=>setHistoryPage(p=>p+1)}>Next <ChevronRight size={16}/></button></div>
          </div>
          <p className="info-note">Growth rate compares the same flock, location and weighing method on different dates; it is descriptive and may still reflect sampling differences. Uniformity uses sample standard deviation and is only available for individual weights. BroodWatch follow-up flags are not MAAIF diagnostic thresholds. Saved assessments come from Supabase. Older records may show a display-only calculated comparison using current batch metadata; these are not saved or used for retrospective alerts. MAAIF Tables 26, 32 and 33 are general commercial weight references. BroodWatch's ±10% screening band is not an official MAAIF diagnostic cutoff. Records with no applicable reference remain saved and unassessed.</p>
        </OpsPanel>
      </div>
      {historyDetail && (
        <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setHistoryDetail(null)}} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(15,23,42,.65)',display:'grid',placeItems:'center',padding:16}}>
          <div role="dialog" aria-modal="true" aria-labelledby="weight-history-detail-title" style={{background:'var(--surface,#fff)',color:'var(--text-primary,#172033)',borderRadius:16,width:'min(100%,560px)',maxHeight:'90vh',overflowY:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2 id="weight-history-detail-title">Recorded measurement</h2><button type="button" className="quiet-action" onClick={()=>setHistoryDetail(null)} aria-label="Close details"><X size={20}/></button></div>
            <p><strong>{names.get(historyDetail.flock_id)||'Archived flock'}</strong> · {penNames.get(historyDetail.pen_id)||'Unassigned'} · {formatDate(historyDetail.weighed_on)}</p>
            <dl style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{[['Method',historyDetail.method],['Birds weighed',historyDetail.sample_size],['Gross weight',`${fmt(historyDetail.gross_weight_kg,3)} kg`],['Tare',`${fmt(historyDetail.tare_weight_kg,3)} kg`],['Net weight',`${fmt(historyDetail.net_weight_kg,3)} kg`],['Average per bird',`${fmt(recordMean(historyDetail),3)} kg`],['Population snapshot',historyDetail.population_at_weighing??'Not recorded'],['Sampling coverage',coveragePct(historyDetail)==null?'Not recorded':`${coveragePct(historyDetail)}%`],['Scale',historyDetail.scale_type||'Not recorded'],['Assessment',assessmentLabel(historyAssessmentFor(historyDetail)?.status)]].map(([k,v])=><div key={k}><dt style={{opacity:.7,fontSize:12}}>{k}</dt><dd style={{margin:0,fontWeight:600}}>{v}</dd></div>)}</dl>
            {historyAssessmentFor(historyDetail)?.target_weight_kg!=null && <div className="ops-callout" style={{marginTop:16}}><CircleAlert size={18}/><div><strong>{historyAssessmentFor(historyDetail).origin==='saved'?'Saved assessment':'Calculated from current batch metadata'} · MAAIF {historyAssessmentFor(historyDetail).reference_table} · week {historyAssessmentFor(historyDetail).age_week}</strong><p>Reference: {fmt(historyAssessmentFor(historyDetail).target_weight_kg,3)} kg · Difference: {fmt(historyAssessmentFor(historyDetail).deviation_pct,1)}%</p><p>{historyAssessmentFor(historyDetail).recommendation}</p></div></div>}
            {Array.isArray(historyDetail.individual_weights_kg) && historyDetail.individual_weights_kg.length>0 && <p><strong>Individual measurements:</strong> {historyDetail.individual_weights_kg.map(v=>`${fmt(v,3)} kg`).join(', ')}</p>}
            <div className="ops-callout" style={{marginTop:16}}><Activity size={18}/><div>
              <strong>BroodWatch growth & sampling analysis</strong>
              <p><strong>Observed growth:</strong> {recordGrowth(historyDetail) ? `${recordGrowth(historyDetail).gramsPerDay>=0?'+':''}${fmt(recordGrowth(historyDetail).gramsPerDay,1)} g/bird/day over ${recordGrowth(historyDetail).days} days (previous: ${formatDate(recordGrowth(historyDetail).previousDate)})` : 'Insufficient comparable dated records'}</p>
              <p><strong>Sampling:</strong> {samplingAssessment(historyDetail).label} — {samplingAssessment(historyDetail).message}</p>
              <p><strong>Individual-weight uniformity:</strong> {recordUniformity(historyDetail) ? `${fmt(recordUniformity(historyDetail).cvPct,1)}% coefficient of variation; ${fmt(recordUniformity(historyDetail).withinTenPct,1)}% of birds within ±10% of sample mean (${recordUniformity(historyDetail).count} weights)` : 'Not measurable from grouped weights or fewer than two individual observations'}</p>
            </div></div>
            <div style={{marginTop:16}}><strong>Follow-up recommendations (BroodWatch)</strong><ul style={{paddingLeft:22}}>{followUpFor(historyDetail).map((tip,i)=><li key={i} style={{marginTop:7}}>{tip}</li>)}</ul></div>
            {historyDetail.notes && <p><strong>Sampling notes:</strong> {historyDetail.notes}</p>}
            <p className="info-note">This is a saved observation. Sampling coverage alone does not prove representativeness.</p>
          </div>
        </div>
      )}
      {result && (
        <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setResult(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.65)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="weight-result-title"
            style={{ background: 'var(--surface, #fff)', color: 'var(--text-primary, #172033)', borderRadius: 18, width: 'min(100%, 570px)', maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 24px 75px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h2 id="weight-result-title" style={{ margin: 0, fontSize: 22 }}>Weight recorded successfully</h2>
              <button type="button" aria-label="Close results" onClick={() => setResult(null)} className="quiet-action"><X size={20} /></button>
            </div>
            <p><strong>{result.flock}</strong> · {result.breed} · {result.pen}</p>
            <p>{result.ageDays == null ? 'Flock age not available' : `Age: ${result.ageDays} days`} · {result.sampleSize} birds weighed</p>
            <div className="ops-callout" style={{ marginTop: 14 }}>
              <Scale size={20} />
              <div>
                <strong>Recorded average weight</strong>
                <p style={{ fontSize: 22, fontWeight: 700, margin: '6px 0' }}>
                  {fmt(result.record?.net_weight_kg != null
                    ? Number(result.record.net_weight_kg) / result.sampleSize : result.observedMean, 3)} kg per bird
                </p>
                <p>Net: {fmt(Number(result.record?.net_weight_kg ?? (result.observedMean * result.sampleSize)), 3)} kg</p>
              </div>
            </div>
            {result.record?.weight_assessment?.target_weight_kg ? (
              <div className="ops-callout" role="status" style={{ marginTop: 14 }}>
                <CircleAlert size={20} />
                <div>
                  <strong>{result.record.weight_assessment.status === 'underweight' ? 'Below reference — investigate' :
                    result.record.weight_assessment.status === 'above_target' ? 'Above reference — review' : 'Within screening range'}</strong>
                  <p>MAAIF general commercial reference ({result.record.weight_assessment.reference_table}, completed week {result.record.weight_assessment.age_week}): <strong>{fmt(result.record.weight_assessment.target_weight_kg, 3)} kg per bird</strong>.</p>
                  <p>Observed difference: <strong>{Number(result.record.weight_assessment.deviation_pct) >= 0 ? '+' : ''}{fmt(result.record.weight_assessment.deviation_pct, 1)}%</strong></p>
                  <p>{result.record.weight_assessment.recommendation}</p>
                  <p style={{ fontSize: 12 }}>{result.record.weight_assessment.breed_note} The ±10% screening band is BroodWatch's rule, not an MAAIF clinical threshold. A pen or small sample is not necessarily representative of the whole flock.</p>
                </div>
              </div>
            ) : (
              <div className="ops-callout" style={{ marginTop: 14 }}>
                <CircleAlert size={20} />
                <div><strong>Weight saved — no verified numerical comparison available</strong>
                  <p>There is no applicable configured MAAIF general weight reference for this age, production category or feed form. Do not interpret this as a good or bad growth result.</p>
                  {result.record?.readError && <p>Saved assessment could not be loaded: {result.record.readError}</p>}
                </div>
              </div>
            )}
            <p style={{ fontSize: 12, marginTop: 14 }}><a href={MAAIF_SOURCE} target="_blank" rel="noopener noreferrer">MAAIF Poultry Training Manual — source reference</a></p>
            <button type="button" className="button-primary" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={() => {
              setResult(null)
              document.getElementById('weight-history')?.scrollIntoView({ behavior: 'smooth' })
            }}>View saved weight history</button>
          </div>
        </div>
      )}
    </div>
  )
}
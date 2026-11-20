'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, CircleHelp, House, MapPin, Plus, Sprout } from 'lucide-react'

const steps = [
  'Farmer profile',
  'Farm information',
  'Poultry houses',
  'Pens and sections',
  'Flocks and batches',
  'Bird placement',
  'Review and finish',
]
const optionalSteps = [2, 3, 4, 5]

function makeHouse(index) {
  const letter = String.fromCharCode(65 + index)
  return {
    name: `House ${letter}`,
    system: 'Deep litter',
    length: '',
    width: '',
    pens: [{ name: `Pen ${letter}1`, capacity: 120 }],
  }
}

function Field({ label, children }) {
  return (
    <label className="wizard-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function Onboarding() {
  const router = useRouter()
  const requestId = useRef(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('English')
  const [farmType, setFarmType] = useState('Smallholder poultry farm')
  const [town, setTown] = useState('')
  const [preferredUnits, setPreferredUnits] = useState('Metric (kg, m)')
  const [step, setStep] = useState(0)
  const [farmerName, setFarmerName] = useState('')
  const [farmName, setFarmName] = useState('')
  const [district, setDistrict] = useState('')
  const [houseCount, setHouseCount] = useState(1)
  const [houses, setHouses] = useState([makeHouse(0)])
  const [batches, setBatches] = useState([
    {
      number: '',
      category: 'Broiler',
      breed: '',
      initialCount: '',
      hatchDate: '',
      arrivalDate: '',
      supplier: '',
      feedingProgramme: '',
    },
  ])
  const [selectedBatch, setSelectedBatch] = useState(0)
  const [placements, setPlacements] = useState({})
  const [placementNotice, setPlacementNotice] = useState('')
  const [skipped, setSkipped] = useState([])
  const [validationMessage, setValidationMessage] = useState('')
  useEffect(() => {
    let active = true
    requestId.current = crypto.randomUUID()
    async function loadProfile() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.replace('/auth/login?next=/onboarding')
          return
        }
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, phone, preferred_language')
          .eq('id', user.id)
          .maybeSingle()
        if (profileError) throw profileError
        if (!active) return
        setEmail(user.email || '')
        setFarmerName(profile?.full_name || user.user_metadata?.full_name || '')
        setPhone(profile?.phone || '')
        setPreferredLanguage(profile?.preferred_language || 'English')
      } catch (error) {
        if (active) setValidationMessage(error.message || 'Could not load your profile.')
      } finally {
        if (active) setLoadingProfile(false)
      }
    }
    loadProfile()
    return () => { active = false }
  }, [router])

  const [done, setDone] = useState(false)

  const activeHouses = skipped.includes(2) ? [] : houses.map((house) => ({
    ...house, pens: skipped.includes(3) ? [] : house.pens,
  }))
  const activeBatches = skipped.includes(4) ? [] : batches
  const pens = useMemo(
    () => activeHouses.flatMap((house, houseIndex) =>
      house.pens.map((pen, penIndex) => ({
        key: `${houseIndex}-${penIndex}`,
        label: `${house.name} · ${pen.name}`,
        capacity: Number(pen.capacity) || 0,
      }))),
    [houses, skipped],
  )
  const currentPlacement = placements[selectedBatch] || {}
  const initialBirds = Number(batches[selectedBatch]?.initialCount) || 0
  const assignedBirds = pens.reduce(
    (total, pen) => total + (Number(currentPlacement[pen.key]) || 0),
    0,
  )
  const unassignedBirds = Math.max(0, initialBirds - assignedBirds)

  function changeHouseCount(nextCount) {
    const next = Math.max(1, Math.min(8, nextCount))
    setHouseCount(next)
    setHouses((current) =>
      Array.from({ length: next }, (_, index) => current[index] || makeHouse(index)),
    )
    setPlacements({})
  }

  function updateHouse(houseIndex, key, value) {
    setHouses((current) =>
      current.map((house, index) => (index === houseIndex ? { ...house, [key]: value } : house)),
    )
  }

  function updatePen(houseIndex, penIndex, key, value) {
    setHouses((current) =>
      current.map((house, index) =>
        index === houseIndex
          ? {
              ...house,
              pens: house.pens.map((pen, currentPen) =>
                currentPen === penIndex ? { ...pen, [key]: value } : pen,
              ),
            }
          : house,
      ),
    )
  }

  function addPen(houseIndex) {
    setHouses((current) =>
      current.map((house, index) =>
        index === houseIndex
          ? {
              ...house,
              pens: [
                ...house.pens,
                {
                  name: `Pen ${String.fromCharCode(65 + index)}${house.pens.length + 1}`,
                  capacity: 120,
                },
              ],
            }
          : house,
      ),
    )
  }

  function updateBatch(index, key, value) {
    setBatches((current) =>
      current.map((batch, batchIndex) =>
        batchIndex === index ? { ...batch, [key]: value } : batch,
      ),
    )
  }

  function addBatch() {
    const nextNumber = batches.length + 1
    setBatches((current) => [
      ...current,
      {
        number: `BR-${new Date().getFullYear()}-${String(nextNumber).padStart(3, '0')}`,
        category: 'Broiler',
        breed: '',
        initialCount: '',
        hatchDate: '',
        arrivalDate: '',
        supplier: '',
        feedingProgramme: '',
      },
    ])
  }

  function updatePlacement(penKey, value) {
    const entered = value === '' ? '' : Math.max(0, Math.floor(Number(value) || 0))
    const otherBatchCount = Object.entries(placements).reduce((total, [batchIndex, entry]) =>
      total + (Number(batchIndex) === selectedBatch ? 0 : Number(entry[penKey]) || 0), 0)
    const capacity = pens.find((pen) => pen.key === penKey)?.capacity || 0
    const availablePen = Math.max(0, capacity - otherBatchCount)
    const remainingBatch = Math.max(0, initialBirds - assignedBirds + (Number(currentPlacement[penKey]) || 0))
    const capped = entered === '' ? '' : Math.min(entered, availablePen, remainingBatch)
    setPlacementNotice(entered !== '' && capped !== entered
      ? `Placement limited to ${capped} birds by batch count or remaining pen capacity.` : '')
    setPlacements((current) => ({
      ...current,
      [selectedBatch]: { ...current[selectedBatch], [penKey]: capped },
    }))
  }

  function validateSetup() {
    if (!farmerName.trim()) return 'Farmer name is required.'
    if (!farmName.trim()) return 'Farm name is required.'
    if (activeHouses.some((house) => !house.name.trim() ||
      (house.length !== '' && !(Number(house.length) > 0)) ||
      (house.width !== '' && !(Number(house.width) > 0)))) return 'Check house names and dimensions.'
    if (activeHouses.some((house) => house.pens.some((pen) =>
      !pen.name.trim() || !Number.isInteger(Number(pen.capacity)) || Number(pen.capacity) <= 0)))
      return 'Each pen needs a name and positive whole-number capacity.'
    if (activeBatches.some((batch) => !batch.number.trim() ||
      !Number.isInteger(Number(batch.initialCount)) || Number(batch.initialCount) <= 0))
      return 'Each batch needs a number and positive whole-number bird count.'
    if (new Set(activeBatches.map((batch) => batch.number.trim())).size !== activeBatches.length)
      return 'Batch numbers must be unique.'
    if (!skipped.includes(5)) {
      const occupied = {}
      for (let bi = 0; bi < activeBatches.length; bi++) {
        let assigned = 0
        for (const pen of pens) {
          const count = Number(placements[bi]?.[pen.key]) || 0
          if (!Number.isInteger(count) || count < 0) return 'Invalid bird placement.'
          assigned += count
          occupied[pen.key] = (occupied[pen.key] || 0) + count
          if (occupied[pen.key] > pen.capacity) return `${pen.label} exceeds capacity.`
        }
        if (assigned > Number(activeBatches[bi].initialCount))
          return `Batch ${activeBatches[bi].number} has too many birds assigned.`
      }
    }
    return ''
  }

  async function finishSetup() {
    if (saving || loadingProfile) return
    const message = validateSetup()
    if (message) { setValidationMessage(message); return }
    setSaving(true)
    setValidationMessage('')
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Please log in again.')
      const flatPens = activeHouses.flatMap((house, hi) =>
        house.pens.map((pen, pi) => ({ ...pen, key: `${hi}-${pi}` })))
      const placementRows = skipped.includes(5) ? [] : activeBatches.flatMap((batch, batchIndex) =>
        flatPens.map((pen, penIndex) => ({
          batchIndex, penIndex, count: Number(placements[batchIndex]?.[pen.key]) || 0,
        })).filter((row) => row.count > 0))
      const payload = {
        requestId: requestId.current,
        profile: { fullName: farmerName.trim(), phone: phone.trim(), preferredLanguage },
        farm: { name: farmName.trim(), farmType, district: district.trim(), town: town.trim(), preferredUnits },
        houses: activeHouses,
        batches: activeBatches,
        placements: placementRows,
      }
      const { data: farmId, error } = await supabase.rpc('complete_farm_onboarding', {
        p_payload: payload,
      })
      if (error) throw error
      if (!farmId) throw new Error('Supabase did not return a farm ID.')
      setDone(true)
      router.replace('/dashboard')
      router.refresh()
    } catch (error) {
      setValidationMessage(error.message || 'Could not save your farm. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function skipCurrentStep() {
    setValidationMessage('')
    const stepsToSkip = step === 2 ? [2, 3, 5] : step === 3 ? [3, 5] : step === 4 ? [4, 5] : [step]
    setSkipped((current) => [...new Set([...current, ...stepsToSkip])])
    if (step === 2 || step === 3 || step === 4) setPlacements({})
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  function continueStep() {
    if (step === 5 && assignedBirds > initialBirds) {
      setValidationMessage(
        'Assigned birds exceed the total in this batch. Reduce placements before continuing.',
      )
      return
    }
    if (step === 0 && !farmerName.trim()) {
      setValidationMessage('Enter the farmer or account name to continue.')
      return
    }
    if (step === 1 && !farmName.trim()) {
      setValidationMessage('Enter a farm name to continue.')
      return
    }
    if (step === 5 && !skipped.includes(5)) {
      const problem = validateSetup()
      if (problem) { setValidationMessage(problem); return }
    }
    setValidationMessage('')
    setSkipped((current) => current.filter((index) => index !== step))
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  if (done)
    return (
      <div className="onboarding-page">
        <div className="onboarding-success">
          <span>
            <Check size={28} />
          </span>
          <p className="eyebrow">FARM SETUP COMPLETE</p>
          <h1>Your farm has been saved.</h1>
          <p>
            Your farm details are securely stored in Supabase. You can finish skipped sections later.
          </p>
          <Link className="button-primary" href="/dashboard">
            Continue to your dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )

  return (
    <div className="onboarding-page">
      <div className="onboarding-top">
        <Link className="back-link" href="/dashboard">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <span className="setup-help">
          <CircleHelp size={15} /> Need help setting up?
        </span>
      </div>
      <div className="onboarding-layout">
        <aside className="wizard-aside">
          <span className="setup-icon">
            <Sprout size={23} />
          </span>
          <p className="eyebrow">FARM SETUP</p>
          <h1>Let’s get your farm ready.</h1>
          <p>Start with the details you have. Optional sections can be completed later.</p>
          <div className="wizard-progress">
            <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="wizard-steps">
            {steps.map((label, index) => (
              <div
                className={`wizard-step ${index === step ? 'current' : ''} ${index < step ? 'completed' : ''} ${skipped.includes(index) ? 'skipped' : ''}`}
                key={label}
              >
                <span>
                  {index < step && !skipped.includes(index) ? <Check size={13} /> : index + 1}
                </span>
                <p>
                  {label}
                  {skipped.includes(index) && <small>Skipped for now</small>}
                </p>
              </div>
            ))}
          </div>
          <div className="help-note">
            <span>
              <House size={16} />
            </span>
            <p>
              <strong>Take it one step at a time.</strong>
              <br />
              You can add more houses, pens and flocks later.
            </p>
          </div>
        </aside>
        <section className="wizard-content">
          <div className="wizard-card">
            <div className="wizard-card-head">
              <p className="eyebrow">
                STEP {step + 1} OF {steps.length}
              </p>
              <h2>{steps[step]}</h2>
              <p>
                {step === 0
                  ? 'Tell us who manages this farm.'
                  : step === 1
                    ? 'Add the main details farmers use to identify the farm.'
                    : step === 2
                      ? 'Add the poultry houses on your farm.'
                      : step === 3
                        ? 'Organise houses into pens or sections.'
                        : step === 4
                          ? 'Add the flocks and batches you want to track.'
                          : step === 5
                            ? 'Place birds into pens and keep an eye on remaining capacity.'
                            : 'Review your information and any sections you skipped.'}
              </p>
            </div>
            {step === 0 && (
              <div className="wizard-fields">
                <Field label="Farmer or account name">
                  <input
                    value={farmerName}
                    onChange={(event) => setFarmerName(event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </Field>
                <Field label="Contact email">
                  <input type="email" value={email} readOnly autoComplete="email" />
                </Field>
                <div className="field-row">
                  <Field label="Phone number">
                    <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+256 7XX XXX XXX" />
                  </Field>
                </div>
                <div className="inline-hint">
                  <CircleHelp size={15} /> Your details will be saved securely when you finish setup.
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="wizard-fields">
                <Field label="Farm name">
                  <input
                    value={farmName}
                    onChange={(event) => setFarmName(event.target.value)}
                    placeholder="e.g. Green Valley Poultry Farm"
                    required
                  />
                </Field>
                <Field label="Farm type">
                  <select value={farmType} onChange={(event) => setFarmType(event.target.value)}>
                    <option>Smallholder poultry farm</option>
                    <option>Commercial poultry farm</option>
                    <option>Mixed farm</option>
                  </select>
                </Field>
                <div className="field-row">
                  <Field label="District">
                    <input value={district} onChange={(event) => setDistrict(event.target.value)} />
                  </Field>
                  <Field label="Town or village">
                    <input value={town} onChange={(event) => setTown(event.target.value)} placeholder="e.g. Entebbe" />
                  </Field>
                </div>
                <Field label="Preferred units">
                  <select value={preferredUnits} onChange={(event) => setPreferredUnits(event.target.value)}>
                    <option>Metric (kg, m)</option>
                    <option>Imperial (lb, ft)</option>
                  </select>
                </Field>
                <div className="inline-hint">
                  <MapPin size={15} /> Location helps organise farm records. Your entries will be saved when you finish.
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="wizard-fields">
                <Field label="How many houses do you have?">
                  <div className="number-stepper">
                    <button type="button" onClick={() => changeHouseCount(houseCount - 1)}>
                      −
                    </button>
                    <strong>{houseCount}</strong>
                    <button type="button" onClick={() => changeHouseCount(houseCount + 1)}>
                      +
                    </button>
                    <span>houses</span>
                  </div>
                </Field>
                {houses.map((house, index) => (
                  <div className="house-entry" key={index}>
                    <span className="house-entry-icon">
                      <House size={17} />
                    </span>
                    <div className="house-entry-fields">
                      <Field label={`House ${String.fromCharCode(65 + index)} name`}>
                        <input
                          value={house.name}
                          onChange={(event) => updateHouse(index, 'name', event.target.value)}
                        />
                      </Field>
                      <Field label="Housing system">
                        <select
                          value={house.system}
                          onChange={(event) => updateHouse(index, 'system', event.target.value)}
                        >
                          <option>Deep litter</option>
                          <option>Raised slatted floor</option>
                          <option>Free range</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      <div className="field-row">
                        <Field label="Length (m)">
                          <input
                            type="number"
                            min="0"
                            value={house.length}
                            onChange={(event) => updateHouse(index, 'length', event.target.value)}
                            placeholder="12"
                          />
                        </Field>
                        <Field label="Width (m)">
                          <input
                            type="number"
                            min="0"
                            value={house.width}
                            onChange={(event) => updateHouse(index, 'width', event.target.value)}
                            placeholder="8"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {step === 3 && (
              <div className="wizard-fields">
                <p className="wizard-explain">
                  Pens help you track birds separately, even within the same house.
                </p>
                {houses.map((house, houseIndex) => (
                  <article className="wizard-house-group" key={houseIndex}>
                    <div>
                      <House size={16} />
                      <strong>
                        {house.name || `House ${String.fromCharCode(65 + houseIndex)}`}
                      </strong>
                      <span>{house.pens.length} pens</span>
                    </div>
                    {house.pens.map((pen, penIndex) => (
                      <div className="wizard-pen-line" key={penIndex}>
                        <Field label="Pen name">
                          <input
                            value={pen.name}
                            onChange={(event) =>
                              updatePen(houseIndex, penIndex, 'name', event.target.value)
                            }
                          />
                        </Field>
                        <Field label="Capacity (birds)">
                          <input
                            type="number"
                            min="0"
                            value={pen.capacity}
                            onChange={(event) =>
                              updatePen(houseIndex, penIndex, 'capacity', event.target.value)
                            }
                          />
                        </Field>
                      </div>
                    ))}
                    <button className="inline-add" type="button" onClick={() => addPen(houseIndex)}>
                      <Plus size={15} /> Add pen
                    </button>
                  </article>
                ))}
              </div>
            )}
            {step === 4 && (
              <div className="wizard-fields">
                {batches.map((batch, index) => (
                  <div className="house-entry" key={index}>
                    <span className="house-entry-icon">
                      <Sprout size={17} />
                    </span>
                    <div className="house-entry-fields">
                      <Field label="Batch number">
                        <input
                          value={batch.number}
                          onChange={(event) => updateBatch(index, 'number', event.target.value)}
                        />
                      </Field>
                      <div className="field-row">
                        <Field label="Production category">
                          <select
                            value={batch.category}
                            onChange={(event) => updateBatch(index, 'category', event.target.value)}
                          >
                            <option>Broiler</option>
                            <option>Layer</option>
                          </select>
                        </Field>
                        <Field label="Breed or strain">
                          <input
                            value={batch.breed}
                            onChange={(event) => updateBatch(index, 'breed', event.target.value)}
                            placeholder="e.g. Cobb 500"
                          />
                        </Field>
                      </div>
                      <div className="field-row">
                        <Field label="Hatch date">
                          <input
                            type="date"
                            value={batch.hatchDate}
                            onChange={(event) =>
                              updateBatch(index, 'hatchDate', event.target.value)
                            }
                          />
                        </Field>
                        <Field label="Arrival date">
                          <input type="date" value={batch.arrivalDate}
                            onChange={(event) => updateBatch(index, 'arrivalDate', event.target.value)} />
                        </Field>
                        <Field label="Initial bird count">
                          <input
                            type="number"
                            min="0"
                            value={batch.initialCount}
                            onChange={(event) =>
                              updateBatch(index, 'initialCount', event.target.value)
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Supplier (optional)">
                        <input
                          value={batch.supplier}
                          onChange={(event) => updateBatch(index, 'supplier', event.target.value)}
                          placeholder="Supplier name"
                        />
                      </Field>
                      <Field label="Feeding programme">
                        <select value={batch.feedingProgramme} onChange={(event) => updateBatch(index, 'feedingProgramme', event.target.value)}>
                          <option value="">Select a programme</option>
                          <option>Broiler starter pellets</option>
                          <option>Broiler grower mash</option>
                          <option>Layer programme</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                ))}
                <button className="inline-add" type="button" onClick={addBatch}>
                  <Plus size={15} /> Add another batch
                </button>
                <p className="inline-hint">
                  <CircleHelp size={15} /> Batch details will be saved to your farm when setup finishes.
                </p>
              </div>
            )}
            {step === 5 && (
              <div className="wizard-fields">
                <Field label="Batch to place">
                  <select
                    value={selectedBatch}
                    onChange={(event) => {
                      setSelectedBatch(Number(event.target.value))
                      setPlacementNotice('')
                    }}
                  >
                    {batches.map((batch, index) => (
                      <option key={index} value={index}>
                        {batch.number} · {batch.category}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="placement-batch">
                  <span className="placement-icon">
                    <Sprout size={17} />
                  </span>
                  <div>
                    <strong>
                      {batches[selectedBatch]?.number} · {batches[selectedBatch]?.category}
                    </strong>
                    <small>{initialBirds} birds to place</small>
                  </div>
                  <span className="remaining">{unassignedBirds} unassigned</span>
                </div>
                {pens.map((pen) => (
                  <div key={pen.key}>
                    <div className="placement-row">
                      <label htmlFor={`placement-${pen.key}`}>
                        {pen.label}
                        <small>Capacity: {pen.capacity} birds</small>
                      </label>
                      <input
                        id={`placement-${pen.key}`}
                        type="number"
                        min="0"
                        value={currentPlacement[pen.key] ?? ''}
                        onChange={(event) => updatePlacement(pen.key, event.target.value)}
                      />
                      <span>birds</span>
                    </div>
                    {Object.values(placements).reduce((total, entry) => total + (Number(entry[pen.key]) || 0), 0) > pen.capacity && (
                      <p className="placement-capacity-warning" role="status">
                        This is above the example capacity for {pen.label}.
                      </p>
                    )}
                  </div>
                ))}
                {placementNotice && (
                  <p className="placement-capacity-warning" role="status">
                    {placementNotice}
                  </p>
                )}
                <div className="inline-hint">
                  <CircleHelp size={15} /> {assignedBirds} of {initialBirds} birds assigned. You
                  cannot place more birds than this batch contains.
                </div>
              </div>
            )}
            {step === 6 && (
              <div className="review-list">
                <div>
                  <span>Farmer</span>
                  <strong>{farmerName || 'Name not entered'}</strong>
                  <small>Account email is managed separately by Supabase Auth.</small>
                </div>
                <div>
                  <span>Farm</span>
                  <strong>{farmName || 'Farm name not entered'}</strong>
                  <small>{district || 'District not entered'} · {preferredUnits}</small>
                </div>
                <div>
                  <span>Houses and pens</span>
                  <strong>
                    {skipped.includes(2)
                      ? 'Skipped for now'
                      : `${houses.length} houses · ${pens.length} pens`}
                  </strong>
                  <small>Optional sections can be added after setup.</small>
                </div>
                <div>
                  <span>Flocks and placement</span>
                  <strong>
                    {skipped.includes(4)
                      ? 'Skipped for now'
                      : `${batches.length} batches · ${skipped.includes(5) ? 'placement later' : `${assignedBirds} birds placed`}`}
                  </strong>
                  <small>
                    Initial and current bird counts are shown separately in the farm workspace.
                  </small>
                </div>
                {skipped.length > 0 && (
                  <p className="inline-hint">
                    <CircleHelp size={15} /> Skipped for now:{' '}
                    {skipped.map((index) => steps[index]).join(', ')}. You can complete these later
                    from the farm workspace.
                  </p>
                )}
              </div>
            )}
            {validationMessage && (
              <p className="wizard-validation" role="alert">
                {validationMessage}
              </p>
            )}
            <div className="wizard-actions">
              {step > 0 && (
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => {
                    setValidationMessage('')
                    setStep(step - 1)
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              <span className="step-saved">{saving ? 'Saving securely…' : 'Continue'}</span>
              {optionalSteps.includes(step) && (
                <button className="skip-step" type="button" onClick={skipCurrentStep}>
                  Skip for now
                </button>
              )}
              <button
                className="button-primary"
                type="button"
                onClick={() => (step === steps.length - 1 ? finishSetup() : continueStep())}
                  disabled={saving || loadingProfile}
              >
                {saving ? 'Saving...' : step === steps.length - 1 ? 'Finish setup' : 'Continue'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Check, Filter, HeartPulse, Plus } from 'lucide-react'

import {
  PageHeading,
  OpsFilters,
  FilterSelect,
  Field,
  OpsPanel,
  Status,
  SuccessNote,
  DataTable,
} from '../shared/operations-ui'

import { healthRecords } from '../data/operations-demo-data'

export function HealthRegister() {
  const [tab, setTab] = useState('Observations')
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK HEALTH"
        title="Mortality & health"
        description="Record what you observe and keep follow-up notes together."
        action={{
          label: 'Add observation',
          icon: Plus,
          onClick: () => {
            setTab('New observation')
            setSaved(false)
          },
        }}
      />
      <div className="ops-callout health">
        <HeartPulse size={17} />
        <p>
          <strong>Observe and record—don’t self-diagnose.</strong> These records help you share
          clear information with a veterinarian or extension worker.
        </p>
      </div>
      {saved && <SuccessNote>Health observation saved to the demonstration register.</SuccessNote>}
      <OpsFilters>
        <FilterSelect
          label="Farm"
          value="Green Valley Poultry Farm"
          values={['Green Valley Poultry Farm']}
        />
        <FilterSelect
          label="Flock"
          value="All active flocks"
          values={['All active flocks', 'BR-2026-001', 'LY-2026-002']}
        />
        <span className="ops-filter-spacer" />
        <button
          className={`ops-tab ${tab === 'Observations' ? 'selected' : ''}`}
          onClick={() => setTab('Observations')}
        >
          Observations <span>2</span>
        </button>
        <button
          className={`ops-tab ${tab === 'New observation' ? 'selected' : ''}`}
          onClick={() => setTab('New observation')}
        >
          New observation
        </button>
      </OpsFilters>
      {tab === 'Observations' ? (
        <>
          <div className="health-summary">
            <div>
              <span>Recorded observations</span>
              <strong>2</strong>
              <small>This month</small>
            </div>
            <div>
              <span>Follow-ups to review</span>
              <strong>1</strong>
              <small>Check in with your flock</small>
            </div>
            <div>
              <span>Mortality recorded</span>
              <strong>2 birds</strong>
              <small>Across active batches</small>
            </div>
          </div>
          <OpsPanel
            title="Health observation register"
            action={
              <button className="quiet-action">
                <Filter size={14} /> Filter
              </button>
            }
          >
            <DataTable
              headings={['DATE', 'FLOCK · PEN', 'OBSERVATION', 'AFFECTED', 'FOLLOW-UP']}
              rows={healthRecords.map((record) => [
                record.date,
                <span key={record.flock}>
                  <strong>{record.flock}</strong>
                  <small>{record.pen}</small>
                </span>,
                record.observation,
                record.affected,
                <Status tone={record.tone} key={record.followup}>
                  {record.followup}
                </Status>,
              ])}
            />
          </OpsPanel>
        </>
      ) : (
        <OpsPanel title="Record a health observation">
          <div className="ops-form-grid">
            <Field label="Observation date" type="date" defaultValue="2026-11-16" />
            <Field
              label="Flock or batch"
              options={['BR-2026-001 · Broiler', 'LY-2026-002 · Layer']}
            />
            <Field
              label="House and pen"
              options={['House A · Pen A1', 'House A · Pen A2', 'House B · Pen B1']}
            />
            <Field label="Number of birds affected" type="number" placeholder="0" min="0" />
            <Field label="Symptoms or changes observed" placeholder="Describe what you saw" />
            <Field label="Bird deaths today" type="number" placeholder="0" min="0" />
          </div>
          <button className="optional-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? '− Hide' : '+ Add'} consultation and follow-up details <span>Optional</span>
          </button>
          {expanded && (
            <div className="ops-form-grid optional-fields">
              <Field
                label="Veterinary consultation"
                options={['Not yet consulted', 'Consultation requested', 'Consulted']}
              />
              <Field label="Follow-up date" type="date" />
              <Field label="Treatment notes" placeholder="Record professional advice received" />
              <Field label="Additional notes" placeholder="Next steps or observations" />
            </div>
          )}
          <div className="ops-form-footer">
            <span>Do not use this form to prescribe treatment.</span>
            <button className="button-primary" onClick={() => setSaved(true)}>
              <Check size={15} /> Save observation
            </button>
          </div>
        </OpsPanel>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Activity, Bird, Check, Clock3, Filter, Plus, Wheat } from 'lucide-react'

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

import { recordHistory } from '../data/operations-demo-data'

export function DailyRecords() {
  const [tab, setTab] = useState('New record')
  const [category, setCategory] = useState('Broiler')
  const [submitted, setSubmitted] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK OPERATIONS"
        title="Daily records"
        description="A quick daily check-in keeps your flock history up to date."
        action={{
          label: 'Record daily data',
          icon: Plus,
          onClick: () => {
            setTab('New record')
            setSubmitted(false)
          },
        }}
      />
      <OpsFilters>
        <FilterSelect
          label="Farm"
          value="Green Valley Poultry Farm"
          values={['Green Valley Poultry Farm']}
        />
        <FilterSelect
          label="Date"
          value="16 Nov 2026"
          values={['16 Nov 2026', '15 Nov 2026', '14 Nov 2026']}
        />
        <span className="ops-filter-spacer" />
        <button
          className={`ops-tab ${tab === 'New record' ? 'selected' : ''}`}
          onClick={() => setTab('New record')}
        >
          New record
        </button>
        <button
          className={`ops-tab ${tab === 'History' ? 'selected' : ''}`}
          onClick={() => setTab('History')}
        >
          History <span>3</span>
        </button>
      </OpsFilters>
      {tab === 'History' ? (
        <OpsPanel
          title="Recent records"
          action={
            <button className="quiet-action">
              <Filter size={14} /> Filter
            </button>
          }
        >
          <DataTable
            headings={['DATE', 'FLOCK', 'HOUSE · PEN', 'FEED', 'WATER', 'DEATHS', 'STATUS']}
            rows={recordHistory.map((record) => [
              record.date,
              record.flock,
              record.location,
              record.feed,
              record.water,
              record.deaths,
              <Status key={record.date + record.flock}>{record.status}</Status>,
            ])}
          />
        </OpsPanel>
      ) : (
        <div className="ops-columns daily-layout">
          <div className="ops-main-column">
            {submitted && (
              <SuccessNote>
                Daily record saved as a demonstration entry. Review the summary before acting on any
                unusual values.
              </SuccessNote>
            )}
            <OpsPanel
              title="Record flock activity"
              action={
                <span className="required-note">
                  <i>*</i> Required
                </span>
              }
            >
              <div className="ops-form-grid">
                <Field
                  label="Flock or batch"
                  options={['BR-2026-001 · Broiler', 'LY-2026-002 · Layer']}
                />
                <Field
                  label="House and pen"
                  options={['House A · Pen A1', 'House A · Pen A2', 'House B · Pen B1']}
                />
                <Field label="Recording date" type="date" defaultValue="2026-11-16" />
                <Field
                  label="Production type"
                  options={['Broiler', 'Layer']}
                  defaultValue={category}
                  onChange={(event) => setCategory(event.target.value)}
                />
              </div>
              <div className="ops-form-section">
                <div className="form-section-heading">
                  <Wheat size={16} />
                  <strong>Feed and water</strong>
                  <span>Enter totals for this pen</span>
                </div>
                <div className="ops-form-grid">
                  <Field
                    label="Feed supplied (kg)"
                    type="number"
                    placeholder="e.g. 16"
                    min="0"
                    step="0.1"
                  />
                  <Field
                    label="Feed remaining (kg)"
                    type="number"
                    placeholder="Optional"
                    min="0"
                    step="0.1"
                  />
                  <Field
                    label="Water supplied (L)"
                    type="number"
                    placeholder="e.g. 28"
                    min="0"
                    step="0.1"
                  />
                  <Field
                    label="Water remaining (L)"
                    type="number"
                    placeholder="Optional"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
              <div className="ops-form-section">
                <div className="form-section-heading">
                  <Bird size={16} />
                  <strong>Flock check</strong>
                  <span>Count birds observed today</span>
                </div>
                <div className="ops-form-grid">
                  <Field label="Bird deaths" type="number" placeholder="0" min="0" />
                  <Field
                    label="General behaviour"
                    options={['Normal', 'Less active than usual', 'Unusual behaviour observed']}
                  />
                </div>
                {category === 'Layer' && (
                  <div className="ops-form-grid conditional-field">
                    <Field label="Eggs collected" type="number" placeholder="e.g. 96" min="0" />
                    <Field label="Damaged eggs" type="number" placeholder="0" min="0" />
                  </div>
                )}
              </div>
              <button className="optional-toggle" onClick={() => setShowOptional(!showOptional)}>
                {showOptional ? '− Hide' : '+ Add'} symptoms and farm notes <span>Optional</span>
              </button>
              {showOptional && (
                <div className="ops-form-grid optional-fields">
                  <Field label="Symptoms noticed" placeholder="Describe what you observed" />
                  <Field label="Farm notes" placeholder="Anything else to remember?" />
                </div>
              )}
              <div className="ops-form-footer">
                <span>
                  <Clock3 size={13} /> Drafts are kept on this device for this demo.
                </span>
                <div>
                  <button className="button-secondary" onClick={() => setSubmitted(false)}>
                    Save draft
                  </button>
                  <button className="button-primary" onClick={() => setSubmitted(true)}>
                    <Check size={15} /> Save record
                  </button>
                </div>
              </div>
            </OpsPanel>
          </div>
          <aside className="ops-aside-column">
            <OpsPanel title="Previous day">
              <p className="ops-aside-caption">BR-2026-001 · Pen A1 · 15 Nov</p>
              <div className="comparison-item">
                <span>Feed supplied</span>
                <strong>16 kg</strong>
                <small>Yesterday</small>
              </div>
              <div className="comparison-item">
                <span>Water supplied</span>
                <strong>28 L</strong>
                <small>Yesterday</small>
              </div>
              <div className="comparison-item">
                <span>Bird deaths</span>
                <strong>1</strong>
                <small>Yesterday</small>
              </div>
              <p className="info-note">
                <Activity size={14} /> Compare like-for-like flock records. These values are
                demonstration data.
              </p>
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
            </OpsPanel>
          </aside>
        </div>
      )}
    </div>
  )
}

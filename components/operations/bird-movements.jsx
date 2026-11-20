'use client'

import { useState } from 'react'
import { ArrowLeftRight, Bird, Check, Filter, MoveRight, Plus } from 'lucide-react'

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

import { movementHistory } from '../data/operations-demo-data'

export function BirdMovements() {
  const [tab, setTab] = useState('Transfer between pens')
  const [saved, setSaved] = useState(false)
  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK OPERATIONS"
        title="Bird movements"
        description="Keep an accurate record when birds move into, between or out of pens."
        action={{
          label: 'Record movement',
          icon: Plus,
          onClick: () => {
            setTab('Transfer between pens')
            setSaved(false)
          },
        }}
      />
      <div className="ops-callout">
        <ArrowLeftRight size={17} />
        <p>
          <strong>Movement records update the live count.</strong> Initial placement stays in your
          batch history. Review each entry before saving.
        </p>
      </div>
      {saved && (
        <SuccessNote>
          Movement added to the demonstration history. Live counts shown here are illustrative.
        </SuccessNote>
      )}
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
          className={`ops-tab ${tab === 'Transfer between pens' ? 'selected' : ''}`}
          onClick={() => setTab('Transfer between pens')}
        >
          Transfer
        </button>
        <button
          className={`ops-tab ${tab === 'Sale or removal' ? 'selected' : ''}`}
          onClick={() => setTab('Sale or removal')}
        >
          Sale or removal
        </button>
        <button
          className={`ops-tab ${tab === 'History' ? 'selected' : ''}`}
          onClick={() => setTab('History')}
        >
          History
        </button>
      </OpsFilters>
      {tab === 'History' ? (
        <OpsPanel
          title="Movement history"
          action={
            <button className="quiet-action">
              <Filter size={14} /> Filter
            </button>
          }
        >
          <DataTable
            headings={['DATE & TIME', 'TYPE', 'FLOCK', 'FROM', 'TO', 'BIRDS', 'REASON']}
            rows={movementHistory.map((row, i) => [
              row.date,
              row.type,
              row.flock,
              row.from,
              row.to,
              row.birds,
              row.reason,
            ])}
          />
        </OpsPanel>
      ) : (
        <div className="ops-columns movement-layout">
          <div className="ops-main-column">
            <OpsPanel title={tab}>
              <div className="ops-form-grid">
                <Field
                  label="Flock or batch"
                  options={['BR-2026-001 · Broiler', 'LY-2026-002 · Layer']}
                />
                <Field label="Movement date" type="date" defaultValue="2026-11-16" />
                <Field
                  label={tab === 'Transfer between pens' ? 'From pen' : 'Current pen'}
                  options={[
                    'House A · Pen A1 (96 birds)',
                    'House A · Pen A2 (90 birds)',
                    'House B · Pen B1 (120 birds)',
                  ]}
                />
                {tab === 'Transfer between pens' ? (
                  <Field
                    label="To pen"
                    options={[
                      'House A · Pen A2 (90 birds)',
                      'House A · Pen A1 (96 birds)',
                      'House B · Pen B2 (empty)',
                    ]}
                  />
                ) : (
                  <Field
                    label="Reason"
                    options={['Bird sale', 'Mortality', 'Culling', 'Other removal']}
                  />
                )}
                <Field label="Number of birds" type="number" placeholder="e.g. 12" min="1" />
                <Field
                  label={
                    tab === 'Transfer between pens'
                      ? 'Movement note'
                      : 'Buyer or reference (optional)'
                  }
                  placeholder="Optional"
                />
              </div>
              {tab === 'Transfer between pens' && (
                <div className="movement-preview">
                  <span>
                    A1 <small>96 birds</small>
                  </span>
                  <MoveRight size={20} />
                  <span>
                    A2 <small>90 birds</small>
                  </span>
                  <em>12 birds to transfer</em>
                </div>
              )}
              <div className="ops-form-footer">
                <span>Count available at selected source: 96 birds</span>
                <button className="button-primary" onClick={() => setSaved(true)}>
                  <Check size={15} /> Save movement
                </button>
              </div>
            </OpsPanel>
          </div>
          <aside className="ops-aside-column">
            <OpsPanel title="Current live counts">
              <div className="count-row">
                <span>
                  <Bird size={15} /> BR-2026-001 · A1
                </span>
                <strong>
                  96 <small>birds</small>
                </strong>
              </div>
              <div className="count-row">
                <span>
                  <Bird size={15} /> BR-2026-001 · A2
                </span>
                <strong>
                  90 <small>birds</small>
                </strong>
              </div>
              <div className="count-row">
                <span>
                  <Bird size={15} /> LY-2026-002 · B1
                </span>
                <strong>
                  120 <small>birds</small>
                </strong>
              </div>
              <p className="ops-aside-caption">Initial count: 320 birds across both batches.</p>
            </OpsPanel>
            <OpsPanel title="Record keeping tip">
              <p className="plain-tip">
                Record each transfer at both the source and destination pen. This helps keep your
                flock totals consistent.
              </p>
            </OpsPanel>
          </aside>
        </div>
      )}
    </div>
  )
}

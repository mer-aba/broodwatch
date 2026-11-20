'use client'

import { useState } from 'react'
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

export function WeightMonitoring() {
  const [method, setMethod] = useState('Group sample')
  const [saved, setSaved] = useState(false)
  const methods = [
    { label: 'Individual bird', icon: Bird },
    { label: 'Group sample', icon: Scale },
    { label: 'Full-flock total', icon: Activity },
  ]
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
          <strong>Choose a sampling method that suits your flock.</strong> Weighing every day is not
          required. Record whether a measurement is a sample or a full-flock total.
        </p>
      </div>
      {saved && <SuccessNote>Weight entry saved to this demonstration log.</SuccessNote>}
      <div className="ops-columns weight-layout">
        <div className="ops-main-column">
          <OpsPanel title="New weight entry">
            <div className="method-choice">
              {methods.map(({ label, icon: Icon }) => (
                <button
                  className={`method-card ${method === label ? 'active' : ''}`}
                  key={label}
                  onClick={() => setMethod(label)}
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
                options={['BR-2026-001 · Broiler', 'LY-2026-002 · Layer']}
              />
              <Field
                label="House and pen"
                options={['House A · Pen A1', 'House A · Pen A2', 'House B · Pen B1']}
              />
              <Field label="Date weighed" type="date" defaultValue="2026-11-16" />
              <Field
                label="Scale type"
                options={['Digital platform scale', 'Hanging scale', 'Other']}
              />
              <Field label="Flock age" defaultValue="28 days" />
              <Field
                label={
                  method === 'Individual bird'
                    ? 'Number of birds weighed'
                    : method === 'Group sample'
                      ? 'Number of birds in sample'
                      : 'Birds weighed'
                }
                type="number"
                placeholder="e.g. 10"
                min="1"
              />
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
                    placeholder="Enter weights, separated by commas"
                  />
                ) : (
                  <Field
                    label={
                      method === 'Full-flock total'
                        ? 'Total flock weight (kg)'
                        : 'Total sample weight (kg)'
                    }
                    type="number"
                    placeholder="e.g. 12.4"
                    min="0"
                    step="0.01"
                  />
                )}
                <Field
                  label="Container tare weight (kg)"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <Field label="Sampling notes" placeholder="How were birds selected?" />
              </div>
            </div>
            <div className="ops-form-footer">
              <span>Sample estimates are not full-flock measurements.</span>
              <button className="button-primary" onClick={() => setSaved(true)}>
                <Check size={15} /> Save weight
              </button>
            </div>
          </OpsPanel>
        </div>
        <aside className="ops-aside-column">
          <OpsPanel title="Latest flock summary">
            <div className="weight-summary">
              <span className="weight-stat-icon">
                <TrendingUp size={17} />
              </span>
              <div>
                <strong>1.18 kg</strong>
                <small>Mean sample weight</small>
              </div>
              <Status>Sample</Status>
            </div>
            <div className="weight-detail-grid">
              <div>
                <span>Sample size</span>
                <strong>10 birds</strong>
              </div>
              <div>
                <span>Last weighed</span>
                <strong>09 Nov 2026</strong>
              </div>
              <div>
                <span>Weight range</span>
                <strong>0.96–1.34 kg</strong>
              </div>
              <div>
                <span>Variability (CV)</span>
                <strong>12.4%</strong>
              </div>
            </div>
            <p className="info-note">
              <CircleAlert size={14} /> Example values only. Reference targets vary by breed, feed
              programme and production system.
            </p>
          </OpsPanel>
        </aside>
      </div>
      <div id="weight-history">
        <OpsPanel
          title="Sampling history"
          action={
            <button className="quiet-action">
              <Download size={14} /> Export
            </button>
          }
        >
          <DataTable
            headings={[
              'DATE',
              'FLOCK',
              'PEN',
              'METHOD',
              'SAMPLE SIZE',
              'MEAN WEIGHT',
              'ENTRY TYPE',
            ]}
            rows={[
              [
                '09 Nov 2026',
                'BR-2026-001',
                'A1',
                'Group sample',
                '10 birds',
                '1.18 kg',
                <Status key="w1">Sample</Status>,
              ],
              [
                '02 Nov 2026',
                'BR-2026-001',
                'A1',
                'Group sample',
                '10 birds',
                '0.94 kg',
                <Status key="w2">Sample</Status>,
              ],
              [
                '26 Oct 2026',
                'LY-2026-002',
                'B1',
                'Individual bird',
                '8 birds',
                '0.82 kg',
                <Status key="w3">Sample</Status>,
              ],
            ]}
          />
        </OpsPanel>
      </div>
    </div>
  )
}

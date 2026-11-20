'use client'

import { useState } from 'react'
import { Activity, Check, Download, FileText, FlaskConical } from 'lucide-react'

import { ScreenHeader, Panel, StatePill, DemoFlag, Field } from '../shared/intelligence-ui'

export function EvaluationLab() {
  const [ran, setRan] = useState(false)
  const [fileName, setFileName] = useState('')
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="ADMINISTRATION · ACADEMIC PROJECT"
        title="Evaluation laboratory"
        description="Compare alerting configurations against labelled example data."
      />
      <div className="environment-warning">
        <FlaskConical size={15} />
        <span>
          <strong>Simulated evaluation only.</strong> Example scores are not model performance
          claims and no production detector is running.
        </span>
        <DemoFlag />
      </div>
      <div className="intel-two-col">
        <Panel title="Evaluation scenario">
          <div className="intel-form-grid">
            <Field
              label="Labelled dataset"
              options={['BroodWatch demo · 7 days', 'Upload a CSV dataset']}
            />
            <Field
              label="Target signal"
              options={[
                'Water anomaly',
                'Temperature anomaly',
                'Mortality anomaly',
                'Combined multi-metric',
              ]}
            />
            <Field label="Rolling baseline window" type="number" value="7" min="2" />
            <Field
              label="Persistence threshold"
              options={[
                '2 consecutive observations',
                '3 consecutive observations',
                '5 consecutive observations',
              ]}
            />
          </div>
          <button className="optional-toggle">
            + Advanced parameters <span>Optional</span>
          </button>
          <div className="intel-form-footer">
            <span>Inputs remain in this demo interface.</span>
            <button className="button-primary" onClick={() => setRan(true)}>
              <Activity size={15} />
              Run simulated evaluation
            </button>
          </div>
        </Panel>
        <Panel title="Configuration notes">
          <div className="benefit-list">
            <span>
              <Check size={14} /> Rolling-median baseline
            </span>
            <span>
              <Check size={14} /> Persistence across consecutive points
            </span>
            <span>
              <Check size={14} /> Missing data separated from health events
            </span>
            <span>
              <Check size={14} /> Configuration recorded for comparison
            </span>
          </div>
        </Panel>
      </div>
      <Panel
        title="Evaluation results"
        action={
          <button className="quiet-action" disabled={!ran}>
            <Download size={14} /> Export report
          </button>
        }
      >
        <div className="evaluation-metrics">
          {[
            ['Precision', ran ? '0.82' : '—'],
            ['Recall', ran ? '0.76' : '—'],
            ['F1 score', ran ? '0.79' : '—'],
            ['False alerts', ran ? '3' : '—'],
            ['Detection lead time', ran ? '2 readings' : '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{ran ? 'Simulated example' : 'Run a scenario to view example output'}</small>
            </div>
          ))}
        </div>
        <div className="eval-upload">
          <span>
            <FileText size={17} />
          </span>
          <div>
            <strong>Labelled CSV dataset</strong>
            <p>
              {fileName ||
                'Upload a dataset with timestamp, metric value and expected label columns.'}
            </p>
          </div>
          <label className="button-secondary">
            Choose CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}
            />
          </label>
        </div>
        <p className="chart-caption">
          Evaluation results shown here are simulated and are not based on a validated field
          dataset.
        </p>
      </Panel>
    </div>
  )
}

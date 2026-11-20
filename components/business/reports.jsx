'use client'

import { useState } from 'react'
import { Download, Leaf } from 'lucide-react'

import {
  ScreenHeader,
  Panel,
  DemoFlag,
  FilterBar,
  FilterControl,
  Table,
} from '../shared/intelligence-ui'

export function Reports() {
  const [report, setReport] = useState('Farm overview')
  const reportNames = [
    'Farm overview',
    'Batch performance',
    'Pen performance',
    'Feed & water',
    'Growth and weight',
    'Mortality and health',
    'Egg production',
    'Vaccination history',
    'Environment',
    'Alert history',
    'Financial performance',
  ]
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="FARM BUSINESS"
        title="Reports"
        description="Bring your farm records together for review and sharing."
        action={{ label: 'Print report', icon: Download, onClick: () => window.print() }}
      />
      <FilterBar>
        <FilterControl
          label="Farm"
          value="Green Valley Poultry Farm"
          options={['Green Valley Poultry Farm']}
        />
        <FilterControl
          label="Period"
          value="Last 30 days"
          options={['Last 7 days', 'Last 30 days', 'This month', 'Custom range']}
        />
        <span className="intel-filter-spacer" />
        <DemoFlag />
      </FilterBar>
      <div className="report-layout">
        <aside className="report-list">
          <span>REPORT TYPE</span>
          {reportNames.map((item) => (
            <button
              key={item}
              className={report === item ? 'selected' : ''}
              onClick={() => setReport(item)}
            >
              {item}
              <span>→</span>
            </button>
          ))}
        </aside>
        <Panel
          title={report}
          action={
            <button className="quiet-action" onClick={() => window.print()}>
              <Download size={14} /> Export
            </button>
          }
          className="report-preview"
        >
          <div className="report-brand">
            <span className="brand-mark">
              <Leaf size={18} />
            </span>
            <div>
              <strong>BroodWatch</strong>
              <small>FARM REPORT · DEMONSTRATION DATA</small>
            </div>
            <span className="report-date">16 Nov 2026</span>
          </div>
          <h2>{report}</h2>
          <p className="report-subtitle">
            Green Valley Poultry Farm · Wakiso District · 01–16 Nov 2026
          </p>
          <div className="report-summary-grid">
            <div>
              <span>Active flocks</span>
              <strong>2</strong>
            </div>
            <div>
              <span>Current live birds</span>
              <strong>306</strong>
            </div>
            <div>
              <span>Houses in use</span>
              <strong>2</strong>
            </div>
            <div>
              <span>Record coverage</span>
              <strong>86%</strong>
            </div>
          </div>
          <h3>Summary</h3>
          <p className="report-copy">
            This preview combines example records for broilers and layers. Review completeness and
            flock context before comparing results or making management decisions.
          </p>
          <Table
            headings={['FLOCK', 'CATEGORY', 'LIVE BIRDS', 'RECORDS', 'NOTES']}
            rows={[
              ['BR-2026-001', 'Broiler', '186', '12 entries', 'Demo flock · 28 days'],
              ['LY-2026-002', 'Layer', '120', '11 entries', 'Demo flock · 16 weeks'],
            ]}
          />
          <p className="chart-caption">
            This report contains simulated values only. No live sensor readings, verified MAAIF
            targets, or audited financial results are included.
          </p>
        </Panel>
      </div>
    </div>
  )
}

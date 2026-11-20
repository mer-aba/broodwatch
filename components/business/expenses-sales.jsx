'use client'

import { useState } from 'react'
import { Activity, Check, CircleAlert, Plus, TrendingDown, TrendingUp } from 'lucide-react'

import {
  ScreenHeader,
  Panel,
  StatePill,
  DemoFlag,
  Metric,
  FilterBar,
  FilterControl,
  Field,
  Table,
} from '../shared/intelligence-ui'

export function ExpensesSales() {
  const [tab, setTab] = useState('Overview')
  const [saved, setSaved] = useState(false)
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="FARM BUSINESS"
        title="Expenses & sales"
        description="Organise costs and revenue in UGX. These are example records."
        action={{ label: 'Add transaction', icon: Plus, onClick: () => setTab('Add transaction') }}
      />
      {saved && (
        <div className="ops-success">
          <Check size={16} />
          Transaction saved to this demonstration ledger.
        </div>
      )}
      <DemoFlag />
      <div className="analytics-metrics">
        <Metric
          label="Expenses this month"
          value="UGX 1.84M"
          detail="Example ledger total"
          icon={TrendingDown}
          tone="rose"
        />
        <Metric
          label="Sales this month"
          value="UGX 2.46M"
          detail="Example ledger total"
          icon={TrendingUp}
          tone="sage"
        />
        <Metric
          label="Net operating balance"
          value="UGX 620K"
          detail="Before unrecorded costs"
          icon={Activity}
          tone="gold"
        />
        <Metric
          label="Uncategorised"
          value="2 items"
          detail="Review transaction records"
          icon={CircleAlert}
          tone="slate"
        />
      </div>
      <FilterBar>
        <button
          className={`intel-tab ${tab === 'Overview' ? 'selected' : ''}`}
          onClick={() => setTab('Overview')}
        >
          Overview
        </button>
        <button
          className={`intel-tab ${tab === 'Transactions' ? 'selected' : ''}`}
          onClick={() => setTab('Transactions')}
        >
          Transactions
        </button>
        <button
          className={`intel-tab ${tab === 'Add transaction' ? 'selected' : ''}`}
          onClick={() => setTab('Add transaction')}
        >
          Add transaction
        </button>
        <span className="intel-filter-spacer" />
        <FilterControl
          label="Period"
          value="November 2026"
          options={['November 2026', 'October 2026', 'Year to date']}
        />
      </FilterBar>
      {tab === 'Add transaction' ? (
        <Panel title="Record a sale or expense">
          <div className="intel-form-grid">
            <Field
              label="Transaction type"
              options={['Expense', 'Bird sale', 'Egg sale', 'Other income']}
            />
            <Field label="Date" type="date" value="2026-11-16" />
            <Field
              label="Category"
              options={[
                'Feed',
                'Bird acquisition',
                'Veterinary',
                'Labour',
                'Utilities',
                'Equipment',
                'Bird sale',
                'Egg sale',
                'Other',
              ]}
            />
            <Field label="Amount (UGX)" type="number" min="0" placeholder="e.g. 250000" />
            <Field
              label="Batch (optional)"
              options={['No batch selected', 'BR-2026-001', 'LY-2026-002']}
            />
            <Field label="Description or supplier" placeholder="Add a brief note" />
          </div>
          <div className="intel-form-footer">
            <span>Amount and totals are for demo display only.</span>
            <button
              className="button-primary"
              onClick={() => {
                setSaved(true)
                setTab('Transactions')
              }}
            >
              <Check size={15} />
              Save transaction
            </button>
          </div>
        </Panel>
      ) : tab === 'Transactions' ? (
        <Panel title="Transaction ledger">
          <Table
            headings={['DATE', 'TYPE', 'CATEGORY', 'DESCRIPTION', 'BATCH', 'AMOUNT (UGX)']}
            rows={[
              [
                '15 Nov 2026',
                'Expense',
                'Feed',
                'Broiler grower feed · 4 bags',
                'BR-2026-001',
                '420,000',
              ],
              ['12 Nov 2026', 'Sale', 'Eggs', 'Egg sales · market', 'LY-2026-002', '286,000'],
              [
                '08 Nov 2026',
                'Expense',
                'Veterinary',
                'Consultation visit',
                'BR-2026-001',
                '120,000',
              ],
              ['05 Nov 2026', 'Sale', 'Birds', 'Bird sale · 12 birds', 'BR-2026-001', '360,000'],
            ]}
          />
        </Panel>
      ) : (
        <div className="intel-two-col">
          <Panel title="Income and expenses">
            <div className="finance-bars">
              <div>
                <span>Feed & supplies</span>
                <strong>UGX 1.12M</strong>
                <i>
                  <b style={{ width: '75%' }} />
                </i>
              </div>
              <div>
                <span>Bird & egg sales</span>
                <strong>UGX 2.46M</strong>
                <i>
                  <b style={{ width: '89%' }} />
                </i>
              </div>
              <div>
                <span>Health & veterinary</span>
                <strong>UGX 280K</strong>
                <i>
                  <b style={{ width: '24%' }} />
                </i>
              </div>
              <div>
                <span>Labour & utilities</span>
                <strong>UGX 440K</strong>
                <i>
                  <b style={{ width: '35%' }} />
                </i>
              </div>
            </div>
          </Panel>
          <Panel title="Batch cost snapshot">
            <div className="batch-finance">
              <span>BR-2026-001 · Broiler</span>
              <strong>UGX 1.26M</strong>
              <small>Recorded costs · sale revenue shown separately</small>
            </div>
            <div className="batch-finance">
              <span>LY-2026-002 · Layer</span>
              <strong>UGX 580K</strong>
              <small>Recorded costs · incomplete demo period</small>
            </div>
            <p className="chart-caption">
              Not a profit guarantee. Incomplete records can make unit costs misleading.
            </p>
          </Panel>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Check, CircleAlert, Download, Plus, Search, TrendingUp, Wheat } from 'lucide-react'

import {
  PageHeading,
  OpsFilters,
  Field,
  OpsPanel,
  Status,
  SuccessNote,
  DataTable,
} from '../shared/operations-ui'

import { inventoryRows } from '../data/operations-demo-data'

export function Inventory() {
  const [tab, setTab] = useState('Stock overview')
  const [saved, setSaved] = useState(false)
  const [query, setQuery] = useState('')
  return (
    <div className="operations-page">
      <PageHeading
        kicker="FARM BUSINESS"
        title="Inventory"
        description="Keep an eye on feed and farm supplies before you run low."
        action={{
          label: 'Record purchase',
          icon: Plus,
          onClick: () => {
            setTab('Record purchase')
            setSaved(false)
          },
        }}
      />
      {saved && <SuccessNote>Inventory transaction saved to this demonstration log.</SuccessNote>}
      <section className="inventory-summary-grid">
        <div className="inventory-stat">
          <span className="inventory-stat-icon">
            <Wheat size={17} />
          </span>
          <span>Feed on hand</span>
          <strong>17 bags</strong>
          <small>Across 3 feed types</small>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-icon gold">
            <CircleAlert size={17} />
          </span>
          <span>Low stock items</span>
          <strong>2 items</strong>
          <small>Review before next order</small>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-icon">
            <TrendingUp size={17} />
          </span>
          <span>Feed usage · 7 days</span>
          <strong>198 kg</strong>
          <small>Demonstration estimate</small>
        </div>
      </section>
      <OpsFilters>
        <button
          className={`ops-tab ${tab === 'Stock overview' ? 'selected' : ''}`}
          onClick={() => setTab('Stock overview')}
        >
          Stock overview
        </button>
        <button
          className={`ops-tab ${tab === 'Transactions' ? 'selected' : ''}`}
          onClick={() => setTab('Transactions')}
        >
          Transactions
        </button>
        <button
          className={`ops-tab ${tab === 'Record purchase' ? 'selected' : ''}`}
          onClick={() => setTab('Record purchase')}
        >
          Record purchase
        </button>
        <span className="ops-filter-spacer" />
        <label className="ops-search">
          <Search size={14} />
          <input
            aria-label="Search inventory"
            placeholder="Search supplies"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </OpsFilters>
      {tab === 'Record purchase' ? (
        <OpsPanel title="Add a stock purchase">
          <div className="ops-form-grid">
            <Field
              label="Item"
              options={[
                'Broiler starter pellets',
                'Broiler grower mash',
                'Layer concentrate',
                'Poultry vitamins',
                'Disinfectant',
                'Other',
              ]}
            />
            <Field label="Purchase date" type="date" defaultValue="2026-11-16" />
            <Field label="Quantity" type="number" placeholder="e.g. 4" min="0" step="0.1" />
            <Field
              label="Unit"
              options={['50 kg bag', '25 kg bag', '1 L bottle', '5 L container', 'Other']}
            />
            <Field label="Total cost (UGX)" type="number" placeholder="e.g. 480,000" min="0" />
            <Field label="Supplier (optional)" placeholder="Supplier name" />
          </div>
          <div className="ops-form-footer">
            <span>Stock quantities are demonstration data.</span>
            <button
              className="button-primary"
              onClick={() => {
                setSaved(true)
                setTab('Stock overview')
              }}
            >
              <Check size={15} /> Save purchase
            </button>
          </div>
        </OpsPanel>
      ) : tab === 'Transactions' ? (
        <OpsPanel title="Recent inventory activity">
          <DataTable
            headings={['DATE', 'ITEM', 'TRANSACTION', 'QUANTITY', 'COST (UGX)', 'SUPPLIER']}
            rows={[
              [
                '14 Nov 2026',
                'Broiler starter pellets',
                'Purchase',
                '+4 bags',
                '480,000',
                'Kampala Agro Feed',
              ],
              [
                '13 Nov 2026',
                'Broiler grower mash',
                'Feed allocation',
                '−1 bag',
                '—',
                'House A · BR-2026-001',
              ],
              [
                '10 Nov 2026',
                'Disinfectant',
                'Purchase',
                '+2 containers',
                '96,000',
                'Farm supply store',
              ],
            ]}
          />
        </OpsPanel>
      ) : (
        <OpsPanel
          title="Stock overview"
          action={
            <button className="quiet-action">
              <Download size={14} /> Export
            </button>
          }
        >
          <DataTable
            headings={['ITEM', 'CATEGORY', 'ON HAND', 'UNIT', 'REORDER AT', 'STATUS']}
            rows={inventoryRows
              .filter((row) =>
                `${row.item} ${row.category}`.toLowerCase().includes(query.toLowerCase()),
              )
              .map((row) => [
                row.item,
                row.category,
                row.onHand,
                row.unit,
                row.reorder,
                <Status tone={row.tone} key={row.item}>
                  {row.status}
                </Status>,
              ])}
          />
        </OpsPanel>
      )}
      <p className="inventory-footnote">
        <CircleAlert size={14} /> Stock levels and costs shown are examples for the interface
        preview, not live records.
      </p>
    </div>
  )
}

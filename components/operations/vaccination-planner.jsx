'use client'

import { useState } from 'react'
import {
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardCheck,
  History,
  Plus,
  ShieldCheck,
} from 'lucide-react'

import {
  PageHeading,
  OpsFilters,
  FilterSelect,
  Field,
  OpsPanel,
  Status,
  SuccessNote,
  DataTable,
  BookIcon,
} from '../shared/operations-ui'

import { vaccines } from '../data/operations-demo-data'

export function VaccinationPlanner() {
  const [tab, setTab] = useState('Schedule')
  const [items, setItems] = useState(vaccines)
  const [saved, setSaved] = useState(false)
  return (
    <div className="operations-page">
      <PageHeading
        kicker="FLOCK HEALTH"
        title="Vaccination & tasks"
        description="Plan flock activities and keep a record of what has been completed."
        action={{
          label: 'Add a task',
          icon: Plus,
          onClick: () => {
            setTab('Add task')
            setSaved(false)
          },
        }}
      />
      <div className="ops-callout">
        <ShieldCheck size={17} />
        <p>
          <strong>Schedules are references, not prescriptions.</strong> Confirm the appropriate
          vaccination plan with a veterinarian or local extension worker for your flock and
          location.
        </p>
      </div>
      {saved && <SuccessNote>Task added to the demonstration planner.</SuccessNote>}
      <div className="health-summary">
        <div>
          <span>Upcoming activities</span>
          <strong>
            {items.filter((item) => item.status === 'Upcoming' || item.status === 'Planned').length}
          </strong>
          <small>Next 14 days</small>
        </div>
        <div>
          <span>Completed this month</span>
          <strong>{items.filter((item) => item.status === 'Completed').length}</strong>
          <small>Recorded for your flocks</small>
        </div>
        <div>
          <span>Active flocks</span>
          <strong>2</strong>
          <small>Broiler and layer</small>
        </div>
      </div>
      <OpsFilters>
        <button
          className={`ops-tab ${tab === 'Schedule' ? 'selected' : ''}`}
          onClick={() => setTab('Schedule')}
        >
          Schedule
        </button>
        <button
          className={`ops-tab ${tab === 'Reference' ? 'selected' : ''}`}
          onClick={() => setTab('Reference')}
        >
          Reference notes
        </button>
        <button
          className={`ops-tab ${tab === 'Add task' ? 'selected' : ''}`}
          onClick={() => setTab('Add task')}
        >
          Add task
        </button>
        <span className="ops-filter-spacer" />
        <FilterSelect
          label="Flock"
          value="All flocks"
          values={['All flocks', 'BR-2026-001', 'LY-2026-002']}
        />
      </OpsFilters>
      {tab === 'Add task' ? (
        <OpsPanel title="Add a vaccination or farm task">
          <div className="ops-form-grid">
            <Field
              label="Flock"
              options={['BR-2026-001 · Broiler', 'LY-2026-002 · Layer', 'All flocks']}
            />
            <Field label="Activity" placeholder="Vaccine or task name" />
            <Field label="Planned date" type="date" />
            <Field label="Assigned to" placeholder="Name (optional)" />
            <Field label="Reference or source" placeholder="Add a source note" />
            <Field
              label="Reminder"
              options={['No reminder', 'On planned date', 'One day before']}
            />
          </div>
          <div className="ops-form-footer">
            <span>Schedule requires confirmation by your veterinary professional.</span>
            <button
              className="button-primary"
              onClick={() => {
                setSaved(true)
                setItems([
                  {
                    activity: 'New farm activity',
                    category: 'Selected flock',
                    age: '—',
                    planned: 'To be confirmed',
                    status: 'Planned',
                    tone: 'sage',
                  },
                  ...items,
                ])
                setTab('Schedule')
              }}
            >
              <Check size={15} /> Save task
            </button>
          </div>
        </OpsPanel>
      ) : tab === 'Reference' ? (
        <OpsPanel title="Using reference schedules">
          <div className="reference-notes">
            <div>
              <span className="reference-mark">
                <BookIcon />
              </span>
              <div>
                <strong>Use flock-specific guidance</strong>
                <p>
                  Schedules can differ by production type, breed, location and veterinary advice.
                  Check the original source and applicability before planning.
                </p>
              </div>
            </div>
            <div>
              <span className="reference-mark gold">
                <CircleAlert size={17} />
              </span>
              <div>
                <strong>Confirm the product and timing</strong>
                <p>
                  Discuss vaccine choice, administration and timing with a qualified veterinary
                  professional. This interface does not provide treatment directions.
                </p>
              </div>
            </div>
            <div>
              <span className="reference-mark">
                <History size={17} />
              </span>
              <div>
                <strong>Keep completion records</strong>
                <p>
                  Record the date, flock, administrator and source notes after an activity has been
                  confirmed and completed.
                </p>
              </div>
            </div>
          </div>
        </OpsPanel>
      ) : (
        <OpsPanel
          title="Flock activity schedule"
          action={
            <button className="quiet-action">
              <CalendarDays size={14} /> November 2026
            </button>
          }
        >
          <div className="vaccination-list">
            {items.map((item, index) => (
              <article className="vaccination-row" key={`${item.activity}-${index}`}>
                <div className="vaccine-date">
                  <CalendarDays size={16} />
                  <span>{item.planned.split(' ')[0]}</span>
                  <small>{item.planned.split(' ').slice(1).join(' ')}</small>
                </div>
                <div className="vaccine-main">
                  <div className="vaccine-title">
                    <strong>{item.activity}</strong>
                    <Status tone={item.tone}>{item.status}</Status>
                  </div>
                  <p>
                    {item.category} flock <i>·</i> {item.age}
                  </p>
                  {item.category === 'Broiler' && item.age === 'Example schedule' && (
                    <small className="illustrative-note">
                      Illustrative example · verify the applicable schedule
                    </small>
                  )}
                </div>
                <button
                  className="complete-task"
                  disabled={item.status === 'Completed'}
                  onClick={() =>
                    setItems(
                      items.map((entry, i) =>
                        i === index ? { ...entry, status: 'Completed', tone: 'blue' } : entry,
                      ),
                    )
                  }
                >
                  {item.status === 'Completed' ? (
                    <>
                      <Check size={14} /> Completed
                    </>
                  ) : (
                    <>
                      <ClipboardCheck size={14} /> Mark complete
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
          <p className="vaccine-disclaimer">
            <ShieldCheck size={14} /> Reference schedule only. Confirm all activities for your flock
            with a veterinarian.
          </p>
        </OpsPanel>
      )}
    </div>
  )
}

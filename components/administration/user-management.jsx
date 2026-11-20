'use client'

import { useState } from 'react'
import { MoreHorizontal, Plus, ShieldCheck } from 'lucide-react'

import { ScreenHeader, Panel, StatePill, DemoFlag, Field, Table } from '../shared/intelligence-ui'

export function UserManagement() {
  const [invite, setInvite] = useState(false)
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="ADMINISTRATION"
        title="User management"
        description="Review who can access this farm workspace."
        action={{ label: 'Invite a teammate', icon: Plus, onClick: () => setInvite(!invite) }}
      />
      {invite && (
        <Panel title="Invite a teammate">
          <div className="intel-form-grid">
            <Field label="Name" placeholder="Teammate name" />
            <Field label="Email address" type="email" placeholder="name@example.com" />
            <Field
              label="Farm role"
              options={['Farm manager', 'Farm worker', 'Read-only viewer']}
            />
          </div>
          <div className="intel-form-footer">
            <span>Invitations are not sent in this demo.</span>
            <button className="button-primary" onClick={() => setInvite(false)}>
              Save demo invite
            </button>
          </div>
        </Panel>
      )}
      <Panel title="People with farm access" action={<DemoFlag />}>
        <Table
          headings={['PERSON', 'ROLE', 'FARM ACCESS', 'STATUS', '']}
          rows={[
            [
              <span key="owner">
                <strong>James M.</strong>
                <small>james@example.com</small>
              </span>,
              'Farm owner',
              'All farm areas',
              <StatePill key="owner-status">Active</StatePill>,
              <button className="quiet-icon" key="owner-menu" aria-label="James profile options">
                <MoreHorizontal size={17} />
              </button>,
            ],
            [
              <span key="manager">
                <strong>Sarah K.</strong>
                <small>sarah@example.com</small>
              </span>,
              'Farm manager',
              'Green Valley Poultry Farm',
              <StatePill key="manager-status">Active</StatePill>,
              <button className="quiet-icon" key="manager-menu" aria-label="Sarah profile options">
                <MoreHorizontal size={17} />
              </button>,
            ],
            [
              <span key="worker">
                <strong>David O.</strong>
                <small>david@example.com</small>
              </span>,
              'Farm worker',
              'Green Valley Poultry Farm',
              <StatePill tone="gold" key="worker-status">
                Invited · demo
              </StatePill>,
              <button className="quiet-icon" key="worker-menu" aria-label="David profile options">
                <MoreHorizontal size={17} />
              </button>,
            ],
          ]}
        />
      </Panel>
      <div className="permission-note">
        <ShieldCheck size={16} />
        <span>
          This screen is a design prototype. It does not implement authentication or access control.
        </span>
      </div>
    </div>
  )
}

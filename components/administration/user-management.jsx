'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { ScreenHeader, Panel, StatePill } from '../shared/intelligence-ui'
import { createClient } from '@/lib/supabase/client'

const ROLE_OPTIONS = [
  ['manager', 'Farm manager'],
  ['worker', 'Farm worker'],
]

async function fetchFarms() {
  const { data, error } = await createClient().from('farms').select('id,name')
  if (error) throw error
  return data || []
}

async function checkOwner(db, farmId) {
  const result = await db.rpc('bw_admin_owner', { p_farm: farmId })
  if (result.error) throw result.error
  return Boolean(result.data)
}

async function fetchMembers(db, farmId) {
  const result = await db.rpc('bw_admin_members', { p_farm: farmId })
  if (result.error) throw result.error
  return result.data || []
}

async function mutateMember(db, { farmId, action, email, userId, role }) {
  const result = await db.rpc('bw_admin_member', {
    p_farm: farmId,
    p_email: action === 'add' ? email : null,
    p_user: userId,
    p_role: role,
    p_action: action,
  })
  if (result.error) throw result.error
}

function useFarms() {
  const [farms, setFarms] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    fetchFarms()
      .then(list => { if (live) setFarms(list) })
      .catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [])

  return { farms, error }
}

function useMembers(farmId, revision) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!farmId) return
    let live = true
    setData(null)
    setError('')

    ;(async () => {
      const db = createClient()
      try {
        const owner = await checkOwner(db, farmId)
        if (!live) return
        if (!owner) {
          setData({ id: farmId, owner: false, rows: [] })
          return
        }
        const rows = await fetchMembers(db, farmId)
        if (live) setData({ id: farmId, owner: true, rows })
      } catch (e) {
        if (live) setError(e.message)
      }
    })()

    return () => { live = false }
  }, [farmId, revision])

  return { data, error, setError }
}

function useMemberMutation(farmId, owner, refresh) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  async function change(action, userId = null, role = 'worker', email = '') {
    if (lock.current || !owner) return
    if (action === 'remove' && !window.confirm('Remove this teammate from the farm?')) return

    lock.current = true
    setBusy(true)
    setError('')

    try {
      await mutateMember(createClient(), { farmId, action, email, userId, role })
      refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return { busy, error, change }
}

function FarmSelector({ farms, value, disabled, onChange }) {
  return (
    <label>
      Farm
      <select className="range-select" disabled={disabled} value={value} onChange={e => onChange(e.target.value)}>
        {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </label>
  )
}

function AddTeammatePanel({ email, setEmail, role, setRole, busy, onSubmit }) {
  return (
    <Panel title="Add an existing teammate">
      <form onSubmit={onSubmit} className="intel-form-grid">
        <label>
          Email address
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>

        <label>
          Role
          <select value={role} onChange={e => setRole(e.target.value)}>
            {ROLE_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>

        <p>
          Teammates must first create and verify a BroodWatch account. This grants access immediately; no email invitation is sent.
        </p>

        <button className="button-primary" disabled={busy}>Add teammate</button>
      </form>
    </Panel>
  )
}

function MembersTable({ rows, busy, onChangeRole, onRemove }) {
  return (
    <Panel title="People with farm access">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              {['Account', 'Role', 'Status', 'Actions'].map(x => (
                <th key={x} style={{ padding: 14, background: '#eaf1eb' }}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={m.user_id} style={{ background: i % 2 ? '#f5f8f5' : 'transparent', borderBottom: '1px solid #e3e9e3' }}>
                <td style={{ padding: 14, overflowWrap: 'anywhere' }}>{m.email || m.user_id}</td>
                <td style={{ padding: 14 }}>
                  {m.role === 'owner' ? (
                    'Farm owner'
                  ) : (
                    <select disabled={busy} value={m.role} onChange={e => onChangeRole(m.user_id, e.target.value)}>
                      {ROLE_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </select>
                  )}
                </td>
                <td style={{ padding: 14 }}><StatePill>Active access</StatePill></td>
                <td style={{ padding: 14 }}>
                  {m.role !== 'owner' && (
                    <button className="button-secondary" disabled={busy} onClick={() => onRemove(m.user_id)}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export function UserManagement({ farmId } = {}) {
  const { farms, error: farmsError } = useFarms()
  const [farm, setFarm] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('worker')
  const [show, setShow] = useState(false)
  const [revision, setRevision] = useState(0)

  const id = farm || farmId || farms[0]?.id || ''
  const { data, error, setError } = useMembers(id, revision)
  const owner = data?.id === id && data.owner

  const { busy, error: mutationError, change } = useMemberMutation(id, owner, () => setRevision(x => x + 1))

  useEffect(() => {
    if (!error && !mutationError) return
    if (mutationError) setError(mutationError)
  }, [mutationError, error, setError])

  function handleAdd(e) {
    e.preventDefault()
    change('add', null, role, email)
    setEmail('')
  }

  function handleFarmChange(value) {
    setFarm(value)
    setShow(false)
    setEmail('')
  }

  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="ADMINISTRATION"
        title="User management"
        description="Manage access to your farm workspace."
        action={owner ? { label: 'Add teammate', icon: Plus, onClick: () => setShow(x => !x) } : undefined}
      />

      <FarmSelector farms={farms} value={id} disabled={busy} onChange={handleFarmChange} />

      {(error || farmsError) && <p role="alert">{error || farmsError}</p>}
      {!data && !error && <p>{id ? 'Loading access…' : 'No accessible farm.'}</p>}
      {data?.id === id && !owner && (
        <p>Only farm owners can view member email addresses and manage access.</p>
      )}

      {owner && show && (
        <AddTeammatePanel
          email={email}
          setEmail={setEmail}
          role={role}
          setRole={setRole}
          busy={busy}
          onSubmit={handleAdd}
        />
      )}

      {owner && (
        <MembersTable
          rows={data.rows}
          busy={busy}
          onChangeRole={(userId, nextRole) => change('role', userId, nextRole)}
          onRemove={userId => change('remove', userId, role)}
        />
      )}

      <div className="permission-note">
        <ShieldCheck size={16} /> Access is controlled by farm membership and existing database policies. Owner access is protected.
      </div>
    </div>
  )
}
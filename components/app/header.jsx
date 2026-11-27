'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, CircleHelp, Menu, Search } from 'lucide-react'
import { visibleGroups } from './sidebar'

const SEARCH_SHORTCUT = 'Ctrl K'

const matchesQuery = (item, query) =>
  item.toLowerCase().includes(query.toLowerCase())

function HeaderSearchDialog({ dialogRef, isAdmin, onNavigate }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (dialogRef.current?.open) setQuery('')
  }, [dialogRef])

  const items = visibleGroups(isAdmin)
    .flatMap(g => g.items)
    .filter(i => matchesQuery(i, query))

  function close() {
    dialogRef.current?.close()
  }

  function select(item) {
    close()
    onNavigate(item)
  }

  return (
    <dialog ref={dialogRef} className="shell-search-dialog">
      <strong>Find a BroodWatch module</strong>
      <input
        autoFocus
        aria-label="Search modules"
        placeholder="Search modules"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {items.map(i => (
        <button key={i} onClick={() => select(i)}>{i}</button>
      ))}
      {!items.length && <p>No matching modules.</p>}
      <button onClick={close}>Close search</button>
    </dialog>
  )
}

function FarmBreadcrumb({ farms, farmId, onFarmChange, active }) {
  return (
    <div className="breadcrumbs">
      <select
        className="shell-farm-select"
        aria-label="Select farm"
        value={farmId || ''}
        onChange={e => onFarmChange(e.target.value)}
      >
        {!farms.length && <option value="">No farm selected</option>}
        {farms.map(f => (
          <option key={f.id} value={f.id}>{f.name || f.farm_name || 'Unnamed farm'}</option>
        ))}
      </select>
      <span className="crumb-slash">/</span>
      <strong title={active}>{active}</strong>
    </div>
  )
}

function HeaderActions({ onOpenSearch, onNavigate, initials }) {
  return (
    <div className="header-actions">
      <button className="header-search" aria-label="Search modules" onClick={onOpenSearch}>
        <Search size={16} />
        <span>Search modules</span>
        <kbd>{SEARCH_SHORTCUT}</kbd>
      </button>
      <button className="header-icon" aria-label="Help" onClick={() => onNavigate('Knowledge Library')}>
        <CircleHelp size={18} />
      </button>
      <button className="header-icon notification-button" aria-label="Alerts" onClick={() => onNavigate('Anomaly Alerts')}>
        <Bell size={18} />
      </button>
      <span className="header-divider" />
      <span className="user-avatar small-avatar">{initials}</span>
    </div>
  )
}

export default function Header({
  onMenu, active, initials, farms = [], farmId, onFarmChange, onNavigate, isAdmin, mobileOpen,
}) {
  const dialog = useRef(null)

  function openSearch() {
    if (!dialog.current?.open) dialog.current?.showModal()
  }

  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <header className="app-header">
      <button
        className="mobile-menu"
        aria-label="Open navigation"
        aria-controls="app-navigation"
        aria-expanded={mobileOpen}
        onClick={onMenu}
      >
        <Menu size={21} />
      </button>

      <FarmBreadcrumb farms={farms} farmId={farmId} onFarmChange={onFarmChange} active={active} />

      <HeaderActions onOpenSearch={openSearch} onNavigate={onNavigate} initials={initials} />

      <HeaderSearchDialog dialogRef={dialog} isAdmin={isAdmin} onNavigate={onNavigate} />
    </header>
  )
}
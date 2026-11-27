'use client'

import {
  Activity, Bell, BookOpen, ChevronLeft, ClipboardList, Egg, FlaskConical, House,
  LayoutDashboard, Leaf, Settings2, Sparkles, Users, Wheat, X,
} from 'lucide-react'
import { navGroups } from '../data/farm-demo-data'
import SignOutButton from '../auth/sign-out-button'
import Brand from './brand'

const ICONS = {
  Dashboard: LayoutDashboard,
  'My Farms': House,
  'Poultry Houses & Pens': House,
  'Flocks & Batches': Egg,
  'Daily Records': ClipboardList,
  'Weight Monitoring': Activity,
  'Feed & Water': Wheat,
  'Egg Production': Egg,
  'Mortality & Health': Activity,
  'Vaccination & Tasks': ClipboardList,
  'Bird Movements': Users,
  'Live Environment': Activity,
  'Anomaly Alerts': Bell,
  'Trends & Analytics': Activity,
  'MAAIF Recommendations': Leaf,
  'Knowledge Library': BookOpen,
  'BroodWatch Assistant': Sparkles,
  Reports: ClipboardList,
  Devices: Activity,
  'Farm Settings': Settings2,
  'User Management': Users,
  'Evaluation Laboratory': FlaskConical,
}

const HIDDEN_ITEMS = ['Inventory', 'Expenses & Sales']
const ADMIN_ONLY_ITEMS = ['Evaluation Laboratory']

const isVisible = (item, isAdmin) =>
  !HIDDEN_ITEMS.includes(item) && (item !== 'Evaluation Laboratory' || isAdmin)

export function visibleGroups(isAdmin) {
  return navGroups
    .map(group => ({ ...group, items: group.items.filter(item => isVisible(item, isAdmin)) }))
    .filter(group => group.items.length)
}

function SidebarBackdrop({ mobileOpen, onClose }) {
  return (
    <button
      type="button"
      className={`sidebar-backdrop ${mobileOpen ? 'show' : ''}`}
      aria-label="Close navigation"
      onClick={onClose}
    />
  )
}

function SidebarBrand({ collapsed, setCollapsed, setMobileOpen }) {
  return (
    <div className="sidebar-brand">
      <Brand />
      <button
        className="collapse-button"
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronLeft size={16} />
      </button>
      <button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
        <X size={19} />
      </button>
    </div>
  )
}

function NavGroup({ group, active, onNavigate }) {
  return (
    <div className="nav-group">
      <p className="nav-group-label">{group.label}</p>
      {group.items.map(item => {
        const Icon = ICONS[item] || LayoutDashboard
        return (
          <button
            type="button"
            key={item}
            title={item}
            aria-label={item}
            aria-current={active === item ? 'page' : undefined}
            className={`nav-item ${active === item ? 'active' : ''}`}
            onClick={() => onNavigate(item)}
          >
            <Icon size={17} />
            <span>{item}</span>
          </button>
        )
      })}
    </div>
  )
}

function SidebarFooter({ displayName, initials, onNavigate }) {
  return (
    <div className="sidebar-bottom">
      <button
        className="nav-item assistant-shortcut"
        title="Ask BroodWatch"
        aria-label="Ask BroodWatch"
        onClick={() => onNavigate('BroodWatch Assistant')}
      >
        <span className="sparkle-box"><Sparkles size={16} /></span>
        <span>Ask BroodWatch</span>
        <span className="shortcut-key">Ctrl J</span>
      </button>

      <div className="sidebar-user">
        <div className="user-avatar" title={displayName}>{initials}</div>
        <div className="user-details">
          <strong>{displayName}</strong>
          <span>Signed in</span>
        </div>
        <SignOutButton />
      </div>
    </div>
  )
}

export default function Sidebar({
  active, onNavigate, collapsed, setCollapsed, mobileOpen, setMobileOpen, displayName, initials, isAdmin,
}) {
  const groups = visibleGroups(isAdmin)

  return (
    <>
      <SidebarBackdrop mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <aside id="app-navigation" className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <SidebarBrand collapsed={collapsed} setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} />

        <nav className="sidebar-nav" aria-label="Main navigation">
          {groups.map(group => (
            <NavGroup key={group.label} group={group} active={active} onNavigate={onNavigate} />
          ))}
        </nav>

        <SidebarFooter displayName={displayName} initials={initials} onNavigate={onNavigate} />
      </aside>
    </>
  )
}
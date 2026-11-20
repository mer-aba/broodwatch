'use client'

import { useEffect, useRef } from 'react'
import {
  Activity,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Egg,
  FlaskConical,
  House,
  LayoutDashboard,
  Leaf,
  Settings2,
  Sparkles,
  Users,
  Wheat,
  X,
} from 'lucide-react'
import { navGroups } from '../data/farm-demo-data'
import SignOutButton from '../auth/sign-out-button'
import Brand from './brand'

const navigationIcons = {
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
  Inventory: Wheat,
  'Expenses & Sales': Activity,
  Reports: ClipboardList,
  Devices: Activity,
  'Farm Settings': Settings2,
  'User Management': Users,
  'Evaluation Laboratory': FlaskConical,
}

export default function Sidebar({
  active,
  onNavigate,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  displayName,
  initials,
  isAdmin,
}) {
  const navRef = useRef(null)

  useEffect(() => {
    if (mobileOpen && navRef.current) navRef.current.scrollTop = 0
  }, [mobileOpen])

  return (
    <>
      <button
        className={`sidebar-backdrop ${mobileOpen ? 'show' : ''}`}
        type="button"
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="collapse-button"
            aria-label="Collapse navigation"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav ref={navRef} className="sidebar-nav" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items
                .filter((item) => item !== 'Evaluation Laboratory' || isAdmin)
                .map((item) => {
                  const Icon = navigationIcons[item] || LayoutDashboard
                  return (
                    <button
                      className={`nav-item ${active === item ? 'active' : ''}`}
                      key={item}
                      title={collapsed ? item : undefined}
                      onClick={() => {
                        onNavigate(item)
                        setMobileOpen(false)
                      }}
                    >
                      <Icon size={17} />
                      <span>{item}</span>
                      {item === 'Anomaly Alerts' && <i className="nav-alert-dot" />}
                    </button>
                  )
                })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item assistant-shortcut"
            onClick={() => onNavigate('BroodWatch Assistant')}
          >
            <span className="sparkle-box">
              <Sparkles size={16} />
            </span>
            <span>Ask BroodWatch</span>
            <span className="shortcut-key">⌘ J</span>
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <strong>{displayName}</strong>
              <span>Signed in</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>
    </>
  )
}

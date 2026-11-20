import { Bell, ChevronDown, CircleHelp, Menu, Search } from 'lucide-react'

export default function Header({ onMenu, active, initials }) {
  return (
    <header className="app-header">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMenu}>
        <Menu size={21} />
      </button>
      <div className="breadcrumbs">
        <span>Green Valley Poultry Farm</span>
        <span className="crumb-slash">/</span>
        <strong>{active}</strong>
      </div>
      <div className="header-actions">
        <button className="header-search">
          <Search size={16} />
          <span>Search anything...</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="header-icon" aria-label="Help">
          <CircleHelp size={18} />
        </button>
        <button className="header-icon notification-button" aria-label="Notifications">
          <Bell size={18} />
          <i />
        </button>
        <span className="header-divider" />
        <button className="header-profile">
          <span className="user-avatar small-avatar">{initials}</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  )
}

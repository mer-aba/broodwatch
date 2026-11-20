'use client'

import { ChevronDown, FileText } from 'lucide-react'

export function ScreenHeader({ kicker, title, description, action }) {
  return (
    <header className="intel-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p className="welcome-copy">{description}</p>
      </div>
      {action && (
        <button className="button-primary" onClick={action.onClick}>
          {action.icon && <action.icon size={16} />} {action.label}
        </button>
      )}
    </header>
  )
}

export function Panel({ id, title, action, children, className = '' }) {
  return (
    <section id={id} className={`intel-panel ${className}`}>
      <div className="intel-panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function StatePill({ children, tone = 'sage' }) {
  return <span className={`intel-pill ${tone}`}>{children}</span>
}

export function DemoFlag({ children = 'Demonstration data' }) {
  return (
    <span className="intel-demo-flag">
      <i />
      {children}
    </span>
  )
}

export function Table({ headings, rows }) {
  return (
    <div className="intel-table-scroll">
      <table className="intel-table">
        <thead>
          <tr>
            {headings.map((item) => (
              <th key={item}>{item}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Field({ label, options, placeholder, type = 'text', value, min, step }) {
  return (
    <label className="intel-field">
      <span>{label}</span>
      {options ? (
        <select defaultValue={value || options[0]}>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input type={type} placeholder={placeholder} defaultValue={value} min={min} step={step} />
      )}
    </label>
  )
}

export function Metric({ label, value, detail, icon: Icon, tone = 'green', trend }) {
  return (
    <article className="intel-metric">
      <span className={`intel-metric-icon ${tone}`}>
        <Icon size={17} />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>
        {trend && <em className={trend.startsWith('↑') ? 'up' : 'down'}>{trend}</em>} {detail}
      </small>
    </article>
  )
}

export function FilterBar({ children }) {
  return <div className="intel-filterbar">{children}</div>
}

export function FilterControl({ label, value, options, onChange }) {
  return (
    <label className="intel-filter">
      <span>{label}</span>
      <select {...(onChange ? { value, onChange } : { defaultValue: value })}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={13} />
    </label>
  )
}

export function ClipboardIcon() {
  return <FileText size={17} />
}

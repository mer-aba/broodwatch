'use client'

import { Check, ChevronDown, Syringe } from 'lucide-react'

export function PageHeading({ kicker, title, description, action, icon: Icon }) {
  return (
    <div className="ops-heading">
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
    </div>
  )
}

export function OpsFilters({ children }) {
  return <div className="ops-filters">{children}</div>
}

export function FilterSelect({ label, value, values }) {
  return (
    <label className="ops-filter-label">
      {label}
      <span className="ops-select-wrap">
        <select defaultValue={value}>
          {values.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <ChevronDown size={13} />
      </span>
    </label>
  )
}

export function Field({
  label,
  type = 'text',
  placeholder,
  defaultValue,
  required = false,
  options,
  min,
  step,
  onChange,
}) {
  return (
    <label className="ops-field">
      <span>
        {label}
        {required && <i>*</i>}
      </span>
      {options ? (
        <select defaultValue={defaultValue || ''} onChange={onChange}>
          {options.map((option) => (
            <option value={option === 'Select an option' ? '' : option} key={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          defaultValue={defaultValue}
          min={min}
          step={step}
          required={required}
        />
      )}
    </label>
  )
}

export function OpsPanel({ title, action, children, className = '' }) {
  return (
    <section className={`ops-panel ${className}`}>
      <div className="ops-panel-header">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Status({ children, tone = 'sage' }) {
  return <span className={`ops-status ${tone}`}>{children}</span>
}

export function SuccessNote({ children }) {
  return (
    <div className="ops-success">
      <Check size={16} />
      <span>{children}</span>
    </div>
  )
}

export function DataTable({ headings, rows }) {
  return (
    <div className="ops-table-wrap">
      <table className="ops-table">
        <thead>
          <tr>
            {headings.map((heading) => (
              <th key={heading}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BookIcon() {
  return <Syringe size={17} />
}

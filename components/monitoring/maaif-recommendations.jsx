'use client'

import { useState } from 'react'
import {
  Activity,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Info,
  ShieldCheck,
} from 'lucide-react'

import {
  ScreenHeader,
  Panel,
  StatePill,
  DemoFlag,
  Metric,
  FilterBar,
  FilterControl,
} from '../shared/intelligence-ui'

import { advisoryCards } from '../data/intelligence-demo-data'

export function MAAIFRecommendations() {
  const [filter, setFilter] = useState('All recommendations')
  const filtered = advisoryCards.filter(
    (card) => filter === 'All recommendations' || card.type === filter,
  )
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="ADVISORY CENTRE"
        title="MAAIF recommendations"
        description="Practical flock guidance, with its source and limits made clear."
      />
      <div className="reference-banner">
        <span>
          <BookOpen size={17} />
        </span>
        <div>
          <strong>Manual guidance is flock-specific.</strong>
          <p>
            Feeding schedules vary by production category and feed programme. Numerical standards
            are not invented here; confirm the relevant manual section for your flock.
          </p>
        </div>
        <StatePill tone="blue">Reference + demo comparison</StatePill>
      </div>
      <FilterBar>
        <FilterControl
          label="Flock"
          value="All active flocks"
          options={['All active flocks', 'BR-2026-001 · Broiler', 'LY-2026-002 · Layer']}
        />
        <FilterControl
          label="Category"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          options={[
            'All recommendations',
            'MAAIF reference',
            'Calculated comparison',
            'BroodWatch suggestion',
          ]}
        />
        <span className="intel-filter-spacer" />
        <span className="last-evaluated">
          <Clock3 size={13} /> Evaluated today · demo
        </span>
      </FilterBar>
      <div className="advisory-overview">
        <Metric
          label="Within reference range"
          value="—"
          detail="No verified benchmark loaded"
          icon={CheckCircle2}
          tone="sage"
        />
        <Metric
          label="Needs attention"
          value="1"
          detail="Demo observation"
          icon={CircleAlert}
          tone="gold"
        />
        <Metric
          label="Insufficient data"
          value="1"
          detail="Confirm flock programme"
          icon={Info}
          tone="slate"
        />
        <Metric
          label="Not applicable"
          value="1"
          detail="Stage-dependent"
          icon={Activity}
          tone="green"
        />
      </div>
      <div className="advisory-list">
        {filtered.map((card) => (
          <article className="advisory-item" key={card.title}>
            <div className="advisory-card-head">
              <span className="advisory-source-label">{card.type}</span>
              <StatePill tone={card.tone}>{card.state}</StatePill>
            </div>
            <h2>{card.title}</h2>
            <p className="advisory-flock">{card.flock}</p>
            <div className="advisory-values">
              {card.values.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="advisory-explanation">
              <span>What this means</span>
              <p>{card.explanation}</p>
            </div>
            <div className="advisory-action">
              <span>
                <CheckCircle2 size={15} />
              </span>
              <p>
                <strong>Suggested check</strong>
                {card.action}
              </p>
            </div>
            <div className="advisory-citation">
              <BookOpen size={14} />
              <span>{card.source}</span>
              <button aria-label={`Show source details for ${card.title}`}>
                <ExternalLink size={13} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="intel-disclaimer">
        <ShieldCheck size={14} /> Guidance is informational and does not replace veterinary advice
        or verified manual review.
      </p>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Filter, Info, Search } from 'lucide-react'

import { ScreenHeader, Panel, StatePill, DemoFlag } from '../shared/intelligence-ui'

import { articleData } from '../data/intelligence-demo-data'

export function KnowledgeLibrary() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All topics')
  const [article, setArticle] = useState(null)
  const categories = [
    'All topics',
    'Housing & equipment',
    'Feeding & nutrition',
    'Water management',
    'Health & biosecurity',
    'Vaccination',
    'Farm economics',
  ]
  const filtered = useMemo(
    () =>
      articleData.filter(
        (item) =>
          (category === 'All topics' || item.category === category) &&
          `${item.title} ${item.detail} ${item.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [category, query],
  )
  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="POULTRY KNOWLEDGE"
        title="Knowledge library"
        description="Clear, practical notes with source context and flock applicability."
      />
      <div className="knowledge-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search poultry guidance, records and farm practice"
          aria-label="Search knowledge library"
        />
        <span>⌘ K</span>
      </div>
      <div className="knowledge-topics">
        {categories.map((item) => (
          <button
            className={category === item ? 'active' : ''}
            key={item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {article ? (
        <Panel
          title={article.title}
          action={
            <button className="quiet-action" onClick={() => setArticle(null)}>
              Back to topics
            </button>
          }
        >
          <div className="article-reader">
            <StatePill tone="blue">{article.mark}</StatePill>
            <p className="article-applies">Applies to: {article.applies}</p>
            <p>{article.detail}</p>
            <h3>What to consider</h3>
            <p>
              Use this as a starting point for your farm’s routine. Consider the flock’s production
              category, age, housing and recent records. If the topic involves animal health or
              vaccination, confirm next steps with a qualified veterinary professional.
            </p>
            <h3>Source and notes</h3>
            <p>
              BroodWatch knowledge preview · aligned to topics in the MAAIF Poultry Training Manual
              for Extension Workers. Verify the relevant manual section before applying numerical
              targets.
            </p>
            <div className="article-citation">
              <BookOpen size={15} />
              <span>
                Reference source: MAAIF Poultry Training Manual for Extension Workers · section and
                page to be verified
              </span>
            </div>
          </div>
        </Panel>
      ) : (
        <>
          <div className="knowledge-result-heading">
            <div>
              <strong>{filtered.length} topics</strong>
              <span>Curated for smallholder poultry farms</span>
            </div>
            <button className="quiet-action">
              <Filter size={14} /> Sort: recommended
            </button>
          </div>
          {filtered.length ? (
            <div className="article-grid">
              {filtered.map((item) => (
                <button className="article-card" key={item.title} onClick={() => setArticle(item)}>
                  <div className="article-card-top">
                    <span className="article-category-icon">
                      <BookOpen size={17} />
                    </span>
                    <span className="article-mark">{item.mark}</span>
                  </div>
                  <span className="article-category">{item.category}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <div className="article-card-footer">
                    <span>{item.applies}</span>
                    <span>
                      {item.read} read <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="knowledge-empty">
              <BookOpen size={22} />
              <strong>No topics match that search</strong>
              <span>Try a broader word or choose another topic.</span>
            </div>
          )}
        </>
      )}
      <p className="intel-disclaimer">
        <Info size={14} /> This library preview is educational and not a substitute for professional
        veterinary care.
      </p>
    </div>
  )
}

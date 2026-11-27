'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Filter, Info, Search } from 'lucide-react'
import { ScreenHeader, Panel, StatePill } from '../shared/intelligence-ui'

const MANUAL_PATH = '/references/maaif-poultry-manual.pdf'

const RAW_TOPICS = [
  ['Housing & equipment', 'Brooder ventilation', 'Chicks', 'Section 4.1.4, p. 35', 'Provide ventilation while protecting chicks from draughts.', 'Inspect the brooder air quality and chick distribution.'],
  ['Housing & equipment', 'Brooder temperature', 'Chicks', 'Section 4.1.5, Table 8, p. 36', 'Brooding temperature requirements change with age.', 'Check the age-specific table and measure conditions at chick level.'],
  ['Feeding & nutrition', 'Commercial layer feeding', 'Pullets and layers', 'Table 26, p. 62', 'Feed intake and growth references vary with age; the table describes mash feeding.', 'Compare a measured daily intake per bird with the applicable age row.'],
  ['Feeding & nutrition', 'Commercial broiler pellets', 'Commercial broilers', 'Table 32, p. 69', 'The pellet programme provides daily and weekly feed quantities for 100 birds.', 'Scale the daily reference to the observed bird population.'],
  ['Feeding & nutrition', 'Commercial broiler mash', 'Commercial broilers', 'Table 33, p. 69', 'Mash feeding has its own age-dependent quantities and weight references.', 'Do not substitute pellet targets for mash targets.'],
  ['Feeding & nutrition', 'Improved meat birds', 'Improved dual-purpose birds', 'Section 4.6, Table 34, p. 71', 'The improved-breed meat programme spans ten weeks.', 'Confirm that the flock is an improved dual-purpose breed before using this schedule.'],
  ['Feeding & nutrition', 'Female breeder references', 'Cobb 500 female breeders', 'Section 4.3, Table 23, p. 57', 'The female breeder schedule is distinct from commercial layer feeding.', 'Do not apply breeder targets to ordinary laying hens.'],
  ['Water management', 'Broiler water consumption', 'Commercial broilers', 'Table 31, p. 69', 'The manual provides age-dependent daily water consumption ranges.', 'Check drinker access and measure actual consumption rather than water supplied alone.'],
  ['Water management', 'Layer water consumption', 'Pullets and layers', 'Table 26, p. 62', 'The layer schedule includes daily water ranges alongside feed and weight.', 'Review the age row and investigate changes in intake.'],
  ['Health & biosecurity', 'Control farm access', 'All flocks', 'Section 6.4, p. 114', 'Physical barriers, visitor controls and equipment disinfection help prevent disease spread.', 'Review visitor records, footwear hygiene and perimeter security.'],
  ['Vaccination', 'Vaccine handling', 'All flocks', 'Sections 7.1.1–7.1.3, pp. 119–121', 'Vaccine storage, transport and administration require appropriate handling.', 'Confirm the product instructions and vaccination plan with a veterinary professional.'],
  ['Farm economics', 'Financial and production records', 'All flocks', 'Section 9.4, pp. 134–135', 'The investment guide distinguishes financial and production records.', 'Maintain dated records of inputs, output and expenditure to support farm decisions.'],
]

const TOPICS = RAW_TOPICS.map(([category, title, applies, source, detail, action], id) => ({
  id, category, title, applies, source, detail, action,
}))

const CATEGORIES = ['All topics', ...new Set(TOPICS.map(t => t.category))]
const SORT_OPTIONS = [['recommended', 'Recommended'], ['az', 'Title A–Z']]

const matchesQuery = (topic, query) =>
  `${topic.title} ${topic.detail} ${topic.category} ${topic.applies} ${topic.source} ${topic.action}`
    .toLowerCase()
    .includes(query.trim().toLowerCase())

function useSearchShortcut(searchRef, onClearArticle) {
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onClearArticle()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchRef, onClearArticle])
}

function TopicCard({ topic, onOpen }) {
  return (
    <button className="article-card" onClick={() => onOpen(topic)}>
      <div className="article-card-top">
        <span className="article-category-icon"><BookOpen size={17} /></span>
        <span className="article-mark">MAAIF reference</span>
      </div>
      <span className="article-category">{topic.category}</span>
      <strong>{topic.title}</strong>
      <p>{topic.detail}</p>
      <div className="article-card-footer">
        <span>{topic.applies}</span>
        <span>Read →</span>
      </div>
    </button>
  )
}

function ArticleReader({ article, onBack }) {
  return (
    <Panel title={article.title} action={<button className="quiet-action" onClick={onBack}>Back to topics</button>}>
      <div className="article-reader">
        <StatePill tone="blue">MAAIF reference</StatePill>
        <p className="article-applies">Applies to: {article.applies}</p>
        <p>{article.detail}</p>

        <h3>BroodWatch suggested check</h3>
        <p>{article.action}</p>

        <h3>Source and notes</h3>
        <p>Concise educational summary, not a verbatim reproduction. Confirm the original programme before applying numerical targets.</p>

        <div className="article-citation">
          <BookOpen size={15} />
          <span>MAAIF (2019), Poultry Training Manual for Extension Workers in Uganda · {article.source}</span>
        </div>

        <a href={MANUAL_PATH} target="_blank" rel="noreferrer">Open original manual (PDF)</a>
      </div>
    </Panel>
  )
}

export function KnowledgeLibrary() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All topics')
  const [article, setArticle] = useState(null)
  const [sort, setSort] = useState('recommended')
  const search = useRef(null)

  useSearchShortcut(search, () => setArticle(null))

  const filtered = useMemo(() => {
    const rows = TOPICS.filter(t =>
      (category === 'All topics' || t.category === category) &&
      matchesQuery(t, query)
    )
    return sort === 'az' ? [...rows].sort((a, b) => a.title.localeCompare(b.title)) : rows
  }, [category, query, sort])

  function updateQuery(value) {
    setQuery(value)
    setArticle(null)
  }

  function selectCategory(next) {
    setCategory(next)
    setArticle(null)
  }

  return (
    <div className="intelligence-page">
      <ScreenHeader
        kicker="POULTRY KNOWLEDGE"
        title="Knowledge library"
        description="Practical notes with traceable manual references and flock applicability."
      />

      <div className="knowledge-search">
        <Search size={18} />
        <input
          ref={search}
          value={query}
          onChange={e => updateQuery(e.target.value)}
          placeholder="Search poultry guidance, records and farm practice"
          aria-label="Search knowledge library"
        />
        <span>Ctrl / ⌘ K</span>
      </div>

      <div className="knowledge-topics">
        {CATEGORIES.map(c => (
          <button key={c} className={category === c ? 'active' : ''} onClick={() => selectCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {article ? (
        <ArticleReader article={article} onBack={() => setArticle(null)} />
      ) : (
        <>
          <div className="knowledge-result-heading">
            <div>
              <strong>{filtered.length} topics</strong>
              <span>Curated for smallholder poultry farms</span>
            </div>
            <label>
              <Filter size={14} />
              <select className="range-select" value={sort} onChange={e => setSort(e.target.value)}>
                {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          {filtered.length ? (
            <div className="article-grid">
              {filtered.map(topic => <TopicCard key={topic.id} topic={topic} onOpen={setArticle} />)}
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
        <Info size={14} /> Educational guidance does not replace professional veterinary care.
      </p>
    </div>
  )
}
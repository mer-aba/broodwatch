export const demoTrend = [
  { day: 'Mon', feed: 27, water: 44, temp: 27.1, humidity: 63, mortality: 1 },
  { day: 'Tue', feed: 29, water: 46, temp: 27.6, humidity: 62, mortality: 0 },
  { day: 'Wed', feed: 28, water: 45, temp: 28.2, humidity: 66, mortality: 0 },
  { day: 'Thu', feed: 31, water: 49, temp: 28.8, humidity: 67, mortality: 1 },
  { day: 'Fri', feed: 30, water: 47, temp: 29.4, humidity: 70, mortality: 0 },
  { day: 'Sat', feed: 32, water: 51, temp: 28.7, humidity: 68, mortality: 0 },
  { day: 'Sun', feed: 30, water: 48, temp: 28.3, humidity: 65, mortality: 0 },
]

export const demoAlerts = [
  {
    id: 'al-01',
    title: 'Water use is below its recent pattern',
    metric: 'Water',
    value: '41 L',
    baseline: '48 L rolling median',
    area: 'House A · Pen A1',
    flock: 'BR-2026-001 · 28 days',
    time: 'Today, 10:25',
    severity: 'Review',
    tone: 'gold',
    why: 'Two consecutive demo observations were lower than the recent rolling median. This is a monitoring flag, not a health diagnosis.',
    steps: 'Check water availability, drinker flow and record completeness.',
  },
  {
    id: 'al-02',
    title: 'House B sensor has stopped reporting',
    metric: 'Sensor offline',
    value: 'No recent reading',
    baseline: 'Last update: 2 hours ago',
    area: 'House B · DHT22-02',
    flock: 'LY-2026-002 · 16 weeks',
    time: 'Today, 08:10',
    severity: 'Data issue',
    tone: 'slate',
    why: 'No new environmental data has arrived within the configured freshness window.',
    steps:
      'Inspect device power and connection. Confirm readings locally; this is not a confirmed poultry-health emergency.',
  },
  {
    id: 'al-03',
    title: 'Daily flock record is missing',
    metric: 'Missing data',
    value: 'Not recorded',
    baseline: 'Expected daily log',
    area: 'House A · Pen A2',
    flock: 'BR-2026-001 · 28 days',
    time: 'Yesterday, 17:00',
    severity: 'Data issue',
    tone: 'slate',
    why: 'A daily record is not present for the selected date, so a comparison cannot be calculated.',
    steps: 'Add the record if available, or leave the date marked as missing.',
  },
]

export const advisoryCards = [
  {
    type: 'BroodWatch suggestion',
    title: 'Review the lower water observation',
    flock: 'BR-2026-001 · Broiler · 28 days',
    state: 'Requires attention',
    tone: 'gold',
    values: [
      ['Actual value', '41 L · latest demo record'],
      ['Reference', '48 L · rolling median'],
      ['Difference', '−7 L vs recent pattern'],
      ['Priority', 'Review'],
    ],
    explanation:
      'The latest recorded value is below this flock’s recent pattern. Confirm supply and drinker access before drawing conclusions.',
    action: 'Check drinkers and compare with the next complete record.',
    source: 'BroodWatch-generated suggestion · Demo calculation',
  },
  {
    type: 'MAAIF reference',
    title: 'Match feeding guidance to the flock programme',
    flock: 'BR-2026-001 · Broiler · programme not confirmed',
    state: 'Insufficient data',
    tone: 'slate',
    values: [
      ['Actual value', 'Not recorded'],
      ['Reference', 'Manual section not verified'],
      ['Difference', 'Not calculated'],
      ['Priority', 'Confirm applicability'],
    ],
    explanation:
      'The reference manual describes different feeding schedules by production category and feeding programme. No universal numerical target is shown here.',
    action: 'Confirm breed, feed form and stage before applying manual guidance.',
    source: 'MAAIF Poultry Training Manual · verify applicable section',
  },
  {
    type: 'Calculated comparison',
    title: 'Layer egg collection is ready to compare',
    flock: 'LY-2026-002 · Layer · 16 weeks',
    state: 'Not applicable',
    tone: 'sage',
    values: [
      ['Actual value', 'No production record'],
      ['Reference', 'Not applicable at this stage'],
      ['Difference', 'Not applicable'],
      ['Priority', 'Informational'],
    ],
    explanation:
      'Egg-production comparisons are not applicable to this flock stage in this example view.',
    action: 'No action required. Revisit when production records apply.',
    source: 'BroodWatch calculated state · based on entered flock category',
  },
]

export const articleData = [
  {
    category: 'Housing & equipment',
    title: 'A practical poultry-house walk-through',
    detail: 'A simple checklist for checking litter, ventilation, light and drinker access.',
    applies: 'Broilers · Layers',
    read: '6 min',
    mark: 'Field guide',
  },
  {
    category: 'Feeding & nutrition',
    title: 'Choose feeding guidance for your flock',
    detail:
      'Why feed form, production category and flock stage matter when using a reference schedule.',
    applies: 'Broilers · Layers',
    read: '5 min',
    mark: 'Manual notes',
  },
  {
    category: 'Water management',
    title: 'Daily water checks that help prevent surprises',
    detail: 'Observe availability, cleanliness and drinker function as part of routine flock care.',
    applies: 'All flocks',
    read: '4 min',
    mark: 'Field guide',
  },
  {
    category: 'Health & biosecurity',
    title: 'Make a useful health observation record',
    detail:
      'Capture observable changes and prepare clear information for a veterinary professional.',
    applies: 'All flocks',
    read: '7 min',
    mark: 'Farm practice',
  },
  {
    category: 'Vaccination',
    title: 'Using a vaccination reference responsibly',
    detail:
      'Treat schedules as references and confirm the plan for your farm with an animal-health professional.',
    applies: 'Flock-specific',
    read: '5 min',
    mark: 'Manual notes',
  },
  {
    category: 'Farm economics',
    title: 'Keep clear costs for each batch',
    detail: 'Record purchases, bird movements and sales to make later batch summaries more useful.',
    applies: 'All farms',
    read: '6 min',
    mark: 'Farm records',
  },
]

export const suggestionQuestions = [
  'How should I check drinkers when water use changes?',
  'What details should I record during a flock health check?',
  'How do I choose feeding guidance for my broilers?',
]

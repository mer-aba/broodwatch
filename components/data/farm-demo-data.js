export const navGroups = [
  {
    label: 'OVERVIEW',
    items: ['Dashboard', 'My Farms', 'Poultry Houses & Pens', 'Flocks & Batches'],
  },
  {
    label: 'FLOCK OPERATIONS',
    items: [
      'Daily Records',
      'Weight Monitoring',
      'Feed & Water',
      'Egg Production',
      'Mortality & Health',
      'Vaccination & Tasks',
      'Bird Movements',
    ],
  },
  { label: 'MONITORING', items: ['Live Environment', 'Anomaly Alerts', 'Trends & Analytics'] },
  {
    label: 'ADVISORY',
    items: ['MAAIF Recommendations', 'Knowledge Library', 'BroodWatch Assistant'],
  },
  { label: 'BUSINESS', items: ['Inventory', 'Expenses & Sales', 'Reports'] },
  {
    label: 'ADMINISTRATION',
    items: ['Devices', 'Farm Settings', 'User Management', 'Evaluation Laboratory'],
  },
]

export const flocks = [
  {
    batch: 'BR-2026-001',
    category: 'Broiler',
    strain: 'Cobb 500',
    house: 'House A',
    pens: 'A1 · A2',
    count: 186,
    initial: 200,
    age: '28 days',
    status: 'On track',
    color: 'gold',
  },
  {
    batch: 'LY-2026-002',
    category: 'Layer',
    strain: 'Lohmann Brown',
    house: 'House B',
    pens: 'B1',
    count: 120,
    initial: 120,
    age: '16 weeks',
    status: 'Growing well',
    color: 'sage',
  },
]

export const trendData = [
  { day: 'Mon', feed: 24, water: 42, mortality: 1 },
  { day: 'Tue', feed: 26, water: 45, mortality: 0 },
  { day: 'Wed', feed: 25, water: 43, mortality: 1 },
  { day: 'Thu', feed: 29, water: 48, mortality: 0 },
  { day: 'Fri', feed: 28, water: 46, mortality: 1 },
  { day: 'Sat', feed: 31, water: 51, mortality: 0 },
  { day: 'Sun', feed: 30, water: 49, mortality: 0 },
]

export const tasks = [
  { time: '08:00', title: 'Check brooder temperature', detail: 'House A · Pen A1', done: true },
  { time: '10:30', title: 'Record feed and water', detail: 'House A · 2 pens', done: false },
  { time: '14:00', title: 'Layer flock health check', detail: 'House B · Pen B1', done: false },
]

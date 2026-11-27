export const topics = [
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
].map(([category, title, applies, source, detail, action], id) => ({
  id, category, title, applies, source, detail, action,
}))

const searchable = topics.map(t => ({
  ...t,
  haystack: `${t.title} ${t.category} ${t.detail} ${t.applies}`.toLowerCase(),
}))

const words = question => question.toLowerCase().match(/[a-z]{3,}/g) || []

export function retrieve(question) {
  const tokens = words(question)
  if (!tokens.length) return []

  return searchable
    .map(t => ({
      ...t,
      score: tokens.filter(w => t.haystack.includes(w)).length,
    }))
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ haystack, ...t }) => t)
}
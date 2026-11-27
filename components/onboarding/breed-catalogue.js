// BroodWatch registration catalogue. Breed names are selectable identifiers;
// they do not assert that MAAIF publishes strain-specific target curves.
export const CATEGORY_OPTIONS = [
  { value: 'Broiler', label: 'Commercial broiler' },
  { value: 'Layer', label: 'Commercial layer' },
  { value: 'Dual-purpose', label: 'Improved dual-purpose' },
  { value: 'Indigenous', label: 'Indigenous / local chicken' },
  { value: 'Breeder', label: 'Breeder stock' },
]
export const BREED_CATALOGUE = [
  ...['Cobb 500', 'Ross 308', 'Arbor Acres', 'Other commercial broiler'].map(name => ({name, category:'Broiler'})),
  ...['ISA Brown', 'Lohmann Brown', 'Hy-Line Brown', 'Other commercial layer'].map(name => ({name, category:'Layer'})),
  ...['Kuroiler', 'Sasso', 'Rainbow Rooster', 'Other improved cross'].map(name => ({name, category:'Dual-purpose'})),
  ...['Ugandan Black & Red', 'Ugandan Brown', 'Ugandan Red', 'Ugandan White', 'Nsesere', 'Teso chicken', 'Ugandan Short Legged (Nyoro)', 'Other local chicken'].map(name => ({name, category:'Indigenous'})),
  ...['Cobb 500 breeder', 'Other breeder strain'].map(name => ({name, category:'Breeder'})),
]
export function getBreed(category, name) {
  return BREED_CATALOGUE.find(b => b.category === category && b.name === name)
}
export function getReferenceDescription(category, name) {
  if (category === 'Broiler') return 'Commercial broiler management references; select the correct age and feed form. Verify breed-specific targets separately'
  if (category === 'Layer') return 'Commercial layer management references; do not use breeder weight targets'
  if (category === 'Dual-purpose') return 'Improved dual-purpose management guidance; verify applicability to this breed and production purpose'
  if (category === 'Indigenous') return 'Local chicken husbandry guidance; no breed-specific growth target assumed'
  if (category === 'Breeder') return name === 'Cobb 500 breeder' ? 'Breeder guidance may be sex-specific; do not apply to commercial layers' : 'Requires a verified breeder strain and sex-specific guide'
  return 'Select a production category'
}

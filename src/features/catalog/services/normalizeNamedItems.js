// Shared exact {id, name} shape for genres, companies and crew names.
export function normalizeNamedItems(items) {
  const seen = new Set()
  return (Array.isArray(items) ? items : []).filter((item) => {
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || typeof item.name !== 'string' || !item.name.trim() || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }).map(({ id, name }) => ({ id, name: name.trim() }))
}

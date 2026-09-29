export function recommendationRevision(
  uid,
  dna,
) {
  if (
    typeof uid !== 'string'
    || !uid
    || dna?.current?.status !== 'ready'
    || typeof dna.current.updatedAt !== 'string'
    || !dna.current.updatedAt
  ) {
    return null
  }

  return dna.current.updatedAt
}

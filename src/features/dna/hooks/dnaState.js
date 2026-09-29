export function deriveMovieDnaState({ loading, current, recalculation, error }) {
  if (loading) return { kind: 'loading', current: null, recalculation: null }
  if (error) return { kind: error.code === 'unsupported-version' || error.code === 'malformed' ? 'malformed' : 'error', current: null, recalculation }
  const calculating = recalculation?.status === 'queued' || recalculation?.status === 'running'
  if (calculating) return { kind: current ? 'stale' : 'running', current, recalculation }
  if (recalculation?.status === 'failed') return { kind: 'failed', current, recalculation }
  if (!current) return { kind: 'empty', current: null, recalculation }
  if (current.status === 'insufficient-data') return { kind: 'insufficient', current, recalculation }
  return { kind: 'ready', current, recalculation }
}

export function deriveRecommendationState({
  loading = false,
  data = null,
  error = null,
} = {}) {
  if (loading) {
    return {
      kind: 'loading',
      results: [],
      data: null,
      error: null,
    }
  }

  if (error) {
    return {
      kind: error.code === 'failed-precondition'
        ? 'unavailable'
        : 'error',
      results: [],
      data: null,
      error,
    }
  }

  if (!data) {
    return {
      kind: 'idle',
      results: [],
      data: null,
      error: null,
    }
  }

  if (data.results.length === 0) {
    return {
      kind: 'empty',
      results: [],
      data,
      error: null,
    }
  }

  return {
    kind: 'ready',
    results: data.results,
    data,
    error: null,
  }
}

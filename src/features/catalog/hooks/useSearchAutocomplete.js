import {
  useEffect,
  useState,
} from 'react'

import {
  searchCatalog,
} from '../services/searchService.js'

import {
  getQueryError,
  normalizeQuery,
} from '../validation/searchValidation.js'


const AUTOCOMPLETE_LIMIT = 8
const AUTOCOMPLETE_DELAY_MS = 250


export function useSearchAutocomplete({
  query,
  language,
} = {}) {
  const normalized =
    normalizeQuery(query)

  const valid =
    !getQueryError(normalized)

  const key = valid
    ? `${language}\u0000${normalized}`
    : null

  const [state, setState] =
    useState({
      key: null,
      results: [],
    })

  useEffect(() => {
    if (!key) {
      return undefined
    }

    const controller =
      new AbortController()

    const timer = window.setTimeout(
      () => {
        searchCatalog({
          query: normalized,
          type: 'all',
          page: 1,
          language,
          signal: controller.signal,
        })
          .then(data => {
            if (
              controller.signal.aborted
            ) {
              return
            }

            setState({
              key,
              results:
                data.results.slice(
                  0,
                  AUTOCOMPLETE_LIMIT,
                ),
            })
          })
          .catch(() => {
            if (
              controller.signal.aborted
            ) {
              return
            }

            setState({
              key,
              results: [],
            })
          })
      },
      AUTOCOMPLETE_DELAY_MS,
    )

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [
    key,
    language,
    normalized,
  ])

  return {
    results:
      state.key === key
        ? state.results
        : [],
    available: Boolean(key),
  }
}

import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import {
  translateCatalogValidation,
} from '../../localization/core/catalogUiMessages.js'

import {
  createSearchParams,
  getQueryError,
  normalizeQuery,
} from '../validation/searchValidation.js'

export default function SearchForm({
  query = '',
  type = 'all',
}) {
  const { t } = useTranslation()
  const id = useId()
  const navigate = useNavigate()

  const [draft, setDraft] = useState({
    source: query,
    value: query,
  })

  const [error, setError] = useState(null)

  if (draft.source !== query) {
    setDraft({
      source: query,
      value: query,
    })

    setError(null)
  }

  const value = draft.source === query
    ? draft.value
    : query

  function submit(event) {
    event.preventDefault()

    const normalized = normalizeQuery(value)
    const validation = getQueryError(normalized)

    setError(validation)

    if (validation) return

    setDraft({
      source: query,
      value: normalized,
    })

    navigate(
      `/search?${createSearchParams({
        query: normalized,
        type,
      })}`,
    )
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="mx-auto w-full max-w-2xl space-y-2"
    >
      <label
        htmlFor={id}
        className="sr-only"
      >
        {t('catalog.search.label')}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={id}
          type="search"
          value={value}
          onChange={event => {
            setDraft({
              source: query,
              value: event.target.value,
            })

            setError(null)
          }}
          placeholder={t('catalog.search.placeholder')}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${id}-error`
              : undefined
          }
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary shadow-[var(--app-shadow-sm)] outline-none transition placeholder:text-tertiary hover:border-border-strong focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />

        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast shadow-[var(--app-shadow-sm)] transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t('catalog.search.button')}
        </button>
      </div>

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm text-rose-600 dark:text-rose-300"
        >
          {translateCatalogValidation(t, error)}
        </p>
      )}
    </form>
  )
}

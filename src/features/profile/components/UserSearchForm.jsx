import { useEffect, useId, useState } from 'react'

import { useTranslation } from '../../localization/hooks/useTranslation.js'

import {
  getUserSearchError,
  normalizeUserSearchQuery,
} from '../validation/userSearchValidation.js'

export default function UserSearchForm({
  query = '',
  onSearch,
}) {
  const { t } = useTranslation()
  const id = useId()
  const [value, setValue] = useState(
    query ? `@${query}` : '',
  )
  const [error, setError] = useState(null)

  useEffect(() => {
    setValue(query ? `@${query}` : '')
    setError(null)
  }, [query])

  function submit(event) {
    event.preventDefault()

    const username = normalizeUserSearchQuery(value)
    const validation = getUserSearchError(username)

    setError(validation)

    if (validation) return

    onSearch(username)
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="w-full max-w-xl space-y-2"
    >
      <label
        htmlFor={id}
        className="text-sm font-medium text-secondary"
      >
        {t('social.userSearch.username')}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          placeholder="@username"
          autoComplete="off"
          spellCheck="false"
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : `${id}-hint`
          }
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-focus"
        />

        <button
          type="submit"
          className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          {t('social.userSearch.search')}
        </button>
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm text-rose-200"
        >
          {t(
            normalizeUserSearchQuery(value)
              ? 'social.userSearch.validationFormat'
              : 'social.userSearch.validationEmpty',
          )}
        </p>
      ) : (
        <p
          id={`${id}-hint`}
          className="text-sm text-tertiary"
        >
          {t('social.userSearch.hint')}
        </p>
      )}
    </form>
  )
}

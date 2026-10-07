import {
  useId,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

import {
  translateCatalogValidation,
} from '../../localization/core/catalogUiMessages.js'

import {
  toTmdbLanguage,
} from '../../../shared/config/tmdb.js'

import {
  getTmdbPosterUrl,
} from '../services/tmdbImages.js'

import {
  useSearchAutocomplete,
} from '../hooks/useSearchAutocomplete.js'

import {
  createSearchParams,
  getQueryError,
  normalizeQuery,
} from '../validation/searchValidation.js'


function suggestionPath(item) {
  if (
    !Number.isSafeInteger(item?.id)
    || item.id <= 0
  ) {
    return null
  }

  if (item.mediaType === 'movie') {
    return `/movies/${item.id}`
  }

  if (item.mediaType === 'tv') {
    return `/tv/${item.id}`
  }

  if (item.mediaType === 'person') {
    return `/actors/${item.id}`
  }

  return null
}


function suggestionTitle(item) {
  return item.mediaType === 'person'
    ? item.name
    : item.title
}


function suggestionDetail(item, t) {
  if (item.mediaType === 'person') {
    return item.knownForDepartment
      || t('catalog.media.person')
  }

  const year =
    typeof item.releaseDate === 'string'
      ? item.releaseDate.slice(0, 4)
      : null

  const type = t(
    item.mediaType === 'movie'
      ? 'catalog.media.movie'
      : 'catalog.media.tv',
  )

  return year
    ? `${type} · ${year}`
    : type
}

function suggestionArtwork(item) {
  if (
    item.mediaType !== 'movie'
    && item.mediaType !== 'tv'
  ) {
    return null
  }

  return getTmdbPosterUrl(
    item.posterPath,
  )
}


export default function SearchForm({
  query = '',
  type = 'all',
}) {
  const {
    t,
    locale,
  } = useTranslation()

  const language =
    toTmdbLanguage(locale)

  const id = useId()
  const listId = `${id}-suggestions`

  const navigate = useNavigate()

  const [draft, setDraft] =
    useState({
      source: query,
      value: query,
    })

  const [error, setError] =
    useState(null)

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(-1)

  const [open, setOpen] =
    useState(false)

  if (draft.source !== query) {
    setDraft({
      source: query,
      value: query,
    })

    setError(null)
    setActiveIndex(-1)
    setOpen(false)
  }

  const value =
    draft.source === query
      ? draft.value
      : query

  const autocomplete =
    useSearchAutocomplete({
      query: value,
      language,
    })

  const suggestions =
    autocomplete.results

  const suggestionsOpen = (
    open
    && suggestions.length > 0
  )

  function openSuggestion(item) {
    const path = suggestionPath(item)

    if (!path) return

    setOpen(false)
    setActiveIndex(-1)
    navigate(path)
  }

  function submit(event) {
    event.preventDefault()

    if (
      suggestionsOpen
      && activeIndex >= 0
      && activeIndex
        < suggestions.length
    ) {
      openSuggestion(
        suggestions[activeIndex],
      )
      return
    }

    const normalized =
      normalizeQuery(value)

    const validation =
      getQueryError(normalized)

    setError(validation)

    if (validation) return

    setDraft({
      source: query,
      value: normalized,
    })

    setOpen(false)
    setActiveIndex(-1)

    navigate(
      `/search?${createSearchParams({
        query: normalized,
        type,
      })}`,
    )
  }

  function onKeyDown(event) {
    if (
      event.key === 'Escape'
    ) {
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    if (
      event.key !== 'ArrowDown'
      && event.key !== 'ArrowUp'
    ) {
      return
    }

    if (!suggestions.length) {
      return
    }

    event.preventDefault()
    setOpen(true)

    setActiveIndex(current => {
      if (
        event.key === 'ArrowDown'
      ) {
        return (
          current + 1
        ) % suggestions.length
      }

      return current <= 0
        ? suggestions.length - 1
        : current - 1
    })
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
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="search"
            autoComplete="off"
            value={value}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls={
              suggestionsOpen
                ? listId
                : undefined
            }
            aria-activedescendant={
              suggestionsOpen
              && activeIndex >= 0
                ? `${listId}-${activeIndex}`
                : undefined
            }
            onFocus={() => {
              if (suggestions.length) {
                setOpen(true)
              }
            }}
            onBlur={() => {
              setOpen(false)
              setActiveIndex(-1)
            }}
            onKeyDown={onKeyDown}
            onChange={event => {
              setDraft({
                source: query,
                value:
                  event.target.value,
              })

              setError(null)
              setOpen(true)
              setActiveIndex(-1)
            }}
            placeholder={t(
              'catalog.search.placeholder',
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error
                ? `${id}-error`
                : undefined
            }
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary shadow-[var(--app-shadow-sm)] outline-none transition placeholder:text-tertiary hover:border-border-strong focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />

          {suggestionsOpen && (
            <ul
              id={listId}
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-96 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-[var(--app-shadow-lg)]"
            >
              {suggestions.map(
                (item, index) => (
                  <li
                    id={`${listId}-${index}`}
                    key={`${item.mediaType}:${item.id}`}
                    role="option"
                    aria-selected={
                      activeIndex === index
                    }
                  >
                    <button
                      type="button"
                      onPointerDown={
                        event => {
                          event.preventDefault()
                        }
                      }
                      onMouseEnter={() => {
                        setActiveIndex(index)
                      }}
                      onClick={() => {
                        openSuggestion(item)
                      }}
                      className={
                        'flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition '
                        + (
                          activeIndex === index
                            ? 'bg-surface-muted'
                            : 'hover:bg-surface-muted'
                        )
                      }
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-primary">
                          {suggestionTitle(
                            item,
                          )}
                        </span>

                        <span className="mt-0.5 block truncate text-xs text-tertiary">
                          {suggestionDetail(
                            item,
                            t,
                          )}
                        </span>
                      </span>

                      {(
                        item.mediaType === 'movie'
                        || item.mediaType === 'tv'
                      ) && (
                        suggestionArtwork(item)
                          ? (
                            <img
                              src={
                                suggestionArtwork(
                                  item,
                                )
                              }
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="
                                h-[66px] w-11 shrink-0
                                rounded-md object-cover
                                bg-surface-muted
                              "
                            />
                          )
                          : (
                            <span
                              aria-hidden="true"
                              className="
                                flex h-[66px] w-11
                                shrink-0 items-center
                                justify-center rounded-md
                                border border-border
                                bg-surface-muted
                                text-lg text-tertiary
                              "
                            >
                              🎬
                            </span>
                          )
                      )}
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>

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
          {translateCatalogValidation(
            t,
            error,
          )}
        </p>
      )}
    </form>
  )
}

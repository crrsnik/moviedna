import { useEffect } from 'react'
import {
  useSearchParams,
} from 'react-router-dom'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

import {
  useCatalogBrowse,
} from '../hooks/useCatalogBrowse.js'

import {
  BROWSE_VIEWS,
  changeBrowse,
  createBrowseParams,
  readBrowseParams,
} from '../validation/browseValidation.js'

import CatalogViewTabs from './CatalogViewTabs.jsx'
import GenreFilter from './GenreFilter.jsx'
import CatalogGrid from './CatalogGrid.jsx'
import CatalogPagination from './CatalogPagination.jsx'

const NOUN_KEYS = {
  movie: 'catalog.browser.movies',
  tv: 'catalog.browser.tvShows',
  person: 'catalog.browser.actors',
}

const VIEW_KEYS = {
  popular: 'catalog.views.popular',
  'top-rated': 'catalog.views.topRated',
  'now-playing': 'catalog.views.nowPlaying',
  upcoming: 'catalog.views.upcoming',
  'airing-today': 'catalog.views.airingToday',
  'on-the-air': 'catalog.views.onTheAir',
  trending: 'catalog.views.trending',
}

export default function CatalogBrowser({
  type,
}) {
  const { t } = useTranslation()

  const [
    params,
    setParams,
  ] = useSearchParams()

  const state = readBrowseParams(
    type,
    params,
  )

  const {
    view,
    genres: selectedGenres,
    page,
  } = state

  const {
    catalog,
    genres: genreState,
  } = useCatalogBrowse(
    type,
    state,
  )

  const canonical = createBrowseParams(
    type,
    state,
  ).toString()

  const genreKey = (
    selectedGenres.join(',')
  )

  const validGenreKey = (
    genreState.data
      ? selectedGenres
          .filter(
            id => genreState.data.some(
              genre => genre.id === id,
            ),
          )
          .join(',')
      : genreKey
  )

  const hasUnknownGenres = (
    genreState.data !== null
    && validGenreKey !== genreKey
  )

  useEffect(() => {
    const target = hasUnknownGenres
      ? createBrowseParams(
          type,
          {
            view,
            genres: validGenreKey
              ? validGenreKey
                  .split(',')
                  .map(Number)
              : [],
            page: 1,
          },
        ).toString()
      : catalog.data
        && catalog.data.page !== page
        ? createBrowseParams(
            type,
            {
              view,
              genres: genreKey
                ? genreKey
                    .split(',')
                    .map(Number)
                : [],
              page:
                catalog.data.page,
            },
          ).toString()
        : canonical

    if (
      params.toString() !== target
    ) {
      setParams(
        target,
        {
          replace: true,
        },
      )
    }
  }, [
    hasUnknownGenres,
    genreState.data,
    catalog.data,
    canonical,
    type,
    view,
    genreKey,
    validGenreKey,
    page,
    params,
    setParams,
  ])

  const noun = t(
    NOUN_KEYS[type],
  )

  const translatedViews = (
    Object.fromEntries(
      Object.keys(
        BROWSE_VIEWS[type],
      ).map(value => [
        value,
        t(VIEW_KEYS[value]),
      ]),
    )
  )

  const selectedGenreNames = (
    genreState.data
      ? selectedGenres
          .map(id => (
            genreState.data.find(
              genre => genre.id === id,
            )?.name
          ))
          .filter(Boolean)
      : []
  )

  const viewHeading = t(
    'catalog.browser.viewHeading',
    {
      noun,
      view: t(
        VIEW_KEYS[view],
      ),
    },
  )

  const heading = (
    selectedGenreNames.length
      ? `${viewHeading} · ${selectedGenreNames.join(' + ')}`
      : viewHeading
  )

  return (
    <div className="min-w-0 space-y-6">
      <CatalogViewTabs
        views={translatedViews}
        selected={view}
        onChange={value => (
          setParams(
            changeBrowse(
              type,
              state,
              {
                view: value,
              },
            ),
          )
        )}
      />

      {type !== 'person' && (
        <GenreFilter
          state={genreState}
          selected={selectedGenres}
          onChange={value => (
            setParams(
              changeBrowse(
                type,
                state,
                {
                  genres: value,
                },
              ),
            )
          )}
        />
      )}

      <h2 className="text-xl font-semibold">
        {heading}
      </h2>

      <CatalogGrid
        state={catalog}
      />

      <CatalogPagination
        page={page}
        data={catalog.data}
        loading={catalog.loading}
        onChange={value => (
          setParams(
            changeBrowse(
              type,
              state,
              {
                page: value,
              },
            ),
          )
        )}
      />
    </div>
  )
}

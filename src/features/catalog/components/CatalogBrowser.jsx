import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { useCatalogBrowse } from '../hooks/useCatalogBrowse.js'

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

export default function CatalogBrowser({ type }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()

  const state = readBrowseParams(
    type,
    params,
  )

  const {
    view,
    genre,
    page,
  } = state

  const {
    catalog,
    genres,
  } = useCatalogBrowse(type, state)

  const canonical = createBrowseParams(
    type,
    state,
  ).toString()

  const selectedGenre = genres.data?.find(
    item => item.id === genre,
  )

  const unknownGenre = (
    genre !== null
    && genres.data !== null
    && !selectedGenre
  )

  useEffect(() => {
    const target = unknownGenre
      ? createBrowseParams(
        type,
        {},
      ).toString()
      : catalog.data
        && catalog.data.page !== page
        ? createBrowseParams(
          type,
          {
            view,
            genre,
            page: catalog.data.page,
          },
        ).toString()
        : canonical

    if (params.toString() !== target) {
      setParams(
        target,
        { replace: true },
      )
    }
  }, [
    unknownGenre,
    catalog.data,
    canonical,
    type,
    view,
    genre,
    page,
    params,
    setParams,
  ])

  const noun = t(NOUN_KEYS[type])

  const translatedViews = Object.fromEntries(
    Object.keys(BROWSE_VIEWS[type]).map(
      value => [
        value,
        t(VIEW_KEYS[value]),
      ],
    ),
  )

  let heading

  if (genre) {
    heading = selectedGenre
      ? t(
        'catalog.browser.genreHeading',
        {
          genre: selectedGenre.name,
          noun,
        },
      )
      : t(
        'catalog.browser.unknownGenreHeading',
        { noun },
      )
  } else {
    heading = t(
      'catalog.browser.viewHeading',
      {
        noun,
        view: t(VIEW_KEYS[view]),
      },
    )
  }

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
              { view: value },
            ),
          )
        )}
      />

      {type !== 'person' && (
        <GenreFilter
          state={genres}
          selected={genre}
          onChange={value => (
            setParams(
              changeBrowse(
                type,
                state,
                { genre: value },
              ),
            )
          )}
        />
      )}

      <h2 className="text-xl font-semibold">
        {heading}
      </h2>

      <CatalogGrid state={catalog} />

      <CatalogPagination
        page={page}
        data={catalog.data}
        loading={catalog.loading}
        onChange={value => (
          setParams(
            changeBrowse(
              type,
              state,
              { page: value },
            ),
          )
        )}
      />
    </div>
  )
}

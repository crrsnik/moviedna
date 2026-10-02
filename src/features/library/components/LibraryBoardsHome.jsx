import { Link } from 'react-router-dom'

import DetailImage from '../../catalog/components/DetailImage.jsx'
import { getTmdbPosterUrl } from '../../catalog/services/tmdbImages.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { useCustomListItems } from '../hooks/useCustomListItems.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'
import { useMediaLibrary } from '../hooks/useMediaLibrary.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'
import {
  librarySelectionParams,
} from '../validation/customListValidation.js'

function compareTimestamp(a, b) {
  return (
    a.seconds - b.seconds
    || a.nanoseconds - b.nanoseconds
  )
}

function customBoardCover(items, listId) {
  return [...(items ?? [])]
    .sort((a, b) => {
      const aAdded = a.listAddedAt?.[listId] ?? null
      const bAdded = b.listAddedAt?.[listId] ?? null

      if (aAdded === null && bAdded !== null) return -1
      if (aAdded !== null && bAdded === null) return 1

      if (aAdded !== null && bAdded !== null) {
        const timestampOrder = compareTimestamp(
          aAdded,
          bAdded,
        )

        if (timestampOrder) return timestampOrder
      }

      return (
        a.title.localeCompare(b.title, 'en')
        || a.key.localeCompare(b.key)
      )
    })[0] ?? null
}

function BoardCover({
  item,
  loading,
}) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex aspect-2/3 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
        …
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex aspect-2/3 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-center text-sm text-zinc-500">
        {t('library.boards.emptyBoard')}
      </div>
    )
  }

  return (
    <DetailImage
      src={getTmdbPosterUrl(
        item.posterPath,
      )}
      alt={t(
        'catalog.media.posterAlt',
        { title: item.title },
      )}
      placeholder={t(
        'catalog.media.noPoster',
      )}
      className="aspect-2/3 rounded-xl"
    />
  )
}

function BoardMeta({
  count,
  loading,
  error,
}) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <span className="text-sm text-zinc-500">
        …
      </span>
    )
  }

  if (error) {
    return (
      <span className="text-sm text-zinc-500">
        {t('library.boards.error')}
      </span>
    )
  }

  return (
    <span className="text-sm text-zinc-500">
      {t(
        count === 1
          ? 'library.boards.oneTitle'
          : 'library.boards.manyTitles',
        { count },
      )}
    </span>
  )
}

function SystemBoardCard({
  uid,
  view,
  title,
}) {
  const { t } = useTranslation()
  const state = useMediaLibrary(uid, view)

  const cover = state.data?.[0] ?? null

  return (
    <article className="min-w-0">
      <Link
        to={`?${librarySelectionParams({
          view,
        })}`}
        className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
      >
        <div className="overflow-hidden rounded-xl bg-zinc-950 transition-transform duration-200 group-hover:-translate-y-0.5">
          <BoardCover
            item={cover}
            loading={state.loading}
          />
        </div>

        <div className="mt-3 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">
              {title}
            </h3>

            <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">
              {t('library.boards.pinned')}
            </span>
          </div>

          <div className="mt-1">
            <BoardMeta
              count={state.data?.length ?? 0}
              loading={state.loading}
              error={state.error}
            />
          </div>
        </div>
      </Link>
    </article>
  )
}

function CustomBoardCard({
  uid,
  list,
}) {
  const { t } = useTranslation()
  const action = useLibraryAction()

  const state = useCustomListItems(
    uid,
    list.id,
  )

  const cover = customBoardCover(
    state.data,
    list.id,
  )

  const boardHref = `?${librarySelectionParams({
    view: 'list',
    listId: list.id,
  })}`

  const togglePinned = () => {
    action.run(() => (
      mediaLibraryService.setCustomListPinned(
        uid,
        list.id,
        !list.pinned,
      )
    ))
  }

  return (
    <article className="min-w-0">
      <div className="relative">
        <Link
          to={boardHref}
          className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
        >
          <div className="overflow-hidden rounded-xl bg-zinc-950 transition-transform duration-200 group-hover:-translate-y-0.5">
            <BoardCover
              item={cover}
              loading={state.loading}
            />
          </div>
        </Link>

        <button
          type="button"
          disabled={action.pending}
          onClick={togglePinned}
          aria-pressed={list.pinned}
          aria-label={t(
            list.pinned
              ? 'library.boards.unpinBoard'
              : 'library.boards.pinBoard',
            { name: list.name },
          )}
          title={t(
            list.pinned
              ? 'library.boards.unpin'
              : 'library.boards.pin',
          )}
          className={`absolute right-2 top-2 flex size-9 items-center justify-center rounded-full border bg-zinc-950/90 text-base shadow-sm backdrop-blur transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
            list.pinned
              ? 'border-zinc-100 text-zinc-100'
              : 'border-zinc-700 text-zinc-400'
          }`}
        >
          <span aria-hidden="true">
            📌
          </span>
        </button>
      </div>

      <div className="mt-3 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={boardHref}
            className="min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <h3 className="truncate font-semibold">
              {list.name}
            </h3>
          </Link>

          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
            list.visibility === 'public'
              ? 'border-violet-800 text-violet-300'
              : 'border-zinc-700 text-zinc-400'
          }`}
          >
            {list.visibility === 'public'
              ? t('library.lists.public')
              : t('library.boards.private')}
          </span>
        </div>

        <div className="mt-1">
          <BoardMeta
            count={state.data?.length ?? 0}
            loading={state.loading}
            error={state.error}
          />
        </div>

        {action.error && (
          <p
            role="alert"
            className="mt-1 text-xs text-zinc-400"
          >
            {t('library.boards.pinError')}
          </p>
        )}
      </div>
    </article>
  )
}

function CreateBoardCard({ onCreate }) {
  const { t } = useTranslation()

  return (
    <article className="min-w-0">
      <button
        type="button"
        onClick={onCreate}
        className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
      >
        <div className="flex aspect-2/3 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950 transition-colors group-hover:border-zinc-500 group-hover:bg-zinc-900">
          <span
            aria-hidden="true"
            className="text-4xl font-light text-zinc-500"
          >
            +
          </span>
        </div>

        <h3 className="mt-3 font-semibold">
          {t('library.boards.create')}
        </h3>
      </button>
    </article>
  )
}

export default function LibraryBoardsHome({
  uid,
  lists,
  onCreate,
}) {
  const { t } = useTranslation()

  const pinnedBoards = (
    lists.data?.filter(list => list.pinned)
    ?? []
  )

  const allBoards = lists.data ?? []

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold">
          {t('library.boards.pinnedBoards')}
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          <SystemBoardCard
            uid={uid}
            view="favorites"
            title={t('library.views.favorites')}
          />

          <SystemBoardCard
            uid={uid}
            view="watchlist"
            title={t('library.views.watchlist')}
          />

          {pinnedBoards.map(list => (
            <CustomBoardCard
              key={list.id}
              uid={uid}
              list={list}
            />
          ))}
        </div>
      </section>

      <section>
        <div>
          <h2 className="text-xl font-semibold">
            {t('library.boards.yourBoards')}
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            {t('library.boards.yourBoardsDescription')}
          </p>
        </div>

        {lists.loading && (
          <p
            role="status"
            className="mt-5 text-zinc-400"
          >
            {t('library.lists.loading')}
          </p>
        )}

        {lists.error && (
          <div className="mt-5 space-y-3">
            <p role="alert" className="text-zinc-400">
              {t('library.errors.load')}
            </p>

            <button
              type="button"
              onClick={lists.retry}
              className="rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {t('library.lists.retry')}
            </button>
          </div>
        )}

        {!lists.loading && !lists.error && (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {allBoards.map(list => (
              <CustomBoardCard
                key={list.id}
                uid={uid}
                list={list}
              />
            ))}

            <CreateBoardCard
              onCreate={onCreate}
            />
          </div>
        )}
      </section>

      <Link
        to={`?${librarySelectionParams({
          view: 'ratings',
        })}`}
        className="inline-flex text-sm font-medium text-zinc-400 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {t('library.views.ratings')} →
      </Link>
    </div>
  )
}

import { Link } from 'react-router-dom'

import DetailImage from '../../catalog/components/DetailImage.jsx'
import { getTmdbPosterUrl } from '../../catalog/services/tmdbImages.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

function BoardCount({ count }) {
  const { t } = useTranslation()

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

function BoardCover({ board }) {
  const { t } = useTranslation()
  const cover = board.items[0]

  if (!cover) {
    return (
      <div className="flex aspect-2/3 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-center text-sm text-zinc-500">
        {t('library.boards.emptyBoard')}
      </div>
    )
  }

  return (
    <DetailImage
      src={getTmdbPosterUrl(
        cover.posterPath,
      )}
      alt={t(
        'catalog.media.posterAlt',
        { title: cover.title },
      )}
      placeholder={t(
        'catalog.media.noPoster',
      )}
      className="aspect-2/3 rounded-xl"
    />
  )
}

export default function PublicBoards({
  state,
  username,
  boardHref,
}) {
  const { t } = useTranslation()

  if (state.loading) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">
          {t('library.boards.title')}
        </h2>

        <p
          role="status"
          className="mt-3 text-zinc-400"
        >
          {t('library.boards.loading')}
        </p>
      </section>
    )
  }

  if (state.error) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">
          {t('library.boards.title')}
        </h2>

        <p
          role="alert"
          className="mt-3 text-zinc-400"
        >
          {t('library.boards.error')}
        </p>
      </section>
    )
  }

  if (!state.boards.length) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">
          {t('library.boards.title')}
        </h2>

        <p className="mt-3 text-sm text-zinc-400">
          {t('library.boards.empty')}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">
          {t('library.boards.title')}
        </h2>

        <p className="text-sm text-zinc-400">
          {t('library.boards.description')}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        {state.boards.map(board => (
          <article
            key={board.id}
            className="min-w-0"
          >
            <Link
              to={boardHref
                ? boardHref(board)
                : `/users/${encodeURIComponent(
                    username,
                  )}/boards/${board.id}`}
              className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
            >
              <div className="overflow-hidden rounded-xl bg-zinc-950 transition-transform duration-200 group-hover:-translate-y-0.5">
                <BoardCover board={board} />
              </div>

              <div className="mt-3 min-w-0">
                <h3 className="truncate font-semibold">
                  {board.name}
                </h3>

                <div className="mt-1">
                  <BoardCount
                    count={board.items.length}
                  />
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}

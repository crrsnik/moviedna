import { Link } from 'react-router-dom'

import DetailImage from '../../catalog/components/DetailImage.jsx'
import { getTmdbPosterUrl } from '../../catalog/services/tmdbImages.js'
import { savedMediaRoute } from '../../library/validation/libraryValidation.js'

function BoardItems({ items }) {
  if (!items.length) {
    return (
      <p className="text-sm text-zinc-400">
        This board is empty.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(item => (
        <article
          key={item.key}
          className="min-w-0"
        >
          <Link
            to={savedMediaRoute(item)}
            className="block space-y-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <DetailImage
              src={getTmdbPosterUrl(item.posterPath)}
              alt={`${item.title} poster`}
              placeholder="No poster available"
              className="aspect-2/3 rounded-lg"
            />

            <h4 className="break-words font-medium">
              {item.title}
            </h4>

            <p className="text-sm text-zinc-400">
              {[
                item.mediaType === 'movie'
                  ? 'Movie'
                  : 'TV',
                item.releaseYear,
              ].filter(Boolean).join(' · ')}
            </p>
          </Link>
        </article>
      ))}
    </div>
  )
}

export default function PublicBoards({ state }) {
  if (state.loading) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">
          Boards
        </h2>

        <p
          role="status"
          className="mt-3 text-zinc-400"
        >
          Loading public boards…
        </p>
      </section>
    )
  }

  if (state.error) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">
          Boards
        </h2>

        <p
          role="alert"
          className="mt-3 text-zinc-400"
        >
          Public boards could not be loaded.
        </p>
      </section>
    )
  }

  if (!state.boards.length) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">
          Boards
        </h2>

        <p className="mt-3 text-sm text-zinc-400">
          No public boards yet.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">
          Boards
        </h2>

        <p className="text-sm text-zinc-400">
          Public movie and TV collections.
        </p>
      </div>

      <div className="mt-6 space-y-8">
        {state.boards.map(board => (
          <article
            key={board.id}
            className="space-y-4"
          >
            <div>
              <h3 className="break-words text-lg font-semibold">
                {board.name}
              </h3>

              {board.description && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-400">
                  {board.description}
                </p>
              )}

              <p className="mt-1 text-sm text-zinc-500">
                {board.items.length}
                {' '}
                {board.items.length === 1
                  ? 'title'
                  : 'titles'}
              </p>
            </div>

            <BoardItems items={board.items} />
          </article>
        ))}
      </div>
    </section>
  )
}

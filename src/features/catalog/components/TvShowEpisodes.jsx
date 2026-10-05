import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { formatRuntime } from '../services/detailHelpers.js'

export default function TvShowEpisodes({
  lastEpisode,
  nextEpisode,
}) {
  const { t } = useTranslation()

  if (!lastEpisode && !nextEpisode) {
    return null
  }

  const episodes = [
    [
      t('catalog.detail.lastAiredEpisode'),
      lastEpisode,
    ],
    [
      t('catalog.detail.nextEpisode'),
      nextEpisode,
    ],
  ].filter(([, episode]) => episode)

  return (
    <section
      aria-labelledby="tv-episodes"
      className="space-y-5"
    >
      <h2
        id="tv-episodes"
        className="text-2xl font-semibold"
      >
        {t('catalog.detail.episodes')}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {episodes.map(([label, episode]) => (
          <article
            key={label}
            className="min-w-0 space-y-2 rounded-lg border border-border p-5"
          >
            <p className="text-sm text-secondary">
              {label}
            </p>

            <h3 className="break-words font-semibold">
              {episode.name}
            </h3>

            <p className="text-sm text-secondary">
              {t(
                'catalog.detail.seasonEpisode',
                {
                  season:
                    episode.seasonNumber,
                  episode:
                    episode.episodeNumber,
                },
              )}
            </p>

            <p className="text-sm text-secondary">
              {[
                episode.airDate,
                formatRuntime(
                  episode.runtime,
                ),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>

            {episode.overview && (
              <p className="line-clamp-4 break-words text-sm text-secondary">
                {episode.overview}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

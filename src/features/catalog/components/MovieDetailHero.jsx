import { useTranslation } from '../../localization/hooks/useTranslation.js'

import DetailHero from './DetailHero.jsx'
import { formatRuntime } from '../services/detailHelpers.js'

export default function MovieDetailHero({
  movie,
  actions = null,
}) {
  const { t } = useTranslation()

  return (
    <DetailHero
      media={movie}
      metadata={[
        movie.releaseYear,
        formatRuntime(movie.runtime),
        movie.certification,
      ]}
      backTo="/movies"
      backLabel={t('catalog.detail.backMovies')}
      actions={actions}
    />
  )
}

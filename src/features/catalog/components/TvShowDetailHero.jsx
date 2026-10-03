import { useTranslation } from '../../localization/hooks/useTranslation.js'

import DetailHero from './DetailHero.jsx'
import { formatRuntime } from '../services/detailHelpers.js'

export default function TvShowDetailHero({ series }) {
  const { t } = useTranslation()

  return (
    <DetailHero
      media={{
        ...series,
        title: series.name,
      }}
      metadata={[
        series.yearRange,
        formatRuntime(series.episodeRuntime),
        series.contentRating,
      ]}
      backTo="/tv"
      backLabel={t('catalog.detail.backTv')}
    />
  )
}

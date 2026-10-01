import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { useUserRatings } from '../hooks/useUserRatings.js'
import RatedMediaCard from './RatedMediaCard.jsx'
import { libraryButton } from '../../library/components/LibraryDialog.jsx'

export default function UserRatings({ uid }) {
  const { t } = useTranslation()

  const {
    data,
    loading,
    error,
    retry,
  } = useUserRatings(uid)

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-semibold">
        {t('ratings.title')}
      </h2>

      {loading ? (
        <p role="status">
          {t('ratings.loading')}
        </p>
      ) : error ? (
        <div>
          <p role="alert">
            {t('ratings.loadError')}
          </p>

          <button
            type="button"
            className={libraryButton}
            onClick={retry}
          >
            {t('ratings.retry')}
          </button>
        </div>
      ) : !data?.length ? (
        <p>
          {t('ratings.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {data.map(item => (
            <RatedMediaCard
              key={item.key}
              uid={uid}
              item={item}
            />
          ))}
        </div>
      )}
    </section>
  )
}

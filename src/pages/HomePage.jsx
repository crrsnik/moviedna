import SearchForm from '../features/catalog/components/SearchForm.jsx'
import { useTrendingCatalog } from '../features/catalog/hooks/useTrendingCatalog.js'
import MediaRow from '../features/catalog/components/MediaRow.jsx'
import CatalogSectionState from '../features/catalog/components/CatalogSectionState.jsx'
import RecommendationSection from '../features/recommendations/components/RecommendationSection.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { movies, tvShows } = useTrendingCatalog()

  const sections = [
    {
      id: 'trending-movies',
      title: t('catalog.home.trendingMovies'),
      state: movies,
    },
    {
      id: 'trending-tv',
      title: t('catalog.home.trendingTv'),
      state: tvShows,
    },
  ]

  return (
    <div className="w-full min-w-0 space-y-12">
      <section
        className="space-y-5 py-4 text-center sm:py-8"
        aria-labelledby="home-title"
      >
        <h1
          id="home-title"
          className="text-4xl font-bold tracking-[-0.025em] text-primary sm:text-6xl"
        >
          MovieDNA
        </h1>

        <p className="text-lg text-secondary">
          {t('catalog.home.tagline')}
        </p>

        <SearchForm />
      </section>

      {user && <RecommendationSection />}

      {sections.map(({ id, title, state }) => (
        <section
          key={id}
          aria-labelledby={id}
          className="min-w-0 space-y-5"
        >
          <h2
            id={id}
            className="text-xl font-semibold tracking-tight text-primary sm:text-2xl"
          >
            {title}
          </h2>

          {state.isLoading
            || state.error
            || state.data.length === 0 ? (
              <CatalogSectionState
                isLoading={state.isLoading}
                error={state.error}
                onRetry={state.retry}
              />
            ) : (
              <MediaRow
                items={state.data}
                labelledBy={id}
              />
            )}
        </section>
      ))}
    </div>
  )
}

export default HomePage

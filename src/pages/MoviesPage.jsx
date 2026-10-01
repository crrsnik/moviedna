import CatalogPageHeader from '../features/catalog/components/CatalogPageHeader.jsx'
import CatalogBrowser from '../features/catalog/components/CatalogBrowser.jsx'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

export default function MoviesPage() {
  const { t } = useTranslation()

  return (
    <section className="w-full min-w-0 space-y-8">
      <CatalogPageHeader
        title={t('catalog.pages.moviesTitle')}
        description={t('catalog.pages.moviesDescription')}
      />

      <CatalogBrowser type="movie" />
    </section>
  )
}

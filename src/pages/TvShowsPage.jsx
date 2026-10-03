import CatalogPageHeader from '../features/catalog/components/CatalogPageHeader.jsx'
import CatalogBrowser from '../features/catalog/components/CatalogBrowser.jsx'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

export default function TvShowsPage() {
  const { t } = useTranslation()

  return (
    <section className="w-full min-w-0 space-y-8">
      <CatalogPageHeader
        title={t('catalog.pages.tvTitle')}
        description={t('catalog.pages.tvDescription')}
      />

      <CatalogBrowser type="tv" />
    </section>
  )
}

import CatalogPageHeader from '../features/catalog/components/CatalogPageHeader.jsx'
import CatalogBrowser from '../features/catalog/components/CatalogBrowser.jsx'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

export default function ActorsPage() {
  const { t } = useTranslation()

  return (
    <section className="w-full min-w-0 space-y-8">
      <CatalogPageHeader
        title={t('catalog.pages.actorsTitle')}
        description={t('catalog.pages.actorsDescription')}
      />

      <div
        data-catalog-scroll-target
        className="scroll-mt-6"
      >
        <CatalogBrowser type="person" />
      </div>
    </section>
  )
}

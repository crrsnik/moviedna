import CatalogPageHeader from '../features/catalog/components/CatalogPageHeader.jsx'
import CatalogBrowser from '../features/catalog/components/CatalogBrowser.jsx'

export default function ActorsPage() {
  return <section className="w-full min-w-0 space-y-8">
    <CatalogPageHeader title="Actors" description="Discover popular and trending people behind your favorite stories." />
    <CatalogBrowser type="person" />
  </section>
}

import CatalogPageHeader from '../features/catalog/components/CatalogPageHeader.jsx'
import CatalogBrowser from '../features/catalog/components/CatalogBrowser.jsx'

export default function MoviesPage() {
  return <section className="w-full min-w-0 space-y-8">
    <CatalogPageHeader title="Movies" description="Explore popular films, acclaimed favorites and new releases." />
    <CatalogBrowser type="movie" />
  </section>
}

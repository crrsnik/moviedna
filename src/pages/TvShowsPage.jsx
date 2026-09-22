import CatalogPageHeader from '../features/catalog/components/CatalogPageHeader.jsx'
import CatalogBrowser from '../features/catalog/components/CatalogBrowser.jsx'

export default function TvShowsPage() {
  return <section className="w-full min-w-0 space-y-8">
    <CatalogPageHeader title="TV Shows" description="Find popular series, top-rated shows and what is airing now." />
    <CatalogBrowser type="tv" />
  </section>
}

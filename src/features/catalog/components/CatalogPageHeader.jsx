import SearchForm from './SearchForm.jsx'
export default function CatalogPageHeader({ title, description }) {
  return <header className="space-y-5"><h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1><p className="text-secondary">{description}</p><SearchForm /></header>
}

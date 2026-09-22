export default function CatalogViewTabs({ views, selected, onChange }) {
  return <nav aria-label="Catalog views" className="flex flex-wrap gap-2">
    {Object.entries(views).map(([view, label]) => <button key={view} type="button" aria-current={selected === view ? 'true' : undefined} onClick={() => onChange(view)} className={`rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 ${selected === view ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>{label}</button>)}
  </nav>
}
